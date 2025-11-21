const Document = require("../models/Document");
const Matter = require("../models/Matter");
const CaseFile = require("../models/CaseFile");
const Task = require("../models/Task");
const {
  buildFieldChanges,
  logEntityActivity,
} = require("../utils/activityLogger");

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeObjectId = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value === "object") {
    if (value === null) {
      return null;
    }

    if (value._id) {
      return value._id.toString();
    }

    if (value.id) {
      return value.id.toString();
    }
  }

  return value.toString();
};

const buildHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const DOCUMENT_ACTIVITY_FIELDS = [
  { path: "title", label: "Title" },
  { path: "documentType", label: "Document Type" },
  { path: "matter", label: "Matter" },
  { path: "caseFile", label: "Case File" },
  { path: "version", label: "Version" },
  { path: "receivedFrom", label: "Received From" },
  { path: "producedTo", label: "Produced To" },
];

const handleErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.statusCode ? error.message : "Server error",
    error: error.statusCode ? undefined : error.message,
  });
};

const resolveMatterAndCase = async ({ matterId, caseFileId }) => {
  const matterProvided = matterId !== undefined;
  const caseProvided = caseFileId !== undefined;

  if (!matterProvided && !caseProvided) {
    return { matterId: undefined, caseFileId: undefined };
  }

  let normalizedMatterId = normalizeObjectId(matterId);
  let normalizedCaseId = normalizeObjectId(caseFileId);
  let caseFileDocument = null;

  if (caseProvided) {
    if (normalizedCaseId) {
      caseFileDocument = await CaseFile.findById(normalizedCaseId).select("matter");
      if (!caseFileDocument) {
        throw buildHttpError("Selected case file could not be found.");
      }
    } else {
      normalizedCaseId = null;
    }
  }

  if (caseFileDocument) {
    const caseMatterId = caseFileDocument.matter?.toString();
    if (!caseMatterId) {
      throw buildHttpError("Selected case file is not linked to a matter.");
    }

    if (matterProvided && normalizedMatterId && normalizedMatterId !== caseMatterId) {
      throw buildHttpError(
        "Selected case file does not belong to the specified matter."
      );
    }

    normalizedMatterId = caseMatterId;
  }

  if (matterProvided) {
    if (normalizedMatterId) {
      const matterExists = await Matter.exists({ _id: normalizedMatterId });
      if (!matterExists) {
        throw buildHttpError("Selected matter could not be found.");
      }
    } else {
      normalizedMatterId = null;
    }
  }

  return {
    matterId: matterProvided ? normalizedMatterId : normalizedMatterId ?? undefined,
    caseFileId: caseProvided ? normalizedCaseId : normalizedCaseId ?? undefined,
  };
};

const validateRelatedTasks = async (taskIds, matterId, caseFileId) => {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return [];
  }

  const normalizedIds = [
    ...new Set(
      taskIds
        .map((taskId) => normalizeObjectId(taskId))
        .filter((taskId) => taskId)
    ),
  ];

  if (!normalizedIds.length) {
    return [];
  }

  const tasks = await Task.find({ _id: { $in: normalizedIds } }).select(
    "_id matter caseFile"
  );

  if (tasks.length !== normalizedIds.length) {
    throw buildHttpError("Some related tasks could not be found.");
  }

  const mismatchedTask = tasks.find((task) => {
    const taskMatter = task.matter?.toString();
    const taskCase = task.caseFile?.toString();

    if (matterId && taskMatter && matterId !== taskMatter) {
      return true;
    }

    if (caseFileId && taskCase && caseFileId !== taskCase) {
      return true;
    }

    return false;
  });

  if (mismatchedTask) {
    throw buildHttpError(
      "Related tasks must belong to the same matter and case file."
    );
  }

  return tasks.map((task) => task._id);
};

const buildDocumentFilters = ({ matterId, caseFileId, type, search }) => {
  const filter = {};

  if (matterId) {
    filter.matter = matterId;
  }

  if (caseFileId) {
    filter.caseFile = caseFileId;
  }

  if (type) {
    filter.documentType = type;
  }

  if (search) {
    const normalizedSearch = search.trim();
    if (normalizedSearch) {
      filter.$or = [
        { title: { $regex: normalizedSearch, $options: "i" } },
        { description: { $regex: normalizedSearch, $options: "i" } },
        { tags: { $regex: normalizedSearch, $options: "i" } },
      ];
    }
  }

  return filter;
};

const getDocuments = async (req, res) => {
  try {
    const { matterId, caseFileId, type, search } = req.query;
    const filter = buildDocumentFilters({ matterId, caseFileId, type, search });

    const documents = await Document.find(filter)
      .populate({
        path: "matter",
        select: "title clientName matterNumber status client",
        populate: { path: "client", select: "name email" },
      })
      .populate("caseFile", "title caseNumber status")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ documents });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate({
        path: "matter",
        select: "title clientName matterNumber status client",
        populate: { path: "client", select: "name email" },
      })
      .populate("caseFile", "title caseNumber status")
      .populate("uploadedBy", "name email")
      .populate("relatedTasks", "title status dueDate");

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json({ document });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const createDocument = async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.title = normalizeString(payload.title);
    payload.documentType = normalizeString(payload.documentType);
    payload.description = normalizeString(payload.description);
    payload.receivedFrom = normalizeString(payload.receivedFrom);
    payload.producedTo = normalizeString(payload.producedTo);

    const { matterId, caseFileId } = await resolveMatterAndCase({
      matterId: payload.matter,
      caseFileId: payload.caseFile,
    });

    if (!matterId) {
      throw buildHttpError("Matter reference is required.");
    }

    payload.matter = matterId;
    payload.caseFile = caseFileId ?? null;

    if (!payload.title) {
      throw buildHttpError("Document title is required.");
    }

    if (Array.isArray(payload.tags)) {
      payload.tags = payload.tags.map((tag) => normalizeString(tag)).filter(Boolean);
    }

    if (Array.isArray(payload.relatedTasks)) {
      payload.relatedTasks = await validateRelatedTasks(
        payload.relatedTasks,
        payload.matter,
        payload.caseFile
      );
    }

    const document = await Document.create(payload);
    const populatedDocument = await Document.findById(document._id)
      .populate({
        path: "matter",
        select: "title clientName matterNumber status client",
        populate: { path: "client", select: "name email" },
      })
      .populate("caseFile", "title caseNumber status")
      .populate("uploadedBy", "name email");

    await logEntityActivity({
      entityType: "document",
      action: "created",
      entityId: document._id,
      entityName: document.title,
      actor: req.user,
      details: buildFieldChanges({}, document.toObject(), DOCUMENT_ACTIVITY_FIELDS),
    });

    res.status(201).json({
      message: "Document created successfully",
      document: populatedDocument,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const originalDocument = document.toObject();    
    const updates = { ...req.body };

    if (updates.title !== undefined) {
      updates.title = normalizeString(updates.title);
      if (!updates.title) {
        throw buildHttpError("Document title is required.");
      }
    }

    if (updates.documentType !== undefined) {
      updates.documentType = normalizeString(updates.documentType);
    }

    if (updates.description !== undefined) {
      updates.description = normalizeString(updates.description);
    }

    if (updates.receivedFrom !== undefined) {
      updates.receivedFrom = normalizeString(updates.receivedFrom);
    }

    if (updates.producedTo !== undefined) {
      updates.producedTo = normalizeString(updates.producedTo);
    }

    if (Array.isArray(updates.tags)) {
      updates.tags = updates.tags.map((tag) => normalizeString(tag)).filter(Boolean);
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "matter") ||
      Object.prototype.hasOwnProperty.call(updates, "caseFile")
    ) {
      const { matterId, caseFileId } = await resolveMatterAndCase({
        matterId: Object.prototype.hasOwnProperty.call(updates, "matter")
          ? updates.matter
          : document.matter,
        caseFileId: Object.prototype.hasOwnProperty.call(updates, "caseFile")
          ? updates.caseFile
          : document.caseFile,
      });

      if (!matterId) {
        throw buildHttpError("Matter reference is required.");
      }

      updates.matter = matterId;
      updates.caseFile = caseFileId ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "relatedTasks")) {
      const targetMatterId =
        Object.prototype.hasOwnProperty.call(updates, "matter")
          ? updates.matter
          : document.matter?.toString();
      const targetCaseId =
        Object.prototype.hasOwnProperty.call(updates, "caseFile")
          ? updates.caseFile
          : document.caseFile?.toString();

      updates.relatedTasks = await validateRelatedTasks(
        updates.relatedTasks,
        targetMatterId,
        targetCaseId
      );
    }

    Object.assign(document, updates);
    await document.save();
    const updatedDocumentObject = document.toObject();
    const documentChanges = buildFieldChanges(
      originalDocument,
      updatedDocumentObject,
      DOCUMENT_ACTIVITY_FIELDS
    );    

    const populatedDocument = await Document.findById(document._id)
      .populate({
        path: "matter",
        select: "title clientName matterNumber status client",
        populate: { path: "client", select: "name email" },
      })
      .populate("caseFile", "title caseNumber status")
      .populate("uploadedBy", "name email")
      .populate("relatedTasks", "title status dueDate");

    await logEntityActivity({
      entityType: "document",
      action: "updated",
      entityId: document._id,
      entityName: document.title,
      actor: req.user,
      details: documentChanges,
    });

    res.json({
      message: "Document updated successfully",
      document: populatedDocument,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const deletedDocumentSnapshot = document.toObject();
    await Task.updateMany(
      { relatedDocuments: document._id },
      { $pull: { relatedDocuments: document._id } }
    );

    await document.deleteOne();

    await logEntityActivity({
      entityType: "document",
      action: "deleted",
      entityId: document._id,
      entityName: document.title,
      actor: req.user,
      details: buildFieldChanges(
        deletedDocumentSnapshot,
        {},
        DOCUMENT_ACTIVITY_FIELDS
      ),
    });

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
};