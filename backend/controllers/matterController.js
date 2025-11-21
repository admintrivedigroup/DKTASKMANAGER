const mongoose = require("mongoose");
const Matter = require("../models/Matter");
const CaseFile = require("../models/CaseFile");
const Document = require("../models/Document");
const Task = require("../models/Task");
const User = require("../models/User");
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

const normalizeOptionalString = (value) => {
  const normalizedValue = normalizeString(value);
  return normalizedValue || undefined;
};

const MATTER_ACTIVITY_FIELDS = [
  { path: "title", label: "Title" },
  { path: "status", label: "Status" },
  { path: "matterNumber", label: "Matter Number" },
  { path: "practiceArea", label: "Practice Area" },
  { path: "clientName", label: "Client Name" },
  { path: "openedDate", label: "Opened Date" },
];

const handleErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.statusCode ? error.message : "Server error",
    error: error.statusCode ? undefined : error.message,
  });
};

const buildHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const resolveClient = async (clientIdentifier, { required = true } = {}) => {
  const normalizedClientId = normalizeObjectId(clientIdentifier);

  if (!normalizedClientId) {
    if (required) {
      throw buildHttpError("Client selection is required.");
    }

    return { clientId: null, clientName: null, clientDocument: null };
  }

  const clientDocument = await User.findOne({
    _id: normalizedClientId,
    role: "client",
  })
    .select("name email")
    .lean();

  if (!clientDocument) {
    throw buildHttpError("Selected client account could not be found.");
  }

  return {
    clientId: clientDocument._id,
    clientName: clientDocument.name,
    clientDocument,
  };
};

const getMatters = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && typeof status === "string") {
      filter.status = status;
    }

    if (search && typeof search === "string") {
      const normalizedSearch = search.trim();
      if (normalizedSearch) {
        filter.$or = [
          { title: { $regex: normalizedSearch, $options: "i" } },
          { clientName: { $regex: normalizedSearch, $options: "i" } },
          { matterNumber: { $regex: normalizedSearch, $options: "i" } },
        ];
      }
    }

    const matters = await Matter.find(filter)
      .populate("leadAttorney", "name email")
      .populate("teamMembers", "name email")
      .populate("client", "name email")      
      .sort({ createdAt: -1 })
      .lean();

    const matterIds = matters
      .map((matter) => matter?._id)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id.toString()));

    let caseCounts = [];
    let documentCounts = [];
    let openTaskCounts = [];
    let closedTaskCounts = [];

    if (matterIds.length) {
      [caseCounts, documentCounts, openTaskCounts, closedTaskCounts] = await Promise.all([
        CaseFile.aggregate([
          { $match: { matter: { $in: matterIds } } },
          { $group: { _id: "$matter", count: { $sum: 1 } } },
        ]),
        Document.aggregate([
          { $match: { matter: { $in: matterIds } } },
          { $group: { _id: "$matter", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { matter: { $in: matterIds }, status: { $ne: "Completed" } } },
          { $group: { _id: "$matter", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { matter: { $in: matterIds }, status: "Completed" } },
          { $group: { _id: "$matter", count: { $sum: 1 } } },
        ]),
      ]);
    }

    const countMap = (entries = []) => {
      const map = new Map();
      entries.forEach((entry) => {
        map.set(entry._id?.toString(), entry.count || 0);
      });
      return map;
    };

    const casesCountMap = countMap(caseCounts);
    const documentsCountMap = countMap(documentCounts);
    const openTasksCountMap = countMap(openTaskCounts);
    const closedTasksCountMap = countMap(closedTaskCounts);

    const response = matters.map((matter) => {
      const matterId = matter?._id ? matter._id.toString() : undefined;
      return {
        ...matter,
        stats: {
          caseCount: (matterId && casesCountMap.get(matterId)) || 0,
          documentCount: (matterId && documentsCountMap.get(matterId)) || 0,
          openTaskCount: (matterId && openTasksCountMap.get(matterId)) || 0,
          closedTaskCount: (matterId && closedTasksCountMap.get(matterId)) || 0,
        },
      };
    });

    res.json({ matters: response });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const getMatterById = async (req, res) => {
  try {
    const matter = await Matter.findById(req.params.id)
      .populate("leadAttorney", "name email role")
      .populate("teamMembers", "name email role")
      .populate("client", "name email");

    if (!matter) {
      return res.status(404).json({ message: "Matter not found" });
    }

    const [caseFiles, documents, tasks] = await Promise.all([
      CaseFile.find({ matter: matter._id })
        .populate("leadCounsel", "name email")
        .sort({ createdAt: -1 })
        .lean(),
      Document.find({ matter: matter._id })
        .populate("uploadedBy", "name email")
        .sort({ createdAt: -1 })
        .lean(),
      Task.find({ matter: matter._id })
        .select("title status dueDate caseFile")
        .populate("caseFile", "title caseNumber")
        .lean(),
    ]);

    res.json({
      matter,
      caseFiles,
      documents,
      tasks,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const createMatter = async (req, res) => {
  try {
    const payload = { ...req.body };

    payload.title = normalizeString(payload.title);

    if (!payload.title) {
      throw buildHttpError("Matter title is required.");
    }

    payload.matterNumber = normalizeOptionalString(payload.matterNumber);
    payload.practiceArea = normalizeOptionalString(payload.practiceArea);
    payload.description = normalizeOptionalString(payload.description);
    payload.notes = normalizeOptionalString(payload.notes);

    if (payload.openedDate === "") {
      payload.openedDate = undefined;
    }

    const clientIdentifier = Object.prototype.hasOwnProperty.call(payload, "client")
      ? payload.client
      : payload.clientId;

    const { clientId, clientName } = await resolveClient(clientIdentifier);
    payload.client = clientId;
    payload.clientName = clientName;
    delete payload.clientId;

    if (payload.matterNumber) {
      const existingMatter = await Matter.findOne({
        matterNumber: payload.matterNumber,
      }).select("_id");

      if (existingMatter) {
        throw buildHttpError("Matter number already exists.");
      }
    }

    const matter = await Matter.create(payload);
    const populatedMatter = await Matter.findById(matter._id)
      .populate("leadAttorney", "name email")
      .populate("teamMembers", "name email")
      .populate("client", "name email");

    await logEntityActivity({
      entityType: "matter",
      action: "created",
      entityId: matter._id,
      entityName: matter.title,
      actor: req.user,
      details: buildFieldChanges({}, matter.toObject(), MATTER_ACTIVITY_FIELDS),
    });

    res.status(201).json({
      message: "Matter created successfully",
      matter: populatedMatter,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const updateMatter = async (req, res) => {
  try {
    const matter = await Matter.findById(req.params.id);

    if (!matter) {
      return res.status(404).json({ message: "Matter not found" });
    }

    const originalMatter = matter.toObject();    
    const updates = { ...req.body };

    if (updates.title !== undefined) {
      updates.title = normalizeString(updates.title);
      if (!updates.title) {
        throw buildHttpError("Matter title is required.");
      }
    }

    const optionalStringFields = [
      "matterNumber",
      "practiceArea",
      "description",
      "notes",
      "clientName",
    ];

    optionalStringFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        updates[field] = normalizeOptionalString(updates[field]);
      }
    });

    if (Object.prototype.hasOwnProperty.call(updates, "openedDate") && updates.openedDate === "") {
      updates.openedDate = undefined;
    }

    const hasClientUpdate =
      Object.prototype.hasOwnProperty.call(updates, "client") ||
      Object.prototype.hasOwnProperty.call(updates, "clientId");

    if (hasClientUpdate) {
      const clientIdentifier = Object.prototype.hasOwnProperty.call(
        updates,
        "client"
      )
        ? updates.client
        : updates.clientId;

      const { clientId, clientName } = await resolveClient(clientIdentifier);
      updates.client = clientId;
      updates.clientName = clientName;
    } else if (!matter.client) {
      if (updates.clientName !== undefined) {
        updates.clientName = normalizeString(updates.clientName);

        if (!updates.clientName) {
          throw buildHttpError("Client name is required.");
        }
      }
    } else {
      delete updates.clientName;      
    }

    delete updates.clientId;

    if (
      updates.matterNumber &&
      updates.matterNumber !== matter.matterNumber
    ) {
      const existingMatter = await Matter.findOne({
        matterNumber: updates.matterNumber,
        _id: { $ne: matter._id },
      }).select("_id");

      if (existingMatter) {
        throw buildHttpError("Matter number already exists.");
      }
    }

    Object.assign(matter, updates);
    await matter.save();
    const updatedMatterObject = matter.toObject();
    const matterChanges = buildFieldChanges(
      originalMatter,
      updatedMatterObject,
      MATTER_ACTIVITY_FIELDS
    );    

    const populatedMatter = await Matter.findById(matter._id)
      .populate("leadAttorney", "name email")
      .populate("teamMembers", "name email")
      .populate("client", "name email");

    await logEntityActivity({
      entityType: "matter",
      action: "updated",
      entityId: matter._id,
      entityName: matter.title,
      actor: req.user,
      details: matterChanges,
    });

    res.json({
      message: "Matter updated successfully",
      matter: populatedMatter,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const deleteMatter = async (req, res) => {
  try {
    const matter = await Matter.findById(req.params.id);

    if (!matter) {
      return res.status(404).json({ message: "Matter not found" });
    }

    const deletedMatterSnapshot = matter.toObject();    
    const [documents] = await Promise.all([
      Document.find({ matter: matter._id }).select("_id"),
    ]);

    const documentIds = documents.map((document) => document._id);

    await Promise.all([
      Task.updateMany(
        { matter: matter._id },
        { $unset: { matter: "", caseFile: "" } }
      ),
      Task.updateMany(
        { relatedDocuments: { $in: documentIds } },
        { $pull: { relatedDocuments: { $in: documentIds } } }
      ),
      CaseFile.deleteMany({ matter: matter._id }),
      Document.deleteMany({ matter: matter._id }),
    ]);

    await matter.deleteOne();

    await logEntityActivity({
      entityType: "matter",
      action: "deleted",
      entityId: matter._id,
      entityName: matter.title,
      actor: req.user,
      details: buildFieldChanges(
        deletedMatterSnapshot,
        {},
        MATTER_ACTIVITY_FIELDS
      ),
    });

    res.json({ message: "Matter deleted successfully" });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const getMatterClients = async (req, res) => {
  try {
    const clients = await User.find({ role: "client" })
      .select("name email")
      .sort({ name: 1, email: 1 })
      .lean();

    res.json({ clients });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

module.exports = {
  getMatters,
  getMatterById,
  createMatter,
  updateMatter,
  deleteMatter,
  getMatterClients,
};