const cron = require("node-cron");
const {
  sendDailyCompletedTaskSummaryEmails,
} = require("../services/email/dailyCompletedSummaryEmail.service");

const DAILY_COMPLETED_SUMMARY_CRON =
  process.env.DAILY_COMPLETED_SUMMARY_CRON || "0 21 * * *";

const runDailyCompletedSummaryJob = async () => {
  console.log("Daily completed task summary cron started.");

  let result;
  try {
    result = await sendDailyCompletedTaskSummaryEmails();
  } catch (error) {
    console.error("Daily completed task summary job failed:", error.message);
    return;
  }

  console.log(
    `Daily completed task summary prepared for ${result?.dateLabel || "today"} (members: ${result?.memberCompletedTaskCount || 0}, admin+member: ${result?.teamCompletedTaskCount || 0}).`
  );

  if (result?.adminRecipients) {
    if (result.adminSentCount) {
      console.log(
        `Admin daily summary email sent (${result.adminSentCount} recipient(s)).`
      );
    } else {
      console.warn("Admin daily summary email failed to send.");
    }
  } else {
    console.warn("Admin daily summary email skipped: no recipients found.");
  }

  if (result?.superadminRecipients) {
    if (result.superadminSentCount) {
      console.log(
        `Superadmin daily summary email sent (${result.superadminSentCount} recipient(s)).`
      );
    } else {
      console.warn("Superadmin daily summary email failed to send.");
    }
  } else {
    console.warn("Superadmin daily summary email skipped: no recipients found.");
  }
};

cron.schedule(
  DAILY_COMPLETED_SUMMARY_CRON,
  () => {
    runDailyCompletedSummaryJob().catch((error) => {
      console.error("Daily completed task summary job failed:", error.message);
    });
  }
);

module.exports = { runDailyCompletedSummaryJob };
