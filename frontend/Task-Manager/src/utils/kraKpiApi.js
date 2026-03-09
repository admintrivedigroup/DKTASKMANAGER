import axiosInstance from "./axiosInstance";
import { API_PATHS } from "./apiPaths";
import { matchesRole } from "./roleUtils";

const TIMELINESS_MAX_LATE_DAYS = {
  ON_TIME: 0,
  ONE_TO_TWO_DAYS: 2,
  THREE_TO_SEVEN_DAYS: 7,
  OVER_SEVEN_DAYS: 9999,
};

const toPositiveNumber = (value, fallbackValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const getCategoryId = (category) =>
  category?._id || category?.id || category?.categoryId || "";

export const DEFAULT_KRA_PRIORITY_MULTIPLIERS = {
  low: 1,
  medium: 1.25,
  high: 1.5,
  urgent: 2,
};

export const DEFAULT_KRA_TIMELINESS_MULTIPLIERS = [
  {
    maxLateDays: TIMELINESS_MAX_LATE_DAYS.ON_TIME,
    multiplier: 1,
  },
  {
    maxLateDays: TIMELINESS_MAX_LATE_DAYS.ONE_TO_TWO_DAYS,
    multiplier: 0.75,
  },
  {
    maxLateDays: TIMELINESS_MAX_LATE_DAYS.THREE_TO_SEVEN_DAYS,
    multiplier: 0.5,
  },
  {
    maxLateDays: TIMELINESS_MAX_LATE_DAYS.OVER_SEVEN_DAYS,
    multiplier: 0.25,
  },
];

const normalizeCategory = (category = {}) => {
  const categoryId = getCategoryId(category);

  return {
    ...category,
    _id: categoryId,
    name: typeof category?.name === "string" ? category.name : "",
    basePoints: Number(category?.basePoints) || 0,
    weightage:
      category?.weightage === null || category?.weightage === undefined
        ? ""
        : Number(category.weightage),
    isActive: category?.isActive !== false,
    requiresApproval: category?.requiresApproval === true,
  };
};

const normalizeCategoryList = (payload) => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.categories)
    ? payload.categories
    : [];

  return source
    .map(normalizeCategory)
    .filter((category) => Boolean(getCategoryId(category)));
};

const normalizeEmployeeList = (payload) => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.users)
    ? payload.users
    : [];

  return source
    .filter((employee) => employee?._id && !matchesRole(employee?.role, "client"))
    .map((employee) => ({
      _id: employee._id,
      name:
        typeof employee?.name === "string" && employee.name.trim()
          ? employee.name.trim()
          : employee?.email || "Unnamed Employee",
      email: employee?.email || "",
      role: employee?.role || "",
    }))
    .sort((firstEmployee, secondEmployee) =>
      firstEmployee.name.localeCompare(secondEmployee.name)
    );
};

const normalizeTimelinessMultipliers = (timelinessMultipliers) => {
  const source = Array.isArray(timelinessMultipliers) ? timelinessMultipliers : [];
  const validRules = source
    .map((rule) => ({
      maxLateDays: Number(rule?.maxLateDays),
      multiplier: Number(rule?.multiplier),
    }))
    .filter(
      (rule) =>
        Number.isInteger(rule.maxLateDays) &&
        rule.maxLateDays >= 0 &&
        Number.isFinite(rule.multiplier) &&
        rule.multiplier > 0
    )
    .sort((firstRule, secondRule) => firstRule.maxLateDays - secondRule.maxLateDays);

  if (!validRules.length) {
    return DEFAULT_KRA_TIMELINESS_MULTIPLIERS.map((rule) => ({ ...rule }));
  }

  const findMultiplierByMaxLateDays = (maxLateDays, fallbackValue) => {
    const exactMatch = validRules.find((rule) => rule.maxLateDays === maxLateDays);
    if (exactMatch) {
      return exactMatch.multiplier;
    }

    return fallbackValue;
  };

  return DEFAULT_KRA_TIMELINESS_MULTIPLIERS.map((rule) => ({
    maxLateDays: rule.maxLateDays,
    multiplier: findMultiplierByMaxLateDays(rule.maxLateDays, rule.multiplier),
  }));
};

const normalizeMultiplierProfile = (profile = {}) => ({
  ...profile,
  _id: profile?._id || profile?.id || "",
  employeeId: profile?.employeeId || "",
  priorityMultipliers: {
    low: toPositiveNumber(
      profile?.priorityMultipliers?.low,
      DEFAULT_KRA_PRIORITY_MULTIPLIERS.low
    ),
    medium: toPositiveNumber(
      profile?.priorityMultipliers?.medium,
      DEFAULT_KRA_PRIORITY_MULTIPLIERS.medium
    ),
    high: toPositiveNumber(
      profile?.priorityMultipliers?.high,
      DEFAULT_KRA_PRIORITY_MULTIPLIERS.high
    ),
    urgent: toPositiveNumber(
      profile?.priorityMultipliers?.urgent,
      DEFAULT_KRA_PRIORITY_MULTIPLIERS.urgent
    ),
  },
  timelinessMultipliers: normalizeTimelinessMultipliers(profile?.timelinessMultipliers),
});

const normalizePerformanceSummary = (summary = {}) => ({
  employeeId: summary?.employeeId || "",
  month: Number(summary?.month) || null,
  year: Number(summary?.year) || null,
  earnedPointsTotal: Number(summary?.earnedPointsTotal) || 0,
  potentialPointsTotal: Number(summary?.potentialPointsTotal) || 0,
  completedCount: Number(summary?.completedCount) || 0,
  openCount: Number(summary?.openCount) || 0,
  overdueCount: Number(summary?.overdueCount) || 0,
});

const normalizeKraKpiSummary = (summary = {}, employeeId = "") => {
  const monthLabel =
    typeof summary?.month === "string" ? summary.month.trim() : "";
  const matchedMonth = /^(\d{4})-(\d{2})$/.exec(monthLabel);
  const parsedYear = matchedMonth ? Number.parseInt(matchedMonth[1], 10) : null;
  const parsedMonth = matchedMonth ? Number.parseInt(matchedMonth[2], 10) : null;

  return {
    employeeId: summary?.employeeId || employeeId || "",
    month: Number.isInteger(parsedMonth) ? parsedMonth : null,
    year: Number.isInteger(parsedYear) ? parsedYear : null,
    monthlyScore:
      summary?.monthlyScore === null || summary?.monthlyScore === undefined
        ? null
        : Number(summary?.monthlyScore),
    yearlyScore:
      summary?.yearlyScore === null || summary?.yearlyScore === undefined
        ? null
        : Number(summary?.yearlyScore),
    earnedPointsTotal: Number(summary?.earnedPoints) || 0,
    potentialPointsTotal: Number(summary?.potentialPoints) || 0,
    completedCount: Number(summary?.completedTasks) || 0,
    openCount: Number(summary?.openTasks) || 0,
    overdueCount: Number(summary?.overdueTasks) || 0,
  };
};

const normalizePerformanceTask = (task = {}) => {
  const normalizedStatus =
    typeof task?.status === "string" ? task.status.trim() : "";
  const isCompleted = normalizedStatus.toLowerCase() === "completed";
  const isUnscored = Boolean(task?.isUnscored);
  const lateDaysValue = isCompleted
    ? Number(task?.lateDaysAtCompletion)
    : Number(task?.lateDaysAsOfToday);
  const parsedPointsValue = Number(task?.pointsValue);
  const pointsValue = Number.isFinite(parsedPointsValue) ? parsedPointsValue : 0;
  const serverScoringLabel =
    typeof task?.scoringLabel === "string" ? task.scoringLabel.trim() : "";

  return {
    _id: task?._id || task?.id || "",
    title: typeof task?.title === "string" ? task.title : "",
    status: normalizedStatus,
    priority: typeof task?.priority === "string" ? task.priority : "",
    dueDate: task?.dueDate || null,
    completedAt: task?.completedAt || null,
    categoryName:
      typeof task?.categoryName === "string" ? task.categoryName.trim() : "",
    categoryBasePoints: Number(task?.categoryBasePoints) || 0,
    lateDays:
      Number.isFinite(lateDaysValue) && lateDaysValue > 0 ? lateDaysValue : 0,
    pointsType: task?.pointsType === "earned" ? "earned" : "potential",
    pointsValue,
    isUnscored,
    scoringLabel:
      serverScoringLabel || (isUnscored ? "Unscored" : isCompleted ? "Final" : "Live"),
  };
};

const normalizeKraKpiTask = (task = {}, index = 0) => {
  const normalizedStatus =
    typeof task?.status === "string" ? task.status.trim() : "";
  const isCompleted = normalizedStatus.toLowerCase() === "completed";
  const lateDays = Number(task?.latenessDays);
  const pointsValue = isCompleted
    ? Number(task?.earnedPoints)
    : Number(task?.potentialPoints);
  const bucketLabel =
    typeof task?.timelinessBucket === "string" ? task.timelinessBucket.trim() : "";

  return {
    _id:
      task?._id ||
      task?.id ||
      `${task?.title || "task"}-${task?.dueDate || "no-due"}-${index}`,
    title: typeof task?.title === "string" ? task.title : "",
    status: normalizedStatus,
    priority: typeof task?.priority === "string" ? task.priority : "",
    dueDate: task?.dueDate || null,
    completedAt: task?.completedAt || null,
    categoryName:
      typeof task?.categoryName === "string" ? task.categoryName.trim() : "",
    categoryBasePoints: Number(task?.basePoints) || 0,
    lateDays: Number.isFinite(lateDays) && lateDays > 0 ? lateDays : 0,
    pointsType: isCompleted ? "earned" : "potential",
    pointsValue: Number.isFinite(pointsValue) ? pointsValue : 0,
    isUnscored: false,
    scoringLabel: bucketLabel || (isCompleted ? "Final" : "Live"),
  };
};

const normalizePerformanceTaskList = (payload) => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.tasks)
    ? payload.tasks
    : [];

  return source
    .map(normalizePerformanceTask)
    .filter((task) => Boolean(task._id));
};

const normalizeKraKpiTaskList = (tasks) =>
  (Array.isArray(tasks) ? tasks : [])
    .map((task, index) => normalizeKraKpiTask(task, index))
    .filter((task) => Boolean(task._id));

const normalizeWeightageStatus = (payload = {}) => {
  const totalWeightage = Number(payload?.totalWeightage);
  const remainingWeightage = Number(payload?.remainingWeightage);

  return {
    totalWeightage: Number.isFinite(totalWeightage) ? totalWeightage : 0,
    isValidStrict: Boolean(payload?.isValidStrict),
    remainingWeightage: Number.isFinite(remainingWeightage) ? remainingWeightage : 100,
  };
};

export const getEmployeesForKraKpi = async () => {
  const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
  return normalizeEmployeeList(response?.data);
};

export const getKraKpiCategories = async ({ employeeId, month }) => {
  const params = { employeeId, activeOnly: false };

  if (month && month !== "all") {
    params.month = month;
  }

  const response = await axiosInstance.get(API_PATHS.KRA_KPI.GET_CATEGORIES, {
    params,
  });

  return normalizeCategoryList(response?.data);
};

export const createKraKpiCategory = async (payload) => {
  const response = await axiosInstance.post(
    API_PATHS.KRA_KPI.CREATE_CATEGORY,
    payload
  );

  const createdCategory =
    response?.data?.category || response?.data?.data || response?.data;
  return normalizeCategory(createdCategory);
};

export const updateKraKpiCategory = async (categoryId, payload) => {
  const response = await axiosInstance.put(
    API_PATHS.KRA_KPI.UPDATE_CATEGORY(categoryId),
    payload
  );

  const updatedCategory =
    response?.data?.category || response?.data?.data || response?.data;
  return normalizeCategory(updatedCategory);
};

export const deleteKraKpiCategory = async (categoryId) => {
  await axiosInstance.delete(API_PATHS.KRA_KPI.DELETE_CATEGORY(categoryId));
};

export const getKraKpiMultiplierProfile = async ({ employeeId }) => {
  const response = await axiosInstance.get(API_PATHS.KRA_KPI.GET_MULTIPLIERS, {
    params: { employeeId },
  });

  const profile = response?.data?.profile || response?.data?.data || response?.data;
  return normalizeMultiplierProfile(profile);
};

export const getKraWeightageStatus = async ({ employeeId }) => {
  const response = await axiosInstance.get(API_PATHS.KRA_KPI.GET_WEIGHTAGE_STATUS, {
    params: { employeeId },
  });

  return normalizeWeightageStatus(response?.data);
};

export const updateKraKpiMultiplierProfile = async ({
  employeeId,
  priorityMultipliers,
  timelinessMultipliers,
}) => {
  const response = await axiosInstance.put(
    API_PATHS.KRA_KPI.UPDATE_MULTIPLIERS,
    {
      priorityMultipliers,
      timelinessMultipliers,
    },
    {
      params: { employeeId },
    }
  );

  const profile = response?.data?.profile || response?.data?.data || response?.data;
  return normalizeMultiplierProfile(profile);
};

export const getKraPerformanceSummary = async ({
  employeeId,
  month,
  year,
  financialYear,
  startDate,
  endDate,
}) => {
  const params = { employeeId, month, year };
  if (financialYear !== undefined && financialYear !== null && financialYear !== "") {
    params.financialYear = financialYear;
  }
  if (startDate) {
    params.startDate = startDate;
  }
  if (endDate) {
    params.endDate = endDate;
  }

  const response = await axiosInstance.get(
    API_PATHS.KRA_KPI.GET_PERFORMANCE_SUMMARY,
    {
      params,
    }
  );

  return normalizePerformanceSummary(response?.data);
};

export const getKraPerformanceTasks = async ({
  employeeId,
  month,
  year,
  financialYear,
  startDate,
  endDate,
  status = "all",
}) => {
  const params = { employeeId, month, year, status };
  if (financialYear !== undefined && financialYear !== null && financialYear !== "") {
    params.financialYear = financialYear;
  }
  if (startDate) {
    params.startDate = startDate;
  }
  if (endDate) {
    params.endDate = endDate;
  }

  const response = await axiosInstance.get(
    API_PATHS.KRA_KPI.GET_PERFORMANCE_TASKS,
    {
      params,
    }
  );

  return normalizePerformanceTaskList(response?.data);
};

export const getKraKpiSummary = async ({
  employeeId,
  month,
  financialYear,
  startDate,
  endDate,
}) => {
  const params = { employeeId, month };
  if (financialYear !== undefined && financialYear !== null && financialYear !== "") {
    params.financialYear = financialYear;
  }
  if (startDate) {
    params.startDate = startDate;
  }
  if (endDate) {
    params.endDate = endDate;
  }

  const response = await axiosInstance.get(API_PATHS.KRA_KPI.GET_SUMMARY, {
    params,
  });

  const payload = response?.data || {};
  return {
    summary: normalizeKraKpiSummary(payload, employeeId),
    tasks: normalizeKraKpiTaskList(payload?.tasks),
  };
};

export { getCategoryId };
