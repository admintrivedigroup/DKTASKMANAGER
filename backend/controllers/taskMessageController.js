const mongoose = require("mongoose");

const Task = require("../models/Task");
const TaskMessage = require("../models/TaskMessage");
const { createHttpError } = require("../utils/httpError");
const { hasPrivilegedAccess } = require("../utils/roleUtils");
const { getIo, getTaskRoom } = require("../utils/socket");

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
    .populate("dueDateRequest.decidedBy", "name email profileImageUrl role");

const emitTaskEvent = (taskId, event, payload) => {
  try {
    const io = getIo();
    io.to(getTaskRoom(taskId)).emit(event, payload);
  } catch (error) {
    console.error(`Socket emit failed (${event}):`, error.message);
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
  });
};

const getTaskMessages = async (req, res, next) => {
  try {
    const { task } = await ensureTaskChannelAccess(req.params.id, req.user);

    const messages = await TaskMessage.find({ task: task._id })
      .sort({ createdAt: 1 })
      .populate("author", "name email profileImageUrl role")
      .populate("dueDateRequest.decidedBy", "name email profileImageUrl role");

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

    const message = await TaskMessage.create({
      task: task._id,
      author: req.user._id,
      messageType: "message",
      text,
    });

    const populatedMessage = await populateMessage(message._id);

    emitTaskEvent(task._id, "new-message", { message: populatedMessage });

    res.status(201).json({ message: populatedMessage });
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

    const task = await Task.findById(requestMessage.task).select("_id");

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
};
