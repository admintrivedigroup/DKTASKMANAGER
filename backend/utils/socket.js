const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const TaskMessage = require("../models/TaskMessage");
const User = require("../models/User");
const { getJwtSecret } = require("./jwtSecret");
const { hasPrivilegedAccess } = require("./roleUtils");

let ioInstance = null;
const activeTaskUsers = new Map();
const connectedUserCounts = new Map();
const userLastHeartbeatAt = new Map();
const PRESENCE_MAX_IDLE_MS = 2 * 60 * 1000;

const getTaskRoom = (taskId) => `task:${taskId}`;
const getUserRoom = (userId) => `user:${userId}`;

const incrementConnectedUser = (userId) => {
  if (!userId) {
    return;
  }

  const key = userId.toString();
  const currentCount = connectedUserCounts.get(key) || 0;
  connectedUserCounts.set(key, currentCount + 1);
  userLastHeartbeatAt.set(key, Date.now());
};

const decrementConnectedUser = (userId) => {
  if (!userId) {
    return;
  }

  const key = userId.toString();
  const currentCount = connectedUserCounts.get(key) || 0;

  if (currentCount <= 1) {
    connectedUserCounts.delete(key);
    userLastHeartbeatAt.delete(key);
    return;
  }

  connectedUserCounts.set(key, currentCount - 1);
};

const markUserHeartbeat = (userId) => {
  if (!userId) {
    return;
  }

  const key = userId.toString();
  if (!connectedUserCounts.has(key)) {
    return;
  }

  userLastHeartbeatAt.set(key, Date.now());
};

const addActiveTaskUser = (taskId, userId) => {
  if (!taskId || !userId) {
    return;
  }

  const taskKey = taskId.toString();
  const userKey = userId.toString();
  const activeSet = activeTaskUsers.get(taskKey) || new Set();
  activeSet.add(userKey);
  activeTaskUsers.set(taskKey, activeSet);
};

const removeActiveTaskUser = (taskId, userId) => {
  if (!taskId || !userId) {
    return;
  }

  const taskKey = taskId.toString();
  const userKey = userId.toString();
  const activeSet = activeTaskUsers.get(taskKey);

  if (!activeSet) {
    return;
  }

  activeSet.delete(userKey);

  if (!activeSet.size) {
    activeTaskUsers.delete(taskKey);
  }
};

const isUserActiveInTask = (taskId, userId) => {
  if (!taskId || !userId) {
    return false;
  }

  const activeSet = activeTaskUsers.get(taskId.toString());
  if (!activeSet) {
    return false;
  }

  return activeSet.has(userId.toString());
};

const resolveToken = (socket) => {
  const authToken = socket?.handshake?.auth?.token;
  if (authToken && typeof authToken === "string") {
    return authToken;
  }

  const header = socket?.handshake?.headers?.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }

  return null;
};

const initSocket = (httpServer, { corsOrigin } = {}) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: corsOrigin || process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization", "Content-Type"],
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = resolveToken(socket);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, getJwtSecret());
      if (!decoded?.id) {
        return next(new Error("Unauthorized"));
      }

      const user = await User.findById(decoded.id).select("_id role");
      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
      };

      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    if (socket.user?.id) {
      socket.join(getUserRoom(socket.user.id));
      incrementConnectedUser(socket.user.id);
    }

    socket.on("presence-heartbeat", () => {
      markUserHeartbeat(socket.user?.id);
    });

    socket.on("join-task-room", async ({ taskId } = {}, callback) => {
      try {
        if (!taskId) {
          throw new Error("Task id is required.");
        }

        const task = await Task.findById(taskId).select(
          "assignedTo isPersonal createdBy"
        );
        if (!task) {
          throw new Error("Task not found.");
        }

        const userId = socket.user?.id;
        const assignedIds = Array.isArray(task.assignedTo)
          ? task.assignedTo.map((assignee) => assignee.toString())
          : [];
        const isAssigned = userId && assignedIds.includes(userId);
        const isPrivileged = hasPrivilegedAccess(socket.user?.role);
        const createdById =
          typeof task.createdBy === "object" && task.createdBy !== null && task.createdBy._id
            ? task.createdBy._id.toString()
            : task.createdBy?.toString();

        if (task.isPersonal) {
          if (!userId || !createdById || createdById !== userId) {
            socket.emit("room-error", { message: "Not authorized." });
            socket.disconnect(true);
            return;
          }
        } else if (!isAssigned && !isPrivileged) {
          socket.emit("room-error", { message: "Not authorized." });
          socket.disconnect(true);
          return;
        }

        socket.join(getTaskRoom(taskId));
        addActiveTaskUser(taskId, userId);
        socket.data.activeTasks = socket.data.activeTasks || new Set();
        socket.data.activeTasks.add(taskId.toString());
        if (typeof callback === "function") {
          callback({ ok: true });
        }
      } catch (error) {
        if (typeof callback === "function") {
          callback({ error: error.message || "Unable to join room." });
        }
        socket.emit("room-error", { message: "Unable to join room." });
        socket.disconnect(true);
      }
    });

    socket.on("leave-task-room", ({ taskId } = {}) => {
      if (!taskId) {
        return;
      }
      socket.leave(getTaskRoom(taskId));
      removeActiveTaskUser(taskId, socket.user?.id);
      if (socket.data?.activeTasks) {
        socket.data.activeTasks.delete(taskId.toString());
      }
    });

    socket.on("mark-task-seen", async ({ taskId, messageId } = {}) => {
      try {
        if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
          return;
        }

        const userId = socket.user?.id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          return;
        }

        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
          return;
        }

        const task = await Task.findById(taskId).select(
          "assignedTo isPersonal createdBy"
        );
        if (!task) {
          return;
        }

        const assignedIds = Array.isArray(task.assignedTo)
          ? task.assignedTo.map((assignee) => assignee.toString())
          : [];
        const isAssigned = assignedIds.includes(userId);
        const isPrivileged = hasPrivilegedAccess(socket.user?.role);
        const createdById =
          typeof task.createdBy === "object" && task.createdBy !== null && task.createdBy._id
            ? task.createdBy._id.toString()
            : task.createdBy?.toString();

        if (task.isPersonal) {
          if (!userId || !createdById || createdById !== userId) {
            return;
          }
        } else if (!isAssigned && !isPrivileged) {
          return;
        }

        const seenAt = new Date();
        const updateResult = await TaskMessage.updateOne(
          {
            _id: messageId,
            task: taskId,
            messageType: { $ne: "system" },
            "seenBy.user": { $ne: userId },
          },
          {
            $push: { seenBy: { user: userId, seenAt } },
          }
        );

        const updatedCount =
          updateResult.modifiedCount ?? updateResult.nModified ?? 0;

        if (!updatedCount) {
          return;
        }

        const seenUser = await User.findById(userId).select(
          "name email profileImageUrl role"
        );

        if (!seenUser) {
          return;
        }

        ioInstance.to(getTaskRoom(taskId)).emit("task-seen", {
          taskId: taskId.toString(),
          messageId: messageId.toString(),
          seenAt,
          user: {
            _id: seenUser._id,
            name: seenUser.name,
            email: seenUser.email,
            profileImageUrl: seenUser.profileImageUrl,
            role: seenUser.role,
          },
        });
      } catch (error) {
        console.error("Failed to mark task as seen:", error.message);
      }
    });

    socket.on("disconnect", () => {
      decrementConnectedUser(socket.user?.id);

      const activeTasks = socket.data?.activeTasks;
      if (!activeTasks || !activeTasks.size) {
        return;
      }

      activeTasks.forEach((taskId) => {
        removeActiveTaskUser(taskId, socket.user?.id);
      });
      socket.data.activeTasks.clear();
    });
  });

  return ioInstance;
};

const getIo = () => {
  if (!ioInstance) {
    throw new Error("Socket.io has not been initialized.");
  }

  return ioInstance;
};

const isUserActive = (
  userId,
  { maxIdleMs = PRESENCE_MAX_IDLE_MS, referenceTime = Date.now() } = {}
) => {
  if (!userId) {
    return false;
  }

  const key = userId.toString();
  const currentCount = connectedUserCounts.get(key) || 0;

  if (currentCount <= 0) {
    return false;
  }

  const lastHeartbeatAt = userLastHeartbeatAt.get(key) || 0;
  return referenceTime - lastHeartbeatAt <= Math.max(maxIdleMs, 0);
};

module.exports = {
  initSocket,
  getIo,
  getTaskRoom,
  getUserRoom,
  isUserActiveInTask,
  isUserActive,
  PRESENCE_MAX_IDLE_MS,
};
