const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildStatList = (stats) => {
  const safeStats = stats || {};
  const items = [
    ["Total tasks", safeStats.totalTasks ?? 0],
    ["Completed this week", safeStats.completedTasks ?? 0],
    ["Pending tasks", safeStats.pendingTasks ?? 0],
    ["In progress tasks", safeStats.inProgressTasks ?? 0],
    ["Overdue tasks", safeStats.overdueTasks ?? 0],
  ];

  const itemsHtml = items
    .map(
      ([label, value]) =>
        `<li style="margin:0 0 6px 0;color:#111827;"><strong>${escapeHtml(
          label
        )}:</strong> ${escapeHtml(value)}</li>`
    )
    .join("");

  return `<ul style="margin:12px 0 0 18px;padding:0;list-style:disc;">${itemsHtml}</ul>`;
};

const renderPeopleSections = (people, includeRole) => {
  if (!people || !people.length) {
    return `<p style="margin:0 0 16px 0;color:#374151;">No team members were found for this summary.</p>`;
  }

  return people
    .map((person) => {
      const name = escapeHtml(person?.name || "Unknown");
      const email = person?.email
        ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${escapeHtml(
            person.email
          )}</div>`
        : "";
      const role = includeRole && person?.roleLabel
        ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">Role: ${escapeHtml(
            person.roleLabel
          )}</div>`
        : "";

      return `
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin:0 0 16px 0;background:#f9fafb;">
          <div style="font-size:16px;font-weight:600;color:#111827;">${name}</div>
          ${email}
          ${role}
          ${buildStatList(person?.stats)}
        </div>
      `;
    })
    .join("");
};

const buildWeeklyRoleSummaryTemplate = ({
  recipientName,
  weekRange,
  heading,
  introLine,
  people,
  includeRole = false,
}) => {
  const greeting = recipientName ? `Hello ${escapeHtml(recipientName)},` : "Hello,";
  const safeRange = weekRange ? escapeHtml(weekRange) : "Last 7 days";
  const safeHeading = heading ? escapeHtml(heading) : "Weekly Task Summary";
  const introHtml = introLine
    ? `<p style="margin:0 0 16px 0;font-size:14px;color:#374151;">${escapeHtml(
        introLine
      )}</p>`
    : "";

  return `
    <div style="background-color:#f5f7fb;padding:24px 0;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <div style="max-width:680px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;box-sizing:border-box;">
              <h1 style="margin:0 0 8px 0;font-size:22px;color:#111827;">${safeHeading}</h1>
              <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">Week: ${safeRange}</p>
              <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">${greeting}</p>
              ${introHtml}
              ${renderPeopleSections(people, includeRole)}
              <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">This is an automated summary from Task Manager.</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
};

module.exports = { buildWeeklyRoleSummaryTemplate };
