import React, { useMemo, useState } from "react";
import {
  LuBriefcaseBusiness,
  LuCalendarRange,
  LuLayoutGrid,
  LuTrendingUp,
  LuUser,
} from "react-icons/lu";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  buildFinancialYearOptions,
  getFinancialYearStartYear,
} from "../../utils/financialYearUtils";

const EMPLOYEE_OPTIONS = [
  { value: "aarav-sharma", label: "Aarav Sharma" },
  { value: "diya-patel", label: "Diya Patel" },
  { value: "kabir-mehta", label: "Kabir Mehta" },
  { value: "meera-joshi", label: "Meera Joshi" },
];

const TARGET_ROW = {
  label: "Target",
  month: "",
  revenuePoints: "0%",
  taskCompletion: "10%",
  process: "10%",
  objective: "0%",
  overAndBeyond: "0%",
  finalScore: "",
};

const SOURCE_ROW = {
  label: "Source",
  month: "",
  revenuePoints: "Task Management",
  taskCompletion: "Accounts Report",
  process: "P&L",
  objective: "Observation by Partners",
  overAndBeyond: "Observation by Partners",
  finalScore: "",
};

const FREQUENCY_ROW = {
  label: "Frequency",
  month: "",
  revenuePoints: "Monthly",
  taskCompletion: "Monthly",
  process: "Monthly",
  objective: "Monthly",
  overAndBeyond: "Monthly",
  finalScore: "",
};

const WEIGHTAGE_ROW = {
  label: "Weightage",
  month: "",
  revenuePoints: "25%",
  taskCompletion: "60%",
  process: "15%",
  objective: "25%",
  overAndBeyond: "25%",
  finalScore: "",
};

const MONTHLY_PERFORMANCE_TEMPLATE = [
  {
    month: "Apr",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "May",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Jun",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Jul",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Aug",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Sep",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Oct",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Nov",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Dec",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Jan",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 7.5,
    overAndBeyond: 25,
    finalScore: 100.5,
  },
  {
    month: "Feb",
    revenuePoints: 22.5,
    taskCompletion: 80,
    process: 48,
    objective: 0,
    overAndBeyond: 0,
    finalScore: 70.5,
  },
  {
    month: "Mar",
    revenuePoints: 20,
    taskCompletion: 80,
    process: 48,
    objective: 0,
    overAndBeyond: 100,
    finalScore: 168,
  },
];

const MATRIX_COLUMNS = [
  { key: "label", label: "KRA Measure", widthClass: "min-w-[190px]" },
  { key: "month", label: "Month", widthClass: "min-w-[110px]" },
  { key: "revenuePoints", label: "Revenue Points", widthClass: "min-w-[140px]" },
  {
    key: "taskCompletion",
    label: "Tasks Completed On Time (% Work Not Done)",
    widthClass: "min-w-[210px]",
  },
  {
    key: "process",
    label: "Process (% Reports Completed on Time)",
    widthClass: "min-w-[220px]",
  },
  {
    key: "objective",
    label: "Objective 1 (Reduce Financial Cost by 10%)",
    widthClass: "min-w-[250px]",
  },
  {
    key: "overAndBeyond",
    label: "Over & Beyond (Action)",
    widthClass: "min-w-[190px]",
  },
  { key: "finalScore", label: "Final Score", widthClass: "min-w-[130px]" },
];

const formatScore = (value) => {
  if (typeof value !== "number") {
    return value;
  }

  const rounded = Number(value.toFixed(4));
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
};

const buildMonthRows = (item) => [
  {
    label: "Revenue Points",
    month: item.month,
    revenuePoints: formatScore(item.revenuePoints),
    taskCompletion: "N/A",
    process: "N/A",
    objective: "N/A",
    overAndBeyond: "N/A",
    finalScore: "",
    tone: "standard",
  },
  {
    label: "Points",
    month: item.month,
    revenuePoints: "80",
    taskCompletion: formatScore(item.taskCompletion),
    process: "50",
    objective: "25",
    overAndBeyond: "25",
    finalScore: "",
    tone: "standard",
  },
  {
    label: "Weightage",
    month: item.month,
    revenuePoints: WEIGHTAGE_ROW.revenuePoints,
    taskCompletion: WEIGHTAGE_ROW.taskCompletion,
    process: WEIGHTAGE_ROW.process,
    objective: WEIGHTAGE_ROW.objective,
    overAndBeyond: WEIGHTAGE_ROW.overAndBeyond,
    finalScore: "",
    tone: "muted",
  },
  {
    label: "Final Score",
    month: item.month,
    revenuePoints: formatScore(item.revenuePoints),
    taskCompletion: formatScore(item.process),
    process: formatScore(item.objective),
    objective: formatScore(item.overAndBeyond),
    overAndBeyond: "",
    finalScore: formatScore(item.finalScore),
    tone: "final",
  },
];

const getStickyColumnClass = (columnIndex) => {
  if (columnIndex === 0) {
    return "sticky left-0";
  }

  if (columnIndex === 1) {
    return "sticky left-[190px]";
  }

  return "";
};

const StatCard = ({ icon: Icon, label, value, hint }) => (
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
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </div>
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

  const [selectedEmployee, setSelectedEmployee] = useState(EMPLOYEE_OPTIONS[0].value);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(
    financialYearOptions[1]?.value || financialYearOptions[0]?.value || ""
  );

  const selectedEmployeeLabel = useMemo(
    () =>
      EMPLOYEE_OPTIONS.find((option) => option.value === selectedEmployee)?.label ||
      "Select employee",
    [selectedEmployee]
  );

  const selectedFinancialYearLabel = useMemo(
    () =>
      financialYearOptions.find((option) => option.value === selectedFinancialYear)?.label ||
      "Select financial year",
    [financialYearOptions, selectedFinancialYear]
  );

  const summary = useMemo(() => {
    const monthCount = MONTHLY_PERFORMANCE_TEMPLATE.length;
    const totals = MONTHLY_PERFORMANCE_TEMPLATE.reduce(
      (accumulator, item) => ({
        revenuePoints: accumulator.revenuePoints + item.revenuePoints,
        taskCompletion: accumulator.taskCompletion + item.taskCompletion,
        process: accumulator.process + item.process,
        objective: accumulator.objective + item.objective,
        overAndBeyond: accumulator.overAndBeyond + item.overAndBeyond,
        finalScore: accumulator.finalScore + item.finalScore,
      }),
      {
        revenuePoints: 0,
        taskCompletion: 0,
        process: 0,
        objective: 0,
        overAndBeyond: 0,
        finalScore: 0,
      }
    );

    const highestMonth =
      MONTHLY_PERFORMANCE_TEMPLATE.reduce(
        (best, item) => (item.finalScore > best.finalScore ? item : best),
        MONTHLY_PERFORMANCE_TEMPLATE[0]
      ) || MONTHLY_PERFORMANCE_TEMPLATE[0];

    return {
      averageRevenuePoints: totals.revenuePoints / monthCount,
      averageTaskCompletion: totals.taskCompletion / monthCount,
      averageProcess: totals.process / monthCount,
      averageObjective: totals.objective / monthCount,
      averageOverAndBeyond: totals.overAndBeyond / monthCount,
      averageFinalScore: totals.finalScore / monthCount,
      annualFinalScore: totals.finalScore,
      highestMonth,
    };
  }, []);

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
              Mock Data
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
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
              >
                {EMPLOYEE_OPTIONS.map((option) => (
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
          hint="Mock employee list for frontend preview"
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
          value={formatScore(summary.averageFinalScore)}
          hint="Prominent monthly average across the matrix"
        />
        <StatCard
          icon={LuBriefcaseBusiness}
          label="Top Performing Month"
          value={summary.highestMonth.month}
          hint={`Final score ${formatScore(summary.highestMonth.finalScore)}`}
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
            <span>Average final score: {formatScore(summary.averageFinalScore)}</span>
            <span>Annual score: {formatScore(summary.annualFinalScore)}</span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/60 dark:border-slate-700/80 dark:bg-slate-950/20">
          <div className="overflow-x-auto">
            <table className="min-w-[1440px] border-separate border-spacing-0">
              <thead className="bg-slate-900 text-white dark:bg-slate-950">
                <tr>
                  {MATRIX_COLUMNS.map((column, columnIndex) => (
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
                {[TARGET_ROW, SOURCE_ROW, FREQUENCY_ROW].map((row, rowIndex) => (
                  <tr
                    key={row.label}
                    className={
                      rowIndex % 2 === 0
                        ? "bg-slate-50/90 dark:bg-slate-900/70"
                        : "bg-white/90 dark:bg-slate-900/40"
                    }
                  >
                    {MATRIX_COLUMNS.map((column, columnIndex) => (
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

              {MONTHLY_PERFORMANCE_TEMPLATE.map((item, monthIndex) => {
                const monthRows = buildMonthRows(item);

                return (
                  <tbody key={item.month}>
                    <tr className="bg-primary/5 dark:bg-primary/10">
                      <td
                        colSpan={MATRIX_COLUMNS.length}
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
                          {MATRIX_COLUMNS.map((column, columnIndex) => {
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
                  {MATRIX_COLUMNS.map((column, columnIndex) => {
                    const row = {
                      label: "Average Score",
                      month: "Average",
                      revenuePoints: formatScore(summary.averageRevenuePoints),
                      taskCompletion: formatScore(summary.averageTaskCompletion),
                      process: formatScore(summary.averageProcess),
                      objective: formatScore(summary.averageObjective),
                      overAndBeyond: formatScore(summary.averageOverAndBeyond),
                      finalScore: formatScore(summary.averageFinalScore),
                    };

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
                  {MATRIX_COLUMNS.map((column, columnIndex) => {
                    const row = {
                      label: "Annual Score",
                      month: "Annual",
                      revenuePoints: "",
                      taskCompletion: "",
                      process: "",
                      objective: "",
                      overAndBeyond: "",
                      finalScore: formatScore(summary.annualFinalScore),
                    };

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
    </DashboardLayout>
  );
};

export default KraKpiWorkspace;
