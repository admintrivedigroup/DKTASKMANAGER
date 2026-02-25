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

const taskHasAssigneeWithRole = (task, roles = []) => {
  if (!Array.isArray(task?.assignedTo) || !roles.length) {
    return false;
  }

  return task.assignedTo.some((assignee) =>
    roles.some((role) => matchesRole(assignee?.role, role))
  );
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
    memberCompletedTaskCount: 0,
    teamCompletedTaskCount: 0,
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
    taskHasAssigneeWithRole(task, ["member"])
  );
  const completedTeamTasks = completedTasks.filter((task) =>
    taskHasAssigneeWithRole(task, ["admin", "member"])
  );

  result.memberCompletedTaskCount = completedMemberTasks.length;
  result.teamCompletedTaskCount = completedTeamTasks.length;
  result.completedTaskCount = completedTeamTasks.length;

  const { admins, superadmins } = normalizeRecipientsByRole(privilegedUsers);
  result.adminRecipients = admins.length;
  result.superadminRecipients = superadmins.length;

  const adminTemplateData = {
    heading: "Daily Member Completed Task Summary",
    introLine:
      "This report includes tasks completed today by member accounts only.",
    emptyMessage: "No member tasks were completed today.",
    dateLabel: result.dateLabel,
    completedCount: completedMemberTasks.length,
    tasks: buildCompletedTaskItems(completedMemberTasks),
  };

  const superadminTemplateData = {
    heading: "Daily Team Completed Task Summary",
    introLine:
      "This report includes tasks completed today by admin and member accounts.",
    emptyMessage: "No admin/member tasks were completed today.",
    dateLabel: result.dateLabel,
    completedCount: completedTeamTasks.length,
    tasks: buildCompletedTaskItems(completedTeamTasks),
  };

  if (admins.length) {
    result.adminSentCount = await sendDailySummaryToRecipients({
      recipients: admins,
      subject: `Daily Member Task Summary - ${formatDateLabel(referenceDate)}`,
      templateData: adminTemplateData,
    });
  }

  if (superadmins.length) {
    result.superadminSentCount = await sendDailySummaryToRecipients({
      recipients: superadmins,
      subject: `Daily Team Task Summary - ${formatDateLabel(referenceDate)}`,
      templateData: superadminTemplateData,
    });
  }

  return result;
};

module.exports = { sendDailyCompletedTaskSummaryEmails };
