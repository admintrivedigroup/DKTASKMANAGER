const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER = { Completed: 1 };

export const sortTasks = (tasks = [], { includePrioritySort = false } = {}) => {
  return [...tasks].sort((taskA, taskB) => {
    const taskAStatusRank = STATUS_ORDER[taskA?.status] ?? 0;
    const taskBStatusRank = STATUS_ORDER[taskB?.status] ?? 0;

    if (taskAStatusRank !== taskBStatusRank) {
      return taskAStatusRank - taskBStatusRank;
    }

    if (includePrioritySort) {
      const taskAPriority = PRIORITY_ORDER[taskA?.priority] ?? Number.MAX_SAFE_INTEGER;
      const taskBPriority = PRIORITY_ORDER[taskB?.priority] ?? Number.MAX_SAFE_INTEGER;

      if (taskAPriority !== taskBPriority) {
        return taskAPriority - taskBPriority;
      }
    }

    const taskADueDate = taskA?.dueDate ? new Date(taskA.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const taskBDueDate = taskB?.dueDate ? new Date(taskB.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

    return taskADueDate - taskBDueDate;
  });
};

export const buildStatusTabs = (statusSummary = {}) => {
  return [
    { label: "All", count: statusSummary.all || 0 },
    { label: "Drafts", count: statusSummary.draftTasks || 0 },
    { label: "Pending", count: statusSummary.pendingTasks || 0 },
    { label: "In Progress", count: statusSummary.inProgressTasks || 0 },
    { label: "Completed", count: statusSummary.completedTasks || 0 },
  ];
};

export const extractStatusSummary = (summary) => ({
  all: Number(summary?.all || 0),
  draftTasks: Number(summary?.draftTasks || 0),
  pendingTasks: Number(summary?.pendingTasks || 0),
  inProgressTasks: Number(summary?.inProgressTasks || 0),
  completedTasks: Number(summary?.completedTasks || 0),
});
