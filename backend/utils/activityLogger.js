const Notification = require("../models/Notification");

const formatPrimitive = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const formattedItems = value
      .map((item) => formatPrimitive(item))
      .filter((item) => item !== "");
    return formattedItems.join(", ");
  }

  if (typeof value === "object") {
    if (value.name) {
      return value.name;
    }

    if (value.title) {
      return value.title;
    }

    if (value.email) {
      return value.email;
    }

    if (value._id) {
      return value._id.toString();
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  return String(value);
};

const resolveValueForComparison = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValueForComparison(item));
  }

  if (typeof value === "object") {
    if (value._id && Object.keys(value).length === 1) {
      return value._id.toString();
    }

    const normalized = {};
    Object.keys(value).forEach((key) => {
      normalized[key] = resolveValueForComparison(value[key]);
    });
    return normalized;
  }

  return value;
};

const areValuesEqual = (a, b) => {
  const normalizedA = resolveValueForComparison(a);
  const normalizedB = resolveValueForComparison(b);

  try {
    return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
  } catch (error) {
    return normalizedA === normalizedB;
  }
};

const getValueByPath = (source, path) => {
  if (!source || !path) {
    return undefined;
  }

  const segments = path.split(".");
  return segments.reduce((value, segment) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value !== "object") {
      return undefined;
    }

    return value[segment];
  }, source);
};

const buildFieldChanges = (original = {}, updated = {}, fields = []) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return [];
  }

  const changes = [];

  fields.forEach((fieldDefinition) => {
    const { path, label, formatter } = fieldDefinition || {};
    if (!path) {
      return;
    }

    const previousValue = getValueByPath(original, path);
    const nextValue = getValueByPath(updated, path);

    if (areValuesEqual(previousValue, nextValue)) {
      return;
    }

    const before = formatter
      ? formatter(previousValue, { original, updated })
      : formatPrimitive(previousValue);
    const after = formatter
      ? formatter(nextValue, { original, updated })
      : formatPrimitive(nextValue);

    changes.push({
      field: path,
      label: label || path,
      before,
      after,
    });
  });

  return changes;
};

const normalizeActor = (actor = {}) => {
  const normalized = {};

  if (actor._id) {
    normalized._id = actor._id;
  }

  if (actor.id && !normalized._id) {
    normalized._id = actor.id;
  }

  if (actor.name) {
    normalized.name = actor.name;
  }

  if (actor.email) {
    normalized.email = actor.email;
  }

  if (actor.role) {
    normalized.role = actor.role;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const logEntityActivity = async ({
  entityType,
  action,
  entityId,
  entityName,
  actor,
  details,
  meta,
}) => {
  if (!entityType || !action) {
    return null;
  }

  try {
    const payload = {
      entityType,
      action,
      entityId,
      entityName,
      actor: normalizeActor(actor),
      details: Array.isArray(details) && details.length ? details : undefined,
      meta,
    };

    return await Notification.create(payload);
  } catch (error) {
    console.error("Failed to record activity notification", error);
    return null;
  }
};

module.exports = {
  buildFieldChanges,
  logEntityActivity,
  formatPrimitive,
};