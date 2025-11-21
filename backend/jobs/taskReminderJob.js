const Task = require("../models/Task");
const { sendTaskReminderEmail } = require("../utils/emailService");

const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // Run once every hour

let reminderTimer = null;

const runReminderCheck = async () => {
  const now = new Date();
  const previousDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  console.log(`[TaskReminderJob] Running reminder check at ${now.toISOString()}`);

  try {
    const tasksDueSoon = await Task.find({
      dueDate: { $gte: previousDay, $lte: nextDay },
      status: { $ne: "Completed" },
      $or: [{ reminderSentAt: null }, { reminderSentAt: { $exists: false } }],
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    console.log(`[TaskReminderJob] Found ${tasksDueSoon.length} tasks due soon`);

    await Promise.all(
      tasksDueSoon.map(async (task) => {
        const assigneesSource = Array.isArray(task.assignedTo)
          ? task.assignedTo
          : task.assignedTo
          ? [task.assignedTo]
          : [];
        const assignees = assigneesSource.filter(Boolean);  
                
        if (!assignees.length) {
          console.log(`[TaskReminderJob] Task "${task.title}" has no assignees, skipping`);
          return;
        }

        console.log(`[TaskReminderJob] Processing reminder for task "${task.title}" with ${assignees.length} assignees`);

        try {
          await sendTaskReminderEmail({
            task,
            assignees,
            assignedBy: task.createdBy,
          });

          task.reminderSentAt = now;
          await task.save();
          console.log(`[TaskReminderJob] Reminder email sent successfully for task "${task.title}"`);
        } catch (error) {
          console.error(
            `[TaskReminderJob] Failed to send reminder email for task "${task.title}" (${task._id}):`,
            error.message
          );
        }
      })
    );
  } catch (error) {
    console.error("Task reminder job failed", error);
  }
};

const startTaskReminderJob = () => {
  if (reminderTimer) {
    return;
  }

  runReminderCheck();
  reminderTimer = setInterval(runReminderCheck, REMINDER_INTERVAL_MS);
};

module.exports = { startTaskReminderJob };