const mongoose = require("mongoose");
const { createHttpError } = require("../utils/httpError");

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeObjectId = (value, fieldName, { required = false } = {}) => {
  if (value === undefined) {
    if (required) {
      throw createHttpError(`${fieldName} is required`, 400);
    }

    return undefined;
  }

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

  const normalized = value.trim();
  if (!mongoose.Types.ObjectId.isValid(normalized)) {
    throw createHttpError(`${fieldName} must be a valid identifier`, 400);
  }

  return normalized;
};

const normalizeRequiredString = (value, fieldName) => {
  if (!isNonEmptyString(value)) {
    throw createHttpError(`${fieldName} is required`, 400);
  }

  return value.trim();
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw createHttpError("Text fields must be strings", 400);
  }

  return value.trim();
};

const normalizeNumber = (
  value,
  fieldName,
  { required = false, min, max } = {}
) => {
  if (value === undefined) {
    if (required) {
      throw createHttpError(`${fieldName} is required`, 400);
    }

    return undefined;
  }

  if (value === null || value === "") {
    throw createHttpError(`${fieldName} must be numeric`, 400);
  }

  const normalized = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(normalized)) {
    throw createHttpError(`${fieldName} must be numeric`, 400);
  }

  if (min !== undefined && normalized < min) {
    throw createHttpError(`${fieldName} cannot be less than ${min}`, 400);
  }

  if (max !== undefined && normalized > max) {
    throw createHttpError(`${fieldName} cannot be greater than ${max}`, 400);
  }

  return normalized;
};

const normalizeBoolean = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw createHttpError(`${fieldName} must be a boolean`, 400);
};

const validateEmployeeKraColumnQuery = (query) => {
  return {
    employeeId: normalizeObjectId(query.employeeId, "employeeId", {
      required: true,
    }),
  };
};

const validateCreateEmployeeKraColumnPayload = (payload) => {
  return {
    employeeId: normalizeObjectId(payload.employeeId, "employeeId", {
      required: true,
    }),
    label: normalizeRequiredString(payload.label, "label"),
    weightage: normalizeNumber(payload.weightage, "weightage", {
      required: true,
      min: 0,
    }),
    targetText: normalizeOptionalString(payload.targetText) ?? "",
    sourceText: normalizeOptionalString(payload.sourceText) ?? "",
    frequencyText: normalizeOptionalString(payload.frequencyText) ?? "",
    requiresApproval: normalizeBoolean(payload.requiresApproval, "requiresApproval") ?? false,
    order: normalizeNumber(payload.order, "order", {
      required: true,
      min: 1,
    }),
    isActive: normalizeBoolean(payload.isActive, "isActive") ?? true,
  };
};

const validateUpdateEmployeeKraColumnPayload = (payload) => {
  const sanitized = {};

  if (hasOwn(payload, "employeeId")) {
    sanitized.employeeId = normalizeObjectId(payload.employeeId, "employeeId", {
      required: true,
    });
  }

  if (hasOwn(payload, "label")) {
    sanitized.label = normalizeRequiredString(payload.label, "label");
  }

  if (hasOwn(payload, "weightage")) {
    sanitized.weightage = normalizeNumber(payload.weightage, "weightage", {
      required: true,
      min: 0,
    });
  }

  if (hasOwn(payload, "targetText")) {
    sanitized.targetText = normalizeOptionalString(payload.targetText) ?? "";
  }

  if (hasOwn(payload, "sourceText")) {
    sanitized.sourceText = normalizeOptionalString(payload.sourceText) ?? "";
  }

  if (hasOwn(payload, "frequencyText")) {
    sanitized.frequencyText = normalizeOptionalString(payload.frequencyText) ?? "";
  }

  if (hasOwn(payload, "requiresApproval")) {
    sanitized.requiresApproval = normalizeBoolean(
      payload.requiresApproval,
      "requiresApproval"
    );
  }

  if (hasOwn(payload, "order")) {
    sanitized.order = normalizeNumber(payload.order, "order", {
      required: true,
      min: 1,
    });
  }

  if (hasOwn(payload, "isActive")) {
    sanitized.isActive = normalizeBoolean(payload.isActive, "isActive");
  }

  if (!Object.keys(sanitized).length) {
    throw createHttpError("Provide at least one field to update", 400);
  }

  return sanitized;
};

module.exports = {
  validateEmployeeKraColumnQuery,
  validateCreateEmployeeKraColumnPayload,
  validateUpdateEmployeeKraColumnPayload,
};
