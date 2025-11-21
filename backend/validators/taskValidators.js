const { createHttpError } = require("../utils/httpError");

const TASK_PRIORITIES = new Set(["High", "Medium", "Low"]);
const TASK_STATUSES = new Set(["Pending", "In Progress", "Completed"]);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeRequiredId = (value, fieldName) => {
  if (typeof value === "object" && value !== null) {
    if (value._id) {
      value = value._id;
    } else if (value.id) {
      value = value.id;
    }
  }

  if (typeof value === "number") {
    value = value.toString();
  }

  if (!isNonEmptyString(value)) {
    throw createHttpError(`${fieldName} must be a valid identifier`, 400);
  }

  return value.trim();
};

const normalizeOptionalId = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return normalizeRequiredId(value, fieldName);
};

const normalizeAssigneeIds = (assignedTo) => {
  if (!Array.isArray(assignedTo)) {
    throw createHttpError("assignedTo must be an array", 400);
  }

  if (!assignedTo.length) {
    throw createHttpError("Assign the task to at least one member.", 400);
  }

  const seen = new Set();
  const normalized = [];

  assignedTo.forEach((value, index) => {
    const id = normalizeRequiredId(value, `assignedTo[${index}]`);
    if (!seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  });

  return normalized;
};

const normalizeChecklist = (
  checklist,
  { requireText = true, allowPartialUpdate = false } = {}
) => {
  if (checklist === undefined) {
    return undefined;
  }

  if (!Array.isArray(checklist)) {
    throw createHttpError("todoChecklist must be an array", 400);
  }

  return checklist.map((item, index) => {
    if (typeof item === "string") {
      const text = item.trim();
      if (!text) {
        throw createHttpError(
          `todoChecklist[${index}] must include non-empty text`,
          400
        );
      }
      return text;
    }

    if (typeof item !== "object" || item === null) {
      throw createHttpError(
        `todoChecklist[${index}] must be a string or an object`,
        400
      );
    }

    const normalizedItem = {};

    const hasId =
      item._id !== undefined && item._id !== null && item._id !== "";

    if (hasId) {
      normalizedItem._id = normalizeRequiredId(
        item._id,
        `todoChecklist[${index}]._id`
      );
    } else if (allowPartialUpdate) {
      throw createHttpError(
        `todoChecklist[${index}]._id is required when updating the checklist`,
        400
      );      
    }

    if (item.assignedTo !== undefined && item.assignedTo !== null) {
      normalizedItem.assignedTo = normalizeRequiredId(
        item.assignedTo,
        `todoChecklist[${index}].assignedTo`
      );
    }

    if (item.completed !== undefined) {
      normalizedItem.completed = Boolean(item.completed);
    }

    if (item.text !== undefined) {
      const text = isNonEmptyString(item.text) ? item.text.trim() : "";

      if (!text && requireText && !allowPartialUpdate) {
        throw createHttpError(
          `todoChecklist[${index}].text must be provided`,
          400
        );
      }

      if (text) {
        normalizedItem.text = text;
      }
    } else if (requireText && !allowPartialUpdate) {
      throw createHttpError(
        `todoChecklist[${index}].text must be provided`,
        400
      );
    }

    if (!Object.keys(normalizedItem).length) {
      throw createHttpError(
        `todoChecklist[${index}] must include at least one updatable field`,
        400
      );
    }

    return normalizedItem;
  });
};

const normalizeDueDate = (value, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createHttpError("dueDate is required", 400);
    }
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError("dueDate must be a valid date string", 400);
  }

  return value;
};

const validatePriority = (value, { required = false } = {}) => {
  if (!isNonEmptyString(value)) {
    if (required) {
      throw createHttpError("priority is required", 400);
    }
    return undefined;
  }

  const normalized = value.trim();
  if (!TASK_PRIORITIES.has(normalized)) {
    throw createHttpError("priority must be High, Medium or Low", 400);
  }

  return normalized;
};

const validateStatus = (value, { required = false } = {}) => {
  if (!isNonEmptyString(value)) {
    if (required) {
      throw createHttpError("status is required", 400);
    }
    return undefined;
  }

  const normalized = value.trim();
  if (!TASK_STATUSES.has(normalized)) {
    throw createHttpError(
      "status must be one of Pending, In Progress or Completed",
      400
    );
  }

  return normalized;
};

const normalizeDocumentIds = (values) => {
  if (values === undefined) {
    return undefined;
  }

  if (!Array.isArray(values)) {
    throw createHttpError("relatedDocuments must be an array", 400);
  }

  const seen = new Set();
  const normalized = [];

  values.forEach((value, index) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    const id = normalizeRequiredId(value, `relatedDocuments[${index}]`);
    if (!seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  });

  return normalized;
};

const normalizeAttachments = (attachments) => {
  if (attachments === undefined) {
    return undefined;
  }

  if (!Array.isArray(attachments)) {
    throw createHttpError("attachments must be an array", 400);
  }

  return attachments;
};

const sanitizeDescription = (value, { required = false } = {}) => {
  if (!isNonEmptyString(value)) {
    if (required) {
      throw createHttpError("description is required", 400);
    }
    return "";
  }

  return value.trim();
};

const validateCreateTaskPayload = (payload) => {
  const sanitized = {};

  if (!isNonEmptyString(payload.title)) {
    throw createHttpError("title is required", 400);
  }

  sanitized.title = payload.title.trim();
  sanitized.description = sanitizeDescription(payload.description, {
    required: true,
  });
  sanitized.priority = validatePriority(payload.priority, { required: true });
  const dueDate = normalizeDueDate(payload.dueDate, { required: true });
  if (dueDate !== undefined) {
    sanitized.dueDate = dueDate;
  }

  sanitized.assignedTo = normalizeAssigneeIds(payload.assignedTo);
  const checklist = normalizeChecklist(payload.todoChecklist);
  if (checklist !== undefined) {
    sanitized.todoChecklist = checklist;
  }

  const attachments = normalizeAttachments(payload.attachments);
  if (attachments !== undefined) {
    sanitized.attachments = attachments;
  }

  const matter = normalizeOptionalId(payload.matter, "matter");
  if (matter !== undefined) {
    sanitized.matter = matter;
  }

  const caseFile = normalizeOptionalId(payload.caseFile, "caseFile");
  if (caseFile !== undefined) {
    sanitized.caseFile = caseFile;
  }

  const relatedDocuments = normalizeDocumentIds(payload.relatedDocuments);
  if (relatedDocuments && relatedDocuments.length) {
    sanitized.relatedDocuments = relatedDocuments;
  }

  return sanitized;
};

const validateUpdateTaskPayload = (payload) => {
  const sanitized = {};

  if (hasOwn(payload, "title")) {
    if (!isNonEmptyString(payload.title)) {
      throw createHttpError("title cannot be empty", 400);
    }
    sanitized.title = payload.title.trim();
  }

  if (hasOwn(payload, "description")) {
    sanitized.description = sanitizeDescription(payload.description, {
      required: true,
    });
  }

  if (hasOwn(payload, "priority")) {
    sanitized.priority = validatePriority(payload.priority, { required: true });
  }

  if (hasOwn(payload, "dueDate")) {
    const dueDate = normalizeDueDate(payload.dueDate, { required: true });
    if (dueDate !== undefined) {
      sanitized.dueDate = dueDate;
    }
  }

  if (hasOwn(payload, "assignedTo")) {
    sanitized.assignedTo = normalizeAssigneeIds(payload.assignedTo);
  }

  if (hasOwn(payload, "todoChecklist")) {
    sanitized.todoChecklist = normalizeChecklist(payload.todoChecklist);
  }

  if (hasOwn(payload, "attachments")) {
    sanitized.attachments = normalizeAttachments(payload.attachments);
  }

  if (hasOwn(payload, "matter")) {
    sanitized.matter = normalizeOptionalId(payload.matter, "matter");
  }

  if (hasOwn(payload, "caseFile")) {
    sanitized.caseFile = normalizeOptionalId(payload.caseFile, "caseFile");
  }

  if (hasOwn(payload, "relatedDocuments")) {
    const relatedDocuments = normalizeDocumentIds(payload.relatedDocuments);
    sanitized.relatedDocuments = relatedDocuments || [];
  }

  if (hasOwn(payload, "status")) {
    sanitized.status = validateStatus(payload.status, { required: true });
  }

  if (!Object.keys(sanitized).length) {
    throw createHttpError("Provide at least one field to update", 400);
  }

  return sanitized;
};

const validateStatusPayload = (payload) => {
  return {
    status: validateStatus(payload.status, { required: true }),
  };
};

const validateChecklistPayload = (payload) => {
  if (!hasOwn(payload, "todoChecklist")) {
    throw createHttpError("todoChecklist is required", 400);
  }

  return {
    todoChecklist: normalizeChecklist(payload.todoChecklist, {
      requireText: false,
      allowPartialUpdate: true,
    }),
  };
};

const validateTaskQuery = (query) => {
  const sanitized = {};

  if (hasOwn(query, "status")) {
    const status = validateStatus(query.status, { required: false });
    if (status) {
      sanitized.status = status;
    }
  }

  if (hasOwn(query, "scope")) {
    const scopeValue = typeof query.scope === "string" ? query.scope.trim() : "";
    if (!scopeValue) {
      // ignore empty scope values
    } else if (scopeValue === "my" || scopeValue === "all") {
      sanitized.scope = scopeValue;
    } else {
      throw createHttpError("scope must be either my or all", 400);
    }
  }

  if (hasOwn(query, "matter")) {
    const matter = normalizeOptionalId(query.matter, "matter");
    if (matter !== undefined && matter !== null) {
      sanitized.matter = matter;
    }
  }

  if (hasOwn(query, "caseFile")) {
    const caseFile = normalizeOptionalId(query.caseFile, "caseFile");
    if (caseFile !== undefined && caseFile !== null) {
      sanitized.caseFile = caseFile;
    }
  }

  return sanitized;
};

module.exports = {
  TASK_PRIORITIES,
  TASK_STATUSES,
  validateCreateTaskPayload,
  validateUpdateTaskPayload,
  validateStatusPayload,
  validateChecklistPayload,
  validateTaskQuery,
};