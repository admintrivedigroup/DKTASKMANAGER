import React from "react";
import {
  LuFolder,
  LuCircleUser,
  LuCalendarClock,
  LuTrendingUp,
  LuBadgeCheck,
  LuArrowUpRight,
} from "react-icons/lu";
import Progress from "../Progress";
import { formatDateLabel } from "../../utils/dateUtils";

const MatterCard = ({ matter, onViewDetails }) => {
  if (!matter) {
    return null;
  }

  const {
    title,
    clientName,
    reference,
    stage,
    overallProgress,
    statusBreakdown,
    upcomingTask,
    recentUpdates,
    filteredTasksCount,
    totalTasks,
    defaultTaskId,
  } = matter;

  const statusEntries = [
    { key: "Pending", label: "Pending" },
    { key: "In Progress", label: "In Progress" },
    { key: "Completed", label: "Completed" },
  ];

  const handleViewDetails = () => {
    if (typeof onViewDetails === "function" && defaultTaskId) {
      onViewDetails(defaultTaskId);
    }
  };

  return (
    <article className="relative flex h-full flex-col gap-6 overflow-hidden rounded-[32px] border border-white/60 bg-white/75 p-6 shadow-[0_24px_60px_rgba(30,64,175,0.15)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(30,64,175,0.25)] dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-[0_26px_60px_rgba(2,6,23,0.6)]">
      <span className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/10 via-sky-400/10 to-emerald-400/15" />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {stage && (
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500/90 to-indigo-500/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                <LuFolder className="text-sm" />
                {stage}
              </span>
            )}
            {filteredTasksCount !== undefined && filteredTasksCount !== null && (
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200">
                {filteredTasksCount} of {totalTasks} updates
              </span>
            )}
          </div>
          <h3 className="mt-3 text-2xl font-semibold leading-tight text-slate-900 transition-colors duration-300 dark:text-slate-50">
            {title}
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-600 transition-colors duration-300 dark:text-slate-300">
            {clientName ? (
              <span className="inline-flex items-center gap-2">
                <LuCircleUser className="text-base text-indigo-500 dark:text-indigo-300" />
                {clientName}
              </span>
            ) : (
              "Client details pending"
            )}
          </p>
          {reference && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
              {reference}
            </p>
          )}
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3 rounded-3xl border border-white/60 bg-white/80 p-4 text-sm shadow-inner transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 transition-colors duration-300 dark:text-slate-400">
            <span>Case Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress progress={overallProgress} status={overallProgress === 100 ? "Completed" : "In Progress"} />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-inner transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 transition-colors duration-300 dark:text-slate-400">
            <LuTrendingUp className="text-base text-indigo-500 dark:text-indigo-300" />
            Status Overview
          </p>
          <div className="flex flex-wrap gap-2">
            {statusEntries.map(({ key, label }) => {
              const count = statusBreakdown?.[key] ?? 0;
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors duration-300 dark:border-slate-600/60 dark:bg-slate-800/60 dark:text-slate-300"
                >
                  <LuBadgeCheck className="text-sm" />
                  {label}: {count}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-inner transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 transition-colors duration-300 dark:text-slate-400">
            <LuCalendarClock className="text-base text-indigo-500 dark:text-indigo-300" />
            Next Milestone
          </p>
          {upcomingTask ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-800 transition-colors duration-300 dark:text-slate-200">
                {upcomingTask.title || upcomingTask.description || "Unnamed task"}
              </p>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
                Due {formatDateLabel(upcomingTask.dueDate) || "TBD"}
              </p>
              <p className="text-sm text-slate-600 transition-colors duration-300 dark:text-slate-300">
                Status: {upcomingTask.status || "Pending"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-slate-400">
              All tasks are completed for this matter.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-inner transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 transition-colors duration-300 dark:text-slate-400">
          Recent Updates
        </p>
        {recentUpdates && recentUpdates.length > 0 ? (
          <ul className="space-y-3">
            {recentUpdates.map((update) => (
              <li
                key={update._id}
                className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 text-sm transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 transition-colors duration-300 dark:text-slate-200">
                    {update.title || update.description || "Update"}
                  </span>
                  <span className="text-xs uppercase tracking-[0.26em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
                    {formatDateLabel(update.updatedAt || update.dueDate || update.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 transition-colors duration-300 dark:text-slate-400">
                  Status: {update.status}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-slate-400">
            No recent updates available.
          </p>
        )}
      </section>

      {defaultTaskId && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleViewDetails}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition hover:shadow-[0_16px_40px_rgba(56,189,248,0.45)]"
          >
            View case details
            <LuArrowUpRight className="text-base" />
          </button>
        </div>
      )}
    </article>
  );
};

export default MatterCard;