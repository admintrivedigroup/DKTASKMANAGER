const cron = require("node-cron");
const {
  sendRoleBasedWeeklySummaryEmails,
} = require("../services/email/weeklySummaryEmail.service");

const runWeeklySummaryJob = async () => {
  console.log("Weekly summary cron started.");

  let result;
  try {
    result = await sendRoleBasedWeeklySummaryEmails();
  } catch (error) {
    console.error("Weekly summary job failed:", error.message);
    return;
  }

  if (result?.summaryReady) {
    console.log("Weekly summary generation succeeded.");
  }

  if (result?.adminRecipients) {
    if (result.adminSentCount) {
      console.log(
        `Admin weekly summary email sent (${result.adminSentCount} recipient(s)).`
      );
    } else {
      console.warn("Admin weekly summary email failed to send.");
    }
  } else {
    console.warn("Admin weekly summary email skipped: no recipients found.");
  }

  if (result?.superadminRecipients) {
    if (result.superadminSentCount) {
      console.log(
        `Superadmin weekly summary email sent (${result.superadminSentCount} recipient(s)).`
      );
    } else {
      console.warn("Superadmin weekly summary email failed to send.");
    }
  } else {
    console.warn("Superadmin weekly summary email skipped: no recipients found.");
  }
};

cron.schedule("0 9 * * 1", () => {
  runWeeklySummaryJob().catch((error) => {
    console.error("Weekly summary job failed:", error.message);
  });
});

module.exports = { runWeeklySummaryJob };
