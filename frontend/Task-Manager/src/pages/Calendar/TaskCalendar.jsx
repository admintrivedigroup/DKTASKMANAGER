import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuTriangleAlert,
  LuCalendarDays,
  LuChevronLeft,
  LuChevronRight,
  LuClock3,
  LuDot,
  LuListChecks,
  LuUsers,
} from "react-icons/lu";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import LoadingOverlay from "../../components/LoadingOverlay";
import useTasks from "../../hooks/useTasks";
import { UserContext } from "../../context/userContext.jsx";
import { formatDateInputValue, formatDateLabel } from "../../utils/dateUtils";
import { getPrivilegedBasePath, hasPrivilegedAccess } from "../../utils/roleUtils";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const statusDotClass = {
  Pending: "bg-amber-500",
  "In Progress": "bg-sky-500",
  Completed: "bg-emerald-500",
};

const statusBadgeClass = {
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  "In Progress": "bg-sky-50 text-sky-700 border-sky-100",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const priorityBadgeClass = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Medium: "bg-amber-50 text-amber-700 border-amber-100",
  High: "bg-rose-50 text-rose-700 border-rose-100",
};

const FIXED_INDIAN_HOLIDAYS = [
  { month: 1, day: 1, label: "New Year" },
  { month: 1, day: 14, label: "Makar Sankranti / Pongal" },
  { month: 1, day: 26, label: "Republic Day" },
  { month: 3, day: 8, label: "International Women's Day" },
  { month: 8, day: 15, label: "Independence Day" },
  { month: 10, day: 2, label: "Gandhi Jayanti" },
  { month: 12, day: 25, label: "Christmas" },
];

// Some festivals move each year; keep a simple year-specific map so tiles still highlight.
const YEAR_SPECIFIC_HOLIDAYS = {
  // Curated 2025 festival calendar (approximate public dates)
  2025: [
    { date: "2025-01-14", label: "Makar Sankranti / Pongal" },
    { date: "2025-02-26", label: "Maha Shivaratri" },
    { date: "2025-03-14", label: "Holi" },
    { date: "2025-03-31", label: "Eid al-Fitr" },
    { date: "2025-04-14", label: "Baisakhi" },
    { date: "2025-04-18", label: "Good Friday" },
    { date: "2025-05-12", label: "Buddha Purnima" },
    { date: "2025-06-27", label: "Rath Yatra" },
    { date: "2025-07-29", label: "Muharram" },
    { date: "2025-08-09", label: "Raksha Bandhan" },
    { date: "2025-08-15", label: "Independence Day" },
    { date: "2025-08-27", label: "Janmashtami" },
    { date: "2025-09-05", label: "Onam" },
    { date: "2025-09-17", label: "Ganesh Chaturthi" },
    { date: "2025-10-02", label: "Gandhi Jayanti / Navratri" },
    { date: "2025-10-20", label: "Diwali" },
    { date: "2025-10-23", label: "Bhai Dooj" },
    { date: "2025-11-05", label: "Guru Nanak Jayanti" },
    { date: "2025-12-25", label: "Christmas" },
  ],
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const TaskCalendar = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const tasksSectionRef = useRef(null);

  const todayKey = formatDateInputValue(new Date());
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => todayKey);

  const isPrivilegedUser = hasPrivilegedAccess(user?.role);
  const detailBasePath = isPrivilegedUser
    ? getPrivilegedBasePath(user?.role)
    : "/user";

  const { tasks, isLoading } = useTasks({
    statusFilter: "All",
    scope: isPrivilegedUser ? "all" : "my",
    includePrioritySort: false,
  });

  const tasksByDate = useMemo(() => {
    return tasks.reduce((accumulator, task) => {
      const dateKey = formatDateInputValue(task?.dueDate);

      if (!dateKey) {
        return accumulator;
      }

      if (!accumulator[dateKey]) {
        accumulator[dateKey] = [];
      }

      accumulator[dateKey].push(task);
      return accumulator;
    }, {});
  }, [tasks]);

  const handleTaskClick = useCallback(
    (taskId) => {
      if (!taskId) {
        return;
      }

      navigate(`${detailBasePath}/task-details/${taskId}`);
    },
    [detailBasePath, navigate]
  );

  const handleMonthChange = useCallback((offset) => {
    setMonthCursor((previous) => {
      const reference = previous || new Date();
      return new Date(reference.getFullYear(), reference.getMonth() + offset, 1);
    });
  }, []);

  const jumpToToday = useCallback(() => {
    const today = new Date();
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(formatDateInputValue(today));
  }, []);

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth(),
      1
    );
    const daysInMonth = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + 1,
      0
    ).getDate();
    const startDay = startOfMonth.getDay();

    const days = [];

    for (let index = 0; index < startDay; index += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth(),
        day
      );
      const dateKey = formatDateInputValue(date);
      const dayTasks = tasksByDate[dateKey] || [];

      days.push({
        date,
        dateKey,
        tasks: dayTasks,
        isToday: dateKey === todayKey,
      });
    }

    const remainder = days.length % 7;
    if (remainder) {
      for (let index = 0; index < 7 - remainder; index += 1) {
        days.push(null);
      }
    }

    return days;
  }, [monthCursor, tasksByDate, todayKey]);

  const handleDateSelect = useCallback((dateKey) => {
    setSelectedDate(dateKey);
    if (tasksSectionRef.current) {
      tasksSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const selectedTasks = useMemo(() => {
    const dayTasks = tasksByDate[selectedDate] || [];
    const statusOrder = { Pending: 0, "In Progress": 1, Completed: 2 };

    return [...dayTasks].sort((first, second) => {
      const firstStatusRank = statusOrder[first?.status] ?? 99;
      const secondStatusRank = statusOrder[second?.status] ?? 99;

      if (firstStatusRank !== secondStatusRank) {
        return firstStatusRank - secondStatusRank;
      }

      const firstPriority =
        first?.priority === "High" ? 0 : first?.priority === "Medium" ? 1 : 2;
      const secondPriority =
        second?.priority === "High" ? 0 : second?.priority === "Medium" ? 1 : 2;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      const firstDue = normalizeDate(first?.dueDate)?.getTime() || 0;
      const secondDue = normalizeDate(second?.dueDate)?.getTime() || 0;

      return firstDue - secondDue;
    });
  }, [selectedDate, tasksByDate]);

  const monthTaskCount = useMemo(() => {
    const month = monthCursor.getMonth();
    const year = monthCursor.getFullYear();

    return tasks.reduce((count, task) => {
      const dueDate = normalizeDate(task?.dueDate);
      if (!dueDate) {
        return count;
      }

      if (dueDate.getMonth() === month && dueDate.getFullYear() === year) {
        return count + 1;
      }

      return count;
    }, 0);
  }, [monthCursor, tasks]);

  const selectedDateLabel = selectedDate
    ? formatDateLabel(selectedDate)
    : "Pick a date to view tasks";
  const monthLabel = monthLabelFormatter.format(monthCursor);
  const todayCount = tasksByDate[todayKey]?.length || 0;
  const selectedCount = selectedTasks.length;

  const holidayMap = useMemo(() => {
    const map = new Map();

    FIXED_INDIAN_HOLIDAYS.forEach((item) => {
      const keyMonth = String(item.month).padStart(2, "0");
      const keyDay = String(item.day).padStart(2, "0");
      map.set(`${keyMonth}-${keyDay}`, item.label);
    });

    const yearKey = monthCursor.getFullYear();
    (YEAR_SPECIFIC_HOLIDAYS[yearKey] || []).forEach((item) => {
      const key = item.date?.slice(5);
      if (key) {
        map.set(key, item.label);
      }
    });

    return map;
  }, [monthCursor]);

  const holidaysThisMonth = useMemo(() => {
    const month = String(monthCursor.getMonth() + 1).padStart(2, "0");
    const year = monthCursor.getFullYear();

    const fixedHits = FIXED_INDIAN_HOLIDAYS.filter(
      (item) => item.month === monthCursor.getMonth() + 1
    ).length;

    const movableHits = (YEAR_SPECIFIC_HOLIDAYS[year] || []).filter(
      (item) => item.date?.slice(5, 7) === month
    ).length;

    return fixedHits + movableHits;
  }, [monthCursor]);

  const renderDayTasks = (taskList) => {
    if (!Array.isArray(taskList) || taskList.length === 0) {
      return null;
    }

    const MAX_VISIBLE = 2;
    const visibleTasks = taskList.slice(0, MAX_VISIBLE);
    const hiddenCount = taskList.length - visibleTasks.length;

    return (
      <div className="mt-2 space-y-1.5 overflow-hidden">
        {visibleTasks.map((task) => (
          <div
            key={task?._id || task?.title}
            className="inline-flex max-w-full items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700/70"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                statusDotClass[task?.status] || "bg-slate-300"
              }`}
              aria-hidden="true"
            />
            <span className="truncate leading-tight">{task?.title || "Untitled task"}</span>
          </div>
        ))}
        {hiddenCount > 0 && (
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            + {hiddenCount} more
          </p>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout activeMenu="Calendar">
      {isLoading ? (
        <LoadingOverlay message="Loading calendar..." className="py-24" />
      ) : (
        <div className="page-shell space-y-5 sm:space-y-6">
          <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-white px-5 py-4 shadow-sm sm:px-6 sm:py-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_36%)]" />
            <div className="relative flex flex-col gap-3 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-[28px] font-bold text-slate-900 sm:text-[30px]">
                    Task Calendar
                  </h1>
                  <p className="text-sm text-slate-600">
                    Visualize upcoming work and spot busy dates quickly.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMonthChange(-1)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
                    aria-label="Previous month"
                  >
                    <LuChevronLeft className="text-base" />
                    Prev
                  </button>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                    {monthLabel}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMonthChange(1)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
                    aria-label="Next month"
                  >
                    Next
                    <LuChevronRight className="text-base" />
                  </button>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <LuCalendarDays className="text-base" />
                    Today
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  Month · {monthLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {monthTaskCount} due this month
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {holidaysThisMonth} holidays & festivals
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {todayCount} due today
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/75">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Calendar
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  Due dates mapped per day
                </h3>
                <p className="text-sm text-slate-600">
                  Tap a date tile to see every task due that day.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Today
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1 ring-1 ring-rose-100">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Holidays / weekends
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-lg border border-slate-100 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="h-24 rounded-lg border border-dashed border-slate-200/80 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-900/40"
                        aria-hidden="true"
                      />
                    );
                  }

                  const isSelected = selectedDate === day.dateKey;
                  const hasTasks = day.tasks.length > 0;
                  const isSunday = day.date.getDay() === 0;
                  const holidayLabel = holidayMap.get(day.dateKey.slice(5));
                  const isHoliday = Boolean(holidayLabel);
                  const shouldHighlightHoliday = isHoliday || isSunday;
                  const weekendAccent = shouldHighlightHoliday ? "border-l-4 border-l-rose-300" : "border-l-4 border-l-transparent";

                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() => handleDateSelect(day.dateKey)}
                      className={`relative flex h-24 flex-col rounded-lg border p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md ${weekendAccent} ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50/70 shadow-sm"
                          : shouldHighlightHoliday
                          ? "border-rose-200 bg-rose-50/60 dark:border-rose-500/50 dark:bg-rose-500/10"
                          : "border-slate-200 bg-white/90 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60"
                      } ${day.isToday ? "ring-2 ring-indigo-200" : ""} ${
                        hasTasks ? "bg-gradient-to-br from-indigo-50/60 to-sky-50/60 dark:from-slate-800/60 dark:to-slate-900/60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {day.date.getDate()}
                        </span>
                        {hasTasks ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                            <LuDot className="text-base" />
                            {day.tasks.length} due
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {day.isToday && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700 ring-1 ring-indigo-200">
                            Today
                          </span>
                        )}
                        {holidayLabel && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700 ring-1 ring-rose-200">
                            {holidayLabel}
                          </span>
                        )}
                        {isSunday && !holidayLabel && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600 ring-1 ring-rose-200">
                            Sunday
                          </span>
                        )}
                      </div>

                      {renderDayTasks(day.tasks)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/75"
            ref={tasksSectionRef}
          >
            <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-slate-200 bg-white/90 pb-3 dark:bg-slate-900/90 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Tasks due
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedDateLabel}
                </h3>
                <p className="text-sm text-slate-600">
                  {selectedCount > 0
                    ? "Click a card to open task details."
                    : "No tasks are due on this day."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                  <LuDot className="text-lg" />
                  Pending
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                  <LuDot className="text-lg" />
                  In Progress
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  <LuDot className="text-lg" />
                  Completed
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {selectedTasks.length > 0 ? (
                selectedTasks.map((task) => {
                  const assignees = Array.isArray(task?.assignedTo)
                    ? task.assignedTo
                    : task?.assignedTo
                    ? [task.assignedTo]
                    : [];
                  const assigneeNames = assignees
                    .map((person) => {
                      if (!person) {
                        return "";
                      }

                      if (typeof person === "string") {
                        return person;
                      }

                      if (typeof person === "object") {
                        return person.name || person.fullName || "";
                      }

                      return "";
                    })
                    .filter(Boolean);

                  const priorityAccent =
                    task?.priority === "High"
                      ? "bg-rose-500"
                      : task?.priority === "Medium"
                      ? "bg-amber-500"
                      : "bg-emerald-500";

                  return (
                    <button
                      key={task?._id || task?.title}
                      type="button"
                      onClick={() => handleTaskClick(task?._id)}
                      className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <span
                        className={`absolute inset-y-0 left-0 w-1 ${priorityAccent}`}
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-semibold ${statusBadgeClass[task?.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                          >
                            <LuDot className="text-lg" />
                            {task?.status || "Status"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-semibold ${priorityBadgeClass[task?.priority] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                          >
                            <LuListChecks className="text-base" />
                            {task?.priority || "Priority"}
                          </span>
                        </div>
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          <LuClock3 className="text-sm" />
                          Due {formatDateLabel(task?.dueDate)}
                        </p>
                      </div>

                      <div className="mt-3 space-y-2">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {task?.title || "Untitled task"}
                        </h4>
                        {task?.description && (
                          <p className="text-sm text-slate-600 line-clamp-2 dark:text-slate-300">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                          {assigneeNames.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700/70">
                              <LuUsers className="text-base" />
                              {assigneeNames.join(", ")}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700/70">
                            <LuClock3 className="text-base" />
                            {task?.progress ?? 0}% progress
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm font-medium text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300">
                  <LuTriangleAlert className="text-lg text-amber-500" />
                  No tasks are scheduled for this date. Pick another day from the calendar to view due work.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TaskCalendar;
