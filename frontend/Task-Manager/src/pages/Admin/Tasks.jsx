import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LuPlus, LuRotateCcw, LuSearch } from "react-icons/lu";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import PageHeader from "../../components/layouts/PageHeader";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";
import LoadingOverlay from "../../components/LoadingOverlay";
import TaskFormModal from "../../components/TaskFormModal";
import ViewToggle from "../../components/ViewToggle";
import TaskListTable from "../../components/TaskListTable";
import useTasks from "../../hooks/useTasks";

const Tasks = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state;
  const initialFilterStatus = locationState?.filterStatus || "All";

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
      navigate(`/admin/task-details/${taskId}`);
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

  useEffect(() => {
    if (!highlightTaskId || !isHighlighting) {
      return;
    }

    if (viewMode !== "grid") {
      setViewMode("grid");
    }

    const hasMatchingTask = filteredTasks.some(
      (task) => task._id === highlightTaskId
    );

    if (!hasMatchingTask) {
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
  }, [filteredTasks, highlightTaskId, isHighlighting, viewMode]);

  const filteredTaskCount = filteredTasks.length;
  const totalTasksCount = tasks.length;

  return (
    <DashboardLayout activeMenu="Tasks">
      <div className="page-shell">
        <PageHeader
          tone="primary"
          eyebrow="Task Hub"
          title="Tasks"
          description="Curate, assign and elevate every deliverable with confidence."
          meta={[
            `Scope: ${taskScope}`,
            `Showing ${filteredTaskCount} of ${totalTasksCount || 0}`,
            viewMode === "grid" ? "Card view" : "Table view",
          ]}
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <select
                value={taskScope}
                onChange={(event) => setTaskScope(event.target.value)}
                className="rounded-xl border border-white/30 bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white outline-none transition hover:-translate-y-0.5 hover:bg-white/25 focus:border-white focus:ring-2 focus:ring-white/50"
              >
                <option>All Tasks</option>
                <option>My Task</option>
              </select>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 shadow-sm shadow-indigo-900/20 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
                onClick={() => openTaskForm()}
              >
                <LuPlus className="text-base" /> Create
              </button>
            </div>
          }
        />

        {isLoading ? (
          <LoadingOverlay message="Loading tasks..." className="py-24" />
        ) : (
          <>
            {(tabs.length > 0 || tasks.length > 0) && (
              <div className="page-surface space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <TaskStatusTabs
                    tabs={tabs}
                    activeTab={filterStatus}
                    setActiveTab={setFilterStatus}
                  />

                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200"
                      onClick={handleResetFilters}
                    >
                      <LuRotateCcw className="text-base" /> Reset Filters
                    </button>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.6fr_auto] lg:items-center">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="group flex flex-col text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
                      Search Task
                      <div className="relative mt-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors duration-300 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200 outline-none transition group-focus-within:border-primary group-focus-within:ring-2 group-focus-within:ring-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 dark:text-slate-500">
                          <LuSearch className="text" />
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
              </div>
            )}

            {viewMode === "grid" ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTasks?.map((item) => (
                  <TaskCard
                    key={item._id}
                    cardId={item._id}
                    title={item.title}
                    description={item.description}
                    priority={item.priority}
                    status={item.status}
                    progress={item.progress}
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
              <section>
                {filteredTasks.length ? (
                  <TaskListTable
                    tableData={filteredTasks}
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
