const cron = require("node-cron");
const { generateWeeklySummaryAI } = require("../services/groq.service");
const { getWeeklyRawSummary } = require("../services/weeklySummary.service");

const runWeeklySummaryJob = async () => {
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

  console.log("Weekly summary:", finalSummary);
};

cron.schedule("0 9 * * 1", () => {
  runWeeklySummaryJob().catch((error) => {
    console.error("Weekly summary job failed:", error.message);
  });
});

module.exports = { runWeeklySummaryJob };
