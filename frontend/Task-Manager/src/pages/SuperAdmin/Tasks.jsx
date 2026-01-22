import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LuCalendarRange,
  LuChevronLeft,
  LuChevronRight,
  LuPlus,
  LuRotateCcw,
  LuSearch,
} from "react-icons/lu";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";
import LoadingOverlay from "../../components/LoadingOverlay";
import TaskFormModal from "../../components/TaskFormModal";
import ViewToggle from "../../components/ViewToggle";
import TaskListTable from "../../components/TaskListTable";
import useTasks from "../../hooks/useTasks";
import useTaskNotifications from "../../hooks/useTaskNotifications";

const Tasks = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state;
  const initialFilterStatus = locationState?.filterStatus || "All";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
  const [selectedDate, setSelectedDate] = useState("");
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskScope, setTaskScope] = useState("All Tasks");
  const [viewMode, setViewMode] = useState("grid");
  const [highlightTaskId, setHighlightTaskId] = useState(
    locationState?.highlightTaskId || null
  );
  const [isHighlighting, setIsHighlighting] = useState(
    Boolean(locationState?.highlightTaskId)
  );
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 9;

  const { tasks, tabs, isLoading, refetch } = useTasks({
    statusFilter: filterStatus,
    scope: taskScope === "My Task" ? "my" : "all",
    includePrioritySort: true,
  });
  const { getUnreadCount, clearTaskNotifications } = useTaskNotifications(tasks);

  const hasActiveFilters =
    filterStatus !== "All" || searchQuery.trim() || selectedDate.trim();

  const handleResetFilters = () => {
    setFilterStatus("All");
    setSearchQuery("");
    setSelectedDate("");
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

  const handleTaskCardClick = (taskId) => {
    if (!taskId) {
      return;
    }

    navigate(`/super-admin/task-details/${taskId}`);
  };

  const handleTaskNotificationClick = async (taskId) => {
    if (!taskId) {
      return;
    }

    await clearTaskNotifications(taskId);
    navigate(`/tasks/${taskId}?tab=channel`);
  };

  useEffect(() => {
    if (!locationState?.highlightTaskId) {
      return;
    }

    const { highlightTaskId: incomingHighlightId, ...restState } =
      locationState;

    setHighlightTaskId(incomingHighlightId);
    setIsHighlighting(Boolean(incomingHighlightId));
    setViewMode("grid");
    setFilterStatus("All");

    navigate(location.pathname, {
      replace: true,
      state: restState,
    });
  }, [location.pathname, locationState, navigate]);

  useEffect(() => {
    if (typeof locationState?.filterStatus !== "string") {
      return;
    }

    setFilterStatus(locationState.filterStatus);

    const { filterStatus: _filterStatus, ...restState } = locationState;
    navigate(location.pathname, {
      replace: true,
      state: restState,
    });
  }, [location.pathname, locationState, navigate]);

  useEffect(() => {
    if (!locationState?.openTaskForm) {
      return;
    }

    const { openTaskForm: _openTaskForm, taskId, ...restState } =
      locationState || {};

    setActiveTaskId(taskId || null);
    setIsTaskFormOpen(true);

    navigate(location.pathname, {
      replace: true,
      state: restState,
    });
  }, [location.pathname, locationState, navigate]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const normalizedSelectedDate = selectedDate.trim();

      const matchesSearch =
        !normalizedQuery || task.title?.toLowerCase().includes(normalizedQuery);

      const matchesDate =
        !normalizedSelectedDate ||
        (task.dueDate &&
          new Date(task.dueDate).toISOString().split("T")[0] ===
            normalizedSelectedDate);

      return matchesSearch && matchesDate;
    });
  }, [tasks, searchQuery, selectedDate]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE)),
    [filteredTasks.length]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, selectedDate, taskScope, tasks]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredTasks]);

  useEffect(() => {
    if (!highlightTaskId || !isHighlighting) {
      return;
    }

    if (viewMode !== "grid") {
      setViewMode("grid");
    }

    const targetIndex = filteredTasks.findIndex(
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
    filteredTasks,
    highlightTaskId,
    isHighlighting,
    viewMode,
  ]);

  const filteredTaskCount = filteredTasks.length;
  const totalTasksCount = tasks.length;
  const pageStart = filteredTaskCount ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = filteredTaskCount
    ? Math.min(currentPage * PAGE_SIZE, filteredTaskCount)
    : 0;
  const metaChips = [
    `Scope · ${taskScope}`,
    `${filteredTaskCount} of ${totalTasksCount || 0} tasks`,
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
                onChange={(event) => setTaskScope(event.target.value)}
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
                        setActiveTab={setFilterStatus}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0">
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

                  <div className="grid gap-3 lg:grid-cols-[1.2fr_auto] lg:items-center">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="relative">
                        <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(event) =>
                            setSearchQuery(event.target.value)
                          }
                          placeholder="Search tasks"
                          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-9 text-sm text-slate-700 shadow-sm transition focus:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
                        />
                      </div>
                      <div className="relative">
                        <LuCalendarRange className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(event) =>
                            setSelectedDate(event.target.value)
                          }
                          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-9 text-sm text-slate-700 shadow-sm transition focus:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-200"
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
                    onBadgeClick={() => handleTaskNotificationClick(item._id)}
                    onEdit={() => openTaskForm(item._id)}
                  />
                ))}

                {!filteredTasks.length && (
                  <div className="md:col-span-2 xl:col-span-3">
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
                      No tasks match the selected filters.
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section>
                {filteredTasks.length ? (
                  <TaskListTable
                    tableData={paginatedTasks}
                    onTaskClick={(task) => handleTaskCardClick(task?._id)}
                    onEdit={(task) => openTaskForm(task?._id)}
                    getUnreadCount={getUnreadCount}
                    onNotificationClick={handleTaskNotificationClick}
                    className="mt-0"
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
                    No tasks match the selected filters.
                  </div>
                )}
              </section>
            )}

            {filteredTasks.length > 0 && renderPagination()}
          </>
        )}
      </div>

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
