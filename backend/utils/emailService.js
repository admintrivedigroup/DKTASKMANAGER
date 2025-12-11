const nodemailer = require("nodemailer");

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  EMAIL_FROM_NAME,
  CLIENT_URL,
} = process.env;

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: Number(EMAIL_PORT) || 587,
  secure: Number(EMAIL_PORT) === 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const requiredConfig = [EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS];

const getFromAddress = () => {
  const address = EMAIL_FROM || EMAIL_USER;
  const name = EMAIL_FROM_NAME || "Task Manager";

  return name ? `"${name}" <${address}>` : address;
};

const formatDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};

const buildTaskLink = (taskId) => {
  if (!CLIENT_URL || !taskId) return null;
  const base = CLIENT_URL.endsWith("/") ? CLIENT_URL.slice(0, -1) : CLIENT_URL;
  return `${base}/tasks/${taskId}`;
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (requiredConfig.some((value) => !value)) {
    throw new Error(
      "Email configuration is incomplete. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS."
    );
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (!recipients.length) {
    throw new Error("No recipient email address provided.");
  }

  await transporter.sendMail({
    from: getFromAddress(),
    to: recipients,
    subject,
    text: text || (html ? html.replace(/<[^>]+>/g, "") : undefined),
    html,
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
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>New Task Assigned</h2>
      <p>${assignedBy?.name || assignedBy?.email || "A team member"} assigned you a new task.</p>
      <h3 style="margin-bottom: 4px;">${task?.title || "Task"}</h3>
      ${task?.description ? `<p style="margin-top: 0;">${task.description}</p>` : ""}
      <ul>
        <li><b>Priority:</b> ${task?.priority || "Not set"}</li>
        <li><b>Status:</b> ${task?.status || "Pending"}</li>
        ${task?.dueDate ? `<li><b>Due:</b> ${formatDate(task.dueDate)}</li>` : ""}
      </ul>
      ${
        taskLink
          ? `<p style="margin-top: 12px;"><a href="${taskLink}" target="_blank" rel="noopener">View task</a></p>`
          : ""
      }
    </div>
  `;

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

const sendTestEmail = async ({ to, subject, message }) => {
  const recipient = Array.isArray(to) ? to.filter(Boolean) : to;
  await sendEmail({
    to: recipient || EMAIL_USER,
    subject: subject || "Test Email",
    html: `<p>${message || "This is a test email from the Task Manager backend."}</p>`,
    text: message || "This is a test email from the Task Manager backend.",
  });
};

module.exports = {
  sendEmail,
  sendTaskAssignmentEmail,
  sendTaskReminder,
  sendTaskReminderEmail,
  sendTestEmail,
};
