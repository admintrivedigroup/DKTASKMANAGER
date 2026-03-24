const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER = { Completed: 1 };
const DEFAULT_SORT_MODE = "default";

const getTimestamp = (value, fallback = Number.MAX_SAFE_INTEGER) => {
  if (!value) {
    return fallback;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
};

const compareDefaultTasks = (taskA, taskB, includePrioritySort) => {
  const taskAStatusRank = STATUS_ORDER[taskA?.status] ?? 0;
  const taskBStatusRank = STATUS_ORDER[taskB?.status] ?? 0;

  if (taskAStatusRank !== taskBStatusRank) {
    return taskAStatusRank - taskBStatusRank;
  }

  if (includePrioritySort) {
    const taskAPriority =
      PRIORITY_ORDER[taskA?.priority] ?? Number.MAX_SAFE_INTEGER;
    const taskBPriority =
      PRIORITY_ORDER[taskB?.priority] ?? Number.MAX_SAFE_INTEGER;

    if (taskAPriority !== taskBPriority) {
      return taskAPriority - taskBPriority;
    }
  }

  const taskADueDate = getTimestamp(taskA?.dueDate);
  const taskBDueDate = getTimestamp(taskB?.dueDate);

  return taskADueDate - taskBDueDate;
};

const compareAssignedNewestTasks = (taskA, taskB) => {
  const taskAAssignedTime = getTimestamp(
    taskA?.createdAt || taskA?.assignedAt || taskA?.startDate,
    Number.MIN_SAFE_INTEGER
  );
  const taskBAssignedTime = getTimestamp(
    taskB?.createdAt || taskB?.assignedAt || taskB?.startDate,
    Number.MIN_SAFE_INTEGER
  );

  if (taskAAssignedTime !== taskBAssignedTime) {
    return taskBAssignedTime - taskAAssignedTime;
  }

  return compareDefaultTasks(taskA, taskB, true);
};

const comparePriorityTasks = (taskA, taskB) => {
  const taskAPriority = PRIORITY_ORDER[taskA?.priority] ?? Number.MAX_SAFE_INTEGER;
  const taskBPriority = PRIORITY_ORDER[taskB?.priority] ?? Number.MAX_SAFE_INTEGER;

  if (taskAPriority !== taskBPriority) {
    return taskAPriority - taskBPriority;
  }

  return compareDefaultTasks(taskA, taskB, false);
};

const compareDueDateTasks = (taskA, taskB) => {
  const taskADueDate = getTimestamp(taskA?.dueDate);
  const taskBDueDate = getTimestamp(taskB?.dueDate);

  if (taskADueDate !== taskBDueDate) {
    return taskADueDate - taskBDueDate;
  }

  return compareDefaultTasks(taskA, taskB, true);
};

export const TASK_SORT_OPTIONS = [
  {
    value: DEFAULT_SORT_MODE,
    label: "Default",
    description: "Status first, then priority and due date.",
  },
  {
    value: "assigned-newest",
    label: "Assigned: New to Old",
    description: "Newest assigned or created tasks appear first.",
  },
  {
    value: "priority-high",
    label: "Priority: High to Low",
    description: "High-priority work moves to the top.",
  },
  {
    value: "due-nearest",
    label: "Due Date: Near to Far",
    description: "Upcoming deadlines appear first.",
  },
];

export const getTaskSortLabel = (sortMode = DEFAULT_SORT_MODE) =>
  TASK_SORT_OPTIONS.find((option) => option.value === sortMode)?.label ||
  TASK_SORT_OPTIONS[0].label;

export const sortTasks = (
  tasks = [],
  { includePrioritySort = false, mode = DEFAULT_SORT_MODE } = {}
) => {
  return [...tasks].sort((taskA, taskB) => {
    switch (mode) {
      case "assigned-newest":
        return compareAssignedNewestTasks(taskA, taskB);
      case "priority-high":
        return comparePriorityTasks(taskA, taskB);
      case "due-nearest":
        return compareDueDateTasks(taskA, taskB);
      default:
        return compareDefaultTasks(taskA, taskB, includePrioritySort);
    }
  });
};

export const buildStatusTabs = (statusSummary = {}) => {
  return [
    { label: "All", count: statusSummary.all || 0 },
    { label: "Drafts", count: statusSummary.draftTasks || 0 },
    { label: "Pending", count: statusSummary.pendingTasks || 0 },
    { label: "In Progress", count: statusSummary.inProgressTasks || 0 },
    {
      label: "Pending Approval",
      count: statusSummary.pendingApprovalTasks || 0,
    },
    { label: "Completed", count: statusSummary.completedTasks || 0 },
  ];
};

export const extractStatusSummary = (summary) => ({
  all: Number(summary?.all || 0),
  draftTasks: Number(summary?.draftTasks || 0),
  pendingTasks: Number(summary?.pendingTasks || 0),
  inProgressTasks: Number(summary?.inProgressTasks || 0),
  pendingApprovalTasks: Number(summary?.pendingApprovalTasks || 0),
  completedTasks: Number(summary?.completedTasks || 0),
});
