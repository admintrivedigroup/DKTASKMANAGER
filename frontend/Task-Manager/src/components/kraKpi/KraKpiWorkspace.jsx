import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  LuBriefcaseBusiness,
  LuCalendarRange,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
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
  { key: "requiresApproval", label: "Approval Required", widthClass: "min-w-[160px]" },
  { key: "order", label: "Order", widthClass: "min-w-[90px]" },
  { key: "isActive", label: "Active", widthClass: "min-w-[100px]" },
  { key: "actions", label: "Actions", widthClass: "min-w-[150px]" },
];

const createDefaultKraColumnForm = (employeeId = "") => ({
  id: "",
  employeeId,
  label: "",
  columnType: "standard",
  isSystemColumn: false,
  weightage: "",
  targetText: "",
  sourceText: "",
  frequencyText: "",
  requiresApproval: false,
  order: "",
  isActive: true,
});

const MONTH_SEQUENCE = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const FREQUENCY_OPTIONS = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];
const SYSTEM_KRA_COLUMN_TYPE = "over_and_beyond";
const TOTAL_WEIGHTAGE_LIMIT = 200;
const isOverAndBeyondColumn = (column) =>
  Boolean(
    column &&
      (column.isSystemColumn === true || column.columnType === SYSTEM_KRA_COLUMN_TYPE)
  );

const formatScore = (value) => {
  if (typeof value !== "number") {
    return value;
  }

  const rounded = Number(value.toFixed(4));
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
};

const buildMatrixColumns = (employeeColumns) => [
  { key: "label", label: "KRA Measure", widthClass: "min-w-[92px]" },
  ...employeeColumns.map((column) => ({
    key: column.id,
    label: column.isActive ? column.label : `${column.label} (Inactive)`,
    widthClass: "min-w-[102px]",
  })),
  { key: "finalScore", label: "Final Score", widthClass: "min-w-[88px]" },
];

const buildMetaRow = (label, employeeColumns, getValue) => {
  const row = { label, finalScore: "" };

  employeeColumns.forEach((column) => {
    row[column.id] = getValue(column);
  });

  return row;
};

const buildMonthRows = (monthData, employeeColumns) => {
  const achievedRow = { label: "Reverse Points", finalScore: "", tone: "standard" };
  const pointsRow = { label: "Points", finalScore: "", tone: "standard" };
  const weightageRow = { label: "Weightage", finalScore: "", tone: "muted" };
  const finalScoreRow = {
    label: "Final Score",
    finalScore: "",
    tone: "final",
  };

  employeeColumns.forEach((column) => {
    const reverseValue = monthData?.reversePoints?.[column.id];
    const pointsValue = monthData?.points?.[column.id];
    const weightageValue = monthData?.weightage?.[column.id];
    const finalScoreValue = monthData?.finalScore?.[column.id];

    achievedRow[column.id] =
      reverseValue === "N/A"
        ? "N/A"
        : reverseValue || reverseValue === 0
          ? formatScore(Number(reverseValue))
          : "";
    pointsRow[column.id] =
      pointsValue || pointsValue === 0 ? formatScore(Number(pointsValue)) : "";
    weightageRow[column.id] = `${Number(weightageValue ?? column.weightage ?? 0)}%`;
    finalScoreRow[column.id] =
      finalScoreValue || finalScoreValue === 0 ? formatScore(Number(finalScoreValue)) : "";
  });

  finalScoreRow.finalScore =
    monthData?.monthFinalScore || monthData?.monthFinalScore === 0
      ? formatScore(Number(monthData.monthFinalScore))
      : "";

  return [achievedRow, pointsRow, weightageRow, finalScoreRow];
};

const normalizeKraColumn = (column) => ({
  id: column?.id || column?._id || "",
  employeeId:
    typeof column?.employeeId === "object" && column?.employeeId !== null
      ? column.employeeId._id || column.employeeId.id || ""
      : column?.employeeId || "",
  label: column?.label || "",
  columnType: column?.columnType || "standard",
  isSystemColumn:
    column?.isSystemColumn === true || column?.columnType === SYSTEM_KRA_COLUMN_TYPE,
  weightage: Number(column?.weightage || 0),
  targetText: column?.targetText || "",
  sourceText: column?.sourceText || "",
  frequencyText: column?.frequencyText || "",
  requiresApproval: Boolean(column?.requiresApproval),
  order: Number(column?.order || 0),
  isActive: column?.isActive ?? true,
});

const getStickyColumnClass = (columnIndex) => {
  if (columnIndex === 0) {
    return "sticky left-0";
  }

  return "";
};

const StatCard = ({ icon, label, value, hint }) => (
  <div className="rounded-[22px] border border-white/60 bg-white/85 p-3.5 shadow-[0_14px_28px_rgba(15,23,42,0.06)] dark:border-slate-700/60 dark:bg-slate-900/60">
    <div className="flex items-start justify-between gap-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className="mt-1.5 truncate text-[1.05rem] font-semibold leading-tight text-slate-900 sm:text-[1.25rem] dark:text-slate-100">
          {value}
        </p>
        <p className="mt-1 text-[11px] leading-4.5 text-slate-500/90 dark:text-slate-400">{hint}</p>
      </div>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-xl border border-white/70 bg-primary/10 text-primary dark:border-slate-700 dark:bg-primary/15">
        {React.createElement(icon, { className: "h-4 w-4" })}
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

const ToggleField = ({ label, checked, onChange, disabled = false }) => (
  <label
    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
      disabled
        ? "cursor-not-allowed border-slate-200/70 bg-slate-100/80 opacity-70 dark:border-slate-700/70 dark:bg-slate-900/40"
        : "border-slate-200/80 bg-slate-50/80 dark:border-slate-700/80 dark:bg-slate-950/40"
    }`}
  >
    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    <button
      type="button"
      disabled={disabled}
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

const KraKpiWorkspace = ({ readOnly = false, currentUser = null }) => {
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
  const [kraMatrixData, setKraMatrixData] = useState({
    columns: [],
    months: [],
    averageRow: null,
    annualScoreRow: null,
  });
  const [loading, setLoading] = useState(false);
  const [isKraColumnsLoading, setIsKraColumnsLoading] = useState(false);
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [isSavingKraColumn, setIsSavingKraColumn] = useState(false);
  const [manualPointEditor, setManualPointEditor] = useState(null);
  const [manualPointDraft, setManualPointDraft] = useState("");
  const [manualPointSavingKey, setManualPointSavingKey] = useState("");
  const [isMatrixDragging, setIsMatrixDragging] = useState(false);
  const [isKraColumnModalOpen, setIsKraColumnModalOpen] = useState(false);
  const [kraColumnToDelete, setKraColumnToDelete] = useState(null);
  const [editingKraColumnId, setEditingKraColumnId] = useState("");
  const [kraColumnForm, setKraColumnForm] = useState(() => createDefaultKraColumnForm(""));
  const [kraColumnFormErrors, setKraColumnFormErrors] = useState({});
  const matrixScrollContainerRef = useRef(null);
  const matrixDragStateRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  });

  const normalizedCurrentUserRole = useMemo(
    () => normalizeRole(currentUser?.role),
    [currentUser?.role]
  );
  const isPrivilegedUser = matchesRole(normalizedCurrentUserRole, "admin") || matchesRole(normalizedCurrentUserRole, "super_admin");

  const fetchEmployees = async () => {
    if (!isPrivilegedUser) {
      const currentUserId = currentUser?._id || currentUser?.id || "";
      const currentUserLabel =
        currentUser?.name?.trim() || currentUser?.email?.trim() || "My KRA / KPI";

      setEmployees(
        currentUserId
          ? [
              {
                value: currentUserId,
                label: currentUser?.email?.trim()
                  ? `${currentUserLabel} (${currentUser.email.trim()})`
                  : currentUserLabel,
              },
            ]
          : []
      );

      if (currentUserId) {
        setSelectedEmployee(currentUserId);
      }

      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      const users = Array.isArray(response.data) ? response.data : [];
      const employeeOptions = users
        .filter(
          (user) =>
            user?._id &&
            (matchesRole(user?.role, "admin") || matchesRole(user?.role, "member"))
        )
        .sort((firstUser, secondUser) => {
          const rolePriority = {
            admin: 0,
            member: 1,
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
  }, [currentUser?._id, currentUser?.id, currentUser?.email, currentUser?.name, isPrivilegedUser]);

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

  const fetchKraMatrix = async (employeeId, fyStartYear) => {
    if (!employeeId || !fyStartYear) {
      setKraMatrixData({
        columns: [],
        months: [],
        averageRow: null,
        annualScoreRow: null,
      });
      return;
    }

    try {
      setIsMatrixLoading(true);
      const response = await axiosInstance.get(
        API_PATHS.KRA_KPI.GET_MATRIX(employeeId, fyStartYear)
      );
      const responseData =
        response?.data && typeof response.data === "object" ? response.data : {};

      setKraMatrixData({
        columns: Array.isArray(responseData.columns)
          ? responseData.columns.map(normalizeKraColumn)
          : [],
        months: Array.isArray(responseData.months) ? responseData.months : [],
        averageRow: responseData.averageRow || null,
        annualScoreRow: responseData.annualScoreRow || null,
      });
    } catch (error) {
      console.error("Error fetching KRA/KPI matrix:", error);
      const message =
        error?.response?.data?.message || "Unable to load KRA/KPI matrix. Please try again.";
      toast.error(message);
      setKraMatrixData({
        columns: [],
        months: [],
        averageRow: null,
        annualScoreRow: null,
      });
    } finally {
      setIsMatrixLoading(false);
    }
  };

  useEffect(() => {
    fetchKraMatrix(selectedEmployee, selectedFinancialYear);
  }, [selectedEmployee, selectedFinancialYear]);

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
  const selectedEmployeeActiveColumnSetup = useMemo(
    () => selectedEmployeeColumnSetup.filter((column) => column.isActive),
    [selectedEmployeeColumnSetup]
  );
  const selectedEmployeeColumnMap = useMemo(
    () => new Map(selectedEmployeeActiveColumnSetup.map((column) => [column.id, column])),
    [selectedEmployeeActiveColumnSetup]
  );
  const overAndBeyondColumn = useMemo(
    () => selectedEmployeeActiveColumnSetup.find((column) => isOverAndBeyondColumn(column)) || null,
    [selectedEmployeeActiveColumnSetup]
  );
  const selectedEmployeeMatrixColumns = useMemo(
    () => buildMatrixColumns(selectedEmployeeActiveColumnSetup),
    [selectedEmployeeActiveColumnSetup]
  );
  const matrixMetaRows = useMemo(
    () => [
      buildMetaRow("Target", selectedEmployeeActiveColumnSetup, (column) => column.targetText || "-"),
      buildMetaRow("Source", selectedEmployeeActiveColumnSetup, (column) => column.sourceText || "-"),
      buildMetaRow(
        "Frequency",
        selectedEmployeeActiveColumnSetup,
        (column) => column.frequencyText || "-"
      ),
    ],
    [selectedEmployeeActiveColumnSetup]
  );
  const selectedEmployeeMonthlyPerformance = useMemo(
    () =>
      MONTH_SEQUENCE.map((month) => {
        const matrixRow =
          kraMatrixData.months.find(
            (item) => item?.month?.toLowerCase?.() === month.toLowerCase()
          ) || {};

        return {
          month,
          reversePoints: matrixRow.reversePoints || {},
          points: matrixRow.points || {},
          weightage: matrixRow.weightage || {},
          finalScore: matrixRow.finalScore || {},
          monthFinalScore: Number(matrixRow.monthFinalScore || 0),
        };
      }),
    [kraMatrixData.months]
  );
  const kraColumnWeightageSummary = useMemo(() => {
    const totalActiveWeightage = selectedEmployeeColumnSetup.reduce(
      (total, column) => total + (column.isActive ? Number(column.weightage) || 0 : 0),
      0
    );

    return {
      totalActiveWeightage,
      remainingWeightage: TOTAL_WEIGHTAGE_LIMIT - totalActiveWeightage,
      isOverweight: totalActiveWeightage > TOTAL_WEIGHTAGE_LIMIT,
    };
  }, [selectedEmployeeColumnSetup]);
  const summary = useMemo(() => {
    const hasMatrixValues = selectedEmployeeMonthlyPerformance.some(
      (item) => Number(item.monthFinalScore || 0) > 0
    );
    const annualFinalScore = Number(kraMatrixData.annualScoreRow?.monthFinalScore || 0);
    const highestMonth = hasMatrixValues
      ? selectedEmployeeMonthlyPerformance.reduce(
          (best, item) => (item.monthFinalScore > best.monthFinalScore ? item : best),
          selectedEmployeeMonthlyPerformance[0] || { month: "--", monthFinalScore: 0 }
        ) || { month: "--", monthFinalScore: 0 }
      : { month: "--", monthFinalScore: 0 };
    const averageColumnScores = {};

    selectedEmployeeActiveColumnSetup.forEach((column) => {
      const averageValue = Number(kraMatrixData.averageRow?.finalScore?.[column.id] || 0);
      averageColumnScores[column.id] =
        averageValue || averageValue === 0 ? formatScore(averageValue) : "";
    });

    return {
      averageFinalScore: Number(kraMatrixData.averageRow?.monthFinalScore || 0),
      annualFinalScore,
      highestMonth,
      averageColumnScores,
    };
  }, [kraMatrixData.annualScoreRow, kraMatrixData.averageRow, selectedEmployeeActiveColumnSetup, selectedEmployeeMonthlyPerformance]);
  const isEditingKraColumn = Boolean(editingKraColumnId);

  const canEditManualPoints = isPrivilegedUser && !readOnly;

  const handleMatrixPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (event.target.closest("button, input, select, textarea, a")) {
      return;
    }

    const container = matrixScrollContainerRef.current;
    if (!container) {
      return;
    }

    matrixDragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      scrollLeft: container.scrollLeft,
    };
    setIsMatrixDragging(true);
  };

  const handleMatrixPointerMove = (event) => {
    const container = matrixScrollContainerRef.current;
    const dragState = matrixDragStateRef.current;
    if (!container || !dragState.isDragging) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    container.scrollLeft = dragState.scrollLeft - deltaX;
  };

  const stopMatrixDragging = () => {
    if (!matrixDragStateRef.current.isDragging) {
      return;
    }

    matrixDragStateRef.current.isDragging = false;
    setIsMatrixDragging(false);
  };

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
    if (!currentColumn || currentColumn.isSystemColumn) {
      return;
    }

    const employeeRows = kraColumns
      .filter((row) => row.employeeId === currentColumn.employeeId)
      .sort((firstRow, secondRow) => firstRow.order - secondRow.order);

    const currentIndex = employeeRows.findIndex((row) => row.id === columnId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const targetRow = employeeRows[targetIndex];

    if (
      currentIndex === -1 ||
      targetIndex < 0 ||
      targetIndex >= employeeRows.length ||
      targetRow?.isSystemColumn
    ) {
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

  const openManualPointEditor = (monthKey, columnId, currentValue) => {
    setManualPointEditor({ monthKey, columnId });
    setManualPointDraft(`${currentValue ?? 0}`);
  };

  const closeManualPointEditor = () => {
    setManualPointEditor(null);
    setManualPointDraft("");
    setManualPointSavingKey("");
  };

  const handleManualPointSave = async () => {
    if (!manualPointEditor || !selectedEmployee || !overAndBeyondColumn) {
      return;
    }

    const normalizedValue = Number(manualPointDraft);
    if (!Number.isFinite(normalizedValue)) {
      toast.error("Manual points must be numeric.");
      return;
    }

    const saveKey = `${manualPointEditor.monthKey}:${manualPointEditor.columnId}`;

    try {
      setManualPointSavingKey(saveKey);
      await axiosInstance.put(API_PATHS.KRA_KPI.UPDATE_MANUAL_POINT, {
        employeeId: selectedEmployee,
        kraColumnId: manualPointEditor.columnId,
        fyStartYear: Number(selectedFinancialYear),
        monthKey: manualPointEditor.monthKey,
        manualPoints: normalizedValue,
      });
      toast.success("Over & Beyond points updated successfully.");
      await fetchKraMatrix(selectedEmployee, selectedFinancialYear);
      closeManualPointEditor();
    } catch (error) {
      console.error("Error updating Over & Beyond points:", error);
      const message =
        error?.response?.data?.message || "Unable to update Over & Beyond points.";
      toast.error(message);
    } finally {
      setManualPointSavingKey("");
    }
  };


  return (
    <DashboardLayout activeMenu="KRA / KPI">
      <div className="mx-auto w-full max-w-[1400px] space-y-3.5 sm:space-y-4">
      <section className="relative overflow-hidden rounded-[24px] border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-800 to-sky-700 px-4 py-4.5 text-white shadow-[0_18px_38px_rgba(30,64,175,0.28)] sm:px-6 sm:py-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.18),_transparent_55%)]" />
        <div className="relative space-y-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
            <LuLayoutGrid className="h-3.5 w-3.5" />
            Performance Review
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[1.9rem]">
              KRA / KPI
            </h1>
            <p className="max-w-xl text-[13px] text-white/72 sm:text-sm">
              Employee-wise monthly performance matrix
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
              Monthly Matrix
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
              Backend Ready
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-white/60 bg-white/80 px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.07)] dark:border-slate-800/60 dark:bg-slate-900/60 sm:px-5 sm:py-3.5">
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          <div>
            <label
              htmlFor="kra-kpi-employee"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
            >
              Employee
            </label>
            <div className="relative mt-1">
              <LuUser className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-slate-400" />
              <select
                id="kra-kpi-employee"
                value={selectedEmployee}
                onChange={(event) => setSelectedEmployee(event.target.value)}
                disabled={loading}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white/90 py-2.25 pl-9 pr-4 text-sm text-slate-700 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
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
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
            >
              Financial Year
            </label>
            <div className="relative mt-1">
              <LuCalendarRange className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-slate-400" />
              <select
                id="kra-kpi-financial-year"
                value={selectedFinancialYear}
                onChange={(event) => setSelectedFinancialYear(event.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white/90 py-2.25 pl-9 pr-4 text-sm text-slate-700 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
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

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={LuUser}
          label="Selected Employee"
          value={selectedEmployeeLabel}
          hint=""
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
            summary.highestMonth.monthFinalScore
              ? `Final score ${formatScore(summary.highestMonth.monthFinalScore)}`
              : "No monthly score data available"
          }
        />
      </section>

      <section className="rounded-[22px] border border-white/60 bg-white/85 px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.07)] dark:border-slate-700/60 dark:bg-slate-900/70 sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-[1.05rem] font-semibold text-slate-900 dark:text-slate-100 sm:text-[1.15rem]">
              Monthly performance matrix
            </h2>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
              Each month is visually grouped and the score rows are emphasized for faster review.
            </p>
          </div>
          <div className="grid gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 md:justify-items-end">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800/80">
              Average final score:{" "}
              {summary.averageFinalScore ? formatScore(summary.averageFinalScore) : "--"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800/80">
              Annual score: {summary.annualFinalScore ? formatScore(summary.annualFinalScore) : "--"}
            </span>
          </div>
        </div>

        <div className="mt-2.5 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-slate-700/80 dark:bg-slate-950/20">
          {isMatrixLoading ? (
            <div className="flex min-h-16 items-center px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              Loading KRA/KPI matrix...
            </div>
          ) : isKraColumnsLoading ? (
            <div className="flex min-h-16 items-center px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              Loading KRA categories...
            </div>
          ) : selectedEmployeeActiveColumnSetup.length === 0 ? (
            <div className="flex min-h-16 items-center rounded-[18px] bg-slate-50/80 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
              No KRA configuration found for this employee.
            </div>
          ) : null}
          <div
            ref={matrixScrollContainerRef}
            onPointerDown={handleMatrixPointerDown}
            onPointerMove={handleMatrixPointerMove}
            onPointerUp={stopMatrixDragging}
            onPointerLeave={stopMatrixDragging}
            onPointerCancel={stopMatrixDragging}
            className={`overflow-x-auto ${isMatrixDragging ? "cursor-grabbing" : "cursor-grab"}`}
          >
            <table className="min-w-[1280px] border-separate border-spacing-0">
              <thead className="bg-slate-950 text-white dark:bg-black">
                <tr>
                  {selectedEmployeeMatrixColumns.map((column, columnIndex) => (
                    <th
                      key={column.key}
                      className={`${column.widthClass} ${getStickyColumnClass(
                        columnIndex
                      )} z-30 border-b-2 border-slate-700 bg-slate-950 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-white dark:bg-black`}
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
                        ? "bg-slate-100 dark:bg-slate-900/80"
                        : "bg-white dark:bg-slate-900/55"
                    }
                  >
                    {selectedEmployeeMatrixColumns.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        className={`${column.widthClass} ${getStickyColumnClass(
                          columnIndex
                        )} z-20 border-b border-slate-300 bg-inherit px-3 py-2 text-[13px] text-slate-700 dark:border-slate-700 dark:text-slate-200 ${
                          column.key === "label"
                            ? "font-semibold text-slate-800 dark:text-slate-100"
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
                const monthRows = buildMonthRows(item, selectedEmployeeActiveColumnSetup);

                return (
                  <tbody key={item.month}>
                    <tr className="bg-sky-100 dark:bg-sky-950/70">
                      <td
                        className={`${selectedEmployeeMatrixColumns[0]?.widthClass || "min-w-[92px]"} ${getStickyColumnClass(
                          0
                        )} z-20 border-y border-sky-300 bg-sky-100 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700 dark:border-sky-700 dark:bg-sky-950/70 dark:text-sky-200`}
                      >
                        {item.month} Review Block
                      </td>
                      <td
                        colSpan={Math.max(1, selectedEmployeeMatrixColumns.length - 1)}
                        className="border-y border-sky-300 bg-sky-100 px-3 py-2 dark:border-sky-700 dark:bg-sky-950/70"
                      />
                    </tr>

                    {monthRows.map((row, rowIndex) => {
                      const baseRowClass =
                        row.tone === "final"
                          ? "bg-rose-100 dark:bg-rose-950/45"
                          : row.tone === "muted"
                          ? "bg-amber-50 dark:bg-amber-950/30"
                          : monthIndex % 2 === 0
                          ? "bg-white dark:bg-slate-900/40"
                          : "bg-slate-100 dark:bg-slate-900/60";

                      return (
                        <tr
                          key={`${item.month}-${row.label}`}
                          className={`${baseRowClass} transition hover:bg-sky-50 dark:hover:bg-sky-950/30`}
                        >
                          {selectedEmployeeMatrixColumns.map((column, columnIndex) => {
                            const employeeColumn = selectedEmployeeColumnMap.get(column.key);
                            const cellValue = row[column.key];
                            const isFinalValue = column.key === "finalScore";
                            const isOverAndBeyondPointsCell =
                              row.label === "Points" && isOverAndBeyondColumn(employeeColumn);
                            const isEditingManualPoint =
                              manualPointEditor?.monthKey === item.month &&
                              manualPointEditor?.columnId === employeeColumn?.id;

                            return (
                              <td
                                key={column.key}
                                className={`${column.widthClass} ${getStickyColumnClass(
                                  columnIndex
                                )} z-20 border-b ${
                                  rowIndex === monthRows.length - 1
                                    ? "border-rose-300 dark:border-rose-800"
                                    : "border-slate-300 dark:border-slate-700"
                                } bg-inherit px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 ${
                                  column.key === "label"
                                    ? "font-semibold text-slate-900 dark:text-slate-100"
                                    : ""
                                } ${
                                  row.tone === "final" && isFinalValue
                                    ? "text-sm font-bold text-rose-800 dark:text-rose-100"
                                    : ""
                                }`}
                              >
                                {isOverAndBeyondPointsCell && canEditManualPoints ? (
                                  isEditingManualPoint ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        step="any"
                                        value={manualPointDraft}
                                        onChange={(event) => setManualPointDraft(event.target.value)}
                                        className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleManualPointSave}
                                        disabled={
                                          manualPointSavingKey ===
                                          `${item.month}:${employeeColumn?.id}`
                                        }
                                        className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={closeManualPointEditor}
                                        className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openManualPointEditor(
                                          item.month,
                                          employeeColumn.id,
                                          item.points?.[employeeColumn.id] ?? 0
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-md px-0.5 py-0.5 text-left text-[13px] text-slate-700 transition hover:text-primary dark:text-slate-200"
                                    >
                                      <span>{cellValue}</span>
                                      <LuChevronRight className="h-3.5 w-3.5 opacity-70" />
                                    </button>
                                  )
                                ) : (
                                  cellValue
                                )}
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
                <tr className="bg-amber-100 dark:bg-amber-950/35">
                  {selectedEmployeeMatrixColumns.map((column, columnIndex) => {
                    const row = {
                      label: "Average Score",
                      finalScore: summary.averageFinalScore
                        ? formatScore(summary.averageFinalScore)
                        : "",
                    };

                    selectedEmployeeActiveColumnSetup.forEach((employeeColumn) => {
                      row[employeeColumn.id] = summary.averageColumnScores[employeeColumn.id] || "";
                    });

                    return (
                      <td
                        key={column.key}
                        className={`${column.widthClass} ${getStickyColumnClass(
                          columnIndex
                        )} z-20 border-y border-amber-300 bg-inherit px-3 py-2.5 text-[13px] font-bold text-amber-950 dark:border-amber-700 dark:text-amber-100 ${
                          column.key === "finalScore" ? "text-base font-bold" : ""
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
                      finalScore: summary.annualFinalScore
                        ? formatScore(summary.annualFinalScore)
                        : "",
                    };

                    selectedEmployeeActiveColumnSetup.forEach((employeeColumn) => {
                      row[employeeColumn.id] = "";
                    });

                    return (
                      <td
                        key={column.key}
                        className={`${column.widthClass} ${getStickyColumnClass(
                          columnIndex
                        )} z-20 border-t border-white/30 bg-inherit px-3 py-2.5 text-[13px] font-bold ${
                          column.key === "finalScore" ? "text-base font-bold" : ""
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

      {isPrivilegedUser && !readOnly ? (
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
                  ? `Warning: active weightage exceeds ${TOTAL_WEIGHTAGE_LIMIT}%`
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
                          disabled={
                            index === 0 ||
                            item.isSystemColumn ||
                            selectedEmployeeColumnSetup[index - 1]?.isSystemColumn
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                        >
                          <LuChevronUp className="h-3.5 w-3.5" />
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveKraColumn(item.id, "down")}
                          disabled={
                            index === selectedEmployeeColumnSetup.length - 1 ||
                            item.isSystemColumn ||
                            selectedEmployeeColumnSetup[index + 1]?.isSystemColumn
                          }
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
                          disabled={item.isSystemColumn}
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
      ) : null}

      </div>

      <Modal
        isOpen={isPrivilegedUser && !readOnly && isKraColumnModalOpen}
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
                disabled={kraColumnForm.isSystemColumn}
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
                disabled={kraColumnForm.isSystemColumn}
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
                disabled={kraColumnForm.isSystemColumn}
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
              disabled={kraColumnForm.isSystemColumn}
              onChange={(value) => {
                if (kraColumnForm.isSystemColumn) {
                  return;
                }

                handleKraColumnFormChange("isActive", value);
              }}
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
        isOpen={isPrivilegedUser && !readOnly && Boolean(kraColumnToDelete)}
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
