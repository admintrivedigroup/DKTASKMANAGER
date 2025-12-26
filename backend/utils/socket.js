const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const Task = require("../models/Task");
const User = require("../models/User");
const { getJwtSecret } = require("./jwtSecret");
const { hasPrivilegedAccess } = require("./roleUtils");

let ioInstance = null;

const getTaskRoom = (taskId) => `task:${taskId}`;

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
    socket.on("join-task-room", async ({ taskId } = {}, callback) => {
      try {
        if (!taskId) {
          throw new Error("Task id is required.");
        }

        const task = await Task.findById(taskId).select("assignedTo");
        if (!task) {
          throw new Error("Task not found.");
        }

        const userId = socket.user?.id;
        const assignedIds = Array.isArray(task.assignedTo)
          ? task.assignedTo.map((assignee) => assignee.toString())
          : [];
        const isAssigned = userId && assignedIds.includes(userId);
        const isPrivileged = hasPrivilegedAccess(socket.user?.role);

        if (!isAssigned && !isPrivileged) {
          socket.emit("room-error", { message: "Not authorized." });
          socket.disconnect(true);
          return;
        }

        socket.join(getTaskRoom(taskId));
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

module.exports = {
  initSocket,
  getIo,
  getTaskRoom,
};
