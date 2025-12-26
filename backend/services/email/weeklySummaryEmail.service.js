const { sendEmail } = require("../../utils/emailService");
const {
  buildWeeklyRoleSummaryTemplate,
} = require("../../utils/emailTemplates/weeklyRoleSummary.template");
const { matchesRole } = require("../../utils/roleUtils");
const { getWeeklyUserTaskStats } = require("../weeklySummary.service");

const normalizePeople = (people) =>
  (people || []).map((person) => ({
    name: person?.name || "Unknown",
    email: person?.email || "",
    role: person?.role || "",
    roleLabel: person?.roleLabel || "",
    stats: person?.stats || {},
  }));

const filterByRole = (people, role) =>
  normalizePeople(people).filter((person) => matchesRole(person.role, role));

const buildSummaryPeople = (people) =>
  normalizePeople(people).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

const sendSummaryEmails = async ({
  recipients = [],
  subject,
  templateData,
}) => {
  let sentCount = 0;

  for (const recipient of recipients) {
    if (!recipient?.email) continue;

    const html = buildWeeklyRoleSummaryTemplate({
      ...templateData,
      recipientName: recipient.name || "Team",
    });

    try {
      await sendEmail({ to: recipient.email, subject, html });
      sentCount += 1;
    } catch (error) {
      console.error(
        "Weekly summary email failed:",
        recipient.email,
        error.message
      );
    }
  }

  return sentCount;
};

const sendRoleBasedWeeklySummaryEmails = async () => {
  const result = {
    weekRange: "",
    summaryReady: false,
    adminRecipients: 0,
    superadminRecipients: 0,
    adminSentCount: 0,
    superadminSentCount: 0,
  };

  let summaryData;
  try {
    summaryData = await getWeeklyUserTaskStats();
  } catch (error) {
    console.error("Weekly summary data generation failed:", error.message);
    return result;
  }

  result.summaryReady = true;

  const users = summaryData?.users || [];
  const weekRangeLabel = summaryData?.weekRangeLabel || "Last 7 days";
  result.weekRange = weekRangeLabel;

  const members = filterByRole(users, "member");
  const admins = filterByRole(users, "admin");
  const superadmins = filterByRole(users, "super_admin");

  const adminRecipients = admins
    .filter((admin) => admin.email)
    .map((admin) => ({ name: admin.name, email: admin.email }));
  const superadminRecipients = superadmins
    .filter((admin) => admin.email)
    .map((admin) => ({ name: admin.name, email: admin.email }));

  result.adminRecipients = adminRecipients.length;
  result.superadminRecipients = superadminRecipients.length;

  const adminTemplateData = {
    weekRange: weekRangeLabel,
    heading: "Weekly Member Task Summary",
    introLine:
      "This report covers tasks assigned to members. Completed counts reflect the last 7 days.",
    people: buildSummaryPeople(members),
    includeRole: false,
  };

  const superadminTemplateData = {
    weekRange: weekRangeLabel,
    heading: "Weekly Team Task Summary",
    introLine:
      "This report covers tasks assigned to admins and members. Completed counts reflect the last 7 days.",
    people: buildSummaryPeople([...admins, ...members]),
    includeRole: true,
  };

  if (adminRecipients.length) {
    result.adminSentCount = await sendSummaryEmails({
      recipients: adminRecipients,
      subject: `Weekly Member Task Summary - ${weekRangeLabel}`,
      templateData: adminTemplateData,
    });
  }

  if (superadminRecipients.length) {
    result.superadminSentCount = await sendSummaryEmails({
      recipients: superadminRecipients,
      subject: `Weekly Team Task Summary - ${weekRangeLabel}`,
      templateData: superadminTemplateData,
    });
  }

  return result;
};

module.exports = { sendRoleBasedWeeklySummaryEmails };
