import React, { useEffect, useMemo, useState } from "react";
import { LuPlus, LuRotateCcw, LuSearch } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";
import LoadingOverlay from "../../components/LoadingOverlay";
import TaskFormModal from "../../components/TaskFormModal";
import ViewToggle from "../../components/ViewToggle";
import TaskListTable from "../../components/TaskListTable";
import useTasks from "../../hooks/useTasks";

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

    if (taskScope === "My Task") {
      navigate(`/super-admin/task-details/${taskId}`);
      return;
    }

    openTaskForm(taskId);
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
    if (
      location.state?.filterStatus &&
      location.state.filterStatus !== filterStatus
    ) {
      setFilterStatus(location.state.filterStatus);
    }
  }, [location.state?.filterStatus, filterStatus]);

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

  const filteredTaskCount = filteredTasks.length;
  const pageStart = filteredTaskCount ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = filteredTaskCount
    ? Math.min(currentPage * PAGE_SIZE, filteredTaskCount)
    : 0;

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
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Showing {pageStart} – {pageEnd} of {filteredTaskCount}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-100 dark:disabled:border-slate-800 dark:disabled:bg-slate-900"
          >
            Prev
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
                  className={`h-8 w-8 rounded-full text-xs font-semibold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/40"
                      : "border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-100"
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
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-100 dark:disabled:border-slate-800 dark:disabled:bg-slate-900"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout activeMenu="Tasks">
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-primary via-indigo-500 to-sky-500 px-4 py-7 text-white shadow-[0_20px_45px_rgba(59,130,246,0.25)] sm:px-6 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.2),_transparent_60%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-white/70">Task Hub</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Tasks</h2>
            <p className="mt-3 text-sm text-white/70">
              Curate, assign and elevate every deliverable with confidence.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={taskScope}
              onChange={(event) => setTaskScope(event.target.value)}
              className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/90 hover:to-sky-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option>All Tasks</option>
              <option>My Task</option>
            </select>            
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/90 hover:to-sky-500 hover:text-white"
              onClick={() => openTaskForm()}
            >
              <LuPlus className="text-base" /> Create
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <LoadingOverlay message="Loading tasks..." className="py-24" />
      ) : (
        <>
          {(tabs.length > 0 || tasks.length > 0) && (
            <div className="flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-colors duration-300 dark:border-slate-800/60 dark:bg-slate-900/60 dark:shadow-[0_26px_60px_rgba(2,6,23,0.55)]">
              <TaskStatusTabs
                tabs={tabs}
                activeTab={filterStatus}
                setActiveTab={setFilterStatus}
              />

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <label className="group flex flex-col text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
                    Search Task
                    <div className="relative mt-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by task name..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors duration-300 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200 outline-none transition group-focus-within:border-primary group-focus-within:ring-2 group-focus-within:ring-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 dark:text-slate-500">
                        <LuSearch className="text-base" />
                      </span>
                    </div>
                  </label>
                  <label className="flex flex-col text-xs uppercase tracking-[0.24em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
                    Due Date
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm capitalize text-slate-600 transition-colors duration-300 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
                    View
                  </span>
                  <ViewToggle
                    value={viewMode}
                    onChange={setViewMode}
                    className="self-end lg:self-auto"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/90 hover:to-sky-500 hover:text-white dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200"
                    onClick={handleResetFilters}
                  >
                    <LuRotateCcw className="text-base" /> Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {viewMode === "grid" ? (
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                    isHighlighted={
                      isHighlighting && highlightTaskId === item._id
                    }
                    onClick={() => handleTaskCardClick(item._id)}
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
            <section className="mt-6">
              {filteredTasks.length ? (
                <TaskListTable
                  tableData={paginatedTasks}
                  onTaskClick={(task) => handleTaskCardClick(task?._id)}
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
