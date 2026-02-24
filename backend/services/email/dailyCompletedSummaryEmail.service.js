const Task = require("../../models/Task");
const User = require("../../models/User");
const { sendEmail } = require("../../utils/emailService");
const { matchesRole } = require("../../utils/roleUtils");
const {
  buildDailyCompletedTasksSummaryTemplate,
} = require("../../utils/emailTemplates/dailyCompletedTasksSummary.template");

const TASK_MANAGER_WEB_URL = "https://triveditask.com";

const getDayWindow = (referenceDate = new Date()) => {
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const formatDateLabel = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const normalizeRecipientsByRole = (users = []) => {
  const admins = [];
  const superadmins = [];

  users.forEach((user) => {
    if (!user?.email) {
      return;
    }

    if (matchesRole(user.role, "super_admin")) {
      superadmins.push({ name: user.name || "Super Admin", email: user.email });
      return;
    }

    if (matchesRole(user.role, "admin")) {
      admins.push({ name: user.name || "Admin", email: user.email });
    }
  });

  return { admins, superadmins };
};

const buildCompletedTaskItems = (tasks = []) =>
  tasks.map((task) => {
    const assigneeNames = Array.isArray(task.assignedTo)
      ? task.assignedTo
          .map((assignee) => assignee?.name || assignee?.email || "")
          .filter(Boolean)
      : [];

    return {
      title: task?.title || "Untitled task",
      priority: task?.priority || "Not set",
      completedAt: task?.completedAt || null,
      dueDate: task?.dueDate || null,
      assignees: assigneeNames.length ? assigneeNames.join(", ") : "Unassigned",
    };
  });

const sendDailySummaryToRecipients = async ({
  recipients = [],
  subject,
  templateData,
}) => {
  let sentCount = 0;

  for (const recipient of recipients) {
    if (!recipient?.email) {
      continue;
    }

    const html = buildDailyCompletedTasksSummaryTemplate({
      ...templateData,
      recipientName: recipient.name || "Team",
      appLink: TASK_MANAGER_WEB_URL,
    });

    try {
      await sendEmail({
        to: recipient.email,
        subject,
        html,
      });
      sentCount += 1;
    } catch (error) {
      console.error(
        "Daily completed task summary email failed:",
        recipient.email,
        error.message
      );
    }
  }

  return sentCount;
};

const sendDailyCompletedTaskSummaryEmails = async ({
  referenceDate = new Date(),
} = {}) => {
  const result = {
    dateLabel: formatDateLabel(referenceDate),
    completedTaskCount: 0,
    adminRecipients: 0,
    superadminRecipients: 0,
    adminSentCount: 0,
    superadminSentCount: 0,
  };

  const { start, end } = getDayWindow(referenceDate);

  const [completedTasks, privilegedUsers] = await Promise.all([
    Task.find({
      isPersonal: { $ne: true },
      status: "Completed",
      completedAt: { $gte: start, $lte: end },
    })
      .select("title priority dueDate completedAt assignedTo")
      .populate("assignedTo", "name email role")
      .sort({ completedAt: 1 })
      .lean(),
    User.find({ role: { $in: ["admin", "super_admin"] } })
      .select("name email role")
      .lean(),
  ]);

  const completedMemberTasks = completedTasks.filter((task) =>
    Array.isArray(task.assignedTo)
      ? task.assignedTo.some((assignee) => matchesRole(assignee?.role, "member"))
      : false
  );

  result.completedTaskCount = completedMemberTasks.length;

  const { admins, superadmins } = normalizeRecipientsByRole(privilegedUsers);
  result.adminRecipients = admins.length;
  result.superadminRecipients = superadmins.length;

  const taskItems = buildCompletedTaskItems(completedMemberTasks);
  const subject = `Daily Completed Task Summary - ${formatDateLabel(referenceDate)}`;

  const templateData = {
    dateLabel: result.dateLabel,
    completedCount: completedMemberTasks.length,
    tasks: taskItems,
  };

  if (admins.length) {
    result.adminSentCount = await sendDailySummaryToRecipients({
      recipients: admins,
      subject,
      templateData,
    });
  }

  if (superadmins.length) {
    result.superadminSentCount = await sendDailySummaryToRecipients({
      recipients: superadmins,
      subject,
      templateData,
    });
  }

  return result;
};

module.exports = { sendDailyCompletedTaskSummaryEmails };
