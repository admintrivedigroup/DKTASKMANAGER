const mongoose = require("mongoose");
const User = require("../models/User");
const { hasPrivilegedAccess, matchesRole } = require("./roleUtils");

const normalizeEmployeeId = (value) =>
  typeof value === "string" ? value.trim() : "";

const getRequesterId = (req) => {
  const requester = req?.user?._id || req?.user?.id || "";

  if (typeof requester === "string") {
    return requester.trim();
  }

  if (requester && typeof requester.toString === "function") {
    return requester.toString();
  }

  return "";
};

const buildInvalidEmployeeIdResult = () => ({
  valid: false,
  statusCode: 400,
  message: "A valid employeeId is required",
});

const buildSuperAdminExcludedResult = () => ({
  valid: false,
  statusCode: 400,
  message: "Super Admin accounts are excluded from KRA and KPI.",
});

const ensureEmployeeEligibleForKraKpi = async (employeeId) => {
  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    return buildInvalidEmployeeIdResult();
  }

  const user = await User.findById(employeeId).select("role").lean();

  if (!user) {
    return {
      valid: false,
      statusCode: 404,
      message: "User not found",
    };
  }

  if (matchesRole(user.role, "super_admin")) {
    return buildSuperAdminExcludedResult();
  }

  return {
    valid: true,
    value: employeeId,
  };
};

const resolveEmployeeIdForRead = async (req, rawEmployeeId) => {
  const requesterId = getRequesterId(req);

  if (!requesterId || !mongoose.Types.ObjectId.isValid(requesterId)) {
    return {
      valid: false,
      statusCode: 401,
      message: "Unauthorized request",
    };
  }

  if (!hasPrivilegedAccess(req.user?.role)) {
    return {
      valid: true,
      value: requesterId,
    };
  }

  const employeeId = normalizeEmployeeId(rawEmployeeId);
  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    return buildInvalidEmployeeIdResult();
  }

  return ensureEmployeeEligibleForKraKpi(employeeId);
};

const resolveEmployeeIdFromRequest = async (rawEmployeeId) => {
  const employeeId = normalizeEmployeeId(rawEmployeeId);

  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    return buildInvalidEmployeeIdResult();
  }

  return ensureEmployeeEligibleForKraKpi(employeeId);
};

module.exports = {
  ensureEmployeeEligibleForKraKpi,
  normalizeEmployeeId,
  resolveEmployeeIdForRead,
  resolveEmployeeIdFromRequest,
};
