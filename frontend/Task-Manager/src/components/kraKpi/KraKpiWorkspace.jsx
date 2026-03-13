import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  LuBriefcaseBusiness,
  LuCalendarRange,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuFilePenLine,
  LuLayoutGrid,
  LuListChecks,
  LuPlus,
  LuTrendingUp,
  LuUser,
  LuTrash2,
  LuX,
} from "react-icons/lu";

import DashboardLayout from "../layouts/DashboardLayout";
import DeleteAlert from "../DeleteAlert";
import Modal from "../Modal";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";
import {
  buildFinancialYearOptions,
  getFinancialYearStartYear,
} from "../../utils/financialYearUtils";
import { matchesRole, normalizeRole } from "../../utils/roleUtils";

const KRA_COLUMN_SETUP_COLUMNS = [
  { key: "label", label: "Label", widthClass: "min-w-[220px]" },
  { key: "weightage", label: "Weightage %", widthClass: "min-w-[120px]" },
  { key: "targetText", label: "Target", widthClass: "min-w-[180px]" },
  { key: "sourceText", label: "Source", widthClass: "min-w-[170px]" },
  { key: "frequencyText", label: "Frequency", widthClass: "min-w-[130px]" },
  { key: "basePoints", label: "Base Points", widthClass: "min-w-[130px]" },
  { key: "requiresApproval", label: "Approval Required", widthClass: "min-w-[160px]" },
  { key: "order", label: "Order", widthClass: "min-w-[90px]" },
  { key: "isActive", label: "Active", widthClass: "min-w-[100px]" },
  { key: "actions", label: "Actions", widthClass: "min-w-[150px]" },
];

const createDefaultKraColumnForm = (employeeId = "") => ({
  id: "",
  employeeId,
  label: "",
  weightage: "",
  targetText: "",
  sourceText: "",
  frequencyText: "",
  basePoints: "",
  requiresApproval: false,
  order: "",
  isActive: true,
});

const MONTH_SEQUENCE = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const FREQUENCY_OPTIONS = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

const formatScore = (value) => {
  if (typeof value !== "number") {
    return value;
  }

  const rounded = Number(value.toFixed(4));
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
};

const buildMatrixColumns = (employeeColumns) => [
  { key: "label", label: "KRA Measure", widthClass: "min-w-[190px]" },
  { key: "month", label: "Month", widthClass: "min-w-[110px]" },
  ...employeeColumns.map((column) => ({
    key: column.id,
    label: column.isActive ? column.label : `${column.label} (Inactive)`,
    widthClass: "min-w-[220px]",
  })),
  { key: "finalScore", label: "Final Score", widthClass: "min-w-[130px]" },
];

const buildMetaRow = (label, employeeColumns, getValue) => {
  const row = { label, month: "", finalScore: "" };

  employeeColumns.forEach((column) => {
    row[column.id] = getValue(column);
  });

  return row;
};

const buildEmptyMonthRows = (month, employeeColumns) => {
  const achievedRow = { label: "Revenue Points", month, finalScore: "", tone: "standard" };
  const basePointsRow = { label: "Points", month, finalScore: "", tone: "standard" };
  const weightageRow = { label: "Weightage", month, finalScore: "", tone: "muted" };
  const finalScoreRow = {
    label: "Final Score",
    month,
    finalScore: "",
    tone: "final",
  };

  employeeColumns.forEach((column) => {
    achievedRow[column.id] = "";
    basePointsRow[column.id] = "";
    weightageRow[column.id] = "";
    finalScoreRow[column.id] = "";
  });

  return [achievedRow, basePointsRow, weightageRow, finalScoreRow];
};

const normalizeKraColumn = (column) => ({
  id: column?.id || column?._id || "",
  employeeId:
    typeof column?.employeeId === "object" && column?.employeeId !== null
      ? column.employeeId._id || column.employeeId.id || ""
      : column?.employeeId || "",
  label: column?.label || "",
  weightage: Number(column?.weightage || 0),
  targetText: column?.targetText || "",
  sourceText: column?.sourceText || "",
  frequencyText: column?.frequencyText || "",
  basePoints: Number(column?.basePoints || 0),
  requiresApproval: Boolean(column?.requiresApproval),
  order: Number(column?.order || 0),
  isActive: column?.isActive ?? true,
});

const getStickyColumnClass = (columnIndex) => {
  if (columnIndex === 0) {
    return "sticky left-0";
  }

  if (columnIndex === 1) {
    return "sticky left-[190px]";
  }

  return "";
};

const StatCard = ({ icon, label, value, hint }) => (
  <div className="rounded-[26px] border border-white/60 bg-white/80 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700/60 dark:bg-slate-900/60">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {value}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-primary/10 text-primary dark:border-slate-700 dark:bg-primary/15">
        {React.createElement(icon, { className: "h-5 w-5" })}
      </span>
    </div>
  </div>
);

const renderSetupBadge = (value, palette) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${palette}`}
  >
    {value}
  </span>
);

const ToggleField = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-700/80 dark:bg-slate-950/40">
    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        checked ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </label>
);

const KraKpiWorkspace = () => {
  const financialYearOptions = useMemo(
    () =>
      buildFinancialYearOptions({
        centerYear: getFinancialYearStartYear(),
        yearsBefore: 1,
        yearsAfter: 2,
      }),
    []
  );

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(
    financialYearOptions[1]?.value || financialYearOptions[0]?.value || ""
  );
  const [kraColumns, setKraColumns] = useState([]);
  const [kraMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isKraColumnsLoading, setIsKraColumnsLoading] = useState(false);
  const [isSavingKraColumn, setIsSavingKraColumn] = useState(false);
  const [isKraColumnModalOpen, setIsKraColumnModalOpen] = useState(false);
  const [kraColumnToDelete, setKraColumnToDelete] = useState(null);
  const [editingKraColumnId, setEditingKraColumnId] = useState("");
  const [kraColumnForm, setKraColumnForm] = useState(() => createDefaultKraColumnForm(""));
  const [kraColumnFormErrors, setKraColumnFormErrors] = useState({});

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      const users = Array.isArray(response.data) ? response.data : [];
      const employeeOptions = users
        .filter((user) => user?._id && !matchesRole(user?.role, "client"))
        .sort((firstUser, secondUser) => {
          const rolePriority = {
            super_admin: 0,
            admin: 1,
            member: 2,
          };

          const normalizedFirstRole = normalizeRole(firstUser?.role);
          const normalizedSecondRole = normalizeRole(secondUser?.role);
          const roleDifference =
            (rolePriority[normalizedFirstRole] ?? Number.MAX_SAFE_INTEGER) -
            (rolePriority[normalizedSecondRole] ?? Number.MAX_SAFE_INTEGER);

          if (roleDifference !== 0) {
            return roleDifference;
          }

          return (firstUser?.name || "").localeCompare(secondUser?.name || "");
        })
        .map((employee) => {
          const name = employee?.name?.trim() || employee?.email?.trim() || "Unnamed employee";
          const email = employee?.email?.trim();

          return {
            value: employee._id,
            label: email ? `${name} (${email})` : name,
          };
        });

      setEmployees(employeeOptions);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchKraColumns = async (employeeId) => {
    if (!employeeId) {
      setKraColumns([]);
      return;
    }

    try {
      setIsKraColumnsLoading(true);
      const response = await axiosInstance.get(API_PATHS.KRA_COLUMNS.GET_BY_EMPLOYEE(employeeId));
      const columns = Array.isArray(response.data)
        ? response.data.map(normalizeKraColumn)
        : [];

      console.debug("KRA columns fetch result:", {
        employeeId,
        count: columns.length,
        columns,
      });

      setKraColumns(columns);
    } catch (error) {
      console.error("Error fetching KRA columns:", error);
      const message =
        error?.response?.data?.message || "Unable to load KRA categories. Please try again.";
      toast.error(message);
      setKraColumns([]);
    } finally {
      setIsKraColumnsLoading(false);
    }
  };

  useEffect(() => {
    fetchKraColumns(selectedEmployee);
    setKraColumnForm(createDefaultKraColumnForm(selectedEmployee));
    setKraColumnFormErrors({});
  }, [selectedEmployee]);

  const selectedEmployeeLabel = useMemo(
    () =>
      employees.find((option) => option.value === selectedEmployee)?.label ||
      "Select employee",
    [employees, selectedEmployee]
  );

  const selectedFinancialYearLabel = useMemo(
    () =>
      financialYearOptions.find((option) => option.value === selectedFinancialYear)?.label ||
      "Select financial year",
    [financialYearOptions, selectedFinancialYear]
  );

  const selectedEmployeeColumnSetup = useMemo(
    () =>
      kraColumns.filter((column) => column.employeeId === selectedEmployee).sort(
        (firstColumn, secondColumn) => firstColumn.order - secondColumn.order
      ),
    [kraColumns, selectedEmployee]
  );
  const selectedEmployeeMatrixColumns = useMemo(
    () => buildMatrixColumns(selectedEmployeeColumnSetup),
    [selectedEmployeeColumnSetup]
  );
  const matrixMetaRows = useMemo(
    () => [
      buildMetaRow("Target", selectedEmployeeColumnSetup, (column) => column.targetText || "-"),
      buildMetaRow("Source", selectedEmployeeColumnSetup, (column) => column.sourceText || "-"),
      buildMetaRow(
        "Frequency",
        selectedEmployeeColumnSetup,
        (column) => column.frequencyText || "-"
      ),
    ],
    [selectedEmployeeColumnSetup]
  );
  const selectedEmployeeMonthlyPerformance = useMemo(
    () =>
      MONTH_SEQUENCE.map((month) => {
        const matrixRow =
          kraMatrix.find(
            (item) =>
              item?.employeeId === selectedEmployee &&
              item?.month?.toLowerCase?.() === month.toLowerCase()
          ) || {};

        return {
          month,
          columnScores: matrixRow.columnScores || {},
          finalScore: Number(matrixRow.finalScore || 0),
        };
      }),
    [kraMatrix, selectedEmployee]
  );
  const kraColumnWeightageSummary = useMemo(() => {
    const totalActiveWeightage = selectedEmployeeColumnSetup.reduce(
      (total, column) => total + (column.isActive ? Number(column.weightage) || 0 : 0),
      0
    );

    return {
      totalActiveWeightage,
      remainingWeightage: 100 - totalActiveWeightage,
      isOverweight: totalActiveWeightage > 100,
    };
  }, [selectedEmployeeColumnSetup]);
  const summary = useMemo(() => {
    const monthCount = selectedEmployeeMonthlyPerformance.length || 1;
    const hasMatrixValues = kraMatrix.some((item) => item?.employeeId === selectedEmployee);
    const annualFinalScore = selectedEmployeeMonthlyPerformance.reduce(
      (total, item) => total + item.finalScore,
      0
    );
    const highestMonth = hasMatrixValues
      ? selectedEmployeeMonthlyPerformance.reduce(
          (best, item) => (item.finalScore > best.finalScore ? item : best),
          selectedEmployeeMonthlyPerformance[0] || { month: "--", finalScore: 0 }
        ) || { month: "--", finalScore: 0 }
      : { month: "--", finalScore: 0 };
    const averageColumnScores = {};

    selectedEmployeeColumnSetup.forEach((column) => {
      const totalColumnScore = selectedEmployeeMonthlyPerformance.reduce(
        (total, item) =>
          total +
          Number(
            item.columnScores?.[column.id]?.weightedScore ??
              item.columnScores?.[column.id]?.finalScore ??
              0
          ),
        0
      );
      averageColumnScores[column.id] = totalColumnScore ? formatScore(totalColumnScore / monthCount) : "";
    });

    return {
      averageFinalScore: hasMatrixValues ? annualFinalScore / monthCount : 0,
      annualFinalScore,
      highestMonth,
      averageColumnScores,
    };
  }, [kraMatrix, selectedEmployee, selectedEmployeeColumnSetup, selectedEmployeeMonthlyPerformance]);
  const isEditingKraColumn = Boolean(editingKraColumnId);

  const resetKraColumnModalState = () => {
    setIsKraColumnModalOpen(false);
    setEditingKraColumnId("");
    setKraColumnForm(createDefaultKraColumnForm(selectedEmployee));
    setKraColumnFormErrors({});
  };

  const closeDeleteKraColumnAlert = () => {
    setKraColumnToDelete(null);
  };

  const openCreateKraColumnModal = () => {
    setEditingKraColumnId("");
    setKraColumnForm(createDefaultKraColumnForm(selectedEmployee));
    setKraColumnFormErrors({});
    setIsKraColumnModalOpen(true);
  };

  const openEditKraColumnModal = (column) => {
    setEditingKraColumnId(column.id);
    setKraColumnForm({
      ...column,
      weightage: `${column.weightage}`,
      basePoints: `${column.basePoints}`,
      order: `${column.order}`,
    });
    setKraColumnFormErrors({});
    setIsKraColumnModalOpen(true);
  };

  const handleKraColumnFormChange = (key, value) => {
    setKraColumnForm((current) => ({ ...current, [key]: value }));
    setKraColumnFormErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleKraColumnSubmit = async (event) => {
    event.preventDefault();

    const trimmedLabel = kraColumnForm.label.trim();
    const nextErrors = {};

    if (!selectedEmployee) {
      toast.error("Please select an employee first.");
      return;
    }

    if (!trimmedLabel) {
      nextErrors.label = "Column label is required.";
    }

    if (kraColumnForm.weightage === "" || Number(kraColumnForm.weightage) < 0) {
      nextErrors.weightage = "Weightage is required.";
    }

    if (kraColumnForm.basePoints === "" || Number(kraColumnForm.basePoints) < 0) {
      nextErrors.basePoints = "Base points are required.";
    }

    if (kraColumnForm.order === "" || Number(kraColumnForm.order) < 1) {
      nextErrors.order = "Order is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setKraColumnFormErrors(nextErrors);
      return;
    }

    const payload = {
      employeeId: selectedEmployee,
      label: trimmedLabel,
      weightage: Number(kraColumnForm.weightage),
      targetText: kraColumnForm.targetText.trim(),
      sourceText: kraColumnForm.sourceText.trim(),
      frequencyText: kraColumnForm.frequencyText.trim(),
      basePoints: Number(kraColumnForm.basePoints),
      requiresApproval: Boolean(kraColumnForm.requiresApproval),
      order: Number(kraColumnForm.order),
      isActive: Boolean(kraColumnForm.isActive),
    };

    console.debug("KRA column payload before save:", payload);

    try {
      setIsSavingKraColumn(true);

      if (editingKraColumnId) {
        const response = await axiosInstance.put(
          API_PATHS.KRA_COLUMNS.UPDATE(editingKraColumnId),
          payload
        );
        const savedColumn = normalizeKraColumn(response.data);

        console.debug("KRA column update response:", response.data);

        setKraColumns((currentRows) =>
          currentRows.map((row) => (row.id === editingKraColumnId ? savedColumn : row))
        );
        toast.success("KRA category updated successfully.");
      } else {
        const response = await axiosInstance.post(API_PATHS.KRA_COLUMNS.CREATE, payload);
        const savedColumn = normalizeKraColumn(response.data);

        console.debug("KRA column create response:", response.data);

        setKraColumns((currentRows) =>
          [...currentRows, savedColumn].sort(
            (firstRow, secondRow) => firstRow.order - secondRow.order
          )
        );
        toast.success("KRA category created successfully.");
      }

      await fetchKraColumns(selectedEmployee);
      resetKraColumnModalState();
    } catch (error) {
      console.error("Error saving KRA column:", error);
      const message =
        error?.response?.data?.message || "Unable to save KRA category. Please try again.";
      toast.error(message);
    } finally {
      setIsSavingKraColumn(false);
    }
  };

  const handleDeleteKraColumn = async (columnId) => {
    try {
      await axiosInstance.delete(API_PATHS.KRA_COLUMNS.DELETE(columnId));
      await fetchKraColumns(selectedEmployee);
      closeDeleteKraColumnAlert();
      toast.success("KRA category deleted successfully.");
    } catch (error) {
      console.error("Error deleting KRA column:", error);
      const message =
        error?.response?.data?.message || "Unable to delete KRA category. Please try again.";
      toast.error(message);
    }
  };

  const handleMoveKraColumn = async (columnId, direction) => {
    const currentColumn = kraColumns.find((row) => row.id === columnId);
    if (!currentColumn) {
      return;
    }

    const employeeRows = kraColumns
      .filter((row) => row.employeeId === currentColumn.employeeId)
      .sort((firstRow, secondRow) => firstRow.order - secondRow.order);

    const currentIndex = employeeRows.findIndex((row) => row.id === columnId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= employeeRows.length) {
      return;
    }

    const reorderedRows = [...employeeRows];
    const [movedRow] = reorderedRows.splice(currentIndex, 1);
    reorderedRows.splice(targetIndex, 0, movedRow);

    const normalizedEmployeeRows = reorderedRows.map((row, index) => ({
      ...row,
      order: index + 1,
    }));

    try {
      await Promise.all(
        normalizedEmployeeRows.map((row) =>
          axiosInstance.put(API_PATHS.KRA_COLUMNS.UPDATE(row.id), {
            employeeId: row.employeeId,
            label: row.label,
            weightage: row.weightage,
            targetText: row.targetText,
            sourceText: row.sourceText,
            frequencyText: row.frequencyText,
            basePoints: row.basePoints,
            requiresApproval: row.requiresApproval,
            order: row.order,
            isActive: row.isActive,
          })
        )
      );

      await fetchKraColumns(selectedEmployee);
    } catch (error) {
      console.error("Error reordering KRA columns:", error);
      const message =
        error?.response?.data?.message || "Unable to reorder KRA categories. Please try again.";
      toast.error(message);
    }
  };


  return (
    <DashboardLayout activeMenu="KRA / KPI">
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-800 to-sky-700 px-5 py-8 text-white shadow-[0_24px_50px_rgba(30,64,175,0.35)] sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.18),_transparent_55%)]" />
        <div className="relative space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.28em] text-white/70">
            <LuLayoutGrid className="h-3.5 w-3.5" />
            Performance Review
          </span>
          <div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              KRA / KPI
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/75">
              Employee-wise monthly performance matrix
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-white/60">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
              Monthly Matrix
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
              Backend Ready
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-800/60 dark:bg-slate-900/60">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="kra-kpi-employee"
              className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500"
            >
              Employee
            </label>
            <div className="relative mt-2">
              <LuUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="kra-kpi-employee"
                value={selectedEmployee}
                onChange={(event) => setSelectedEmployee(event.target.value)}
                disabled={loading}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
              >
                <option value="">
                  {loading
                    ? "Loading employees..."
                    : employees.length > 0
                      ? "Select employee"
                      : "No employees found"}
                </option>
                {employees.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="kra-kpi-financial-year"
              className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500"
            >
              Financial Year
            </label>
            <div className="relative mt-2">
              <LuCalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="kra-kpi-financial-year"
                value={selectedFinancialYear}
                onChange={(event) => setSelectedFinancialYear(event.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
              >
                {financialYearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={LuUser}
          label="Selected Employee"
          value={selectedEmployeeLabel}
          hint="Employee options will load from API"
        />
        <StatCard
          icon={LuCalendarRange}
          label="Financial Year"
          value={selectedFinancialYearLabel}
          hint="Static year options, no backend connection"
        />
        <StatCard
          icon={LuTrendingUp}
          label="Average Final Score"
          value={summary.averageFinalScore ? formatScore(summary.averageFinalScore) : "--"}
          hint="Will populate from employee matrix data"
        />
        <StatCard
          icon={LuBriefcaseBusiness}
          label="Top Performing Month"
          value={summary.highestMonth.month}
          hint={
            summary.highestMonth.finalScore
              ? `Final score ${formatScore(summary.highestMonth.finalScore)}`
              : "No monthly score data available"
          }
        />
      </section>

      <section className="rounded-[30px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700/60 dark:bg-slate-900/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Monthly performance matrix
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Each month is visually grouped and the score rows are emphasized for faster review.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>
              Average final score:{" "}
              {summary.averageFinalScore ? formatScore(summary.averageFinalScore) : "--"}
            </span>
            <span>
              Annual score: {summary.annualFinalScore ? formatScore(summary.annualFinalScore) : "--"}
            </span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/60 dark:border-slate-700/80 dark:bg-slate-950/20">
          {isKraColumnsLoading ? (
            <div className="border-b border-slate-200/80 px-4 py-4 text-sm text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
              Loading KRA categories...
            </div>
          ) : selectedEmployeeColumnSetup.length === 0 ? (
            <div className="border-b border-slate-200/80 px-4 py-4 text-sm text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
              No KRA configuration found for this employee.
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-[1440px] border-separate border-spacing-0">
              <thead className="bg-slate-900 text-white dark:bg-slate-950">
                <tr>
                  {selectedEmployeeMatrixColumns.map((column, columnIndex) => (
                    <th
                      key={column.key}
                      className={`${column.widthClass} ${getStickyColumnClass(
                        columnIndex
                      )} z-30 border-b border-white/10 bg-slate-900 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 dark:bg-slate-950`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {matrixMetaRows.map((row, rowIndex) => (
                  <tr
                    key={row.label}
                    className={
                      rowIndex % 2 === 0
                        ? "bg-slate-50/90 dark:bg-slate-900/70"
                        : "bg-white/90 dark:bg-slate-900/40"
                    }
                  >
                    {selectedEmployeeMatrixColumns.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        className={`${column.widthClass} ${getStickyColumnClass(
                          columnIndex
                        )} z-20 border-b border-dashed border-slate-200/90 bg-inherit px-4 py-3 text-sm text-slate-600 dark:border-slate-700/90 dark:text-slate-300 ${
                          column.key === "label"
                            ? "font-semibold text-slate-700 dark:text-slate-100"
                            : ""
                        }`}
                      >
                        {row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

              {selectedEmployeeMonthlyPerformance.map((item, monthIndex) => {
                const monthRows = buildEmptyMonthRows(item.month, selectedEmployeeColumnSetup);

                return (
                  <tbody key={item.month}>
                    <tr className="bg-primary/5 dark:bg-primary/10">
                      <td
                        colSpan={selectedEmployeeMatrixColumns.length}
                        className="border-y border-primary/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"
                      >
                        {item.month} Review Block
                      </td>
                    </tr>

                    {monthRows.map((row, rowIndex) => {
                      const baseRowClass =
                        row.tone === "final"
                          ? "bg-rose-50/90 dark:bg-rose-500/10"
                          : row.tone === "muted"
                          ? "bg-slate-50/70 dark:bg-slate-900/60"
                          : monthIndex % 2 === 0
                          ? "bg-white/95 dark:bg-slate-900/35"
                          : "bg-slate-50/80 dark:bg-slate-900/50";

                      return (
                        <tr
                          key={`${item.month}-${row.label}`}
                          className={`${baseRowClass} transition hover:bg-primary/5 dark:hover:bg-primary/10`}
                        >
                          {selectedEmployeeMatrixColumns.map((column, columnIndex) => {
                            const cellValue = row[column.key];
                            const isFinalValue = column.key === "finalScore";

                            return (
                              <td
                                key={column.key}
                                className={`${column.widthClass} ${getStickyColumnClass(
                                  columnIndex
                                )} z-20 border-b ${
                                  rowIndex === monthRows.length - 1
                                    ? "border-primary/20"
                                    : "border-slate-200/80 dark:border-slate-800/80"
                                } bg-inherit px-4 py-3 text-sm text-slate-600 dark:text-slate-300 ${
                                  column.key === "label"
                                    ? "font-semibold text-slate-800 dark:text-slate-100"
                                    : ""
                                } ${
                                  row.tone === "final" && isFinalValue
                                    ? "text-base font-bold text-rose-700 dark:text-rose-200"
                                    : ""
                                }`}
                              >
                                {cellValue}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}

              <tbody>
                <tr className="bg-amber-50 dark:bg-amber-500/10">
                  {selectedEmployeeMatrixColumns.map((column, columnIndex) => {
                    const row = {
                      label: "Average Score",
                      month: "Average",
                      finalScore: summary.averageFinalScore
                        ? formatScore(summary.averageFinalScore)
                        : "",
                    };

                    selectedEmployeeColumnSetup.forEach((employeeColumn) => {
                      row[employeeColumn.id] = summary.averageColumnScores[employeeColumn.id] || "";
                    });

                    return (
                      <td
                        key={column.key}
                        className={`${column.widthClass} ${getStickyColumnClass(
                          columnIndex
                        )} z-20 border-y border-amber-200/80 bg-inherit px-4 py-4 text-sm font-semibold text-amber-900 dark:border-amber-500/20 dark:text-amber-100 ${
                          column.key === "finalScore" ? "text-lg font-bold" : ""
                        }`}
                      >
                        {row[column.key]}
                      </td>
                    );
                  })}
                </tr>

                <tr className="bg-gradient-to-r from-rose-500 to-red-500 text-white">
                  {selectedEmployeeMatrixColumns.map((column, columnIndex) => {
                    const row = {
                      label: "Annual Score",
                      month: "Annual",
                      finalScore: summary.annualFinalScore
                        ? formatScore(summary.annualFinalScore)
                        : "",
                    };

                    selectedEmployeeColumnSetup.forEach((employeeColumn) => {
                      row[employeeColumn.id] = "";
                    });

                    return (
                      <td
                        key={column.key}
                        className={`${column.widthClass} ${getStickyColumnClass(
                          columnIndex
                        )} z-20 border-t border-white/20 bg-inherit px-4 py-4 text-sm font-semibold ${
                          column.key === "finalScore" ? "text-lg font-bold" : ""
                        }`}
                      >
                        {row[column.key]}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700/60 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              <LuListChecks className="h-3.5 w-3.5" />
              Admin Configuration
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
              KRA Column Setup
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Employee-specific KRA sheet columns for {selectedEmployeeLabel}. This section
              is ready for backend integration and currently has no seeded data.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateKraColumnModal}
            disabled={!selectedEmployee}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LuPlus className="h-4 w-4" />
            Add Column
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/60 dark:border-slate-700/80 dark:bg-slate-950/20">
          <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-950/30 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 dark:border-slate-700/80 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Total Active Weightage
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {kraColumnWeightageSummary.totalActiveWeightage}%
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 dark:border-slate-700/80 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Remaining Weightage
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold ${
                      kraColumnWeightageSummary.isOverweight
                        ? "text-rose-600 dark:text-rose-300"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {kraColumnWeightageSummary.remainingWeightage}%
                  </p>
                </div>
              </div>

              <div
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                  kraColumnWeightageSummary.isOverweight
                    ? "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                }`}
              >
                {kraColumnWeightageSummary.isOverweight
                  ? "Warning: active weightage exceeds 100%"
                  : "Status: active weightage is within limit"}
              </div>
            </div>
          </div>

          {selectedEmployeeColumnSetup.length === 0 ? (
            <div className="border-b border-slate-200/80 px-4 py-4 text-sm text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
              No KRA configuration found for this employee.
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-[1520px] border-separate border-spacing-0">
              <thead className="bg-slate-900 text-white dark:bg-slate-950">
                <tr>
                  {KRA_COLUMN_SETUP_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={`${column.widthClass} border-b border-white/10 bg-slate-900 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 dark:bg-slate-950`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {selectedEmployeeColumnSetup.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`transition hover:bg-primary/5 dark:hover:bg-primary/10 ${
                      index % 2 === 0
                        ? "bg-white/95 dark:bg-slate-900/35"
                        : "bg-slate-50/80 dark:bg-slate-900/50"
                    }`}
                  >
                    <td className="min-w-[220px] border-b border-slate-200/80 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800/80 dark:text-slate-100">
                      {item.label}
                    </td>
                    <td className="min-w-[120px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      {item.weightage}%
                    </td>
                    <td className="min-w-[180px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      {item.targetText}
                    </td>
                    <td className="min-w-[170px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      {item.sourceText}
                    </td>
                    <td className="min-w-[130px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      {item.frequencyText}
                    </td>
                    <td className="min-w-[130px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      {item.basePoints}
                    </td>
                    <td className="min-w-[160px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      {renderSetupBadge(
                        item.requiresApproval ? "Yes" : "No",
                        item.requiresApproval
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                      )}
                    </td>
                    <td className="min-w-[90px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      {item.order}
                    </td>
                    <td className="min-w-[100px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      {renderSetupBadge(
                        item.isActive ? "Active" : "Inactive",
                        item.isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      )}
                    </td>
                    <td className="min-w-[150px] border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveKraColumn(item.id, "up")}
                          disabled={index === 0}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                        >
                          <LuChevronUp className="h-3.5 w-3.5" />
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveKraColumn(item.id, "down")}
                          disabled={index === selectedEmployeeColumnSetup.length - 1}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                        >
                          <LuChevronDown className="h-3.5 w-3.5" />
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditKraColumnModal(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                        >
                          <LuFilePenLine className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setKraColumnToDelete(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                        >
                          <LuTrash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isKraColumnModalOpen}
        onClose={resetKraColumnModalState}
        title={isEditingKraColumn ? "Edit KRA Column" : "Add KRA Column"}
        maxWidthClass="max-w-3xl"
      >
        <form className="space-y-5 pt-5" onSubmit={handleKraColumnSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Column Label
              </label>
              <input
                type="text"
                value={kraColumnForm.label}
                onChange={(event) => handleKraColumnFormChange("label", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                placeholder="Enter column label"
              />
              {kraColumnFormErrors.label ? (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {kraColumnFormErrors.label}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Weightage %
              </label>
              <input
                type="number"
                min="0"
                value={kraColumnForm.weightage}
                onChange={(event) =>
                  handleKraColumnFormChange("weightage", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                placeholder="0"
              />
              {kraColumnFormErrors.weightage ? (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {kraColumnFormErrors.weightage}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Base Points
              </label>
              <input
                type="number"
                min="0"
                value={kraColumnForm.basePoints}
                onChange={(event) =>
                  handleKraColumnFormChange("basePoints", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                placeholder="0"
              />
              {kraColumnFormErrors.basePoints ? (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {kraColumnFormErrors.basePoints}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Target text
              </label>
              <input
                type="text"
                value={kraColumnForm.targetText}
                onChange={(event) =>
                  handleKraColumnFormChange("targetText", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                placeholder="Enter target text"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Source text
              </label>
              <input
                type="text"
                value={kraColumnForm.sourceText}
                onChange={(event) =>
                  handleKraColumnFormChange("sourceText", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                placeholder="Enter source text"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Frequency text
              </label>
              <select
                value={kraColumnForm.frequencyText}
                onChange={(event) =>
                  handleKraColumnFormChange("frequencyText", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
              >
                <option value="">Select frequency</option>
                {FREQUENCY_OPTIONS.map((frequencyOption) => (
                  <option key={frequencyOption} value={frequencyOption}>
                    {frequencyOption}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Order
              </label>
              <input
                type="number"
                min="1"
                value={kraColumnForm.order}
                onChange={(event) => handleKraColumnFormChange("order", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                placeholder="1"
              />
              {kraColumnFormErrors.order ? (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {kraColumnFormErrors.order}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ToggleField
              label="Approval Required"
              checked={kraColumnForm.requiresApproval}
              onChange={(value) => handleKraColumnFormChange("requiresApproval", value)}
            />
            <ToggleField
              label="Active"
              checked={kraColumnForm.isActive}
              onChange={(value) => handleKraColumnFormChange("isActive", value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800/80">
            <button
              type="button"
              onClick={resetKraColumnModalState}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
            >
              <LuX className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingKraColumn}
              className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:bg-primary/90"
            >
              <LuCheck className="h-4 w-4" />
              {isSavingKraColumn
                ? "Saving..."
                : isEditingKraColumn
                  ? "Update Column"
                  : "Create Column"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(kraColumnToDelete)}
        onClose={closeDeleteKraColumnAlert}
        title="Delete KRA Category"
      >
        <DeleteAlert
          content={`Are you sure you want to delete ${
            kraColumnToDelete?.label || "this KRA category"
          }?`}
          onDelete={() => handleDeleteKraColumn(kraColumnToDelete?.id)}
        />
      </Modal>
    </DashboardLayout>
  );
};

export default KraKpiWorkspace;
