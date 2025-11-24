import React, { useMemo, useState } from "react";
import { LuPlus, LuRotateCcw, LuSearch } from "react-icons/lu";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";
import LoadingOverlay from "../../components/LoadingOverlay";
import TaskFormModal from "../../components/TaskFormModal";
import ViewToggle from "../../components/ViewToggle";
import TaskListTable from "../../components/TaskListTable";
import useTasks from "../../hooks/useTasks";
const Tasks = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskScope, setTaskScope] = useState("All Tasks");
  const [viewMode, setViewMode] = useState("grid");

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
              {filteredTasks?.map((item) => (
                <TaskCard
                  key={item._id}
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
                    attachmentCount={(item.attachments?.length || 0) + (item.relatedDocuments?.length || 0)}
                    completedTodoCount={item.completedTodoCount || 0}
                    todoChecklist={item.todoChecklist || []}
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