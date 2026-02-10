import { useCallback, useEffect, useMemo, useState } from "react";

import { connectSocket } from "../utils/socket";

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

        next[taskId] = normalizeCount(task?.unreadCount);
      });

      return next;
    });
  }, [tasks]);

  useEffect(() => {
    const socket = connectSocket();

    const handleTaskAssigned = (payload) => {
      const taskId = payload?.taskId;
      if (!taskId) {
        return;
      }

      setCounts((previous) => ({
        ...previous,
        [taskId]: 1,
      }));
    };

    socket.on("task-assigned", handleTaskAssigned);

    return () => {
      socket.off("task-assigned", handleTaskAssigned);
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

  const countsByTaskId = useMemo(() => counts, [counts]);

  return {
    countsByTaskId,
    getUnreadCount,
  };
};

export default useTaskNotifications;
