const Leave = require("../models/Leave");
const { isUserActive } = require("./socket");

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const normalizeUserId = (value) => {
  if (!value) {
    return "";
  }

  return value.toString();
};

const buildUsersOnLeaveSet = async (userIds = [], referenceDate = new Date()) => {
  const normalizedUserIds = Array.isArray(userIds)
    ? userIds.map(normalizeUserId).filter(Boolean)
    : [];

  if (!normalizedUserIds.length) {
    return new Set();
  }

  const dayStart = startOfDay(referenceDate);
  const dayEnd = endOfDay(referenceDate);

  const approvedLeaves = await Leave.find({
    employee: { $in: normalizedUserIds },
    status: "Approved",
    startDate: { $lte: dayEnd },
    endDate: { $gte: dayStart },
  })
    .select("employee")
    .lean();

  const usersOnLeaveSet = new Set();
  approvedLeaves.forEach((leave) => {
    const employeeId = normalizeUserId(leave?.employee);
    if (employeeId) {
      usersOnLeaveSet.add(employeeId);
    }
  });

  return usersOnLeaveSet;
};

const resolveEffectiveStatusForUser = ({
  userId,
  usersOnLeaveSet = new Set(),
  referenceTime = Date.now(),
} = {}) => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return "away";
  }

  if (usersOnLeaveSet.has(normalizedUserId)) {
    return "leave";
  }

  return isUserActive(normalizedUserId, { referenceTime }) ? "active" : "away";
};

const resolveCurrentSessionStatus = async (userId, referenceDate = new Date()) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    return "away";
  }

  const usersOnLeaveSet = await buildUsersOnLeaveSet(
    [normalizedUserId],
    referenceDate
  );

  return usersOnLeaveSet.has(normalizedUserId) ? "leave" : "active";
};

module.exports = {
  buildUsersOnLeaveSet,
  resolveEffectiveStatusForUser,
  resolveCurrentSessionStatus,
};
