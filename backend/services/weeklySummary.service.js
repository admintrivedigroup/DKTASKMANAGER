const Task = require("../models/Task");
const { generateWeeklySummaryAI } = require("./groq.service");

/**
 * Get date range for last 7 days
 */
const getWeekRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const formatDate = (date) => date.toISOString().split("T")[0];

const formatWeekRange = (range) =>
  `${formatDate(range.start)} to ${formatDate(range.end)}`;

/**
 * Build raw summary text from stats
 * This MUST be readable without AI
 */
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
    `Please provide a clear, concise summary for company administrators.`,
  ].join(" ");
};

/**
 * Fallback summary if DB fails
 */
const buildFallbackSummary = (range) => {
  const startLabel = formatDate(range.start);
  const endLabel = formatDate(range.end);

  return `Weekly Task Summary (${startLabel} to ${endLabel}). Task statistics are currently unavailable.`;
};

/**
 * Generate RAW weekly summary from DB
 */
const getWeeklyRawSummary = async (rangeOverride) => {
  const range = rangeOverride || getWeekRange();

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

/**
 * Generate FINAL summary (AI + fallback safe)
 */
const generateFinalWeeklySummary = async () => {
  const range = getWeekRange();
  let rawSummary = "";

  try {
    rawSummary = await getWeeklyRawSummary(range);
  } catch (error) {
    console.error("Weekly raw summary generation failed:", error.message);
    rawSummary = buildFallbackSummary(range);
  }

  // 🔍 DEBUG LOGS (remove later if needed)
  console.log("===== WEEKLY SUMMARY DEBUG =====");
  console.log("RAW SUMMARY LENGTH:", rawSummary?.length);
  console.log("RAW SUMMARY CONTENT:", rawSummary);
  console.log("================================");

  let finalSummary = rawSummary;

  try {
    // 🛑 SAFETY CHECK — NEVER CALL GROQ WITH BAD INPUT
    if (!rawSummary || rawSummary.trim().length < 30) {
      console.warn("Raw summary too short, skipping Groq AI");
      return {
        summary: rawSummary || buildFallbackSummary(range),
        weekRange: formatWeekRange(range),
      };
    }

    finalSummary = await generateWeeklySummaryAI(rawSummary);
  } catch (error) {
    console.error("Groq summary failed:", error.message);
    finalSummary = rawSummary; // fallback
  }

  return {
    summary: finalSummary,
    weekRange: formatWeekRange(range),
  };
};

module.exports = {
  getWeeklyRawSummary,
  generateFinalWeeklySummary,
};
