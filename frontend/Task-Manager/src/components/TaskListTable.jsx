import React from "react";
import { LuCalendar, LuClock3, LuUser } from "react-icons/lu";
import { formatDateTimeLabel } from "../utils/dateUtils";
import {
  calculateTaskCompletion,
  getProgressBarColor,
} from "../utils/taskProgress";

const TaskListTable = ({ tableData, onTaskClick, className = "" }) => {
  const safeTableData = Array.isArray(tableData)
    ? tableData
    : tableData?.tasks && Array.isArray(tableData.tasks)
    ? tableData.tasks
    : [];

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-gradient-to-r from-emerald-500 to-lime-500 text-white shadow-sm";
      case "Pending":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
      case "In Progress":
        return "bg-gradient-to-r from-sky-500 to-cyan-500 text-white";
      default:
        return "bg-gradient-to-r from-slate-500 to-slate-400 text-white";
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case "High":
        return "bg-gradient-to-r from-rose-500 to-red-500 text-white";
      case "Medium":
        return "bg-gradient-to-r from-amber-400 to-orange-400 text-white";
      case "Low":
        return "bg-gradient-to-r from-emerald-400 to-teal-400 text-white";
      default:
        return "bg-gradient-to-r from-slate-500 to-slate-400 text-white";
    }
  };

  const getAssigneeNames = (assignedTo) => {
    if (!assignedTo) {
      return "Unassigned";
    }

    const assigneeList = Array.isArray(assignedTo) ? assignedTo : [assignedTo];

    const names = assigneeList
      .map((assignee) => {
        if (typeof assignee === "string") {
          return assignee;
        }

        if (assignee && typeof assignee === "object") {
          return assignee.name || assignee.fullName || assignee.email || "";
        }

        return "";
      })
      .filter(Boolean);

    return names.length ? names.join(", ") : "Unassigned";
  };

  const formatDate = (value, fallback = "N/A") =>
    formatDateTimeLabel(value, fallback);

 const handleTaskActivation = (task) => {
    if (typeof onTaskClick === "function" && task) {
      onTaskClick(task);
    }
  };

  const interactiveRowProps = (task) => {
    if (typeof onTaskClick !== "function") {
      return {};
    }

    return {
      onClick: () => handleTaskActivation(task),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleTaskActivation(task);
        }
      },
      role: "button",
      tabIndex: 0,
    };
  };

  const getInteractiveRowClasses = (baseClasses) => {
    if (typeof onTaskClick !== "function") {
      return baseClasses;
    }

    return `${baseClasses} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60`;
  };

  const getProgressMeta = (task) => {
    const percentage = calculateTaskCompletion({
      progress:
        task?.progress ??
        task?.progressValue ??
        task?.progressPercentage ??
        task?.completion,
      completedTodoCount: task?.completedTodoCount,
      todoChecklist: task?.todoChecklist,
      status: task?.status,
    });

    const { colorClass } = getProgressBarColor({
      percentage,
      status: task?.status,
      dueDate: task?.dueDate,
    });

    return {
      percentage,
      colorClass,
      rounded: Math.round(percentage),
    };
  };

  const containerClassName = [
    "mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/40",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              <th className="px-6 py-3">S.No.</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Priority</th>
              <th className="hidden px-6 py-3 md:table-cell">Due Date</th>
              <th className="hidden px-6 py-3 md:table-cell">Assigned To</th>
              <th className="hidden px-6 py-3 md:table-cell">Start Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900/60">
            {safeTableData.map((task, index) => {
              const progressMeta = getProgressMeta(task);

              return (
                <tr
                  key={task._id}
                  className={getInteractiveRowClasses(
                    "text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                  )}
                  {...interactiveRowProps(task)}
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <div className="space-y-2">
                      <span className="line-clamp-1">{task.title}</span>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          <span>Progress</span>
                          <span>{progressMeta.rounded}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`${progressMeta.colorClass} h-full transition-all duration-500`}
                            style={{ width: `${progressMeta.percentage}%` }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityBadgeColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="hidden px-6 py-4 text-sm text-slate-500 md:table-cell dark:text-slate-300">
                    {formatDate(task.dueDate)}
                  </td>
                  <td className="hidden px-6 py-4 text-sm text-slate-500 md:table-cell dark:text-slate-300">
                    {getAssigneeNames(task.assignedTo)}
                  </td>
                  <td className="hidden px-6 py-4 text-sm text-slate-500 md:table-cell dark:text-slate-300">
                    {formatDate(task.startDate || task.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {safeTableData.length ? (
          safeTableData.map((task, index) => {
            const progressMeta = getProgressMeta(task);

            return (
              <article
                key={task._id}
                className={getInteractiveRowClasses(
                  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200"
                )}
                {...interactiveRowProps(task)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      S.No. {index + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {task.title}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                </div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {task.priority}
                </div>
                
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <span>Progress</span>
                    <span>{progressMeta.rounded}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`${progressMeta.colorClass} h-full transition-all duration-500`}
                      style={{ width: `${progressMeta.percentage}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <dl className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <LuCalendar className="text-slate-400 dark:text-slate-400" />
                    <dt className="font-medium text-slate-500 dark:text-slate-400">
                      Due
                    </dt>
                    <dd className="text-slate-700 dark:text-slate-200">{formatDate(task.dueDate)}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <LuUser className="text-slate-400 dark:text-slate-400" />
                    <dt className="font-medium text-slate-500 dark:text-slate-400">
                      Assignees
                    </dt>
                    <dd className="text-slate-700 dark:text-slate-200">
                      {getAssigneeNames(task.assignedTo)}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <LuClock3 className="text-slate-400 dark:text-slate-400" />
                    <dt className="font-medium text-slate-500 dark:text-slate-400">
                      Starts
                    </dt>
                    <dd className="text-slate-700 dark:text-slate-200">
                      {formatDate(task.startDate || task.createdAt)}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            No tasks available yet.
          </p>
        )}
      </div>      
    </div>
  );
};

export default TaskListTable;
