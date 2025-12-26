const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isBulletLine = (line) => /^([-*\u2022]|\d+[.)])\s+/.test(line);

const stripBullet = (line) => line.replace(/^([-*\u2022]|\d+[.)])\s+/, "");

const renderSummaryHtml = (summary) => {
  const lines = String(summary || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return `<p style="margin:0 0 16px 0;color:#374151;">No summary is available for this period.</p>`;
  }

  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    const itemsHtml = listItems
      .map(
        (item) =>
          `<li style="margin:0 0 6px 0;color:#111827;">${escapeHtml(item)}</li>`
      )
      .join("");
    blocks.push(
      `<ul style="margin:0 0 16px 20px;padding:0;list-style:disc;">${itemsHtml}</ul>`
    );
    listItems = [];
  };

  for (const line of lines) {
    if (isBulletLine(line)) {
      listItems.push(stripBullet(line));
      continue;
    }

    flushList();
    const isHeading = line.endsWith(":") && line.length <= 60;
    blocks.push(
      `<p style="margin:0 0 12px 0;color:#374151;">${
        isHeading ? `<strong>${escapeHtml(line)}</strong>` : escapeHtml(line)
      }</p>`
    );
  }

  flushList();
  return blocks.join("");
};

const buildWeeklySummaryTemplate = ({ toName, weekRange, summary }) => {
  const greeting = toName ? `Hello ${escapeHtml(toName)},` : "Hello,";
  const safeRange = weekRange ? escapeHtml(weekRange) : "Last 7 days";

  return `
    <div style="background-color:#f5f7fb;padding:24px 0;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <div style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;box-sizing:border-box;">
              <h1 style="margin:0 0 8px 0;font-size:22px;color:#111827;">Weekly Task Summary</h1>
              <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">Week: ${safeRange}</p>
              <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">${greeting}</p>
              ${renderSummaryHtml(summary)}
              <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">This is an automated summary from Task Manager.</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
};

module.exports = { buildWeeklySummaryTemplate };
