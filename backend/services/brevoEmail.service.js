const { sendEmail } = require("../utils/emailService");
const {
  buildWeeklySummaryTemplate,
} = require("../utils/emailTemplates/weeklySummary.template");

const sendWeeklySummaryEmail = async ({
  toEmail,
  toName,
  weekRange,
  summary,
}) => {
  if (!toEmail) return;

  const subject = `Weekly Task Summary \u2013 ${weekRange || "Last 7 days"}`;
  const html = buildWeeklySummaryTemplate({ toName, weekRange, summary });

  try {
    await sendEmail({ to: toEmail, subject, html });
  } catch (error) {
    console.error("Weekly summary email failed:", error.message);
  }
};

module.exports = { sendWeeklySummaryEmail };
