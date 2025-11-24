import React from "react";
import Progress from "../Progress";
import AvatarGroup from "../AvatarGroup";
import { LuPaperclip } from "react-icons/lu";
import { formatDateLabel } from "../../utils/dateUtils";
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
  createdAt,
  dueDate,
  assignedTo = [],
  attachmentCount = 0,
  completedTodoCount,
  todoChecklist,
  onClick,
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
        name: user.name || user.fullName || ""
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
});

const { colorClass: progressBarColor } = getProgressBarColor({
  percentage: completionPercentage,
  status,
  dueDate,
});

const roundedCompletion = Math.round(completionPercentage);

  const getStatusAccent = () => {
    switch (status) {
      case "In Progress":
        return "from-sky-400 via-cyan-500 to-blue-500";
      case "Completed":
        return "from-emerald-400 via-lime-400 to-green-500";
      default:
        return "from-purple-500 via-pink-500 to-rose-500";
    }
  };

  const getStatusTagColor = () => {
    switch (status) {
      case "In Progress":
        return "bg-gradient-to-r from-sky-500 to-cyan-500 text-white";
      case "Completed":
        return "bg-gradient-to-r from-emerald-500 to-lime-400 text-white";
      default:
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    }
  };

  const getPriorityTagColor = () => {
    switch (priority) {
      case "Low":
        return "bg-gradient-to-r from-emerald-400 to-teal-400 text-white";
      case "Medium":
        return "bg-gradient-to-r from-amber-400 to-orange-400 text-white";
      default:
        return "bg-gradient-to-r from-rose-500 to-red-500 text-white";
    }
  };
  return (
    <div
      className="relative cursor-pointer overflow-hidden rounded-[30px] border border-white/60 bg-white/80 p-6 shadow-[0_22px_50px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_32px_70px_rgba(59,130,246,0.2)] dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-[0_26px_60px_rgba(2,6,23,0.6)]"
      onClick={onClick}
    >
      <span className={`absolute inset-0 -z-10 bg-gradient-to-br ${getStatusAccent()} opacity-[0.12]`} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${getStatusTagColor()}`}>
          {status}
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${getPriorityTagColor()}`}>
          {priority} Priority
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <h3 className="text-lg font-semibold leading-tight text-slate-900 transition-colors duration-300 dark:text-slate-100 line-clamp-2">{title}</h3>
        <p className="text-sm leading-relaxed text-slate-600 transition-colors duration-300 dark:text-slate-300 line-clamp-3">{description}</p>
      </div>
        <div className="mt-5 rounded-2xl border border-white/60 bg-white/80 p-4 transition-colors duration-300 dark:border-slate-800/60 dark:bg-slate-900/60">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 transition-colors duration-300 dark:text-slate-400">
          Task Done
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700 transition-colors duration-300 dark:text-slate-300">
          <span className="text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{completedTodoCount}</span> / {todoChecklist.length || 0}
        </p>
        <div className="mt-3">
          <Progress progress={completionPercentage} status={status} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-300">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-slate-400">Start Date</p>
          <p className="mt-1 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-slate-100">{formatDateLabel(createdAt)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-slate-400">Due Date</p>
          <p className="mt-1 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-slate-100">{formatDateLabel(dueDate)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <AvatarGroup avatars={assigneeAvatars} />
          {assigneeNames.length > 0 && (
            <p className="text-xs font-medium text-slate-600 transition-colors duration-300 dark:text-slate-300">
              {assigneeNames.join(", ")}
            </p>
          )}
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
          <LuPaperclip className="text-base text-slate-500 dark:text-slate-300" />
          {totalAttachments}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
          <span>Progress</span>
          <span>{roundedCompletion}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 transition-colors duration-300 dark:bg-slate-800/60">
          <div
            className={`${progressBarColor} h-full transition-all duration-500`}
            style={{ width: `${completionPercentage}%` }}
            aria-hidden="true"
          />        
        </div>
      </div>    
    </div>
    );
};

export default TaskCard;
