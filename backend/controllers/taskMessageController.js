const mongoose = require("mongoose");

const Task = require("../models/Task");
const TaskNotification = require("../models/TaskNotification");
const TaskMessage = require("../models/TaskMessage");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpError");
const { hasPrivilegedAccess } = require("../utils/roleUtils");
const { sendDueDateRequestEmail } = require("../utils/emailService");
const {
  getIo,
  getTaskRoom,
  getUserRoom,
  isUserActiveInTask,
} = require("../utils/socket");

const ensureValidObjectId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(`${label} is invalid.`, 400);
  }
};

const getAssignedMemberIds = (task) => {
  if (!task?.assignedTo) {
    return [];
  }

  const assignees = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : [task.assignedTo];

  return assignees
    .map((assignee) =>
      assignee && typeof assignee.toString === "function" ? assignee.toString() : ""
    )
    .filter(Boolean);
};

const ensureTaskChannelAccess = async (taskId, user, { requireAssignee = false } = {}) => {
  ensureValidObjectId(taskId, "Task id");
  const task = await Task.findById(taskId).select("assignedTo dueDate title");

  if (!task) {
    throw createHttpError("Task not found", 404);
  }

  const requesterId = user?._id ? user._id.toString() : "";
  const assignedIds = getAssignedMemberIds(task);
  const isAssigned = requesterId && assignedIds.includes(requesterId);
  const isPrivileged = hasPrivilegedAccess(user?.role);

  if (requireAssignee && !isAssigned) {
    throw createHttpError("Only assignees can perform this action.", 403);
  }

  if (!requireAssignee && !isAssigned && !isPrivileged) {
    throw createHttpError("You do not have access to this channel.", 403);
  }

  return { task, assignedIds, isAssigned, isPrivileged };
};

const populateMessage = (messageId) =>
  TaskMessage.findById(messageId)
    .populate("author", "name email profileImageUrl role")
    .populate("dueDateRequest.decidedBy", "name email profileImageUrl role")
    .populate("seenBy.user", "name email profileImageUrl role")
    .populate({
      path: "replyTo",
      select: "text author messageType isDeleted",
      populate: { path: "author", select: "name email profileImageUrl role" },
    });

const emitTaskEvent = (taskId, event, payload) => {
  try {
    const io = getIo();
    io.to(getTaskRoom(taskId)).emit(event, payload);
  } catch (error) {
    console.error(`Socket emit failed (${event}):`, error.message);
  }
};

const buildRedirectUrl = (taskId) => `/tasks/${taskId}?tab=channel`;

const buildActorSnapshot = (user) => {
  if (!user || typeof user !== "object") {
    return undefined;
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const getPrivilegedUsers = async () => {
  const users = await User.find().select("_id name email role");
  return users.filter((user) => hasPrivilegedAccess(user?.role));
};

const getNotificationRecipients = async (task) => {
  const assignedIds = getAssignedMemberIds(task);
  const privilegedUsers = await getPrivilegedUsers();
  const privilegedIds = privilegedUsers.map((user) => user._id.toString());

  return {
    recipientIds: [...new Set([...assignedIds, ...privilegedIds])],
    privilegedUsers,
  };
};

const emitTaskNotification = async ({ recipientId, task, notification }) => {
  let io;

  try {
    io = getIo();
  } catch (error) {
    return;
  }

  try {
    const unreadCount = await TaskNotification.countDocuments({
      recipient: recipientId,
      task: task._id,
      readAt: null,
    });

    io.to(getUserRoom(recipientId)).emit("task-notification", {
      taskId: task._id.toString(),
      notificationId: notification._id,
      type: notification.type,
      text: notification.text,
      redirectUrl: notification.redirectUrl,
      unreadCount,
      createdAt: notification.createdAt,
    });
  } catch (error) {
    console.error("Failed to emit task notification:", error.message);
  }
};

const createTaskNotifications = async ({
  task,
  actor,
  type,
  text,
  meta,
  recipients,
}) => {
  if (!task?._id || !Array.isArray(recipients) || !recipients.length) {
    return;
  }

  const actorId = actor?._id ? actor._id.toString() : "";
  const redirectUrl = buildRedirectUrl(task._id);
  const actorSnapshot = buildActorSnapshot(actor);

  for (const recipientId of recipients) {
    if (!recipientId || recipientId === actorId) {
      continue;
    }

    if (isUserActiveInTask(task._id.toString(), recipientId)) {
      continue;
    }

    try {
      const notification = await TaskNotification.create({
        task: task._id,
        recipient: recipientId,
        actor: actorSnapshot,
        type,
        text,
        redirectUrl,
        meta,
      });

      await emitTaskNotification({
        recipientId,
        task,
        notification,
      });
    } catch (error) {
      console.error("Failed to create task notification:", error.message);
    }
  }
};

const createSystemMessage = async ({ taskId, text, actorId }) => {
  if (!text) {
    return null;
  }

  return TaskMessage.create({
    task: taskId,
    author: actorId ?? null,
    messageType: "system",
    text,
    seenBy: actorId ? [{ user: actorId }] : [],
  });
};

const getTaskMessages = async (req, res, next) => {
  try {
    const { task } = await ensureTaskChannelAccess(req.params.id, req.user);

    const messages = await TaskMessage.find({ task: task._id })
      .sort({ createdAt: 1 })
      .populate("author", "name email profileImageUrl role")
      .populate("dueDateRequest.decidedBy", "name email profileImageUrl role")
      .populate("seenBy.user", "name email profileImageUrl role")
      .populate({
        path: "replyTo",
        select: "text author messageType isDeleted",
        populate: { path: "author", select: "name email profileImageUrl role" },
      });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

const createTaskMessage = async (req, res, next) => {
  try {
    const { task } = await ensureTaskChannelAccess(req.params.id, req.user);
    const text =
      typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!text) {
      throw createHttpError("Message text is required.", 400);
    }

    const replyToId = req.body?.replyTo;
    if (replyToId) {
      ensureValidObjectId(replyToId, "Reply message id");
      const replyTarget = await TaskMessage.findById(replyToId).select("task");
      if (!replyTarget || replyTarget.task.toString() !== task._id.toString()) {
        throw createHttpError("Reply target is not available.", 400);
      }
    }

    const message = await TaskMessage.create({
      task: task._id,
      author: req.user._id,
      messageType: "message",
      text,
      replyTo: replyToId || null,
      seenBy: [{ user: req.user._id }],
    });

    const populatedMessage = await populateMessage(message._id);

    emitTaskEvent(task._id, "new-message", { message: populatedMessage });

    try {
      const { recipientIds } = await getNotificationRecipients(task);
      await createTaskNotifications({
        task,
        actor: req.user,
        type: "message",
        text,
        meta: { messageId: message._id },
        recipients: recipientIds,
      });
    } catch (notificationError) {
      console.error("Failed to send task message notifications:", notificationError);
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
};

const updateTaskMessage = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Message id");
    const text =
      typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!text) {
      throw createHttpError("Message text is required.", 400);
    }

    const message = await TaskMessage.findById(req.params.id);
    if (!message) {
      throw createHttpError("Message not found.", 404);
    }

    const { task, isPrivileged } = await ensureTaskChannelAccess(
      message.task,
      req.user
    );

    const isAuthor =
      message.author &&
      req.user?._id &&
      message.author.toString() === req.user._id.toString();

    if (!isAuthor && !isPrivileged) {
      throw createHttpError("You do not have permission to edit this message.", 403);
    }

    if (message.messageType !== "message" || message.isDeleted) {
      throw createHttpError("This message cannot be edited.", 400);
    }

    message.text = text;
    await message.save();

    const populatedMessage = await populateMessage(message._id);
    emitTaskEvent(task._id, "message-updated", { message: populatedMessage });

    res.json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
};

const deleteTaskMessage = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Message id");
    const message = await TaskMessage.findById(req.params.id);
    if (!message) {
      throw createHttpError("Message not found.", 404);
    }

    const { task, isPrivileged } = await ensureTaskChannelAccess(
      message.task,
      req.user
    );

    const isAuthor =
      message.author &&
      req.user?._id &&
      message.author.toString() === req.user._id.toString();

    if (!isAuthor && !isPrivileged) {
      throw createHttpError(
        "You do not have permission to delete this message.",
        403
      );
    }

    if (message.messageType !== "message" || message.isDeleted) {
      throw createHttpError("This message cannot be deleted.", 400);
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.text = "";
    await message.save();

    emitTaskEvent(task._id, "message-deleted", {
      messageId: message._id,
      taskId: task._id,
    });

    res.json({ messageId: message._id, taskId: task._id });
  } catch (error) {
    next(error);
  }
};

const createDueDateRequest = async (req, res, next) => {
  try {
    const { task } = await ensureTaskChannelAccess(req.params.id, req.user, {
      requireAssignee: true,
    });

    const proposedDueDateRaw = req.body?.proposedDueDate;
    const proposedDueDate = proposedDueDateRaw ? new Date(proposedDueDateRaw) : null;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (!proposedDueDate || Number.isNaN(proposedDueDate.getTime())) {
      throw createHttpError("A valid proposed due date is required.", 400);
    }

    if (!reason) {
      throw createHttpError("A reason is required for the request.", 400);
    }

    const requestMessage = await TaskMessage.create({
      task: task._id,
      author: req.user._id,
      messageType: "due_date_request",
      dueDateRequest: {
        proposedDueDate,
        reason,
        status: "pending",
      },
      seenBy: [{ user: req.user._id }],
    });

    const requestorName = req.user?.name || "A member";
    const systemMessage = await createSystemMessage({
      taskId: task._id,
      actorId: req.user._id,
      text: `${requestorName} submitted a due date extension request.`,
    });

    const populatedRequest = await populateMessage(requestMessage._id);
    emitTaskEvent(task._id, "due-date-requested", { message: populatedRequest });

    if (systemMessage) {
      const populatedSystem = await populateMessage(systemMessage._id);
      emitTaskEvent(task._id, "new-message", { message: populatedSystem });
    }

    try {
      const { recipientIds, privilegedUsers } = await getNotificationRecipients(task);
      await createTaskNotifications({
        task,
        actor: req.user,
        type: "due_date_request",
        text: `${requestorName} requested a due date extension.`,
        meta: {
          requestId: requestMessage._id,
          proposedDueDate,
          reason,
        },
        recipients: recipientIds,
      });

      sendDueDateRequestEmail({
        task,
        requestor: req.user,
        proposedDueDate,
        reason,
        recipients: privilegedUsers,
      }).catch((emailError) =>
        console.error("Failed to send due date request email:", emailError)
      );
    } catch (notificationError) {
      console.error("Failed to send due date request notifications:", notificationError);
    }

    res.status(201).json({ message: populatedRequest });
  } catch (error) {
    next(error);
  }
};

const approveDueDateRequest = async (req, res, next) => {
  try {
    if (!hasPrivilegedAccess(req.user?.role)) {
      throw createHttpError("Access denied, admin only", 403);
    }

    ensureValidObjectId(req.params.id, "Request id");

    const requestMessage = await TaskMessage.findById(req.params.id);

    if (!requestMessage || requestMessage.messageType !== "due_date_request") {
      throw createHttpError("Due date request not found.", 404);
    }

    if (requestMessage.dueDateRequest?.status !== "pending") {
      throw createHttpError("This request has already been processed.", 400);
    }

    const task = await Task.findById(requestMessage.task);

    if (!task) {
      throw createHttpError("Task not found.", 404);
    }

    const proposedDueDate = requestMessage.dueDateRequest.proposedDueDate;
    task.dueDate = proposedDueDate;
    task.reminderSentAt = null;
    await task.save();

    requestMessage.dueDateRequest.status = "approved";
    requestMessage.dueDateRequest.decidedBy = req.user._id;
    requestMessage.dueDateRequest.decidedAt = new Date();
    await requestMessage.save();

    const approverName = req.user?.name || "An admin";
    const systemMessage = await createSystemMessage({
      taskId: task._id,
      actorId: req.user._id,
      text: `${approverName} approved the due date request. New due date: ${proposedDueDate.toLocaleDateString(
        "en-US"
      )}.`,
    });

    const populatedRequest = await populateMessage(requestMessage._id);

    const responsePayload = {
      message: "Due date request approved.",
      request: populatedRequest,
      task: { _id: task._id, dueDate: task.dueDate },
    };

    emitTaskEvent(task._id, "due-date-approved", responsePayload);

    if (systemMessage) {
      const populatedSystem = await populateMessage(systemMessage._id);
      emitTaskEvent(task._id, "new-message", { message: populatedSystem });
    }

    try {
      const { recipientIds } = await getNotificationRecipients(task);
      await createTaskNotifications({
        task,
        actor: req.user,
        type: "due_date_approved",
        text: `${approverName} approved the due date request.`,
        meta: {
          requestId: requestMessage._id,
          proposedDueDate,
        },
        recipients: recipientIds,
      });
    } catch (notificationError) {
      console.error("Failed to send due date approval notifications:", notificationError);
    }

    res.json(responsePayload);
  } catch (error) {
    next(error);
  }
};

const rejectDueDateRequest = async (req, res, next) => {
  try {
    if (!hasPrivilegedAccess(req.user?.role)) {
      throw createHttpError("Access denied, admin only", 403);
    }

    ensureValidObjectId(req.params.id, "Request id");

    const requestMessage = await TaskMessage.findById(req.params.id);

    if (!requestMessage || requestMessage.messageType !== "due_date_request") {
      throw createHttpError("Due date request not found.", 404);
    }

    if (requestMessage.dueDateRequest?.status !== "pending") {
      throw createHttpError("This request has already been processed.", 400);
    }

    const task = await Task.findById(requestMessage.task).select(
      "assignedTo title"
    );

    if (!task) {
      throw createHttpError("Task not found.", 404);
    }

    requestMessage.dueDateRequest.status = "rejected";
    requestMessage.dueDateRequest.decidedBy = req.user._id;
    requestMessage.dueDateRequest.decidedAt = new Date();
    await requestMessage.save();

    const approverName = req.user?.name || "An admin";
    const systemMessage = await createSystemMessage({
      taskId: task._id,
      actorId: req.user._id,
      text: `${approverName} rejected the due date request.`,
    });

    const populatedRequest = await populateMessage(requestMessage._id);

    const responsePayload = {
      message: "Due date request rejected.",
      request: populatedRequest,
    };

    emitTaskEvent(task._id, "due-date-rejected", responsePayload);

    if (systemMessage) {
      const populatedSystem = await populateMessage(systemMessage._id);
      emitTaskEvent(task._id, "new-message", { message: populatedSystem });
    }

    try {
      const { recipientIds } = await getNotificationRecipients(task);
      await createTaskNotifications({
        task,
        actor: req.user,
        type: "due_date_rejected",
        text: `${approverName} rejected the due date request.`,
        meta: { requestId: requestMessage._id },
        recipients: recipientIds,
      });
    } catch (notificationError) {
      console.error("Failed to send due date rejection notifications:", notificationError);
    }

    res.json(responsePayload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTaskMessages,
  createTaskMessage,
  createDueDateRequest,
  approveDueDateRequest,
  rejectDueDateRequest,
  updateTaskMessage,
  deleteTaskMessage,
};
