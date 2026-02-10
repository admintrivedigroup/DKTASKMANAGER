const mongoose = require("mongoose");

const Task = require("../models/Task");
const TaskNotification = require("../models/TaskNotification");
const { hasPrivilegedAccess } = require("../utils/roleUtils");
const { createHttpError } = require("../utils/httpError");

const ensureTaskAccess = async (taskId, user) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw createHttpError("Task id is invalid.", 400);
  }

  const task = await Task.findById(taskId).select("assignedTo");
  if (!task) {
    throw createHttpError("Task not found.", 404);
  }

  const requesterId = user?._id ? user._id.toString() : "";
  const assignedIds = Array.isArray(task.assignedTo)
    ? task.assignedTo.map((assignee) =>
        assignee && typeof assignee.toString === "function"
          ? assignee.toString()
          : ""
      )
    : [];
  const isAssigned = requesterId && assignedIds.includes(requesterId);
  const isPrivileged = hasPrivilegedAccess(user?.role);

  if (!isAssigned && !isPrivileged) {
    throw createHttpError("You do not have access to this task.", 403);
  }

  return task;
};

const markTaskNotificationsRead = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    await ensureTaskAccess(taskId, req.user);

    const result = await TaskNotification.updateMany(
      {
        task: taskId,
        recipient: req.user._id,
        type: "task_assigned",
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    );

    const updatedCount = result.modifiedCount ?? result.nModified ?? 0;

    res.json({
      message: "Task notifications marked as read.",
      updatedCount,
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadTaskNotificationCount = async (req, res, next) => {
  try {
    const unreadCount = await TaskNotification.countDocuments({
      recipient: req.user._id,
      type: "task_assigned",
      readAt: null,
    });

    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markTaskNotificationsRead,
  getUnreadTaskNotificationCount,
};
