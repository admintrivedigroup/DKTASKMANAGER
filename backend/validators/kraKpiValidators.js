const mongoose = require("mongoose");
const { createHttpError } = require("../utils/httpError");

const validateKraKpiMatrixQuery = (query) => {
  const employeeId =
    typeof query.employeeId === "string" ? query.employeeId.trim() : "";
  const fyStartYearRaw =
    typeof query.fyStartYear === "string"
      ? query.fyStartYear.trim()
      : query.fyStartYear;

  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    throw createHttpError("employeeId must be a valid identifier", 400);
  }

  const fyStartYear = Number(fyStartYearRaw);
  if (!Number.isInteger(fyStartYear) || fyStartYear < 2000 || fyStartYear > 3000) {
    throw createHttpError("fyStartYear must be a valid year", 400);
  }

  return {
    employeeId,
    fyStartYear,
  };
};

module.exports = {
  validateKraKpiMatrixQuery,
};
