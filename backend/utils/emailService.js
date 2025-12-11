const SibApiV3Sdk = require("@sendinblue/client");

const {
  BREVO_API_KEY,
  EMAIL_FROM,
  EMAIL_FROM_NAME,
  CLIENT_URL,
} = process.env;

const client = new SibApiV3Sdk.TransactionalEmailsApi();
if (BREVO_API_KEY) {
  client.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    BREVO_API_KEY
  );
}

const requiredConfig = [BREVO_API_KEY, EMAIL_FROM];

const formatDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};

const buildTaskLink = (taskId) => {
  if (!CLIENT_URL || !taskId) return null;
  const base = CLIENT_URL.endsWith("/") ? CLIENT_URL.slice(0, -1) : CLIENT_URL;
  return `${base}/tasks/${taskId}`;
};

const buildTaskAssignedEmail = (task, assignedBy, taskLink) => {
  const title = task?.title || "Task";
  const description = task?.description || "No description provided.";
  const priority = task?.priority || "Not set";
  const status = task?.status || "Pending";
  const dueDate = task?.dueDate ? formatDate(task.dueDate) : "Not set";
  const assignedByText =
    assignedBy?.name || assignedBy?.email || "A team member";

  return `
    <div style="background-color:#f4f6fb;padding:24px 0;margin:0;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <div style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 8px 24px rgba(17,24,39,0.12);padding:24px;box-sizing:border-box;">
              <div style="display:flex;align-items:center;gap:8px;font-size:18px;font-weight:600;color:#111827;margin:0 0 8px 0;">
                <span style="font-size:22px;line-height:1;">📌</span>
                <span>          New Task Assigned</span>
              </div>
              <p style="margin:0 0 12px 0;font-size:14px;color:#4b5563;">${assignedByText} assigned you a task.</p>
              <div style="margin:0 0 14px 0;">
                <div style="font-size:20px;font-weight:700;color:#1e90ff;margin:0 0 8px 0;line-height:1.3;">${title}</div>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${description}</p>
              </div>
              <div style="background:#f3f4f6;border-radius:12px;padding:12px 14px;margin:0 0 18px 0;border:1px solid #e5e7eb;">
                <p style="margin:0;font-size:13px;color:#111827;line-height:1.5;"><strong>Priority:</strong> ${priority}</p>
                <p style="margin:6px 0 0 0;font-size:13px;color:#111827;line-height:1.5;"><strong>Status:</strong> ${status}</p>
                <p style="margin:6px 0 0 0;font-size:13px;color:#111827;line-height:1.5;"><strong>Due date:</strong> ${dueDate}</p>
              </div>
              ${
                taskLink
                  ? `<a href="https://dktaskmanager.netlify.app" target="_blank" rel="noopener" style="display:inline-block;background-color:#1e90ff;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:15px;font-weight:600;box-shadow:0 6px 18px rgba(30,144,255,0.35);">View Task</a>`
                  : ""
              }
              <p style="margin:18px 0 0 0;font-size:12px;color:#6b7280;">This is an automated notification from Task Manager.</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
};

const sendEmail = async ({ to, subject, html }) => {
  if (requiredConfig.some((value) => !value)) {
    throw new Error("Email configuration is incomplete. Please set BREVO_API_KEY and EMAIL_FROM.");
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) {
    throw new Error("No recipient email address provided.");
  }

  await client.sendTransacEmail({
    sender: { email: EMAIL_FROM, name: EMAIL_FROM_NAME || "Task Manager" },
    to: recipients.map((email) => ({ email })),
    subject,
    htmlContent: html || "",
    textContent: html ? html.replace(/<[^>]+>/g, "") : "",
  });
};

const sendTaskAssignmentEmail = async ({ task, assignees = [], assignedBy }) => {
  const recipientEmails = assignees
    .map((assignee) => assignee?.email)
    .filter(Boolean);

  if (!recipientEmails.length) {
    return;
  }

  const subject = `New Task Assigned: ${task?.title || "Task"}`;
  const taskLink = buildTaskLink(task?._id);
  const html = buildTaskAssignedEmail(task, assignedBy, taskLink);

  await sendEmail({
    to: recipientEmails,
    subject,
    html,
  });
};

const sendTaskReminder = async (to, task, hoursBefore) => {
  const taskLink = buildTaskLink(task?._id);
  const hoursText =
    typeof hoursBefore === "number" && hoursBefore > 0
      ? `${hoursBefore} hour${hoursBefore === 1 ? "" : "s"}`
      : null;

  const subject = hoursText
    ? `Reminder: ${task?.title || "Task"} due in ${hoursText}`
    : `Reminder: ${task?.title || "Task"} is due soon`;

  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Task Reminder</h2>
      <p>${hoursText ? `This task is due in ${hoursText}.` : "This task is due soon."}</p>
      <p><b>Task:</b> ${task?.title || "Task"}</p>
      ${task?.description ? `<p><b>Details:</b> ${task.description}</p>` : ""}
      ${task?.priority ? `<p><b>Priority:</b> ${task.priority}</p>` : ""}
      ${task?.dueDate ? `<p><b>Due:</b> ${formatDate(task.dueDate)}</p>` : ""}
      ${taskLink ? `<p><a href="${taskLink}" target="_blank" rel="noopener">View task</a></p>` : ""}
    </div>
  `;

  await sendEmail({ to, subject, html });
};

const sendTaskReminderEmail = async ({
  task,
  assignees = [],
  assignedBy,
  message,
}) => {
  const recipientEmails = assignees
    .map((assignee) => assignee?.email)
    .filter(Boolean);

  if (!recipientEmails.length) {
    return;
  }

  const subject = `Reminder: ${task?.title || "Task"}`;
  const html = `
    <h2>Task Reminder</h2>
    <p>${message || "This is a reminder for your assigned task."}</p>
    <p><b>Task:</b> ${task?.title || "Task"}</p>
    ${task?.dueDate ? `<p><b>Due:</b> ${formatDate(task.dueDate)}</p>` : ""}
    ${assignedBy?.name || assignedBy?.email ? `<p><b>From:</b> ${assignedBy?.name || assignedBy?.email}</p>` : ""}
  `;

  await sendEmail({
    to: recipientEmails,
    subject,
    html,
  });
};

const sendTestEmail = async ({ to }) => {
  const recipient = Array.isArray(to) ? to.filter(Boolean) : to;
  await sendEmail({
    to: recipient || EMAIL_FROM,
    subject: "Test Email",
    html: "<p>This is a test email from the Task Manager backend.</p>",
  });
};

module.exports = {
  sendEmail,
  sendTaskAssignmentEmail,
  sendTaskReminder,
  sendTaskReminderEmail,
  sendTestEmail,
};
