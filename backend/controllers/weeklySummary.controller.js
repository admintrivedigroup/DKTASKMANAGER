const { generateWeeklySummaryAI } = require("../services/groq.service");
const { getWeeklyRawSummary } = require("../services/weeklySummary.service");

// @desc    Generate weekly task summary (manual trigger)
// @route   POST /api/weekly-summary/run
// @access  Private (Admin)
const runWeeklySummary = async (req, res) => {
  let rawSummary = "";

  try {
    rawSummary = await getWeeklyRawSummary();
  } catch (error) {
    console.error("Weekly summary raw generation failed:", error.message);
    rawSummary = "Weekly Task Summary: Task statistics are currently unavailable.";
  }

  let finalSummary = rawSummary;
  try {
    finalSummary = await generateWeeklySummaryAI(rawSummary);
  } catch (error) {
    console.error("Groq summary failed:", error.message);
  }

  return res.status(200).json({ summary: finalSummary });
};

module.exports = { runWeeklySummary };
