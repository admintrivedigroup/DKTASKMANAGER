const mongoose = require("mongoose");

const Task = require("../models/Task");
const KraMultiplierProfile = require("../models/KraMultiplierProfile");
const { hasPrivilegedAccess } = require("../utils/roleUtils");
const { ensureEmployeeEligibleForKraKpi } = require("../utils/kraAccessUtils");
const {
  STRICT_WEIGHTAGE_TARGET,
  getActiveWeightageTotal,
  isStrictWeightageValid,
  roundToTwoDecimals: roundWeightageToTwoDecimals,
} = require("../utils/kraWeightageUtils");
const {
  COMPLETED_STATUS,
  buildScoringConfig,
  calculateTaskScoring,
  roundToTwoDecimals,
  toNumberOrZero,
} = require("../utils/taskScoring");

const OPEN_STATUSES = ["Pending", "In Progress", "Pending Approval"];

const parseMonthQuery = (monthValue) => {
  if (typeof monthValue !== "string" || !monthValue.trim()) {
    return { valid: false, message: "month is required in YYYY-MM format" };
  }

  const normalizedMonth = monthValue.trim();
  const matched = /^(\d{4})-(\d{2})$/.exec(normalizedMonth);
  if (!matched) {
    return { valid: false, message: "month must be in YYYY-MM format" };
  }

  const year = Number.parseInt(matched[1], 10);
  const month = Number.parseInt(matched[2], 10);

  if (month < 1 || month > 12) {
    return { valid: false, message: "month must be in YYYY-MM format" };
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return {
    valid: true,
    value: {
      monthLabel: normalizedMonth,
      startDate,
      endDate,
    },
  };
};

const parseDateQueryValue = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return { valid: false, message: `${fieldName} is required` };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, message: `${fieldName} must be a valid date` };
  }

  return { valid: true, value: parsed };
};

const parseDateRangeOrMonth = (query = {}) => {
  const hasStartDate = query.startDate !== undefined && query.startDate !== "";
  const hasEndDate = query.endDate !== undefined && query.endDate !== "";

  if (hasStartDate || hasEndDate) {
    const parsedStartDate = parseDateQueryValue(query.startDate, "startDate");
    if (!parsedStartDate.valid) {
      return parsedStartDate;
    }

    const parsedEndDate = parseDateQueryValue(query.endDate, "endDate");
    if (!parsedEndDate.valid) {
      return parsedEndDate;
    }

    if (parsedStartDate.value > parsedEndDate.value) {
      return { valid: false, message: "startDate must be before or equal to endDate" };
    }

    return {
      valid: true,
      value: {
        monthLabel:
          typeof query.month === "string" && query.month.trim()
            ? query.month.trim()
            : null,
        startDate: parsedStartDate.value,
        endDate: parsedEndDate.value,
      },
    };
  }

  return parseMonthQuery(query.month);
};

const buildTaskDateFilter = ({ startDate, endDate }) => ({
  $or: [
    {
      status: COMPLETED_STATUS,
      completedAt: { $gte: startDate, $lte: endDate },
    },
    {
      status: { $in: OPEN_STATUSES },
      $or: [
        { dueDate: { $gte: startDate, $lte: endDate } },
        {
          $and: [
            {
              $or: [{ dueDate: null }, { dueDate: { $exists: false } }],
            },
            {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          ],
        },
      ],
    },
  ],
});

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

const resolveEmployeeId = async (req) => {
  const requesterId = getRequesterId(req);
  if (!requesterId || !mongoose.Types.ObjectId.isValid(requesterId)) {
    return {
      valid: false,
      statusCode: 401,
      message: "Unauthorized request",
    };
  }

  if (!hasPrivilegedAccess(req.user?.role)) {
    return { valid: true, value: requesterId };
  }

  const rawEmployeeId =
    typeof req.query?.employeeId === "string" ? req.query.employeeId.trim() : "";
  if (!rawEmployeeId) {
    return ensureEmployeeEligibleForKraKpi(requesterId);
  }

  if (!mongoose.Types.ObjectId.isValid(rawEmployeeId)) {
    return {
      valid: false,
      statusCode: 400,
      message: "A valid employeeId is required",
    };
  }

  return ensureEmployeeEligibleForKraKpi(rawEmployeeId);
};

const fetchScoringConfigForEmployee = async (employeeId) => {
  const profile = await KraMultiplierProfile.findOne({
    employeeId,
    isActive: true,
  })
    .select("priorityMultipliers timelinessMultipliers")
    .lean();

  return buildScoringConfig(profile);
};

const getTimelinessBucketLabel = (lateDays, timelinessSlabs) => {
  const slabs = Array.isArray(timelinessSlabs) ? timelinessSlabs : [];
  if (!slabs.length || !Number.isInteger(lateDays) || lateDays < 0) {
    return "";
  }

  let previousMax = -1;
  for (let index = 0; index < slabs.length; index += 1) {
    const slab = slabs[index];
    const slabMax = Number(slab?.maxLateDays);

    if (!Number.isInteger(slabMax) || slabMax < previousMax) {
      continue;
    }

    if (lateDays <= slabMax) {
      if (slabMax === 0) {
        return "On Time";
      }

      const rangeStart = previousMax + 1;
      if (slabMax >= 9999) {
        return `${rangeStart}+ days late`;
      }

      if (rangeStart === slabMax) {
        return `${slabMax} day late`;
      }

      return `${rangeStart}-${slabMax} days late`;
    }

    previousMax = slabMax;
  }

  return "";
};

const buildStrictWeightageInvalidResponse = (totalActiveWeightage) => {
  const totalRounded = roundWeightageToTwoDecimals(totalActiveWeightage);

  return {
    error: "KRA_KPI_WEIGHTAGE_NOT_100",
    message: `Weightage must be exactly 100%. Current active total is ${totalRounded}%.`,
    totalWeightage: totalRounded,
    required: STRICT_WEIGHTAGE_TARGET,
  };
};

const getKraKpiSummary = async (req, res) => {
  try {
    const resolvedEmployeeId = await resolveEmployeeId(req);
    if (!resolvedEmployeeId.valid) {
      return res
        .status(resolvedEmployeeId.statusCode)
        .json({ message: resolvedEmployeeId.message });
    }

    const parsedRange = parseDateRangeOrMonth(req.query);
    if (!parsedRange.valid) {
      return res.status(400).json({ message: parsedRange.message });
    }

    const employeeId = resolvedEmployeeId.value;
    const { monthLabel, startDate, endDate } = parsedRange.value;
    const totalActiveWeightage = await getActiveWeightageTotal(employeeId);

    if (!isStrictWeightageValid(totalActiveWeightage)) {
      return res
        .status(400)
        .json(buildStrictWeightageInvalidResponse(totalActiveWeightage));
    }

    const [scoringConfig, tasks] = await Promise.all([
      fetchScoringConfigForEmployee(employeeId),
      Task.find({
        assignedTo: employeeId,
        isPersonal: { $ne: true },
        kraCategoryId: { $ne: null },
        ...buildTaskDateFilter({ startDate, endDate }),
      })
        .select(
          "title status priority dueDate completedAt earnedPoints kraCategoryId createdAt"
        )
        .populate("kraCategoryId", "name basePoints")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const asOfDate = new Date();
    let earnedPoints = 0;
    let potentialPoints = 0;
    let completedTasks = 0;
    let openTasks = 0;
    let overdueTasks = 0;

    const taskRows = tasks.map((task) => {
      const category = task?.kraCategoryId || null;
      const categoryName = category?.name || "";
      const basePoints = toNumberOrZero(category?.basePoints);
      const scoring = calculateTaskScoring({
        status: task?.status,
        priority: task?.priority,
        dueDate: task?.dueDate,
        completedAt: task?.completedAt,
        categoryBasePoints: basePoints,
        hasCategory: Boolean(category),
        scoringConfig,
        asOfDate,
      });

      const isCompleted = task?.status === COMPLETED_STATUS;
      const taskEarnedPoints = isCompleted
        ? roundToTwoDecimals(
            Number.isFinite(Number(task?.earnedPoints))
              ? toNumberOrZero(task.earnedPoints)
              : scoring.taskPointsEarned
          )
        : 0;
      const taskPotentialPoints = scoring.taskPointsPotential;
      const timelinessBucket = getTimelinessBucketLabel(
        scoring.lateDays,
        scoringConfig?.timelinessMultipliers
      );

      if (isCompleted) {
        completedTasks += 1;
        earnedPoints += taskEarnedPoints;
      } else {
        openTasks += 1;
        potentialPoints += taskPotentialPoints;
        if (scoring.lateDays > 0) {
          overdueTasks += 1;
        }
      }

      return {
        title: task?.title || "",
        status: task?.status || "",
        categoryName,
        basePoints,
        priority: task?.priority || "",
        priorityMultiplier: scoring.priorityMultiplier,
        dueDate: task?.dueDate || null,
        completedAt: task?.completedAt || null,
        latenessDays: scoring.lateDays,
        timelinessBucket,
        timelinessMultiplier: scoring.timelinessMultiplier,
        earnedPoints: taskEarnedPoints,
        potentialPoints: taskPotentialPoints,
      };
    });

    return res.json({
      employeeId,
      month: monthLabel,
      startDate,
      endDate,
      earnedPoints: roundToTwoDecimals(earnedPoints),
      potentialPoints: roundToTwoDecimals(potentialPoints),
      completedTasks,
      openTasks,
      overdueTasks,
      tasks: taskRows,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getKraKpiSummary,
};
