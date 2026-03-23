const mongoose = require("mongoose");
const { createHttpError } = require("../utils/httpError");
const { MONTH_KEYS } = require("../models/EmployeeMonthlyManualKraPoint");

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

const validateKraKpiManualPointsQuery = (query) => {
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

const validateKraKpiManualPointsPayload = (payload) => {
  const employeeId =
    typeof payload.employeeId === "string" ? payload.employeeId.trim() : "";
  const kraColumnId =
    typeof payload.kraColumnId === "string" ? payload.kraColumnId.trim() : "";
  const monthKey =
    typeof payload.monthKey === "string" ? payload.monthKey.trim() : "";
  const fyStartYear = Number(payload.fyStartYear);
  const manualPoints = Number(payload.manualPoints);

  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    throw createHttpError("employeeId must be a valid identifier", 400);
  }

  if (!kraColumnId || !mongoose.Types.ObjectId.isValid(kraColumnId)) {
    throw createHttpError("kraColumnId must be a valid identifier", 400);
  }

  if (!Number.isInteger(fyStartYear) || fyStartYear < 2000 || fyStartYear > 3000) {
    throw createHttpError("fyStartYear must be a valid year", 400);
  }

  if (!MONTH_KEYS.includes(monthKey)) {
    throw createHttpError(`monthKey must be one of: ${MONTH_KEYS.join(", ")}`, 400);
  }

  if (!Number.isFinite(manualPoints)) {
    throw createHttpError("manualPoints must be numeric", 400);
  }

  return {
    employeeId,
    kraColumnId,
    fyStartYear,
    monthKey,
    manualPoints,
  };
};

module.exports = {
  validateKraKpiMatrixQuery,
  validateKraKpiManualPointsQuery,
  validateKraKpiManualPointsPayload,
};
