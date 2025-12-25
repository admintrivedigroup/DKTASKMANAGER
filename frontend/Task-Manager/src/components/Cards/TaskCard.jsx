import React from "react";
import AvatarGroup from "../AvatarGroup";
import { LuPaperclip } from "react-icons/lu";
import { formatDateTimeLabel } from "../../utils/dateUtils";
import {
  calculateTaskCompletion,
  getProgressBarColor,
} from "../../utils/taskProgress";

const TaskCard = ({
  title,
  description,
  priority,
  status,
  progress,
  startDate,
  createdAt,
  dueDate,
  assignedTo = [],
  attachmentCount = 0,
  completedTodoCount,
  todoChecklist,
  onClick,
  cardId,
  isHighlighted = false,
}) => {
  const assigneeAvatars = Array.isArray(assignedTo)
    ? assignedTo.map((user) => {
        if (typeof user === "string") {
          return { profileImageUrl: user, name: "" };
        }

        if (user && typeof user === "object") {
          return {
            profileImageUrl:
              user.profileImageUrl || user.src || user.avatar || "",
            name: user.name || user.fullName || "",
          };
        }

        return { profileImageUrl: "", name: "" };
      })
    : [];

  const assigneeNames = assigneeAvatars
    .map((user) => user.name)
    .filter((name) => Boolean(name?.trim()));

  const totalAttachments =
    typeof attachmentCount === "number" && !Number.isNaN(attachmentCount)
      ? attachmentCount
      : 0;

  const completionPercentage = calculateTaskCompletion({
    progress,
    completedTodoCount,
    todoChecklist,
    status,
  });

  const { colorClass: progressBarColor } = getProgressBarColor({
    percentage: completionPercentage,
    status,
    dueDate,
  });

  const roundedCompletion = Math.round(completionPercentage);

  const getStatusTagColor = () => {
    switch (status) {
      case "Draft":
        return "bg-slate-100 text-slate-700 ring-slate-200";
      case "In Progress":
        return "bg-sky-100 text-sky-700 ring-sky-200";
      case "Completed":
        return "bg-emerald-100 text-emerald-700 ring-emerald-200";
      default:
        return "bg-purple-100 text-purple-700 ring-purple-200";
    }
  };

  const getPriorityTagColor = () => {
    switch (priority) {
      case "Low":
        return "bg-emerald-50 text-emerald-700 ring-emerald-100";
      case "Medium":
        return "bg-amber-50 text-amber-700 ring-amber-100";
      default:
        return "bg-rose-50 text-rose-700 ring-rose-100";
    }
  };

  const cardClasses = [
    "group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_14px_30px_rgba(59,130,246,0.14)] dark:border-slate-800/70 dark:bg-slate-900 dark:shadow-none",
    isHighlighted
      ? "task-card-highlight ring-1 ring-indigo-200 ring-offset-2 ring-offset-white dark:ring-indigo-500/60 dark:ring-offset-slate-900"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cardClasses}
      data-task-card-id={cardId || undefined}
      onClick={onClick}
    >
      <span className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-50 via-indigo-50 to-sky-50 opacity-80 dark:from-slate-900/60 dark:via-slate-900/50 dark:to-indigo-900/40" />

      <div className="flex items-start justify-between gap-3">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusTagColor()}`}
        >
          {status}
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getPriorityTagColor()}`}
        >
          {priority} priority
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-lg font-semibold leading-snug text-slate-900 transition-colors duration-300 dark:text-slate-100 line-clamp-2">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-600 transition-colors duration-300 dark:text-slate-300 line-clamp-3">
          {description}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 transition-colors duration-300 dark:text-slate-400">
        <div className="space-y-1">
          <p className="font-semibold text-slate-500 transition-colors duration-300 dark:text-slate-400">
            Start date
          </p>
          <p className="text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-slate-100">
            {formatDateTimeLabel(startDate || createdAt, "N/A")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-slate-500 transition-colors duration-300 dark:text-slate-400">
            Due date
          </p>
          <p className="text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-slate-100">
            {formatDateTimeLabel(dueDate, "N/A")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1 dark:bg-slate-800/70">
            <AvatarGroup avatars={assigneeAvatars} maxVisible={3} />
            {assigneeNames.length > 0 && (
              <p className="text-xs font-medium text-slate-600 transition-colors duration-300 dark:text-slate-300">
                {assigneeNames.join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
          <LuPaperclip className="text-sm text-slate-500 dark:text-slate-300" />
          {totalAttachments} files
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 transition-colors duration-300 dark:text-slate-400">
          <span>Progress</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {roundedCompletion}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 transition-colors duration-300 dark:bg-slate-800/60">
          <div
            className={`${progressBarColor} h-full rounded-full transition-all duration-500`}
            style={{ width: `${completionPercentage}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
