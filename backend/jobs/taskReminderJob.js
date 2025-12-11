const cron = require("node-cron");
const Task = require("../models/Task");
const { sendTaskReminder } = require("../utils/mailService");

const REMINDER_WINDOWS_HOURS = [24, 12, 6, 1];

const isInReminderWindow = (timeUntilDueMs, windowHours) => {
  const windowMs = windowHours * 60 * 60 * 1000;
  const delta = timeUntilDueMs - windowMs;

  // Fire once when we cross the boundary for this window (within the first minute)
  return delta <= 0 && delta > -60 * 1000;
};

exports.startTaskReminderJob = () => {
  console.log("Task Reminder Cron Job Started...");

  // Runs every minute
  cron.schedule("* * * * *", async () => {
    console.log("Cron tick:", new Date().toISOString());

    try {
      const now = new Date();
      const maxWindowMs = Math.max(...REMINDER_WINDOWS_HOURS) * 60 * 60 * 1000;
      const upperBound = new Date(now.getTime() + maxWindowMs);

      const tasksDueSoon = await Task.find({
        dueDate: { $gte: now, $lte: upperBound },
        status: { $in: ["Pending", "In Progress"] },
      }).populate("assignedTo", "name email");

      for (const task of tasksDueSoon) {
        const timeUntilDue = new Date(task.dueDate) - now;
        if (timeUntilDue <= 0) continue;

        const assigneeEmails = Array.isArray(task.assignedTo)
          ? task.assignedTo.map((user) => user?.email).filter(Boolean)
          : [task.assignedTo?.email].filter(Boolean);

        if (!assigneeEmails.length) continue;

        for (const windowHours of REMINDER_WINDOWS_HOURS) {
          if (!isInReminderWindow(timeUntilDue, windowHours)) continue;

          await sendTaskReminder(assigneeEmails, task, windowHours);
          console.log(
            `Reminder email sent (${windowHours}h before due) for task "${task.title}" to ${assigneeEmails.join(
              ", "
            )}`
          );
        }
      }
    } catch (err) {
      console.error("Reminder Error:", err);
    }
  });
};
