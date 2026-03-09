import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LuChevronLeft,
  LuChevronRight,
  LuLoader,
  LuPencil,
  LuPlus,
  LuSave,
  LuTrash2,
} from "react-icons/lu";
import toast from "react-hot-toast";

import DashboardLayout from "../layouts/DashboardLayout";
import Modal from "../Modal";
import useQueryParamState from "../../hooks/useQueryParamState";
import {
  DEFAULT_KRA_PRIORITY_MULTIPLIERS,
  DEFAULT_KRA_TIMELINESS_MULTIPLIERS,
  createKraKpiCategory,
  deleteKraKpiCategory,
  getCategoryId,
  getEmployeesForKraKpi,
  getKraKpiCategories,
  getKraPerformanceTasks,
  getKraKpiSummary,
  getKraKpiMultiplierProfile,
  updateKraKpiCategory,
  updateKraKpiMultiplierProfile,
} from "../../utils/kraKpiApi";
import { formatDateLabel } from "../../utils/dateUtils";
import {
  buildFinancialYearDateRange,
  buildFinancialYearOptions,
  FY_MONTH_OPTIONS,
  FY_MONTH_VALUE_TO_NUMBER,
  getFinancialYearStartYear,
} from "../../utils/financialYearUtils";

const createInitialFormState = () => ({
  name: "",
  basePoints: "",
  weightage: "",
  isActive: true,
});

const createInitialPerformanceSummaryState = () => ({
  employeeId: "",
  month: null,
  year: null,
  monthlyScore: null,
  yearlyScore: null,
  earnedPointsTotal: 0,
  potentialPointsTotal: 0,
  completedCount: 0,
  openCount: 0,
  overdueCount: 0,
});

const PRIORITY_MULTIPLIER_FIELDS = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "urgent", label: "Urgent" },
];

const TIMELINESS_MULTIPLIER_FIELDS = [
  { key: "onTime", label: "On time (0 days)", maxLateDays: 0 },
  { key: "days1To2", label: "1-2 days", maxLateDays: 2 },
  { key: "days3To7", label: "3-7 days", maxLateDays: 7 },
  { key: "over7Days", label: ">7 days", maxLateDays: 9999 },
];

const TASK_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
];

const TASKS_PAGE_SIZE = 10;
const WEIGHTAGE_MIN = 1;
const WEIGHTAGE_MAX = 100;
const WEIGHTAGE_CAP = 100;
const STRICT_WEIGHTAGE_EPS = 0.01;

const DEFAULT_TIMELINESS_MULTIPLIER_MAP = DEFAULT_KRA_TIMELINESS_MULTIPLIERS.reduce(
  (accumulator, rule) => ({
    ...accumulator,
    [rule.maxLateDays]: rule.multiplier,
  }),
  {}
);

const createInitialMultiplierFormState = () => ({
  low: String(DEFAULT_KRA_PRIORITY_MULTIPLIERS.low),
  medium: String(DEFAULT_KRA_PRIORITY_MULTIPLIERS.medium),
  high: String(DEFAULT_KRA_PRIORITY_MULTIPLIERS.high),
  urgent: String(DEFAULT_KRA_PRIORITY_MULTIPLIERS.urgent),
  onTime: String(DEFAULT_TIMELINESS_MULTIPLIER_MAP[0]),
  days1To2: String(DEFAULT_TIMELINESS_MULTIPLIER_MAP[2]),
  days3To7: String(DEFAULT_TIMELINESS_MULTIPLIER_MAP[7]),
  over7Days: String(DEFAULT_TIMELINESS_MULTIPLIER_MAP[9999]),
});

const getTimelinessMultiplierValue = (
  timelinessMultipliers,
  maxLateDays,
  fallbackValue
) => {
  const rule = Array.isArray(timelinessMultipliers)
    ? timelinessMultipliers.find(
        (entry) => Number(entry?.maxLateDays) === maxLateDays
      )
    : null;
  const parsedMultiplier = Number(rule?.multiplier);
  return Number.isFinite(parsedMultiplier) && parsedMultiplier > 0
    ? parsedMultiplier
    : fallbackValue;
};

const mapMultiplierProfileToFormState = (profile = {}) => ({
  low: String(
    Number(profile?.priorityMultipliers?.low) ||
      DEFAULT_KRA_PRIORITY_MULTIPLIERS.low
  ),
  medium: String(
    Number(profile?.priorityMultipliers?.medium) ||
      DEFAULT_KRA_PRIORITY_MULTIPLIERS.medium
  ),
  high: String(
    Number(profile?.priorityMultipliers?.high) ||
      DEFAULT_KRA_PRIORITY_MULTIPLIERS.high
  ),
  urgent: String(
    Number(profile?.priorityMultipliers?.urgent) ||
      DEFAULT_KRA_PRIORITY_MULTIPLIERS.urgent
  ),
  onTime: String(
    getTimelinessMultiplierValue(
      profile?.timelinessMultipliers,
      0,
      DEFAULT_TIMELINESS_MULTIPLIER_MAP[0]
    )
  ),
  days1To2: String(
    getTimelinessMultiplierValue(
      profile?.timelinessMultipliers,
      2,
      DEFAULT_TIMELINESS_MULTIPLIER_MAP[2]
    )
  ),
  days3To7: String(
    getTimelinessMultiplierValue(
      profile?.timelinessMultipliers,
      7,
      DEFAULT_TIMELINESS_MULTIPLIER_MAP[7]
    )
  ),
  over7Days: String(
    getTimelinessMultiplierValue(
      profile?.timelinessMultipliers,
      9999,
      DEFAULT_TIMELINESS_MULTIPLIER_MAP[9999]
    )
  ),
});

const formatMetricNumber = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );

const formatFixedTwoDecimals = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const roundToTwoDecimals = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseWeightageValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? roundToTwoDecimals(parsed) : null;
};

const isWeightageStrictModeError = (error) => {
  const code = String(error?.response?.data?.error || "").trim();
  if (code === "KRA_KPI_WEIGHTAGE_NOT_100") {
    return true;
  }

  const message = String(error?.response?.data?.message || "").toLowerCase();
  return message.includes("must be exactly 100%");
};

const buildSummaryFromTasks = ({ employeeId, month, year, tasks }) => {
  const normalizedTasks = Array.isArray(tasks) ? tasks : [];
  const summary = {
    employeeId: employeeId || "",
    month: Number(month) || null,
    year: Number(year) || null,
    monthlyScore: null,
    yearlyScore: null,
    earnedPointsTotal: 0,
    potentialPointsTotal: 0,
    completedCount: 0,
    openCount: 0,
    overdueCount: 0,
  };

  normalizedTasks.forEach((task) => {
    const pointsValue = Number(task?.pointsValue);
    const safePointsValue = Number.isFinite(pointsValue) ? pointsValue : 0;
    const normalizedStatus =
      typeof task?.status === "string" ? task.status.trim().toLowerCase() : "";
    const isCompleted = normalizedStatus === "completed";

    if (isCompleted) {
      summary.completedCount += 1;
      summary.earnedPointsTotal += safePointsValue;
      return;
    }

    summary.openCount += 1;
    summary.potentialPointsTotal += safePointsValue;
    if (Number(task?.lateDays) > 0) {
      summary.overdueCount += 1;
    }
  });

  return {
    ...summary,
    earnedPointsTotal: roundToTwoDecimals(summary.earnedPointsTotal),
    potentialPointsTotal: roundToTwoDecimals(summary.potentialPointsTotal),
  };
};

const getNumericWeightage = (category) => {
  const parsed = parseWeightageValue(category?.weightage);
  return parsed === null ? 0 : parsed;
};

const getStatusBadgeClasses = (status) => {
  const normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : "";

  if (normalizedStatus === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/40";
  }

  if (normalizedStatus === "in progress") {
    return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-400/40";
  }

  if (normalizedStatus === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/40";
  }

  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700";
};

const getPriorityBadgeClasses = (priority) => {
  const normalizedPriority =
    typeof priority === "string" ? priority.trim().toLowerCase() : "";

  if (normalizedPriority === "urgent") {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-400/40";
  }

  if (normalizedPriority === "high") {
    return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-400/40";
  }

  if (normalizedPriority === "medium") {
    return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-400/40";
  }

  if (normalizedPriority === "low") {
    return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-400/40";
  }

  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700";
};

const KraKpiWorkspace = ({ readOnly = false, currentUser = null }) => {
  const [, setSearchParams] = useSearchParams();
  const currentUserId =
    typeof currentUser?._id === "string" ? currentUser._id.trim() : "";
  const currentUserName =
    typeof currentUser?.name === "string" && currentUser.name.trim()
      ? currentUser.name.trim()
      : currentUser?.email || "Me";
  const currentUserEmail =
    typeof currentUser?.email === "string" ? currentUser.email : "";
  const currentUserRole =
    typeof currentUser?.role === "string" ? currentUser.role : "";
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingMultipliers, setLoadingMultipliers] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPerformanceTasks, setLoadingPerformanceTasks] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useQueryParamState(
    "employeeId",
    {
      defaultValue: readOnly && currentUserId ? currentUserId : "",
    }
  );
  const [selectedFinancialYear, setSelectedFinancialYear] = useQueryParamState(
    "fy",
    {
      defaultValue: String(getFinancialYearStartYear()),
    }
  );
  const [selectedMonth, setSelectedMonth] = useQueryParamState("month", {
    defaultValue: "all",
  });
  const [categories, setCategories] = useState([]);
  const [performanceTasks, setPerformanceTasks] = useState([]);
  const [performanceSummary, setPerformanceSummary] = useState(
    createInitialPerformanceSummaryState
  );
  const [taskStatusFilter, setTaskStatusFilter] = useQueryParamState("status", {
    defaultValue: "all",
  });
  const [taskCategoryFilter, setTaskCategoryFilter] = useQueryParamState(
    "category",
    {
      defaultValue: "all",
    }
  );
  const [showOnlyOverdueTasks, setShowOnlyOverdueTasks] = useQueryParamState(
    "overdue",
    {
      defaultValue: false,
      parse: (value) => value === "true",
      serialize: (value) => String(Boolean(value)),
    }
  );
  const [taskCurrentPage, setTaskCurrentPage] = useQueryParamState("page", {
    defaultValue: 1,
    parse: (value) => {
      const parsedValue = Number.parseInt(value, 10);
      return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
    },
    serialize: (value) => String(value),
  });
  const [multiplierFormData, setMultiplierFormData] = useState(
    createInitialMultiplierFormState
  );
  const [multiplierFormErrors, setMultiplierFormErrors] = useState({});
  const [usingDefaultMultipliers, setUsingDefaultMultipliers] = useState(false);
  const [isSavingMultipliers, setIsSavingMultipliers] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(createInitialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingActiveToggleId, setPendingActiveToggleId] = useState("");
  const [pendingApprovalToggleId, setPendingApprovalToggleId] = useState("");
  const [isCreatingOtherCategory, setIsCreatingOtherCategory] = useState(false);

  const updateWorkspaceParams = useCallback(
    (updates) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          Object.entries(updates).forEach(([key, value]) => {
            const shouldDelete =
              value === undefined ||
              value === null ||
              value === "" ||
              (key === "month" && value === "all") ||
              (key === "status" && value === "all") ||
              (key === "category" && value === "all") ||
              (key === "overdue" && value === false) ||
              (key === "page" && value === 1);

            if (shouldDelete) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee?._id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const activeWeightageTotalRaw = useMemo(
    () =>
      categories.reduce((total, category) => {
        if (!category?.isActive) {
          return total;
        }

        return total + getNumericWeightage(category);
      }, 0),
    [categories]
  );

  const activeWeightageTotal = useMemo(
    () => roundToTwoDecimals(activeWeightageTotalRaw),
    [activeWeightageTotalRaw]
  );

  const remainingActiveWeightage = useMemo(
    () => roundToTwoDecimals(WEIGHTAGE_CAP - activeWeightageTotalRaw),
    [activeWeightageTotalRaw]
  );

  const isValidStrictWeightage = useMemo(
    () => Math.abs(activeWeightageTotalRaw - WEIGHTAGE_CAP) <= STRICT_WEIGHTAGE_EPS,
    [activeWeightageTotalRaw]
  );

  const hasOtherCategory = useMemo(
    () =>
      categories.some((category) => {
        const normalizedName =
          typeof category?.name === "string" ? category.name.trim().toLowerCase() : "";
        return normalizedName === "other";
      }),
    [categories]
  );

  const editingCategoryActiveWeightage = useMemo(() => {
    if (!editingCategory || editingCategory?.isActive === false) {
      return 0;
    }

    return getNumericWeightage(editingCategory);
  }, [editingCategory]);

  const parsedFormWeightage = useMemo(
    () => parseWeightageValue(formData.weightage),
    [formData.weightage]
  );

  const projectedActiveWeightageAfterSave = useMemo(() => {
    const isDraftActive = Boolean(formData.isActive);
    const draftWeightage = parsedFormWeightage === null ? 0 : parsedFormWeightage;
    const adjustedCurrentTotal =
      editingCategory && editingCategory?.isActive !== false
        ? activeWeightageTotal - editingCategoryActiveWeightage
        : activeWeightageTotal;
    const projectedTotal = isDraftActive
      ? adjustedCurrentTotal + draftWeightage
      : adjustedCurrentTotal;

    return roundToTwoDecimals(projectedTotal);
  }, [
    activeWeightageTotal,
    editingCategory,
    editingCategoryActiveWeightage,
    formData.isActive,
    parsedFormWeightage,
  ]);

  const projectedWeightageExceedsCap = projectedActiveWeightageAfterSave > WEIGHTAGE_CAP;
  const isWeightageMissing = formData.weightage === "";
  const isWeightageOutOfRange =
    parsedFormWeightage !== null &&
    (parsedFormWeightage < WEIGHTAGE_MIN || parsedFormWeightage > WEIGHTAGE_MAX);
  const isWeightageInvalid = parsedFormWeightage === null || isWeightageOutOfRange;
  const isSaveBlocked =
    isSubmitting ||
    isWeightageMissing ||
    isWeightageInvalid ||
    (Boolean(formData.isActive) && projectedWeightageExceedsCap);

  const financialYearOptions = useMemo(
    () => buildFinancialYearOptions({ centerYear: getFinancialYearStartYear() }),
    []
  );

  const selectedFinancialYearLabel = useMemo(() => {
    return (
      financialYearOptions.find(
        (option) => option.value === String(selectedFinancialYear)
      )?.label || `FY ${selectedFinancialYear}`
    );
  }, [financialYearOptions, selectedFinancialYear]);

  const selectedDateRange = useMemo(
    () => buildFinancialYearDateRange(selectedFinancialYear, selectedMonth),
    [selectedFinancialYear, selectedMonth]
  );

  const selectedSummaryPeriod = useMemo(() => {
    const month = FY_MONTH_VALUE_TO_NUMBER[selectedMonth] || null;
    const financialYearStart = Number.parseInt(String(selectedFinancialYear), 10);
    const year =
      month === null || !Number.isInteger(financialYearStart)
        ? null
        : month >= 4
        ? financialYearStart
        : financialYearStart + 1;

    return {
      month,
      year,
      usingAllMonths: month === null,
    };
  }, [selectedFinancialYear, selectedMonth]);

  const selectedSummaryMonthLabel = useMemo(
    () =>
      FY_MONTH_OPTIONS.find((monthOption) => monthOption.value === selectedMonth)
        ?.label || "All Months",
    [selectedMonth]
  );

  const isKpiScoreEnabled = useMemo(
    () =>
      Boolean(selectedEmployeeId) &&
      !loadingCategories &&
      isValidStrictWeightage,
    [isValidStrictWeightage, loadingCategories, selectedEmployeeId]
  );

  const strictWeightageWarningMessage = useMemo(() => {
    if (!selectedEmployeeId || loadingCategories || isValidStrictWeightage) {
      return "";
    }

    return `Weightage must be exactly 100% (currently ${formatFixedTwoDecimals(
      activeWeightageTotal
    )}%). KPI score will not generate until it is 100%. Remaining: ${formatFixedTwoDecimals(
      remainingActiveWeightage
    )}%.`;
  }, [
    activeWeightageTotal,
    isValidStrictWeightage,
    loadingCategories,
    remainingActiveWeightage,
    selectedEmployeeId,
  ]);

  const performanceSummaryCards = useMemo(
    () => [
      {
        label: "Monthly Score",
        value:
          isKpiScoreEnabled && Number.isFinite(Number(performanceSummary.monthlyScore))
            ? formatMetricNumber(performanceSummary.monthlyScore)
            : "—",
      },
      {
        label: "Yearly Score",
        value:
          isKpiScoreEnabled && Number.isFinite(Number(performanceSummary.yearlyScore))
            ? formatMetricNumber(performanceSummary.yearlyScore)
            : "—",
      },
      {
        label: "Earned Points (Completed)",
        value: formatMetricNumber(performanceSummary.earnedPointsTotal),
      },
      {
        label: "Potential Points (Open)",
        value: formatMetricNumber(performanceSummary.potentialPointsTotal),
      },
      {
        label: "Completed Tasks",
        value: formatMetricNumber(performanceSummary.completedCount),
      },
      {
        label: "Open Tasks",
        value: formatMetricNumber(performanceSummary.openCount),
      },
      {
        label: "Overdue Tasks",
        value: formatMetricNumber(performanceSummary.overdueCount),
      },
    ],
    [isKpiScoreEnabled, performanceSummary]
  );

  const taskCategoryOptions = useMemo(() => {
    const categorySet = new Set();

    performanceTasks.forEach((task) => {
      const categoryName =
        typeof task?.categoryName === "string" ? task.categoryName.trim() : "";
      if (categoryName) {
        categorySet.add(categoryName);
      }
    });

    return Array.from(categorySet).sort((first, second) =>
      first.localeCompare(second)
    );
  }, [performanceTasks]);

  const filteredPerformanceTasks = useMemo(() => {
    return performanceTasks.filter((task) => {
      const normalizedStatus =
        typeof task?.status === "string" ? task.status.trim().toLowerCase() : "";

      if (taskStatusFilter === "completed" && normalizedStatus !== "completed") {
        return false;
      }

      if (taskStatusFilter === "open" && normalizedStatus === "completed") {
        return false;
      }

      if (taskCategoryFilter !== "all" && task?.categoryName !== taskCategoryFilter) {
        return false;
      }

      if (showOnlyOverdueTasks && Number(task?.lateDays) <= 0) {
        return false;
      }

      return true;
    });
  }, [performanceTasks, showOnlyOverdueTasks, taskCategoryFilter, taskStatusFilter]);

  const taskTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredPerformanceTasks.length / TASKS_PAGE_SIZE)),
    [filteredPerformanceTasks.length]
  );

  const paginatedPerformanceTasks = useMemo(() => {
    const startIndex = (taskCurrentPage - 1) * TASKS_PAGE_SIZE;
    return filteredPerformanceTasks.slice(startIndex, startIndex + TASKS_PAGE_SIZE);
  }, [filteredPerformanceTasks, taskCurrentPage]);

  const taskPageStart = filteredPerformanceTasks.length
    ? (taskCurrentPage - 1) * TASKS_PAGE_SIZE + 1
    : 0;
  const taskPageEnd = filteredPerformanceTasks.length
    ? Math.min(taskCurrentPage * TASKS_PAGE_SIZE, filteredPerformanceTasks.length)
    : 0;

  const loadEmployees = useCallback(async () => {
    if (readOnly) {
      setLoadingEmployees(false);

      if (!currentUserId) {
        setEmployees([]);
        setSelectedEmployeeId("");
        return;
      }

      setEmployees([
        {
          _id: currentUserId,
          name: currentUserName,
          email: currentUserEmail,
          role: currentUserRole,
        },
      ]);
      setSelectedEmployeeId(currentUserId);
      return;
    }

    try {
      setLoadingEmployees(true);
      const employeeList = await getEmployeesForKraKpi();
      setEmployees(employeeList);
    } catch (error) {
      console.error("Failed to load employees for KRA/KPI", error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to load employees. Please try again."
      );
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [currentUserEmail, currentUserId, currentUserName, currentUserRole, readOnly]);

  const loadCategories = useCallback(
    async (employeeId) => {
      if (!employeeId) {
        setCategories([]);
        return;
      }

      try {
        setLoadingCategories(true);
        const list = await getKraKpiCategories({
          employeeId,
          month: selectedMonth,
        });
        setCategories(list);
      } catch (error) {
        console.error("Failed to load KRA/KPI categories", error);
        toast.error(
          error?.response?.data?.message ||
            "Unable to load categories. Please try again."
        );
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    },
    [selectedMonth]
  );

  const loadMultiplierProfile = useCallback(async (employeeId) => {
    if (!employeeId) {
      setMultiplierFormData(createInitialMultiplierFormState());
      setMultiplierFormErrors({});
      setUsingDefaultMultipliers(false);
      return;
    }

    try {
      setLoadingMultipliers(true);
      const profile = await getKraKpiMultiplierProfile({ employeeId });
      setMultiplierFormData(mapMultiplierProfileToFormState(profile));
      setMultiplierFormErrors({});
      setUsingDefaultMultipliers(!profile?._id);
    } catch (error) {
      console.error("Failed to load KRA multipliers", error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to load multipliers. Please try again."
      );
      setMultiplierFormData(createInitialMultiplierFormState());
      setMultiplierFormErrors({});
      setUsingDefaultMultipliers(true);
    } finally {
      setLoadingMultipliers(false);
    }
  }, []);

  const loadKraKpiSummary = useCallback(
    async (employeeId) => {
      if (!employeeId) {
        setPerformanceSummary(createInitialPerformanceSummaryState());
        setPerformanceTasks([]);
        setLoadingSummary(false);
        setLoadingPerformanceTasks(false);
        return;
      }

      try {
        setLoadingSummary(true);
        setLoadingPerformanceTasks(true);
        const response = await getKraKpiSummary({
          employeeId,
          financialYear: selectedFinancialYear,
          month: selectedMonth,
          startDate: selectedDateRange.startDate?.toISOString(),
          endDate: selectedDateRange.endDate?.toISOString(),
        });
        setPerformanceSummary(response?.summary || createInitialPerformanceSummaryState());
        setPerformanceTasks(Array.isArray(response?.tasks) ? response.tasks : []);
      } catch (error) {
        if (isWeightageStrictModeError(error)) {
          try {
            const fallbackTasks = await getKraPerformanceTasks({
              employeeId,
              month: selectedSummaryPeriod.month,
              year: selectedSummaryPeriod.year,
              financialYear: selectedFinancialYear,
              startDate: selectedDateRange.startDate?.toISOString(),
              endDate: selectedDateRange.endDate?.toISOString(),
              status: "all",
            });
            setPerformanceTasks(fallbackTasks);
            setPerformanceSummary(
              buildSummaryFromTasks({
                employeeId,
                month: selectedSummaryPeriod.month,
                year: selectedSummaryPeriod.year,
                tasks: fallbackTasks,
              })
            );
          } catch (fallbackError) {
            console.error("Failed to load fallback KRA/KPI tasks", fallbackError);
            toast.error(
              fallbackError?.response?.data?.message ||
                "Unable to load task scores. Please try again."
            );
            setPerformanceSummary(createInitialPerformanceSummaryState());
            setPerformanceTasks([]);
          }
        } else {
          console.error("Failed to load KRA/KPI summary", error);
          toast.error(
            error?.response?.data?.message ||
              "Unable to load performance summary. Please try again."
          );
          setPerformanceSummary(createInitialPerformanceSummaryState());
          setPerformanceTasks([]);
        }
      } finally {
        setLoadingSummary(false);
        setLoadingPerformanceTasks(false);
      }
    },
    [
      selectedDateRange.endDate,
      selectedDateRange.startDate,
      selectedFinancialYear,
      selectedMonth,
      selectedSummaryPeriod.month,
      selectedSummaryPeriod.year,
    ]
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!selectedEmployeeId || loadingEmployees) {
      return;
    }

    const hasSelectedEmployee = employees.some(
      (employee) => employee?._id === selectedEmployeeId
    );

    if (!hasSelectedEmployee) {
      setSelectedEmployeeId("");
    }
  }, [employees, loadingEmployees, selectedEmployeeId, setSelectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setCategories([]);
      return;
    }

    setCategories([]);
    loadCategories(selectedEmployeeId);
  }, [loadCategories, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setMultiplierFormData(createInitialMultiplierFormState());
      setMultiplierFormErrors({});
      setUsingDefaultMultipliers(false);
      return;
    }

    loadMultiplierProfile(selectedEmployeeId);
  }, [loadMultiplierProfile, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setPerformanceSummary(createInitialPerformanceSummaryState());
      setPerformanceTasks([]);
      setLoadingSummary(false);
      setLoadingPerformanceTasks(false);
      return;
    }

    loadKraKpiSummary(selectedEmployeeId);
  }, [loadKraKpiSummary, selectedEmployeeId]);

  useEffect(() => {
    setTaskCurrentPage(1);
  }, [
    selectedEmployeeId,
    selectedFinancialYear,
    selectedMonth,
    showOnlyOverdueTasks,
    taskCategoryFilter,
    taskStatusFilter,
  ]);

  useEffect(() => {
    if (taskCategoryFilter === "all") {
      return;
    }

    if (!taskCategoryOptions.includes(taskCategoryFilter)) {
      setTaskCategoryFilter("all");
    }
  }, [taskCategoryFilter, taskCategoryOptions]);

  useEffect(() => {
    setTaskCurrentPage((previousPage) => Math.min(previousPage, taskTotalPages));
  }, [taskTotalPages]);

  const handleOpenCreateModal = () => {
    if (readOnly) {
      return;
    }

    setEditingCategory(null);
    setFormData(createInitialFormState());
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category) => {
    if (readOnly) {
      return;
    }

    setEditingCategory(category);
    setFormData({
      name: category?.name || "",
      basePoints:
        category?.basePoints === null || category?.basePoints === undefined
          ? ""
          : String(category.basePoints),
      weightage:
        category?.weightage === null || category?.weightage === undefined
          ? ""
          : String(category.weightage),
      isActive: category?.isActive !== false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData(createInitialFormState());
    setFormErrors({});
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Category name is required.";
    }

    if (formData.basePoints === "") {
      nextErrors.basePoints = "Base points are required.";
    } else if (Number.isNaN(Number(formData.basePoints))) {
      nextErrors.basePoints = "Base points must be a valid number.";
    } else if (Number(formData.basePoints) < 0) {
      nextErrors.basePoints = "Base points cannot be negative.";
    }

    if (formData.weightage === "") {
      nextErrors.weightage = "Weightage is required.";
    } else if (parsedFormWeightage === null) {
      nextErrors.weightage = "Weightage must be a valid number.";
    } else if (
      parsedFormWeightage < WEIGHTAGE_MIN ||
      parsedFormWeightage > WEIGHTAGE_MAX
    ) {
      nextErrors.weightage = `Weightage must be between ${WEIGHTAGE_MIN} and ${WEIGHTAGE_MAX}.`;
    }

    if (
      !nextErrors.weightage &&
      Boolean(formData.isActive) &&
      projectedWeightageExceedsCap
    ) {
      nextErrors.weightage = `Total active weightage after save: ${formatFixedTwoDecimals(
        projectedActiveWeightageAfterSave
      )}% (must be <= 100%).`;
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (readOnly) {
      return;
    }

    if (!selectedEmployeeId) {
      toast.error("Please select an employee first.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formData.name.trim(),
      basePoints: Number(formData.basePoints),
      weightage: Number(formData.weightage),
      isActive: Boolean(formData.isActive),
    };

    try {
      setIsSubmitting(true);

      if (editingCategory) {
        const editingCategoryId = getCategoryId(editingCategory);
        if (!editingCategoryId) {
          toast.error("Unable to update this category.");
          return;
        }

        const updatedCategory = await updateKraKpiCategory(
          editingCategoryId,
          payload
        );
        const updatedCategoryId = getCategoryId(updatedCategory) || editingCategoryId;

        setCategories((previousCategories) =>
          previousCategories.map((category) =>
            getCategoryId(category) === updatedCategoryId
              ? { ...category, ...updatedCategory }
              : category
          )
        );
        toast.success("Category updated successfully.");
      } else {
        const createdCategory = await createKraKpiCategory({
          employeeId: selectedEmployeeId,
          ...payload,
        });
        const createdCategoryId = getCategoryId(createdCategory);

        if (createdCategoryId) {
          setCategories((previousCategories) => [
            ...previousCategories,
            createdCategory,
          ]);
        } else {
          await loadCategories(selectedEmployeeId);
        }

        toast.success("Category added successfully.");
      }

      handleCloseModal();
    } catch (error) {
      console.error("Failed to save KRA/KPI category", error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to save category. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    if (readOnly) {
      return;
    }

    const categoryId = getCategoryId(category);
    if (!categoryId) {
      toast.error("Unable to delete this category.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${category?.name || "this category"}"?`
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteKraKpiCategory(categoryId);
      setCategories((previousCategories) =>
        previousCategories.filter(
          (entry) => getCategoryId(entry) !== categoryId
        )
      );
      toast.success("Category deleted.");
    } catch (error) {
      console.error("Failed to delete KRA/KPI category", error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to delete category. Please try again."
      );
    }
  };

  const handleToggleActive = async (category) => {
    if (readOnly) {
      return;
    }

    const categoryId = getCategoryId(category);
    if (!categoryId || pendingActiveToggleId || pendingApprovalToggleId) {
      return;
    }

    const categoryWeightage = parseWeightageValue(category?.weightage);
    if (categoryWeightage === null) {
      toast.error("Weightage is required before changing active status.");
      return;
    }

    const nextIsActive = !category?.isActive;
    setPendingActiveToggleId(categoryId);
    setCategories((previousCategories) =>
      previousCategories.map((entry) =>
        getCategoryId(entry) === categoryId
          ? { ...entry, isActive: nextIsActive }
          : entry
      )
    );

    try {
      const updatedCategory = await updateKraKpiCategory(categoryId, {
        name: category?.name || "",
        basePoints: Number(category?.basePoints) || 0,
        weightage: categoryWeightage,
        isActive: nextIsActive,
        requiresApproval: category?.requiresApproval === true,
      });

      const updatedCategoryId = getCategoryId(updatedCategory) || categoryId;
      setCategories((previousCategories) =>
        previousCategories.map((entry) =>
          getCategoryId(entry) === updatedCategoryId
            ? { ...entry, ...updatedCategory }
            : entry
        )
      );
    } catch (error) {
      console.error("Failed to toggle active category", error);
      setCategories((previousCategories) =>
        previousCategories.map((entry) =>
          getCategoryId(entry) === categoryId
            ? { ...entry, isActive: category?.isActive !== false }
            : entry
        )
      );
      toast.error(
        error?.response?.data?.message ||
          "Unable to update active status. Please try again."
      );
    } finally {
      setPendingActiveToggleId("");
    }
  };

  const handleToggleRequiresApproval = async (category) => {
    if (readOnly) {
      return;
    }

    const categoryId = getCategoryId(category);
    if (!categoryId || pendingApprovalToggleId || pendingActiveToggleId) {
      return;
    }

    const categoryWeightage = parseWeightageValue(category?.weightage);
    if (categoryWeightage === null) {
      toast.error("Weightage is required before changing approval status.");
      return;
    }

    const nextRequiresApproval = !(category?.requiresApproval === true);
    setPendingApprovalToggleId(categoryId);
    setCategories((previousCategories) =>
      previousCategories.map((entry) =>
        getCategoryId(entry) === categoryId
          ? { ...entry, requiresApproval: nextRequiresApproval }
          : entry
      )
    );

    try {
      const updatedCategory = await updateKraKpiCategory(categoryId, {
        name: category?.name || "",
        basePoints: Number(category?.basePoints) || 0,
        weightage: categoryWeightage,
        isActive: category?.isActive !== false,
        requiresApproval: nextRequiresApproval,
      });

      const updatedCategoryId = getCategoryId(updatedCategory) || categoryId;
      setCategories((previousCategories) =>
        previousCategories.map((entry) =>
          getCategoryId(entry) === updatedCategoryId
            ? { ...entry, ...updatedCategory }
            : entry
        )
      );
    } catch (error) {
      console.error("Failed to toggle approval requirement", error);
      setCategories((previousCategories) =>
        previousCategories.map((entry) =>
          getCategoryId(entry) === categoryId
            ? { ...entry, requiresApproval: category?.requiresApproval === true }
            : entry
        )
      );
      toast.error(
        error?.response?.data?.message ||
          "Unable to update approval requirement. Please try again."
      );
    } finally {
      setPendingApprovalToggleId("");
    }
  };

  const handleCreateOtherCategory = async () => {
    if (readOnly) {
      return;
    }

    if (!selectedEmployeeId) {
      toast.error("Please select an employee first.");
      return;
    }

    if (hasOtherCategory) {
      toast.error("An 'Other' category already exists.");
      return;
    }

    if (remainingActiveWeightage <= 0) {
      toast.error("No remaining weightage available.");
      return;
    }

    try {
      setIsCreatingOtherCategory(true);
      const createdCategory = await createKraKpiCategory({
        employeeId: selectedEmployeeId,
        name: "Other",
        basePoints: 1,
        weightage: remainingActiveWeightage,
        isActive: true,
        requiresApproval: false,
      });
      const createdCategoryId = getCategoryId(createdCategory);

      if (createdCategoryId) {
        setCategories((previousCategories) => [
          ...previousCategories,
          createdCategory,
        ]);
      } else {
        await loadCategories(selectedEmployeeId);
      }

      toast.success("Created 'Other' category with remaining weightage.");
    } catch (error) {
      console.error("Failed to create 'Other' category", error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to create 'Other' category. Please try again."
      );
    } finally {
      setIsCreatingOtherCategory(false);
    }
  };

  const handleMultiplierFieldChange = (fieldKey, value) => {
    if (readOnly) {
      return;
    }

    setMultiplierFormData((previousData) => ({
      ...previousData,
      [fieldKey]: value,
    }));
    setMultiplierFormErrors((previousErrors) => {
      if (!previousErrors[fieldKey]) {
        return previousErrors;
      }

      const nextErrors = { ...previousErrors };
      delete nextErrors[fieldKey];
      return nextErrors;
    });
  };

  const validateMultiplierForm = () => {
    const nextErrors = {};
    const fieldDefinitions = [
      ...PRIORITY_MULTIPLIER_FIELDS,
      ...TIMELINESS_MULTIPLIER_FIELDS,
    ];

    fieldDefinitions.forEach((field) => {
      const fieldValue = Number(multiplierFormData[field.key]);
      if (!Number.isFinite(fieldValue) || fieldValue <= 0) {
        nextErrors[field.key] = `${field.label} multiplier must be greater than 0.`;
      }
    });

    setMultiplierFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveMultipliers = async () => {
    if (readOnly) {
      return;
    }

    if (!selectedEmployeeId) {
      toast.error("Please select an employee first.");
      return;
    }

    if (!validateMultiplierForm()) {
      return;
    }

    const priorityMultipliers = PRIORITY_MULTIPLIER_FIELDS.reduce(
      (accumulator, field) => ({
        ...accumulator,
        [field.key]: Number(multiplierFormData[field.key]),
      }),
      {}
    );

    const timelinessMultipliers = TIMELINESS_MULTIPLIER_FIELDS.map((field) => ({
      maxLateDays: field.maxLateDays,
      multiplier: Number(multiplierFormData[field.key]),
    }));

    try {
      setIsSavingMultipliers(true);
      const savedProfile = await updateKraKpiMultiplierProfile({
        employeeId: selectedEmployeeId,
        priorityMultipliers,
        timelinessMultipliers,
      });

      setMultiplierFormData(mapMultiplierProfileToFormState(savedProfile));
      setMultiplierFormErrors({});
      setUsingDefaultMultipliers(!savedProfile?._id);
      toast.success("Employee multipliers saved.");
    } catch (error) {
      console.error("Failed to save KRA multipliers", error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to save multipliers. Please try again."
      );
    } finally {
      setIsSavingMultipliers(false);
    }
  };

  const handleTaskPageChange = (pageNumber) => {
    setTaskCurrentPage((previousPage) => {
      const nextPage = Math.min(Math.max(pageNumber, 1), taskTotalPages);
      return nextPage === previousPage ? previousPage : nextPage;
    });
  };

  const handleFinancialYearChange = (event) => {
    updateWorkspaceParams({
      fy: event.target.value,
      month: "all",
      page: 1,
    });
  };

  const handleMonthChange = (event) => {
    updateWorkspaceParams({
      month: event.target.value,
      page: 1,
    });
  };

  return (
    <DashboardLayout activeMenu="KRA / KPI">
      <div className="page-shell">
        <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.08),transparent_36%)]" />
          <div className="relative">
            <h1 className="text-[28px] font-bold text-slate-900 sm:text-[30px]">
              KRA / KPI
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {readOnly
                ? "View your task performance and KRA/KPI score details."
                : "Configure employee-wise categories and points."}
            </p>
          </div>
        </section>

        <section className="card">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label
                htmlFor="employeeSelect"
                className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400"
              >
                Employee
              </label>
              <select
                id="employeeSelect"
                value={selectedEmployeeId}
                onChange={(event) => {
                  if (!readOnly) {
                    updateWorkspaceParams({
                      employeeId: event.target.value,
                      page: 1,
                    });
                  }
                }}
                disabled={loadingEmployees || readOnly}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
              >
                <option value="">
                  {readOnly
                    ? currentUserId
                      ? "Your profile"
                      : "Profile unavailable"
                    : loadingEmployees
                    ? "Loading employees..."
                    : "Select employee"}
                </option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name}
                    {employee.email ? ` (${employee.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="financialYearSelect"
                className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400"
              >
                Financial Year
              </label>
              <select
                id="financialYearSelect"
                value={selectedFinancialYear}
                onChange={handleFinancialYearChange}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {financialYearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="monthSelect"
                className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400"
              >
                Month
              </label>
              <select
                id="monthSelect"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {FY_MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Performance Summary
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {selectedEmployee
                  ? `${selectedSummaryMonthLabel} ${selectedSummaryPeriod.year} snapshot for ${selectedEmployee.name}.`
                  : "Select an employee to view performance metrics."}
              </p>
            </div>
          </div>

          {!selectedEmployeeId ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
              Select an employee to load the performance summary.
            </div>
          ) : loadingSummary ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
              <LuLoader className="animate-spin text-base" /> Loading summary...
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {performanceSummaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-700/70 dark:bg-slate-900/50"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {strictWeightageWarningMessage ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
              {strictWeightageWarningMessage}
            </div>
          ) : null}
          {selectedEmployeeId ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">
              Strict mode: total active weightage must equal 100%.
            </p>
          ) : null}

          {selectedEmployeeId ? (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-300">
              Showing {selectedSummaryMonthLabel} in {selectedFinancialYearLabel}.
            </p>
          ) : null}
        </section>

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Tasks & Scores
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {selectedEmployee
                  ? `${selectedSummaryMonthLabel} (${selectedFinancialYearLabel}) task-level scoring for ${selectedEmployee.name}.`
                  : "Select an employee to view tasks and score details."}
              </p>
            </div>
          </div>

          {!selectedEmployeeId ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
              Select an employee to load task scores.
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="taskStatusFilter"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
                  >
                    Status
                  </label>
                  <select
                    id="taskStatusFilter"
                    value={taskStatusFilter}
                    onChange={(event) =>
                      updateWorkspaceParams({
                        status: event.target.value,
                        page: 1,
                      })
                    }
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
                  >
                    {TASK_STATUS_FILTER_OPTIONS.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="taskCategoryFilter"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
                  >
                    Category
                  </label>
                  <select
                    id="taskCategoryFilter"
                    value={taskCategoryFilter}
                    onChange={(event) =>
                      updateWorkspaceParams({
                        category: event.target.value,
                        page: 1,
                      })
                    }
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
                  >
                    <option value="all">All Categories</option>
                    {taskCategoryOptions.map((categoryName) => (
                      <option key={categoryName} value={categoryName}>
                        {categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Overdue
                  </label>
                  <label className="inline-flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={showOnlyOverdueTasks}
                      onChange={(event) =>
                        updateWorkspaceParams({
                          overdue: event.target.checked,
                          page: 1,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40"
                    />
                    Show overdue tasks only
                  </label>
                </div>
              </div>

              {loadingPerformanceTasks ? (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
                  <LuLoader className="animate-spin text-base" /> Loading tasks...
                </div>
              ) : filteredPerformanceTasks.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
                  {performanceTasks.length === 0
                    ? "No tasks found for this period."
                    : "No tasks match the selected filters."}
                </div>
              ) : (
                <>
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600 dark:divide-slate-800 dark:text-slate-300">
                      <thead>
                        <tr className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                          <th scope="col" className="px-4 py-3">
                            Task Title
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Status
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Category
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Priority
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Due Date
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Late Days
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                        {paginatedPerformanceTasks.map((task) => {
                          const isUnscored = Boolean(task?.isUnscored);
                          const pointsLabel = isUnscored
                            ? String(task?.scoringLabel || "Unscored").toUpperCase()
                            : task?.pointsType === "earned"
                            ? "FINAL"
                            : "LIVE";
                          const pointsBadgeClasses = isUnscored
                            ? "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                            : task?.pointsType === "earned"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/10 dark:text-sky-300";

                          return (
                            <tr
                              key={task._id}
                              className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                            >
                              <td className="px-4 py-4 font-medium text-slate-800 dark:text-slate-100">
                                {task?.title || "-"}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClasses(
                                    task?.status
                                  )}`}
                                >
                                  {task?.status || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-4">{task?.categoryName || "-"}</td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityBadgeClasses(
                                    task?.priority
                                  )}`}
                                >
                                  {task?.priority || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {formatDateLabel(task?.dueDate, "-")}
                              </td>
                              <td
                                className={`px-4 py-4 font-semibold ${
                                  Number(task?.lateDays) > 0
                                    ? "text-rose-600 dark:text-rose-300"
                                    : "text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {Number(task?.lateDays) || 0}
                              </td>
                              <td className="px-4 py-4">
                                <div className="inline-flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                                    {formatMetricNumber(task?.pointsValue)}
                                  </span>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${pointsBadgeClasses}`}
                                  >
                                    {pointsLabel}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {taskTotalPages > 1 ? (
                    <div className="mt-6 flex flex-col items-center gap-3 text-sm text-slate-600 dark:text-slate-200">
                      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
                        <button
                          type="button"
                          onClick={() => handleTaskPageChange(taskCurrentPage - 1)}
                          disabled={taskCurrentPage === 1}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:-translate-y-0.5 hover:text-indigo-600 disabled:translate-y-0 disabled:text-slate-300 dark:text-slate-200 dark:hover:text-indigo-200"
                        >
                          <LuChevronLeft className="text-lg" />
                        </button>
                        <div className="inline-flex items-center gap-1">
                          {Array.from({ length: taskTotalPages }).map((_, index) => {
                            const pageNumber = index + 1;
                            const isActive = pageNumber === taskCurrentPage;
                            return (
                              <button
                                key={pageNumber}
                                type="button"
                                onClick={() => handleTaskPageChange(pageNumber)}
                                className={`h-10 min-w-[2.75rem] rounded-full px-3 text-sm font-semibold transition ${
                                  isActive
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-slate-600 hover:-translate-y-0.5 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-200"
                                }`}
                                aria-current={isActive ? "page" : undefined}
                              >
                                {pageNumber}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTaskPageChange(taskCurrentPage + 1)}
                          disabled={taskCurrentPage === taskTotalPages}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:-translate-y-0.5 hover:text-indigo-600 disabled:translate-y-0 disabled:text-slate-300 dark:text-slate-200 dark:hover:text-indigo-200"
                        >
                          <LuChevronRight className="text-lg" />
                        </button>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Showing {taskPageStart}-{taskPageEnd} of{" "}
                        {filteredPerformanceTasks.length}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </section>

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Employee Multipliers
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {selectedEmployee
                  ? `Configure priority and timeliness multipliers for ${selectedEmployee.name}.`
                  : "Select an employee to configure multipliers."}
              </p>
            </div>
            {selectedEmployeeId && !loadingMultipliers && usingDefaultMultipliers ? (
              <span className="inline-flex h-8 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300">
                Using defaults
              </span>
            ) : null}
          </div>

          {!selectedEmployeeId ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
              Select an employee to configure multiplier values.
            </div>
          ) : loadingMultipliers ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
              <LuLoader className="animate-spin text-base" /> Loading multipliers...
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Priority
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {PRIORITY_MULTIPLIER_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label
                        htmlFor={`multiplier-${field.key}`}
                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                      >
                        {field.label}
                      </label>
                      <input
                        id={`multiplier-${field.key}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={multiplierFormData[field.key]}
                        onChange={(event) =>
                          handleMultiplierFieldChange(field.key, event.target.value)
                        }
                        disabled={readOnly}
                        className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-800 shadow-inner transition focus:outline-none focus:ring-2 dark:bg-slate-950/70 dark:text-slate-100 ${
                          multiplierFormErrors[field.key]
                            ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100 dark:border-rose-400/40"
                            : "border-slate-200 focus:border-indigo-300 focus:ring-indigo-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                        }`}
                      />
                      {multiplierFormErrors[field.key] ? (
                        <p className="text-xs font-medium text-rose-500">
                          {multiplierFormErrors[field.key]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Timeliness
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {TIMELINESS_MULTIPLIER_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label
                        htmlFor={`multiplier-${field.key}`}
                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                      >
                        {field.label}
                      </label>
                      <input
                        id={`multiplier-${field.key}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={multiplierFormData[field.key]}
                        onChange={(event) =>
                          handleMultiplierFieldChange(field.key, event.target.value)
                        }
                        disabled={readOnly}
                        className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-800 shadow-inner transition focus:outline-none focus:ring-2 dark:bg-slate-950/70 dark:text-slate-100 ${
                          multiplierFormErrors[field.key]
                            ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100 dark:border-rose-400/40"
                            : "border-slate-200 focus:border-indigo-300 focus:ring-indigo-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                        }`}
                      />
                      {multiplierFormErrors[field.key] ? (
                        <p className="text-xs font-medium text-rose-500">
                          {multiplierFormErrors[field.key]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {!readOnly ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveMultipliers}
                    disabled={isSavingMultipliers}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingMultipliers ? (
                      <>
                        <LuLoader className="animate-spin text-base" /> Saving...
                      </>
                    ) : (
                      <>
                        <LuSave className="text-base" /> Save Multipliers
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Categories & Points
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {selectedEmployee
                  ? `Managing categories for ${selectedEmployee.name}`
                  : "Select an employee to begin."}
              </p>
              {selectedEmployeeId ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      isValidStrictWeightage
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : activeWeightageTotal < WEIGHTAGE_CAP
                        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300"
                        : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300"
                    }`}
                  >
                    Total Weightage Used: {formatFixedTwoDecimals(activeWeightageTotal)}% / 100.00%
                  </p>
                  <p
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      isValidStrictWeightage
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : remainingActiveWeightage > 0
                        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300"
                        : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300"
                    }`}
                  >
                    Remaining: {formatFixedTwoDecimals(remainingActiveWeightage)}%
                  </p>
                </div>
              ) : null}
              {selectedEmployeeId ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                  Strict mode: total active weightage must equal 100%.
                </p>
              ) : null}
            </div>

            {!readOnly ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {selectedEmployeeId &&
                remainingActiveWeightage > 0 &&
                !hasOtherCategory ? (
                  <button
                    type="button"
                    onClick={handleCreateOtherCategory}
                    disabled={isCreatingOtherCategory || loadingCategories}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                  >
                    {isCreatingOtherCategory ? (
                      <>
                        <LuLoader className="animate-spin text-base" /> Creating...
                      </>
                    ) : (
                      "Create 'Other' Category With Remaining %"
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  disabled={!selectedEmployeeId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LuPlus className="text-base" /> Add Category
                </button>
              </div>
            ) : null}
          </div>

          {!selectedEmployeeId ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
              Select an employee to configure KRA/KPI.
            </div>
          ) : loadingCategories ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
              <LuLoader className="animate-spin text-base" /> Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center dark:border-slate-700/70 dark:bg-slate-900/50">
              <p className="text-sm text-slate-500 dark:text-slate-300">
                No categories found for this employee.
              </p>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700"
                >
                  <LuPlus className="text-base" /> Add Category
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600 dark:divide-slate-800 dark:text-slate-300">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    <th scope="col" className="px-4 py-3">
                      Category Name
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Base Points
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Weightage %
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Approval Required
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Active
                    </th>
                    {!readOnly ? (
                      <th scope="col" className="px-4 py-3 text-right">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {categories.map((category) => {
                    const categoryId = getCategoryId(category);
                    const isActiveTogglePending = pendingActiveToggleId === categoryId;
                    const isApprovalTogglePending =
                      pendingApprovalToggleId === categoryId;

                    return (
                      <tr
                        key={categoryId}
                        className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-4 font-medium text-slate-800 dark:text-slate-100">
                          {category?.name || "-"}
                        </td>
                        <td className="px-4 py-4">{Number(category?.basePoints) || 0}</td>
                        <td className="px-4 py-4">
                          {category?.weightage === "" ||
                          category?.weightage === null ||
                          category?.weightage === undefined
                            ? "-"
                            : Number(category.weightage)}
                        </td>
                        <td className="px-4 py-4">
                          {readOnly ? (
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {category?.requiresApproval ? "Yes" : "No"}
                            </span>
                          ) : (
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={category?.requiresApproval === true}
                                onChange={() => handleToggleRequiresApproval(category)}
                                disabled={isApprovalTogglePending}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Set ${category?.name || "category"} approval requirement`}
                              />
                            </label>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {readOnly ? (
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {category?.isActive ? "Yes" : "No"}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(category)}
                              disabled={isActiveTogglePending}
                              className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition ${
                                category?.isActive
                                  ? "bg-emerald-500"
                                  : "bg-slate-300 dark:bg-slate-600"
                              } ${isActiveTogglePending ? "cursor-not-allowed opacity-70" : ""}`}
                              aria-label={`Set ${category?.name || "category"} active status`}
                            >
                              <span
                                className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
                                  category?.isActive ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          )}
                        </td>
                        {!readOnly ? (
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(category)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-100"
                                aria-label={`Edit ${category?.name || "category"}`}
                              >
                                <LuPencil className="text-sm" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(category)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-rose-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-rose-300 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                                aria-label={`Delete ${category?.name || "category"}`}
                              >
                                <LuTrash2 className="text-sm" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {!readOnly ? (
        <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? "Edit Category" : "Add Category"}
        maxWidthClass="max-w-xl"
      >
        <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor="categoryName"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Category Name
            </label>
            <input
              id="categoryName"
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              placeholder="Enter category name"
              className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-800 shadow-inner transition focus:outline-none focus:ring-2 dark:bg-slate-950/70 dark:text-slate-100 ${
                formErrors.name
                  ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100 dark:border-rose-400/40"
                  : "border-slate-200 focus:border-indigo-300 focus:ring-indigo-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
              }`}
            />
            {formErrors.name ? (
              <p className="text-xs font-medium text-rose-500">{formErrors.name}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="basePoints"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Base Points
              </label>
              <input
                id="basePoints"
                type="number"
                min="0"
                value={formData.basePoints}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    basePoints: event.target.value,
                  }))
                }
                placeholder="0"
                className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-800 shadow-inner transition focus:outline-none focus:ring-2 dark:bg-slate-950/70 dark:text-slate-100 ${
                  formErrors.basePoints
                    ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100 dark:border-rose-400/40"
                    : "border-slate-200 focus:border-indigo-300 focus:ring-indigo-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                }`}
              />
              {formErrors.basePoints ? (
                <p className="text-xs font-medium text-rose-500">
                  {formErrors.basePoints}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="weightage"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Weightage %
              </label>
              <input
                id="weightage"
                type="number"
                min={WEIGHTAGE_MIN}
                max={WEIGHTAGE_MAX}
                step="0.01"
                value={formData.weightage}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    weightage: event.target.value,
                  }))
                }
                placeholder="Enter weightage %"
                required
                className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-800 shadow-inner transition focus:outline-none focus:ring-2 dark:bg-slate-950/70 dark:text-slate-100 ${
                  formErrors.weightage
                    ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100 dark:border-rose-400/40"
                    : "border-slate-200 focus:border-indigo-300 focus:ring-indigo-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                }`}
              />
              {formErrors.weightage ? (
                <p className="text-xs font-medium text-rose-500">
                  {formErrors.weightage}
                </p>
              ) : null}
              <div className="space-y-1 pt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current active total: {formatFixedTwoDecimals(activeWeightageTotal)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Remaining: {formatFixedTwoDecimals(remainingActiveWeightage)}%
                </p>
                <p
                  className={`text-xs font-medium ${
                    Boolean(formData.isActive) && projectedWeightageExceedsCap
                      ? "text-rose-500"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Total active weightage after save:{" "}
                  {formatFixedTwoDecimals(projectedActiveWeightageAfterSave)}% (must be
                  {" <= "}100%)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40"
              />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaveBlocked}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <LuLoader className="animate-spin text-base" /> Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
        </Modal>
      ) : null}
    </DashboardLayout>
  );
};

export default KraKpiWorkspace;
