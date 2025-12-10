const cron = require("node-cron");
const Task = require("../models/Task");
const User = require("../models/User");
const { sendTaskReminder } = require("../utils/mailService");

exports.startTaskReminderJob = () => {
  console.log("⏳ Task Reminder Cron Job Started...");

  // Runs every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const tasksDueSoon = await Task.find({
        dueDate: { $gte: now, $lte: oneHourFromNow },
        status: "pending",
      }).populate("assignedTo");

      for (const task of tasksDueSoon) {
        if (!task.assignedTo?.email) continue;

        await sendTaskReminder(task.assignedTo.email, task);

        console.log(`📧 Email sent to ${task.assignedTo.email}`);
      }

    } catch (err) {
      console.error("Reminder Error:", err);
    }
  });
};
