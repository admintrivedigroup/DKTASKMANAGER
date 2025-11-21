const fs = require("fs");
const path = require("path");

const CaseFile = require("../models/CaseFile");
const Matter = require("../models/Matter");
const Document = require("../models/Document");
const Task = require("../models/Task");
const { hasPrivilegedAccess } = require("../utils/roleUtils");
const {
  buildFieldChanges,
  logEntityActivity,
} = require("../utils/activityLogger");

const buildHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const handleErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.statusCode ? error.message : "Server error",
    error: error.statusCode ? undefined : error.message,
  });
};

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeObjectId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "object") {
    if (value._id) {
      return value._id.toString();
    }

    if (value.id) {
      return value.id.toString();
    }
  }

  return value.toString();
};

const CASE_ACTIVITY_FIELDS = [
  { path: "title", label: "Title" },
  { path: "status", label: "Status" },
  { path: "caseNumber", label: "Case Number" },
  { path: "jurisdiction", label: "Jurisdiction" },
  { path: "court", label: "Court" },
  { path: "filingDate", label: "Filing Date" },
];

const deleteFileQuietly = (filePath) => {
  if (!filePath) {
    return;
  }

  fs.promises
    .unlink(filePath)
    .catch(() => {});
};

const getCases = async (req, res) => {
  try {
    const { matterId, status } = req.query;
    const filter = {};

    if (matterId) {
      filter.matter = matterId;
    }

    if (status) {
      filter.status = status;
    }

    const cases = await CaseFile.find(filter)
      .populate("leadCounsel", "name email")
      .populate({
        path: "matter",
        select: "title clientName matterNumber status client",
        populate: { path: "client", select: "name email" },
      })
      .sort({ createdAt: -1 });

    res.json({ cases });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const getCaseById = async (req, res) => {
  try {
    const caseFile = await CaseFile.findById(req.params.id)
      .populate("leadCounsel", "name email")
      .populate({
        path: "matter",
        select: "title clientName matterNumber status client",
        populate: { path: "client", select: "name email" },
      });

    if (!caseFile) {
      return res.status(404).json({ message: "Case file not found" });
    }

    const [documents, tasks] = await Promise.all([
      Document.find({ caseFile: caseFile._id })
        .populate("uploadedBy", "name email")
        .sort({ createdAt: -1 }),
      Task.find({ caseFile: caseFile._id })
        .select("title status dueDate matter")
        .populate({
          path: "matter",
          select: "title clientName client",
          populate: { path: "client", select: "name email" },
        })
        .lean(),
    ]);

    res.json({ caseFile, documents, tasks });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const createCase = async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.title = normalizeString(payload.title);
    payload.matter = normalizeObjectId(payload.matter);

    if (!payload.matter) {
      throw buildHttpError("Matter reference is required.");
    }

    if (!payload.title) {
      throw buildHttpError("Case title is required.");
    }

    const matter = await Matter.findById(payload.matter).select("_id");
    if (!matter) {
      throw buildHttpError("Referenced matter could not be found.");
    }

    const caseFile = await CaseFile.create(payload);
    const populatedCase = await CaseFile.findById(caseFile._id)
      .populate("leadCounsel", "name email")
      .populate({
        path: "matter",
        select: "title clientName matterNumber status client",
        populate: { path: "client", select: "name email" },
      });

    await logEntityActivity({
      entityType: "case",
      action: "created",
      entityId: caseFile._id,
      entityName: caseFile.title,
      actor: req.user,
      details: buildFieldChanges({}, caseFile.toObject(), CASE_ACTIVITY_FIELDS),
    });

    res.status(201).json({
      message: "Case file created successfully",
      caseFile: populatedCase,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const updateCase = async (req, res) => {
  try {
    const caseFile = await CaseFile.findById(req.params.id);

    if (!caseFile) {
      return res.status(404).json({ message: "Case file not found" });
    }

    const originalCase = caseFile.toObject();    
    const updates = { ...req.body };

    if (updates.title !== undefined) {
      updates.title = normalizeString(updates.title);
      if (!updates.title) {
        throw buildHttpError("Case title is required.");
      }
    }

    if (updates.matter !== undefined) {
      updates.matter = normalizeObjectId(updates.matter);
      const currentMatterId = caseFile.matter?.toString();

      if (!updates.matter) {
        throw buildHttpError("Matter reference is required.");
      }

      if (updates.matter !== currentMatterId) {
        const matter = await Matter.findById(updates.matter).select("_id");
        if (!matter) {
          throw buildHttpError("Referenced matter could not be found.");
        }
      }
    }

    Object.assign(caseFile, updates);
    await caseFile.save();
    const updatedCaseObject = caseFile.toObject();
    const caseChanges = buildFieldChanges(
      originalCase,
      updatedCaseObject,
      CASE_ACTIVITY_FIELDS
    );    

    const populatedCase = await CaseFile.findById(caseFile._id)
      .populate("leadCounsel", "name email")
      .populate({
        path: "matter",
        select: "title clientName matterNumber status client",
        populate: { path: "client", select: "name email" },
      });

    await logEntityActivity({
      entityType: "case",
      action: "updated",
      entityId: caseFile._id,
      entityName: caseFile.title,
      actor: req.user,
      details: caseChanges,
    });

    res.json({
      message: "Case file updated successfully",
      caseFile: populatedCase,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const deleteCase = async (req, res) => {
  try {
    const caseFile = await CaseFile.findById(req.params.id);

    if (!caseFile) {
      return res.status(404).json({ message: "Case file not found" });
    }

    const deletedCaseSnapshot = caseFile.toObject();    
    const documents = await Document.find({ caseFile: caseFile._id }).select("_id");
    const documentIds = documents.map((document) => document._id);

    await Promise.all([
      Task.updateMany(
        { caseFile: caseFile._id },
        { $unset: { caseFile: "" } }
      ),
      Task.updateMany(
        { relatedDocuments: { $in: documentIds } },
        { $pull: { relatedDocuments: { $in: documentIds } } }
      ),
      Document.updateMany(
        { caseFile: caseFile._id },
        { $unset: { caseFile: "" } }
      ),
    ]);

    await caseFile.deleteOne();

    await logEntityActivity({
      entityType: "case",
      action: "deleted",
      entityId: caseFile._id,
      entityName: caseFile.title,
      actor: req.user,
      details: buildFieldChanges(
        deletedCaseSnapshot,
        {},
        CASE_ACTIVITY_FIELDS
      ),
    });

    res.json({ message: "Case file deleted successfully" });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const uploadCaseDocument = async (req, res) => {
  const { id: caseId } = req.params;
  const uploadedFile = req.file;
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const documentType =
    typeof req.body?.documentType === "string"
      ? req.body.documentType.trim()
      : "";
  const description =
    typeof req.body?.description === "string"
      ? req.body.description.trim()
      : "";

  if (!uploadedFile) {
    return res.status(400).json({ message: "A document file is required." });
  }

  if (!title) {
    deleteFileQuietly(uploadedFile.path);
    return res.status(400).json({ message: "Document title is required." });
  }

  try {
    const caseFile = await CaseFile.findById(caseId)
      .populate({
        path: "matter",
        select: "client leadAttorney teamMembers",
      })
      .populate("leadCounsel", "_id");

    if (!caseFile) {
      deleteFileQuietly(uploadedFile.path);
      return res.status(404).json({ message: "Case file not found" });
    }

    const requesterId = req.user?._id ? req.user._id.toString() : "";
    const isPrivilegedUser = hasPrivilegedAccess(req.user?.role);
    const leadCounselId = normalizeObjectId(caseFile.leadCounsel);
    const matterLeadAttorneyId = normalizeObjectId(caseFile.matter?.leadAttorney);
    const matterClientId = normalizeObjectId(caseFile.matter?.client);
    const matterTeamMemberIds = Array.isArray(caseFile.matter?.teamMembers)
      ? caseFile.matter.teamMembers
          .map((member) => normalizeObjectId(member))
          .filter((memberId) => memberId)
      : [];

    const isAuthorized =
      isPrivilegedUser ||
      (requesterId && leadCounselId && requesterId === leadCounselId) ||
      (requesterId && matterLeadAttorneyId && requesterId === matterLeadAttorneyId) ||
      (requesterId && matterClientId && requesterId === matterClientId) ||
      (requesterId && matterTeamMemberIds.includes(requesterId));

    if (!isAuthorized) {
      deleteFileQuietly(uploadedFile.path);
      return res.status(403).json({
        message: "You do not have permission to upload documents for this case file.",
      });
    }

    const matterId = normalizeObjectId(caseFile.matter);

    if (!matterId) {
      deleteFileQuietly(uploadedFile.path);
      return res.status(400).json({
        message: "Case file must be linked to a matter before uploading documents.",
      });
    }

    const documentPayload = {
      title,
      documentType,
      description,
      matter: matterId,
      caseFile: caseFile._id,
      uploadedBy: req.user._id,
      storagePath: uploadedFile.path,
      fileUrl: `/uploads/documents/${path.basename(uploadedFile.path)}`,
    };

    const document = await Document.create(documentPayload);
    const sanitizedDocument = await Document.findById(document._id).select(
      "title documentType version fileUrl _id"
    );

    res.status(201).json({
      message: "Document uploaded successfully.",
      document: sanitizedDocument,
    });
  } catch (error) {
    deleteFileQuietly(uploadedFile?.path);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      message: error.statusCode ? error.message : "Server error",
      error: error.statusCode ? undefined : error.message,
    });
  }
};

module.exports = {
  getCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  uploadCaseDocument,  
};