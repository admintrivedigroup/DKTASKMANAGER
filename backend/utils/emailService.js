const nodemailer = require("nodemailer");

let transporter = null;
const DEFAULT_FROM_EMAIL = "helpdesk@ravaladvocates.com";

const getAdminNotificationEmails = () => {
  const rawAdminEmails =
    process.env.ADMIN_NOTIFICATION_EMAILS || process.env.ADMIN_EMAIL || "";

  return rawAdminEmails
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
};

const isEmailConfigured = () => {
  return (
    process.env.EMAIL_HOST &&
    process.env.EMAIL_PORT &&
    (process.env.EMAIL_USER || process.env.EMAIL_FROM)
  );
};

const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    const config = {
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: String(process.env.EMAIL_PORT) === "465",
      auth:
        process.env.EMAIL_USER && process.env.EMAIL_PASS
          ? {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            }
          : undefined,
    };

    // Handle WebHostBox SSL certificate issues
    if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('webhostbox')) {
      config.tls = {
        rejectUnauthorized: false
      };
    }

    transporter = nodemailer.createTransport(config);
  }

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn(
      "Email transport is not configured. Please check your environment variables:",
      {
        EMAIL_HOST: process.env.EMAIL_HOST ? "[SET]" : "[NOT SET]",
        EMAIL_PORT: process.env.EMAIL_PORT ? "[SET]" : "[NOT SET]",
        EMAIL_USER: process.env.EMAIL_USER ? "[SET]" : "[NOT SET]",
        EMAIL_PASS: process.env.EMAIL_PASS ? "[SET]" : "[NOT SET]"
      }
    );
    console.warn("Skipping email delivery for:", subject);
    return;
  }

  const from =
    process.env.EMAIL_FROM || process.env.EMAIL_USER || DEFAULT_FROM_EMAIL;

  try {
    console.log(`Attempting to send email: "${subject}" to:`, to);
    await mailer.sendMail({ from, to, subject, text, html });
    console.log(`Email sent successfully: "${subject}"`);
  } catch (error) {
    console.error(`Failed to send email: "${subject}"`, {
      error: error.message,
      to,
      from
    });
    throw error;
  }
};

const formatDueDate = (dueDate) => {
  if (!dueDate) return "an upcoming deadline";
  try {
    return new Date(dueDate).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return String(dueDate);
  }
};

const buildAssignmentEmail = ({ task, assignees, assignedBy }) => {
  const dueDate = formatDueDate(task.dueDate);
  const assignedByName = assignedBy?.name || "A team member";

  const text = `Hello,

You have been assigned a new task: ${task.title}.

Details:
- Description: ${task.description || "No description provided"}
- Priority: ${task.priority}
- Due date: ${dueDate}

Assigned by: ${assignedByName}

Please log in to the Task Manager to review the task.

Thank you.`;

  const html = `<p>Hello,</p>
<p>You have been assigned a new task: <strong>${task.title}</strong>.</p>
<ul>
  <li><strong>Description:</strong> ${
    task.description || "No description provided"
  }</li>
  <li><strong>Priority:</strong> ${task.priority}</li>
  <li><strong>Due date:</strong> ${dueDate}</li>
</ul>
<p>Assigned by: ${assignedByName}</p>
<p>Please log in to the Task Manager to review the task.</p>
<p>Thank you.</p>`;

  return { subject: `New task assigned: ${task.title}`, text, html };
};

const buildReminderEmail = ({ task, assignedBy, message }) => {
  const dueDate = formatDueDate(task.dueDate);
  const sender = assignedBy?.name || "A team member";
  const reminderMessage = message ||
    `This is a friendly reminder that the task "${task.title}" is due on ${dueDate}.`;

  const text = `Hello,

${reminderMessage}

Task details:
- Priority: ${task.priority}
- Due date: ${dueDate}

Reminder sent by: ${sender}

Please log in to the Task Manager for more information.

Thank you.`;

  const html = `<p>Hello,</p>
<p>${reminderMessage}</p>
<ul>
  <li><strong>Priority:</strong> ${task.priority}</li>
  <li><strong>Due date:</strong> ${dueDate}</li>
</ul>
<p>Reminder sent by: ${sender}</p>
<p>Please log in to the Task Manager for more information.</p>
<p>Thank you.</p>`;

  return { subject: `Reminder: ${task.title}`, text, html };
};

const buildRecipientList = (assignees) => {
  const assigneeEmails = assignees
    .filter((user) => user?.email)
    .map((user) => user.email);

  const adminEmails = getAdminNotificationEmails();

  return Array.from(new Set([...assigneeEmails, ...adminEmails]));
};

const sendTaskAssignmentEmail = async ({ task, assignees, assignedBy }) => {
  const recipients = buildRecipientList(assignees);

  if (!recipients.length) {
    return;
  }

  const { subject, text, html } = buildAssignmentEmail({ task, assignees, assignedBy });
  await sendEmail({ to: recipients, subject, text, html });
};

const sendTaskReminderEmail = async ({
  task,
  assignees,
  assignedBy,
  message,
}) => {
  const recipients = buildRecipientList(assignees);

  if (!recipients.length) {
    return;
  }

  const { subject, text, html } = buildReminderEmail({ task, assignedBy, message });
  await sendEmail({ to: recipients, subject, text, html });
};

module.exports = {
  sendTaskAssignmentEmail,
  sendTaskReminderEmail,
};