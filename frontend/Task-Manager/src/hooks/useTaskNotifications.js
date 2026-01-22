import { useCallback, useEffect, useMemo, useState } from "react";

import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { connectSocket } from "../utils/socket";

const ACTIVE_TASK_STORAGE_KEY = "taskChannel:activeTaskId";

const readActiveTaskId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage?.getItem(ACTIVE_TASK_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
};

const resolveTaskId = (task) => {
  if (!task) {
    return "";
  }

  if (typeof task === "string") {
    return task;
  }

  return task._id || task.id || "";
};

const normalizeCount = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
};

const useTaskNotifications = (tasks = []) => {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!Array.isArray(tasks)) {
      return;
    }

    setCounts((previous) => {
      const next = { ...previous };

      tasks.forEach((task) => {
        const taskId = resolveTaskId(task);
        if (!taskId) {
          return;
        }

        const baseCount = normalizeCount(task?.unreadCount);
        if (next[taskId] === undefined) {
          next[taskId] = baseCount;
        }
      });

      return next;
    });
  }, [tasks]);

  useEffect(() => {
    const socket = connectSocket();

    const handleTaskNotification = (payload) => {
      const taskId = payload?.taskId;
      if (!taskId) {
        return;
      }

      const activeTaskId = readActiveTaskId();
      if (activeTaskId && activeTaskId === taskId) {
        return;
      }

      setCounts((previous) => {
        const next = { ...previous };
        const nextCount = Number.isFinite(payload?.unreadCount)
          ? normalizeCount(payload.unreadCount)
          : normalizeCount(previous[taskId]) + 1;
        next[taskId] = nextCount;
        return next;
      });
    };

    socket.on("task-notification", handleTaskNotification);

    return () => {
      socket.off("task-notification", handleTaskNotification);
    };
  }, []);

  const getUnreadCount = useCallback(
    (task) => {
      const resolvedTaskId = resolveTaskId(task);
      if (resolvedTaskId && counts[resolvedTaskId] !== undefined) {
        return normalizeCount(counts[resolvedTaskId]);
      }

      if (task && typeof task === "object") {
        return normalizeCount(task.unreadCount);
      }

      return 0;
    },
    [counts]
  );

  const clearTaskNotifications = useCallback(async (taskId) => {
    const resolvedTaskId = resolveTaskId(taskId);
    if (!resolvedTaskId) {
      return;
    }

    try {
      await axiosInstance.post(
        API_PATHS.TASKS.MARK_TASK_NOTIFICATIONS_READ(resolvedTaskId)
      );
    } catch (error) {
      console.error("Failed to clear task notifications", error);
    } finally {
      setCounts((previous) => ({
        ...previous,
        [resolvedTaskId]: 0,
      }));
    }
  }, []);

  const countsByTaskId = useMemo(() => counts, [counts]);

  return {
    countsByTaskId,
    getUnreadCount,
    clearTaskNotifications,
  };
};

export default useTaskNotifications;
