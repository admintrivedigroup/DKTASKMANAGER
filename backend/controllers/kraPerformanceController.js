const mongoose = require("mongoose");

const Task = require("../models/Task");
const KraMultiplierProfile = require("../models/KraMultiplierProfile");
const { resolveEmployeeIdForRead } = require("../utils/kraAccessUtils");
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

const parseIntegerQueryValue = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return { valid: false, message: `${fieldName} is required` };
  }

  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    return { valid: false, message: `${fieldName} must be an integer` };
  }

  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed)) {
    return { valid: false, message: `${fieldName} must be an integer` };
  }

  return { valid: true, value: parsed };
};

const parseMonthYear = (req) => {
  const parsedMonth = parseIntegerQueryValue(req.query?.month, "month");
  if (!parsedMonth.valid) {
    return parsedMonth;
  }

  const parsedYear = parseIntegerQueryValue(req.query?.year, "year");
  if (!parsedYear.valid) {
    return parsedYear;
  }

  if (parsedMonth.value < 1 || parsedMonth.value > 12) {
    return { valid: false, message: "month must be between 1 and 12" };
  }

  if (parsedYear.value < 1970 || parsedYear.value > 9999) {
    return { valid: false, message: "year must be between 1970 and 9999" };
  }

  return {
    valid: true,
    value: {
      month: parsedMonth.value,
      year: parsedYear.value,
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

const resolveEmployeeId = async (req) => {
  return resolveEmployeeIdForRead(req, req.query?.employeeId);
};

const getWeightageStatus = async (req, res) => {
  try {
    const resolvedEmployeeId = await resolveEmployeeId(req);
    if (!resolvedEmployeeId.valid) {
      return res
        .status(resolvedEmployeeId.statusCode)
        .json({ message: resolvedEmployeeId.message });
    }

    const employeeId = resolvedEmployeeId.value;
    const totalWeightageRaw = await getActiveWeightageTotal(employeeId);
    const totalWeightage = roundWeightageToTwoDecimals(totalWeightageRaw);
    const remainingWeightage = roundWeightageToTwoDecimals(
      STRICT_WEIGHTAGE_TARGET - totalWeightageRaw
    );

    return res.json({
      totalWeightage,
      isValidStrict: isStrictWeightageValid(totalWeightageRaw),
      remainingWeightage,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const buildMonthRangeFromQuery = (req) => {
  const parsedMonthYear = parseMonthYear(req);

  if (!parsedMonthYear.valid) {
    return parsedMonthYear;
  }

  const { month, year } = parsedMonthYear.value;
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return {
    valid: true,
    value: {
      month,
      year,
      startDate,
      endDate,
    },
  };
};

const buildDateRangeFromQuery = (req) => {
  const hasStartDate = req.query?.startDate !== undefined && req.query?.startDate !== "";
  const hasEndDate = req.query?.endDate !== undefined && req.query?.endDate !== "";

  if (hasStartDate || hasEndDate) {
    const parsedStartDate = parseDateQueryValue(req.query?.startDate, "startDate");
    if (!parsedStartDate.valid) {
      return parsedStartDate;
    }

    const parsedEndDate = parseDateQueryValue(req.query?.endDate, "endDate");
    if (!parsedEndDate.valid) {
      return parsedEndDate;
    }

    if (parsedStartDate.value > parsedEndDate.value) {
      return { valid: false, message: "startDate must be before or equal to endDate" };
    }

    return {
      valid: true,
      value: {
        month: null,
        year: null,
        startDate: parsedStartDate.value,
        endDate: parsedEndDate.value,
      },
    };
  }

  return buildMonthRangeFromQuery(req);
};

const getTaskStatusFilter = (statusQuery) => {
  const normalizedStatus =
    typeof statusQuery === "string" ? statusQuery.trim().toLowerCase() : "all";

  if (!normalizedStatus || normalizedStatus === "all") {
    return {
      valid: true,
      value: {
        status: "all",
        filter: { $in: [COMPLETED_STATUS, ...OPEN_STATUSES] },
      },
    };
  }

  if (normalizedStatus === "completed") {
    return {
      valid: true,
      value: {
        status: "completed",
        filter: COMPLETED_STATUS,
      },
    };
  }

  if (normalizedStatus === "open") {
    return {
      valid: true,
      value: {
        status: "open",
        filter: { $in: OPEN_STATUSES },
      },
    };
  }

  return {
    valid: false,
    message: "status must be one of: all, completed, open",
  };
};

const getCategoryFilter = (categoryId) => {
  if (categoryId === undefined || categoryId === null || categoryId === "") {
    return { valid: true, value: null };
  }

  const normalizedCategoryId = String(categoryId).trim();

  if (!mongoose.Types.ObjectId.isValid(normalizedCategoryId)) {
    return {
      valid: false,
      message: "categoryId must be a valid id",
    };
  }

  return {
    valid: true,
    value: normalizedCategoryId,
  };
};

const buildPerformanceTask = ({ task, scoringConfig, asOfDate }) => {
  const category = task?.kraCategoryId || null;
  const hasCategory = Boolean(category);
  const isCompleted = task?.status === COMPLETED_STATUS;
  const categoryBasePoints = hasCategory ? toNumberOrZero(category?.basePoints) : 0;

  const scoring = calculateTaskScoring({
    status: task?.status,
    priority: task?.priority,
    dueDate: task?.dueDate,
    completedAt: task?.completedAt,
    categoryBasePoints,
    hasCategory,
    scoringConfig,
    asOfDate,
  });

  const hasStoredEarnedPoints = Number.isFinite(Number(task?.earnedPoints));
  const pointsValue = isCompleted
    ? scoring.isUnscored
      ? 0
      : roundToTwoDecimals(
          hasStoredEarnedPoints
            ? toNumberOrZero(task.earnedPoints)
            : scoring.taskPointsEarned
        )
    : scoring.taskPointsPotential;
  const lateDaysPayload = isCompleted
    ? { lateDaysAtCompletion: scoring.lateDays }
    : { lateDaysAsOfToday: scoring.lateDays };
  const snapshots = isCompleted && !scoring.isUnscored
    ? {
        basePointsSnapshot: task?.basePointsSnapshot ?? null,
        priorityMultiplierSnapshot: task?.priorityMultiplierSnapshot ?? null,
        timelinessMultiplierSnapshot: task?.timelinessMultiplierSnapshot ?? null,
        earnedPoints: task?.earnedPoints ?? null,
      }
    : null;

  return {
    _id: task?._id,
    title: task?.title || "",
    status: task?.status || "",
    priority: task?.priority || "",
    dueDate: task?.dueDate || null,
    completedAt: task?.completedAt || null,
    categoryName: category?.name || "",
    categoryBasePoints: scoring.categoryBasePoints,
    ...lateDaysPayload,
    pointsType: isCompleted ? "earned" : "potential",
    pointsValue,
    isUnscored: scoring.isUnscored,
    scoringLabel: scoring.isUnscored
      ? "Unscored"
      : isCompleted
      ? "Final"
      : "Live",
    snapshots,
  };
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

const fetchPerformanceTasks = async ({
  employeeId,
  status,
  categoryId,
  rangeStart,
  rangeEnd,
}) => {
  const baseFilter = {
    assignedTo: employeeId,
    isPersonal: { $ne: true },
  };

  let statusDateFilter = null;
  if (status === "completed") {
    statusDateFilter = {
      status: COMPLETED_STATUS,
      completedAt: { $gte: rangeStart, $lte: rangeEnd },
    };
  } else if (status === "open") {
    statusDateFilter = {
      status: { $in: OPEN_STATUSES },
      $or: [
        { dueDate: { $gte: rangeStart, $lte: rangeEnd } },
        {
          $and: [
            {
              $or: [{ dueDate: null }, { dueDate: { $exists: false } }],
            },
            {
              createdAt: { $gte: rangeStart, $lte: rangeEnd },
            },
          ],
        },
      ],
    };
  } else {
    statusDateFilter = {
      $or: [
        {
          status: COMPLETED_STATUS,
          completedAt: { $gte: rangeStart, $lte: rangeEnd },
        },
        {
          status: { $in: OPEN_STATUSES },
          $or: [
            { dueDate: { $gte: rangeStart, $lte: rangeEnd } },
            {
              $and: [
                {
                  $or: [{ dueDate: null }, { dueDate: { $exists: false } }],
                },
                {
                  createdAt: { $gte: rangeStart, $lte: rangeEnd },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  const taskFilter = {
    ...baseFilter,
    ...statusDateFilter,
  };

  if (categoryId) {
    taskFilter.kraCategoryId = categoryId;
  }

  return Task.find(taskFilter)
    .select(
      "title status priority dueDate completedAt earnedPoints basePointsSnapshot priorityMultiplierSnapshot timelinessMultiplierSnapshot kraCategoryId createdAt"
    )
    .populate("kraCategoryId", "name basePoints")
    .sort({ createdAt: -1 })
    .lean();
};

const getPerformanceSummary = async (req, res) => {
  try {
    const resolvedEmployeeId = await resolveEmployeeId(req);
    if (!resolvedEmployeeId.valid) {
      return res
        .status(resolvedEmployeeId.statusCode)
        .json({ message: resolvedEmployeeId.message });
    }

    const parsedRange = buildDateRangeFromQuery(req);
    if (!parsedRange.valid) {
      return res.status(400).json({ message: parsedRange.message });
    }

    const employeeId = resolvedEmployeeId.value;
    const { month, year, startDate, endDate } = parsedRange.value;

    const [scoringConfig, tasks] = await Promise.all([
      fetchScoringConfigForEmployee(employeeId),
      fetchPerformanceTasks({
        employeeId,
        status: "all",
        categoryId: null,
        rangeStart: startDate,
        rangeEnd: endDate,
      }),
    ]);

    const now = new Date();
    let earnedPointsTotal = 0;
    let potentialPointsTotal = 0;
    let completedCount = 0;
    let openCount = 0;
    let overdueCount = 0;

    tasks.forEach((task) => {
      const category = task?.kraCategoryId || null;
      const hasCategory = Boolean(category);
      const categoryBasePoints = hasCategory ? toNumberOrZero(category?.basePoints) : 0;
      const scoring = calculateTaskScoring({
        status: task?.status,
        priority: task?.priority,
        dueDate: task?.dueDate,
        completedAt: task?.completedAt,
        categoryBasePoints,
        hasCategory,
        scoringConfig,
        asOfDate: now,
      });

      if (task.status === COMPLETED_STATUS) {
        completedCount += 1;
        const hasStoredEarnedPoints = Number.isFinite(Number(task?.earnedPoints));
        earnedPointsTotal += scoring.isUnscored
          ? 0
          : hasStoredEarnedPoints
          ? roundToTwoDecimals(toNumberOrZero(task.earnedPoints))
          : scoring.taskPointsEarned;
        return;
      }

      if (!OPEN_STATUSES.includes(task.status)) {
        return;
      }

      openCount += 1;
      if (scoring.lateDays > 0) {
        overdueCount += 1;
      }
      potentialPointsTotal += scoring.taskPointsPotential;
    });

    return res.json({
      employeeId,
      month,
      year,
      startDate,
      endDate,
      earnedPointsTotal: roundToTwoDecimals(earnedPointsTotal),
      potentialPointsTotal: roundToTwoDecimals(potentialPointsTotal),
      completedCount,
      openCount,
      overdueCount,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPerformanceTasks = async (req, res) => {
  try {
    const resolvedEmployeeId = await resolveEmployeeId(req);
    if (!resolvedEmployeeId.valid) {
      return res
        .status(resolvedEmployeeId.statusCode)
        .json({ message: resolvedEmployeeId.message });
    }

    const parsedRange = buildDateRangeFromQuery(req);
    if (!parsedRange.valid) {
      return res.status(400).json({ message: parsedRange.message });
    }

    const parsedStatus = getTaskStatusFilter(req.query?.status);
    if (!parsedStatus.valid) {
      return res.status(400).json({ message: parsedStatus.message });
    }

    const parsedCategory = getCategoryFilter(req.query?.categoryId);
    if (!parsedCategory.valid) {
      return res.status(400).json({ message: parsedCategory.message });
    }

    const employeeId = resolvedEmployeeId.value;
    const { month, year, startDate, endDate } = parsedRange.value;
    const { status } = parsedStatus.value;

    const [scoringConfig, tasks] = await Promise.all([
      fetchScoringConfigForEmployee(employeeId),
      fetchPerformanceTasks({
        employeeId,
        status,
        categoryId: parsedCategory.value,
        rangeStart: startDate,
        rangeEnd: endDate,
      }),
    ]);

    const now = new Date();
    const performanceTasks = tasks.map((task) =>
      buildPerformanceTask({
        task,
        scoringConfig,
        asOfDate: now,
      })
    );

    return res.json({
      employeeId,
      month,
      year,
      startDate,
      endDate,
      status,
      categoryId: parsedCategory.value,
      tasks: performanceTasks,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getPerformanceSummary,
  getPerformanceTasks,
  getWeightageStatus,
};
