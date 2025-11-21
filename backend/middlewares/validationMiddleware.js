const { createHttpError } = require("../utils/httpError");

const ensureObject = (value, type) => {
  if (value === undefined || value === null) {
    throw createHttpError(`${type} must be provided`, 400);
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw createHttpError(`${type} must be an object`, 400);
  }
};

const validateBody = (validator) => (req, res, next) => {
  try {
    if (!validator) {
      return next();
    }

    ensureObject(req.body ?? {}, "Request body");
    req.body = validator(req.body, req) ?? req.body;
    next();
  } catch (error) {
    next(error);
  }
};

const validateQuery = (validator) => (req, res, next) => {
  try {
    if (!validator) {
      return next();
    }

    req.query = validator(req.query ?? {}, req) ?? req.query;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateBody,
  validateQuery,
};