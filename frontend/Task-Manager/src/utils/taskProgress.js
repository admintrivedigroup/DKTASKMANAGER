export const clampPercentage = (value) => {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, numericValue));
};

export const calculateTaskCompletion = ({
  progress,
  completedTodoCount,
  todoChecklist,
  status,
}) => {
  const normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : "";

  const deriveCompletedFromChecklist = (checklist) => {
    if (!Array.isArray(checklist)) {
      return null;
    }

    return checklist.reduce((count, item) => {
      if (!item) return count;

      const flag =
        item.completed ??
        item.isCompleted ??
        item.done ??
        item.isDone ??
        (typeof item.status === "string"
          ? item.status.trim().toLowerCase() === "completed"
          : null);

      return flag ? count + 1 : count;
    }, 0);
  };

  const completedFromChecklist = deriveCompletedFromChecklist(todoChecklist);

  const completed =
    typeof completedTodoCount === "number" && !Number.isNaN(completedTodoCount)
      ? completedTodoCount
      : typeof completedFromChecklist === "number"
      ? completedFromChecklist
      : 0;

  const totalTodos = Array.isArray(todoChecklist)
    ? todoChecklist.length
    : typeof todoChecklist === "number" && !Number.isNaN(todoChecklist)
    ? todoChecklist
    : 0;

  const hasChecklist = totalTodos > 0;
  const hasIncompleteChecklist = hasChecklist && completed < totalTodos;

  const parseProgressValue = (value) => {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === "string") {
      const cleaned = value.replace(/%/g, "").trim();
      const numericValue = Number(cleaned);
      if (!Number.isNaN(numericValue)) {
        return numericValue;
      }
    }

    return null;
  };

  const explicitProgress = parseProgressValue(progress);

  if (hasChecklist) {
    const derivedProgress = clampPercentage((completed / totalTodos) * 100);

    if (hasIncompleteChecklist) {
      return derivedProgress;
    }

    if (explicitProgress !== null) {
      const clampedProgress = clampPercentage(explicitProgress);
      return Math.max(clampedProgress, derivedProgress);
    }

    return 100;
  }

  if (explicitProgress !== null) {
    return clampPercentage(explicitProgress);
  }

  if (normalizedStatus === "completed") {
    return 100;
  }

  if (normalizedStatus === "in progress") {
    return 50;
  }

  return 0;
};

const isDueWithinNextDay = (dueDate, isCompleted) => {
  if (!dueDate || isCompleted) {
    return false;
  }

  const dueDateInstance = new Date(dueDate);

  if (Number.isNaN(dueDateInstance.getTime())) {
    return false;
  }

  const now = Date.now();
  const dueTime = dueDateInstance.getTime();
  const millisecondsInDay = 24 * 60 * 60 * 1000;

  return dueTime - now <= millisecondsInDay;
};

export const getProgressBarColor = ({ percentage, status, dueDate }) => {
  const normalizedPercentage = clampPercentage(percentage);
  const normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : "";
  const isCompleted =
    normalizedPercentage >= 100 ||
    (normalizedStatus === "completed" && normalizedPercentage >= 99.5);

  if (isCompleted) {
    return {
      colorClass: "bg-emerald-500",
      tone: "success",
    };
  }

  if (normalizedPercentage < 25 || isDueWithinNextDay(dueDate, isCompleted)) {
    return {
      colorClass: "bg-rose-500",
      tone: "danger",
    };
  }

  return {
    colorClass: "bg-orange-400",
    tone: "caution",
  };
};
