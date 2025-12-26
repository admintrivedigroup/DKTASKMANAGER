const cron = require("node-cron");
const User = require("../models/User");
const { matchesRole } = require("../utils/roleUtils");
const {
  generateFinalWeeklySummary,
} = require("../services/weeklySummary.service");
const { sendWeeklySummaryEmail } = require("../services/brevoEmail.service");

const ADMIN_ROLE_FILTER = ["admin", "super_admin", "superadmin"];

const fetchAdminRecipients = async () => {
  const users = await User.find({ role: { $in: ADMIN_ROLE_FILTER } })
    .select("name email role")
    .lean();

  return users.filter(
    (user) => matchesRole(user.role, "admin") || matchesRole(user.role, "super_admin")
  );
};

const runWeeklySummaryEmailJob = async () => {
  let summaryData;
  try {
    summaryData = await generateFinalWeeklySummary();
  } catch (error) {
    console.error("Weekly summary generation failed:", error.message);
    return;
  }

  const { summary, weekRange } = summaryData || {};
  if (!summary) {
    console.warn("Weekly summary email skipped: no summary generated.");
    return;
  }

  let recipients = [];
  try {
    recipients = await fetchAdminRecipients();
  } catch (error) {
    console.error("Weekly summary recipients lookup failed:", error.message);
    return;
  }

  if (!recipients.length) {
    console.warn("Weekly summary email skipped: no admin recipients found.");
    return;
  }

  for (const recipient of recipients) {
    if (!recipient?.email) continue;
    await sendWeeklySummaryEmail({
      toEmail: recipient.email,
      toName: recipient.name,
      weekRange,
      summary,
    });
  }
};

cron.schedule("*/2 * * * *", () => {
  runWeeklySummaryEmailJob().catch((error) => {
    console.error("Weekly summary email job failed:", error.message);
  });
});

module.exports = { runWeeklySummaryEmailJob };
