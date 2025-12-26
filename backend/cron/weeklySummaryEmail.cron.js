const {
  sendRoleBasedWeeklySummaryEmails,
} = require("../services/email/weeklySummaryEmail.service");

const runWeeklySummaryEmailJob = async () => {
  try {
    return await sendRoleBasedWeeklySummaryEmails();
  } catch (error) {
    console.error("Weekly summary email job failed:", error.message);
    return null;
  }
};

module.exports = { runWeeklySummaryEmailJob };
