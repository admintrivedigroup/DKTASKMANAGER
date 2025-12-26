const Task = require("../models/Task");
const User = require("../models/User");
const { getRoleLabel, normalizeRole } = require("../utils/roleUtils");
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

const DEFAULT_USER_STATS = Object.freeze({
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  overdueTasks: 0,
});

const buildUserTaskStatsMap = async (range) => {
  const stats = await Task.aggregate([
    { $match: { assignedTo: { $exists: true, $ne: [] } } },
    { $unwind: "$assignedTo" },
    {
      $group: {
        _id: "$assignedTo",
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$completedAt", range.start] },
                  { $lt: ["$completedAt", range.end] },
                ],
              },
              1,
              0,
            ],
          },
        },
        pendingTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
          },
        },
        inProgressTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0],
          },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", range.end] },
                  { $ne: ["$status", "Completed"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const statsMap = new Map();
  stats.forEach((item) => {
    statsMap.set(String(item._id), {
      totalTasks: item.totalTasks || 0,
      completedTasks: item.completedTasks || 0,
      pendingTasks: item.pendingTasks || 0,
      inProgressTasks: item.inProgressTasks || 0,
      overdueTasks: item.overdueTasks || 0,
    });
  });

  return statsMap;
};

const getWeeklyUserTaskStats = async (rangeOverride) => {
  const range = rangeOverride || getWeekRange();
  let users = [];

  try {
    users = await User.find({ role: { $in: ["member", "admin", "super_admin"] } })
      .select("name email role")
      .lean();
  } catch (error) {
    console.error("Weekly summary user lookup failed:", error.message);
    return { range, weekRangeLabel: formatWeekRange(range), users: [] };
  }

  let statsMap = new Map();
  try {
    statsMap = await buildUserTaskStatsMap(range);
  } catch (error) {
    console.error("Weekly summary user stats error:", error.message);
  }

  const summaries = users
    .map((user) => {
      const userId = String(user?._id || "");
      const stats = statsMap.get(userId) || { ...DEFAULT_USER_STATS };

      return {
        id: userId,
        name: user?.name || "Unknown",
        email: user?.email || "",
        role: normalizeRole(user?.role) || "member",
        roleLabel: getRoleLabel(user?.role),
        stats,
      };
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return { range, weekRangeLabel: formatWeekRange(range), users: summaries };
};

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
  getWeeklyUserTaskStats,
  getWeeklyRawSummary,
  generateFinalWeeklySummary,
};
