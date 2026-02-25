const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDateTime = (value) => {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return parsed.toLocaleString();
};

const renderCompletedTasksTable = (tasks = [], emptyMessage = "No tasks were completed today.") => {
  if (!tasks.length) {
    return `<p style="margin:0 0 16px 0;font-size:14px;color:#374151;">${escapeHtml(emptyMessage)}</p>`;
  }

  const rows = tasks
    .map((task, index) => {
      const serial = index + 1;
      const title = escapeHtml(task?.title || "Untitled task");
      const assignees = escapeHtml(task?.assignees || "Unassigned");
      const priority = escapeHtml(task?.priority || "Not set");
      const completedAt = escapeHtml(formatDateTime(task?.completedAt));
      const dueDate = escapeHtml(formatDateTime(task?.dueDate));

      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;vertical-align:top;">${serial}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;vertical-align:top;">${title}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;vertical-align:top;">${assignees}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;vertical-align:top;">${priority}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;vertical-align:top;">${completedAt}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;vertical-align:top;">${dueDate}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th align="left" style="padding:10px 8px;font-size:12px;color:#111827;">#</th>
          <th align="left" style="padding:10px 8px;font-size:12px;color:#111827;">Task</th>
          <th align="left" style="padding:10px 8px;font-size:12px;color:#111827;">Assignees</th>
          <th align="left" style="padding:10px 8px;font-size:12px;color:#111827;">Priority</th>
          <th align="left" style="padding:10px 8px;font-size:12px;color:#111827;">Completed At</th>
          <th align="left" style="padding:10px 8px;font-size:12px;color:#111827;">Due Date</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

const buildDailyCompletedTasksSummaryTemplate = ({
  recipientName,
  heading,
  introLine,
  emptyMessage,
  dateLabel,
  completedCount,
  tasks = [],
  appLink,
}) => {
  const greeting = recipientName ? `Hello ${escapeHtml(recipientName)},` : "Hello,";
  const safeHeading = escapeHtml(heading || "Daily Completed Task Summary");
  const safeDate = escapeHtml(dateLabel || "Today");
  const totalCompleted = Number.isFinite(completedCount) ? completedCount : 0;
  const introHtml = introLine
    ? `<p style="margin:0 0 12px 0;font-size:14px;color:#374151;">${escapeHtml(
        introLine
      )}</p>`
    : "";

  return `
    <div style="background-color:#f5f7fb;padding:24px 0;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <div style="max-width:760px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;box-sizing:border-box;">
              <h1 style="margin:0 0 8px 0;font-size:22px;color:#111827;">${safeHeading}</h1>
              <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">Date: ${safeDate}</p>
              <p style="margin:0 0 8px 0;font-size:14px;color:#374151;">${greeting}</p>
              ${introHtml}
              <p style="margin:0 0 16px 0;font-size:14px;color:#374151;">
                Total completed tasks today: <strong>${totalCompleted}</strong>
              </p>
              ${renderCompletedTasksTable(tasks, emptyMessage)}
              ${
                appLink
                  ? `<p style="margin:16px 0 0 0;"><a href="${escapeHtml(
                      appLink
                    )}" target="_blank" rel="noopener" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">Open Task Manager</a></p>`
                  : ""
              }
              <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">This is an automated summary from Task Manager.</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
};

module.exports = { buildDailyCompletedTasksSummaryTemplate };
