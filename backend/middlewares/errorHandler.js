const { createHttpError, HttpError } = require("../utils/httpError");

const notFoundHandler = (req, res, next) => {
  next(createHttpError(`Cannot ${req.method} ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = "Server error";
  let details;

  if (err instanceof HttpError || err.statusCode) {
    statusCode = err.statusCode || statusCode;
    message = err.message || message;
    details = err.details;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
  }

  const response = { message };

  if (details !== undefined) {
    response.details = details;
  }

  if (statusCode === 500 && process.env.NODE_ENV !== "production") {
    response.error = err.message;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};