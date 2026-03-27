import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  LuArrowUpDown,
  LuCalendarRange,
  LuChevronLeft,
  LuChevronRight,
  LuPlus,
  LuRotateCcw,
  LuSearch,
} from "react-icons/lu";
import toast from "react-hot-toast";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";
import LoadingOverlay from "../../components/LoadingOverlay";
import TaskFormModal from "../../components/TaskFormModal";
import ViewToggle from "../../components/ViewToggle";
import TaskListTable from "../../components/TaskListTable";
import SearchableSelect from "../../components/SearchableSelect";
import TaskSortDialog from "../../components/TaskSortDialog";
import useQueryParamState from "../../hooks/useQueryParamState";
import useTasks from "../../hooks/useTasks";
import useTaskNotifications from "../../hooks/useTaskNotifications";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { navigateWithReturn } from "../../utils/routeNavigation";
import { getTaskSortLabel, sortTasks } from "../../utils/taskHelpers";

const normalizeAssigneeOption = (assignee) => {
  if (!assignee) {
    return null;
  }

  if (typeof assignee === "string" || typeof assignee === "number") {
    const value = assignee.toString().trim();
    return value ? { id: value, label: value } : null;
  }

  if (typeof assignee === "object") {
    const idValue =
      assignee._id || assignee.id || assignee.userId || assignee.email || "";
    const labelValue =
      assignee.name ||
      assignee.fullName ||
      assignee.email ||
      assignee.username ||
      "";
    const id = idValue ? idValue.toString() : labelValue.toString();
    const label = labelValue ? labelValue.toString() : idValue.toString();

    if (!id || !label) {
      return null;
    }

    return { id, label };
  }

  return null;
};

const getDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const Tasks = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const locationState = location.state;
  const consumedLocationStateRef = useRef({
    highlightTaskId: false,
    filterStatus: false,
    openTaskForm: false,
  });
  const [searchQuery, setSearchQuery] = useQueryParamState("search", {
    defaultValue: "",
  });
  const [filterStatus, setFilterStatus] = useQueryParamState("status", {
    defaultValue: "All",
  });
  const [selectedDate, setSelectedDate] = useQueryParamState("dueDate", {
    defaultValue: "",
  });
  const [assignedFilter, setAssignedFilter] = useQueryParamState("employeeId", {
    defaultValue: "all",
  });
  const [assignedSearch, setAssignedSearch] = useState("");
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskScope, setTaskScope] = useQueryParamState("tab", {
    defaultValue: "All Tasks",
  });
  const [viewMode, setViewMode] = useQueryParamState("view", {
    defaultValue: "grid",
  });
  const [sortMode] = useQueryParamState("sort", {
    defaultValue: "default",
  });
  const [highlightTaskId, setHighlightTaskId] = useState(
    locationState?.highlightTaskId || null
  );
  const [isHighlighting, setIsHighlighting] = useState(
    Boolean(locationState?.highlightTaskId)
  );
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  const [approvalActionTaskId, setApprovalActionTaskId] = useState(null);
  const [currentPage, setCurrentPage] = useQueryParamState("page", {
    defaultValue: 1,
    parse: (value) => {
      const parsedValue = Number.parseInt(value, 10);
      return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
    },
    serialize: (value) => String(value),
  });
  const PAGE_SIZE = 9;
  const updateTaskListParams = useCallback(
    (updates) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          Object.entries(updates).forEach(([key, value]) => {
            const shouldDelete =
              value === undefined ||
              value === null ||
              value === "" ||
              (key === "status" && value === "All") ||
              (key === "employeeId" && value === "all") ||
              (key === "tab" && value === "All Tasks") ||
              (key === "view" && value === "grid") ||
              (key === "sort" && value === "default") ||
              (key === "page" && value === 1);

            if (shouldDelete) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const { tasks, tabs, isLoading, refetch } = useTasks({
    statusFilter: filterStatus,
    scope: taskScope === "My Task" ? "my" : "all",
    includePrioritySort: true,
  });
  const { getUnreadCount } = useTaskNotifications(tasks);

  const assigneeOptions = useMemo(() => {
    const optionMap = new Map();

    tasks.forEach((task) => {
      const assignedMembers = Array.isArray(task.assignedTo)
        ? task.assignedTo
        : task.assignedTo
        ? [task.assignedTo]
        : [];

      assignedMembers.forEach((assignee) => {
        const normalized = normalizeAssigneeOption(assignee);
        if (!normalized) {
          return;
        }

        if (!optionMap.has(normalized.id)) {
          optionMap.set(normalized.id, normalized);
        }
      });
    });

    return Array.from(optionMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [tasks]);

  const filteredAssigneeOptions = useMemo(() => {
    const normalizedSearch = assignedSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return assigneeOptions;
    }

    return assigneeOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch)
    );
  }, [assignedSearch, assigneeOptions]);

  const hasActiveFilters =
    filterStatus !== "All" ||
    searchQuery.trim() ||
    selectedDate.trim() ||
    assignedFilter !== "all";

  const handleResetFilters = () => {
    updateTaskListParams({
      status: "All",
      search: "",
      dueDate: "",
      employeeId: "all",
      page: 1,
    });
    setAssignedSearch("");
  };

  const openTaskForm = (taskId = null) => {
    setActiveTaskId(taskId);
    setIsTaskFormOpen(true);
  };

  const closeTaskForm = () => {
    setIsTaskFormOpen(false);
    setActiveTaskId(null);
  };

  const handleTaskMutationSuccess = () => {
    refetch();
    closeTaskForm();
  };

  const handleApproveTaskCompletion = useCallback(
    async (task) => {
      const taskId = task?._id;
      if (!taskId) {
        return;
      }

      try {
        setApprovalActionTaskId(taskId);
        const response = await axiosInstance.post(
          API_PATHS.TASKS.APPROVE_COMPLETION(taskId)
        );
        toast.success(response.data?.message || "Task completion approved");
        await refetch();
      } catch (error) {
        console.error("Error approving task completion:", error);
        toast.error(
          error?.response?.data?.message || "Failed to approve task completion."
        );
      } finally {
        setApprovalActionTaskId(null);
      }
    },
    [refetch]
  );

  const handleRejectTaskCompletion = useCallback(
    async (task) => {
      const taskId = task?._id;
      if (!taskId) {
        return;
      }

      try {
        setApprovalActionTaskId(taskId);
        const response = await axiosInstance.post(
          API_PATHS.TASKS.REJECT_COMPLETION(taskId)
        );
        toast.success(response.data?.message || "Task completion rejected");
        await refetch();
      } catch (error) {
        console.error("Error rejecting task completion:", error);
        toast.error(
          error?.response?.data?.message || "Failed to reject task completion."
        );
      } finally {
        setApprovalActionTaskId(null);
      }
    },
    [refetch]
  );

  const handleTaskCardClick = (taskId) => {
    if (!taskId) {
      return;
    }

    navigateWithReturn(navigate, `/admin/task-details/${taskId}`, location);
  };

  useEffect(() => {
    const incomingHighlightId = locationState?.highlightTaskId;
    if (!incomingHighlightId || consumedLocationStateRef.current.highlightTaskId) {
      return;
    }
    consumedLocationStateRef.current.highlightTaskId = true;

    const { highlightTaskId: _highlightTaskId, ...restState } = locationState;

    setHighlightTaskId(incomingHighlightId);
    setIsHighlighting(Boolean(incomingHighlightId));
    updateTaskListParams({ view: "grid", status: "All" });

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      {
        replace: true,
        state: restState,
      }
    );
  }, [location.pathname, location.search, locationState, navigate, updateTaskListParams]);

  useEffect(() => {
    const incomingFilterStatus = locationState?.filterStatus;
    if (
      typeof incomingFilterStatus !== "string" ||
      consumedLocationStateRef.current.filterStatus
    ) {
      return;
    }
    consumedLocationStateRef.current.filterStatus = true;

    setFilterStatus(incomingFilterStatus);

    const { filterStatus: _filterStatus, ...restState } = locationState;
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      {
        replace: true,
        state: restState,
      }
    );
  }, [location.pathname, location.search, locationState, navigate, setFilterStatus]);

  useEffect(() => {
    const shouldOpenTaskForm = locationState?.openTaskForm;
    if (!shouldOpenTaskForm || consumedLocationStateRef.current.openTaskForm) {
      return;
    }
    consumedLocationStateRef.current.openTaskForm = true;

    const { openTaskForm: _openTaskForm, taskId, ...restState } =
      locationState || {};

    setActiveTaskId(taskId || null);
    setIsTaskFormOpen(true);

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      {
        replace: true,
        state: restState,
      }
    );
  }, [location.pathname, location.search, locationState, navigate]);

  const filteredTasks = useMemo(() => {
    const normalizedAssignedFilter = assignedFilter.trim().toLowerCase();

    return tasks.filter((task) => {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const normalizedSelectedDate = selectedDate.trim();
      const normalizedTitle = task.title?.toLowerCase?.() || "";
      const normalizedDescription = task.description?.toLowerCase?.() || "";

      const matchesSearch =
        !normalizedQuery ||
        normalizedTitle.includes(normalizedQuery) ||
        normalizedDescription.includes(normalizedQuery);

      const matchesDate =
        !normalizedSelectedDate ||
        getDateInputValue(task.dueDate) === normalizedSelectedDate;

      const assignedMembers = Array.isArray(task.assignedTo)
        ? task.assignedTo
        : task.assignedTo
        ? [task.assignedTo]
        : [];
      const matchesAssignee =
        !normalizedAssignedFilter ||
        normalizedAssignedFilter === "all" ||
        assignedMembers.some((assignee) => {
          const normalized = normalizeAssigneeOption(assignee);
          return normalized?.id.toLowerCase() === normalizedAssignedFilter;
        });

      return matchesSearch && matchesDate && matchesAssignee;
    });
  }, [tasks, searchQuery, selectedDate, assignedFilter]);

  const sortedTasks = useMemo(
    () => sortTasks(filteredTasks, { mode: sortMode, includePrioritySort: true }),
    [filteredTasks, sortMode]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE)),
    [sortedTasks.length]
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [isLoading, totalPages]);

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedTasks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, sortedTasks]);

  useEffect(() => {
    if (!highlightTaskId || !isHighlighting) {
      return;
    }

    if (viewMode !== "grid") {
      setViewMode("grid");
    }

    const targetIndex = sortedTasks.findIndex(
      (task) => task._id === highlightTaskId
    );

    if (targetIndex === -1) {
      return;
    }

    const desiredPage = Math.floor(targetIndex / PAGE_SIZE) + 1;

    if (currentPage !== desiredPage) {
      setCurrentPage(desiredPage);
      return;
    }

    const targetCard = document.querySelector(
      `[data-task-card-id="${highlightTaskId}"]`
    );

    if (targetCard?.scrollIntoView) {
      targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timeoutId = window.setTimeout(() => {
      setIsHighlighting(false);
      setHighlightTaskId(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [
    PAGE_SIZE,
    currentPage,
    sortedTasks,
    highlightTaskId,
    isHighlighting,
    viewMode,
  ]);

  const filteredTaskCount = sortedTasks.length;
  const totalTasksCount = tasks.length;
  const pageStart = filteredTaskCount ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = filteredTaskCount
    ? Math.min(currentPage * PAGE_SIZE, filteredTaskCount)
    : 0;
  const metaChips = [
    `Scope · ${taskScope}`,
    `${filteredTaskCount} of ${totalTasksCount || 0} tasks`,
    `Sort · ${getTaskSortLabel(sortMode)}`,
    viewMode === "grid" ? "Card view" : "Table view",
  ];

  const handlePageChange = (page) => {
    setCurrentPage((previous) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);
      return nextPage === previous ? previous : nextPage;
    });
  };

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="mt-6 flex flex-col items-center gap-3 text-sm text-slate-600 dark:text-slate-200">
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:-translate-y-0.5 hover:text-indigo-600 disabled:translate-y-0 disabled:text-slate-300 dark:text-slate-200 dark:hover:text-indigo-200"
          >
            <LuChevronLeft className="text-lg" />
          </button>
          <div className="inline-flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;
              const isActive = pageNumber === currentPage;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => handlePageChange(pageNumber)}
                  className={`h-10 min-w-[2.75rem] rounded-full px-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:-translate-y-0.5 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-200"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:-translate-y-0.5 hover:text-indigo-600 disabled:translate-y-0 disabled:text-slate-300 dark:text-slate-200 dark:hover:text-indigo-200"
          >
            <LuChevronRight className="text-lg" />
          </button>
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing {pageStart}-{pageEnd} of {filteredTaskCount}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout activeMenu="Tasks">
      <div className="page-shell space-y-5 sm:space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.08),transparent_36%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <h1 className="text-[28px] font-bold text-slate-900 sm:text-[30px]">
                  Tasks
                </h1>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {metaChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <select
                value={taskScope}
                onChange={(event) => {
                  updateTaskListParams({
                    tab: event.target.value,
                    page: 1,
                  });
                }}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-40"
              >
                <option>All Tasks</option>
                <option>My Task</option>
              </select>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                onClick={() => openTaskForm()}
              >
                <LuPlus className="text-base" /> Create task
              </button>
            </div>
          </div>
        </section>

        {isLoading ? (
          <LoadingOverlay message="Loading tasks..." className="py-24" />
        ) : (
          <>
            {(tabs.length > 0 || tasks.length > 0) && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-800/70 dark:bg-slate-900/75 sm:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="w-full min-w-0 flex-1">
                      <TaskStatusTabs
                        tabs={tabs}
                        activeTab={filterStatus}
                        setActiveTab={(value) => {
                          updateTaskListParams({
                            status: value,
                            page: 1,
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsSortDialogOpen(true)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-200"
                      >
                        <LuArrowUpDown className="text-base" />
                        Sort by
                      </button>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        View
                      </span>
                      <ViewToggle
                        value={viewMode}
                        onChange={setViewMode}
                        className="self-end lg:self-auto"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                          Search
                        </span>
                        <div className="relative">
                          <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => {
                              updateTaskListParams({
                                search: event.target.value,
                                page: 1,
                              });
                            }}
                            placeholder="Search tasks"
                            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-9 text-sm text-slate-700 shadow-sm transition focus:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                          Due Date
                        </span>
                        <div className="relative">
                          <LuCalendarRange className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => {
                              updateTaskListParams({
                                dueDate: event.target.value,
                                page: 1,
                              });
                            }}
                            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-9 text-sm text-slate-700 shadow-sm transition focus:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                          Assigned
                        </span>
                        <SearchableSelect
                          value={assignedFilter}
                          onChange={(value) => {
                            updateTaskListParams({
                              employeeId: value,
                              page: 1,
                            });
                          }}
                          options={assigneeOptions}
                          filteredOptions={filteredAssigneeOptions}
                          getOptionValue={(option) => option.id}
                          getOptionLabel={(option) => option.label}
                          placeholder="Select member"
                          searchTerm={assignedSearch}
                          onSearchTermChange={setAssignedSearch}
                          searchPlaceholder="Search members"
                          noResultsMessage="No members found."
                          staticOptions={[{ label: "All", value: "all" }]}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-200"
                          onClick={handleResetFilters}
                        >
                          <LuRotateCcw className="text-base" /> Reset filters
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewMode === "grid" ? (
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {paginatedTasks?.map((item) => (
                  <TaskCard
                    key={item._id}
                    task={item}
                    cardId={item._id}
                    title={item.title}
                    description={item.description}
                    priority={item.priority}
                    status={item.status}
                    progress={item.progress}
                    startDate={item.startDate}
                    createdAt={item.createdAt}
                    dueDate={item.dueDate}
                    assignedTo={Array.isArray(item.assignedTo)
                      ? item.assignedTo
                      : item.assignedTo
                      ? [item.assignedTo]
                      : []}
                    attachmentCount={item.attachments?.length || 0}
                    completedTodoCount={item.completedTodoCount || 0}
                    todoChecklist={item.todoChecklist || []}
                    unreadCount={getUnreadCount(item)}
                    isHighlighted={
                      isHighlighting && highlightTaskId === item._id
                    }
                    onClick={() => handleTaskCardClick(item._id)}
                    onEdit={() => openTaskForm(item._id)}
                    onApprove={handleApproveTaskCompletion}
                    onReject={handleRejectTaskCompletion}
                    isApprovalActionLoading={approvalActionTaskId === item._id}
                  />
                ))}

                {!sortedTasks.length && (
                  <div className="md:col-span-2 xl:col-span-3">
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
                      No tasks match the selected filters.
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section>
                {sortedTasks.length ? (
                  <TaskListTable
                    tableData={paginatedTasks}
                    onTaskClick={(task) => handleTaskCardClick(task?._id)}
                    onEdit={(task) => openTaskForm(task?._id)}
                    onApprove={handleApproveTaskCompletion}
                    onReject={handleRejectTaskCompletion}
                    isApprovalActionLoading={Boolean(approvalActionTaskId)}
                    getUnreadCount={getUnreadCount}
                    className="mt-0"
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
                    No tasks match the selected filters.
                  </div>
                )}
              </section>
            )}

            {sortedTasks.length > 0 && renderPagination()}
          </>
        )}
      </div>

      <TaskSortDialog
        isOpen={isSortDialogOpen}
        onClose={() => setIsSortDialogOpen(false)}
        sortMode={sortMode}
        onApply={(value) => {
          updateTaskListParams({
            sort: value,
            page: 1,
          });
          setIsSortDialogOpen(false);
        }}
        onReset={() => {
          updateTaskListParams({
            sort: "default",
            page: 1,
          });
          setIsSortDialogOpen(false);
        }}
      />
      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={closeTaskForm}
        taskId={activeTaskId}
        onSuccess={handleTaskMutationSuccess}
      />
    </DashboardLayout>
  );
};

export default Tasks;
