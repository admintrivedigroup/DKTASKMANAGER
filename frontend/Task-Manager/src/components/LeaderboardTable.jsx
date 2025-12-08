import React from "react";
import { getRoleLabel } from "../utils/roleUtils";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
};

const Avatar = ({ name, profileImageUrl }) => {
  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={name || "Team member"}
        className="h-10 w-10 flex-shrink-0 rounded-full object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-sky-500 to-teal-400 text-xs font-semibold uppercase text-white shadow-sm">
      {getInitials(name)}
    </div>
  );
};

const formatRatio = (numerator, denominator) => {
  if (!denominator) {
    return "0 / 0";
  }

  return `${numerator} / ${denominator}`;
};

const formatPercentage = (value) => {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
};

const LeaderboardTable = ({ entries, onEntryClick }) => {
  const data = Array.isArray(entries) ? entries : [];

  const handleEntryClick = (entry) => {
    if (typeof onEntryClick === "function") {
      onEntryClick(entry);
    }
  };

  if (!data.length) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
        Leaderboard data will appear once tasks are assigned and completed.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden md:block">
        <div className="max-h-[420px] overflow-y-auto overflow-x-auto pr-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">S.No.</th>
                <th className="px-6 py-3">Rank</th>
                <th className="px-6 py-3">Team Member</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Completed</th>
                <th className="px-6 py-3">On-Time</th>
                <th className="px-6 py-3">Late</th>
                <th className="px-6 py-3">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.map((entry, index) => {
                const isInteractive =
                  typeof onEntryClick === "function" && entry?.userId;

                return (
                  <tr
                    key={entry.userId || index}
                    className={`text-sm text-slate-600 transition hover:bg-slate-50 ${isInteractive ? "cursor-pointer" : ""}`}
                    onClick={
                      isInteractive
                        ? () => {
                            handleEntryClick(entry);
                          }
                        : undefined
                    }
                    role={isInteractive ? "button" : undefined}
                    tabIndex={isInteractive ? 0 : undefined}
                    onKeyDown={
                      isInteractive
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleEntryClick(entry);
                            }
                          }
                        : undefined
                    }
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      #{entry.rank}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={entry.name}
                          profileImageUrl={entry.profileImageUrl}
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.name}
                          </p>
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            {getRoleLabel(entry.role)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {Number(entry.score || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatRatio(entry.completedTasks, entry.totalAssigned)}
                      <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                        {formatPercentage(entry.completionRate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {entry.onTimeCompletions}
                      <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-sky-600">
                        {formatPercentage(entry.onTimeRate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {entry.lateCompletions}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {entry.overdueTasks}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-h-[520px] space-y-3 overflow-y-auto p-4 pr-1 md:hidden">
        {data.map((entry, index) => (
          <article
            key={entry.userId || index}
            className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
              typeof onEntryClick === "function" && entry?.userId
                ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
                : ""
            }`}
            onClick={
              typeof onEntryClick === "function" && entry?.userId
                ? () => handleEntryClick(entry)
                : undefined
            }
            role={
              typeof onEntryClick === "function" && entry?.userId
                ? "button"
                : undefined
            }
            tabIndex={
              typeof onEntryClick === "function" && entry?.userId ? 0 : undefined
            }
            onKeyDown={
              typeof onEntryClick === "function" && entry?.userId
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleEntryClick(entry);
                    }
                  }
                : undefined
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  S.No. {index + 1}
                </span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  Rank #{entry.rank}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {Number(entry.score || 0).toLocaleString()} pts
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Avatar name={entry.name} profileImageUrl={entry.profileImageUrl} />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{entry.name}</h3>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {getRoleLabel(entry.role)}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-medium uppercase tracking-wider text-slate-500">
                  Completed
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {formatRatio(entry.completedTasks, entry.totalAssigned)}
                </dd>
                <dd className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                  {formatPercentage(entry.completionRate)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-medium uppercase tracking-wider text-slate-500">
                  On-Time
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {entry.onTimeCompletions}
                </dd>
                <dd className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">
                  {formatPercentage(entry.onTimeRate)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-medium uppercase tracking-wider text-slate-500">
                  Late
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {entry.lateCompletions}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-medium uppercase tracking-wider text-slate-500">
                  Overdue
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {entry.overdueTasks}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardTable;
