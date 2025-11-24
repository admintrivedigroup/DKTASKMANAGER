import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import {
  buildStatusTabs,
  extractStatusSummary,
  sortTasks,
} from "../utils/taskHelpers";

const DEFAULT_SUMMARY = extractStatusSummary({});

const normalizeScope = (scope) => {
  if (typeof scope !== "string") {
    return undefined;
  }

  const trimmed = scope.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }

  return trimmed === "all" || trimmed === "my" ? trimmed : undefined;
};

const normalizeStatusFilter = (statusFilter) => {
  if (typeof statusFilter !== "string") {
    return undefined;
  }

  const trimmed = statusFilter.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") {
    return undefined;
  }

  return trimmed;
};

const useTasks = ({
  statusFilter = "All",
  scope,
  includePrioritySort = false,
  enabled = true,
  errorMessage = "Failed to fetch tasks. Please try again later.",
} = {}) => {
  const [tasks, setTasks] = useState([]);
  const [statusSummary, setStatusSummary] = useState(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!enabled) {
      return [];
    }

    setIsLoading(true);

    try {
      const params = {};
      const normalizedStatus = normalizeStatusFilter(statusFilter);
      const normalizedScope = normalizeScope(scope);

      if (normalizedStatus) {
        params.status = normalizedStatus;
      }

      if (normalizedScope) {
        params.scope = normalizedScope;
      }

      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params,
      });

      const fetchedTasks = Array.isArray(response.data?.tasks)
        ? response.data.tasks
        : [];

      const summary = extractStatusSummary(response.data?.statusSummary || {});

      setTasks(sortTasks(fetchedTasks, { includePrioritySort }));
      setStatusSummary(summary);

      return fetchedTasks;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [
    enabled,
    errorMessage,
    includePrioritySort,
    scope,
    statusFilter,
  ]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const tabs = useMemo(() => buildStatusTabs(statusSummary), [statusSummary]);

  return {
    tasks,
    statusSummary,
    tabs,
    isLoading,
    refetch: fetchTasks,
  };
};

export default useTasks;