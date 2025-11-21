class HttpError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

const createHttpError = (message, statusCode = 400, details) => {
  return new HttpError(message, statusCode, details);
};

module.exports = {
  HttpError,
  createHttpError,
};