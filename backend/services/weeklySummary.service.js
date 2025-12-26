const Task = require("../models/Task");

const getWeekRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const formatDate = (date) => date.toISOString().split("T")[0];

const buildRawSummary = (stats, range) => {
  const startLabel = formatDate(range.start);
  const endLabel = formatDate(range.end);

  return [
    `Weekly Task Summary (${startLabel} to ${endLabel}).`,
    `Total tasks in the system: ${stats.totalTasks}.`,
    `New tasks created this week: ${stats.createdThisWeek}.`,
    `Tasks completed this week: ${stats.completedThisWeek}.`,
    `Open tasks: ${stats.openTasks} (Draft: ${stats.draftTasks}, Pending: ${stats.pendingTasks}, In Progress: ${stats.inProgressTasks}).`,
    `Overdue tasks: ${stats.overdueTasks}.`,
    `High-priority open tasks: ${stats.highPriorityOpenTasks}.`,
  ].join(" ");
};

const buildFallbackSummary = (range) => {
  const startLabel = formatDate(range.start);
  const endLabel = formatDate(range.end);
  return `Weekly Task Summary (${startLabel} to ${endLabel}). Task statistics are currently unavailable.`;
};

const getWeeklyRawSummary = async () => {
  const range = getWeekRange();

  try {
    const [
      totalTasks,
      createdThisWeek,
      completedThisWeek,
      draftTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      highPriorityOpenTasks,
    ] = await Promise.all([
      Task.countDocuments({}),
      Task.countDocuments({ createdAt: { $gte: range.start, $lt: range.end } }),
      Task.countDocuments({ completedAt: { $gte: range.start, $lt: range.end } }),
      Task.countDocuments({ status: "Draft" }),
      Task.countDocuments({ status: "Pending" }),
      Task.countDocuments({ status: "In Progress" }),
      Task.countDocuments({
        dueDate: { $lt: range.end },
        status: { $ne: "Completed" },
      }),
      Task.countDocuments({
        priority: "High",
        status: { $ne: "Completed" },
      }),
    ]);

    const openTasks = draftTasks + pendingTasks + inProgressTasks;

    return buildRawSummary(
      {
        totalTasks,
        createdThisWeek,
        completedThisWeek,
        draftTasks,
        pendingTasks,
        inProgressTasks,
        openTasks,
        overdueTasks,
        highPriorityOpenTasks,
      },
      range
    );
  } catch (error) {
    console.error("Weekly summary stats error:", error.message);
    return buildFallbackSummary(range);
  }
};

module.exports = { getWeeklyRawSummary };
