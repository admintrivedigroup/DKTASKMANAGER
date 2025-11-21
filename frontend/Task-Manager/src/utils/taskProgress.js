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
}) => {
  if (typeof progress === "number" && !Number.isNaN(progress)) {
    return clampPercentage(progress);
  }

  const completed =
    typeof completedTodoCount === "number" && !Number.isNaN(completedTodoCount)
      ? completedTodoCount
      : 0;

  const totalTodos = Array.isArray(todoChecklist)
    ? todoChecklist.length
    : typeof todoChecklist === "number" && !Number.isNaN(todoChecklist)
    ? todoChecklist
    : 0;

  if (totalTodos <= 0) {
    return 0;
  }

  const derivedProgress = (completed / totalTodos) * 100;

  return clampPercentage(derivedProgress);
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
  const isCompleted =
    status?.toLowerCase() === "completed" || normalizedPercentage >= 100;

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