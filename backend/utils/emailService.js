const nodemailer = require("nodemailer");

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  EMAIL_FROM_NAME,
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
  const html = `
    <h2>${task?.title || "Task Assigned"}</h2>
    ${task?.description ? `<p>${task.description}</p>` : ""}
    <p><b>Priority:</b> ${task?.priority || "Not set"}</p>
    ${task?.dueDate ? `<p><b>Due:</b> ${formatDate(task.dueDate)}</p>` : ""}
    ${assignedBy?.name || assignedBy?.email ? `<p><b>Assigned By:</b> ${assignedBy?.name || assignedBy?.email}</p>` : ""}
  `;

  await sendEmail({
    to: recipientEmails,
    subject,
    html,
  });
};

const sendTaskReminder = async (to, task) => {
  const subject = `Reminder: ${task?.title || "Task"} is due soon`;
  const html = `
      <h2>Task Reminder</h2>
      <p>Your task <b>${task?.title || "Task"}</b> is due at:</p>
      <h3>${formatDate(task?.dueDate)}</h3>
      <p>Please complete it on time.</p>
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
