const mongoose = require("mongoose");
const { hasPrivilegedAccess } = require("./roleUtils");

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

const resolveEmployeeIdForRead = (req, rawEmployeeId) => {
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

  return {
    valid: true,
    value: employeeId,
  };
};

const resolveEmployeeIdFromRequest = (rawEmployeeId) => {
  const employeeId = normalizeEmployeeId(rawEmployeeId);

  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    return buildInvalidEmployeeIdResult();
  }

  return {
    valid: true,
    value: employeeId,
  };
};

module.exports = {
  normalizeEmployeeId,
  resolveEmployeeIdForRead,
  resolveEmployeeIdFromRequest,
};
