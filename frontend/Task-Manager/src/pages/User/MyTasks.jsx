import React, { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LuChevronLeft, LuChevronRight, LuSparkles } from "react-icons/lu";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";
import LoadingOverlay from "../../components/LoadingOverlay";
import useListSearchParams from "../../hooks/useListSearchParams";
import useTasks from "../../hooks/useTasks";
import TaskFormModal from "../../components/TaskFormModal";
import useTaskNotifications from "../../hooks/useTaskNotifications";
import { navigateWithReturn } from "../../utils/routeNavigation";

const MyTasks = () => {
  const { state, setParam } = useListSearchParams({
    status: { defaultValue: "All" },
    tab: { defaultValue: "assigned" },
    page: {
      defaultValue: 1,
      parse: (value) => {
        const parsedValue = Number.parseInt(value, 10);
        return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
      },
      serialize: (value) => String(value),
    },
  });
  const { status: filterStatus, tab: taskType, page: currentPage } = state;
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const PAGE_SIZE = 9;

  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
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
              (key === "tab" && value === "assigned") ||
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

  const { tasks: fetchedTasks, tabs, isLoading, refetch } = useTasks({
    statusFilter: filterStatus,
    taskType,
    includePrioritySort: false,
  });
  const { getUnreadCount } = useTaskNotifications(fetchedTasks);

  const handleClick = (taskId) => {
    navigateWithReturn(navigate, `/user/task-details/${taskId}`, location);
  };

  const allTasks = useMemo(() => fetchedTasks, [fetchedTasks]);
  const isPersonalView = taskType === "personal";
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(allTasks.length / PAGE_SIZE)),
    [allTasks.length]
  );
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return allTasks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [allTasks, currentPage]);
  const pageStart = allTasks.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = allTasks.length
    ? Math.min(currentPage * PAGE_SIZE, allTasks.length)
    : 0;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    setParam("page", (previousPage) => Math.min(previousPage, totalPages));
  }, [isLoading, setParam, totalPages]);

  const handlePageChange = (page) => {
    setParam("page", (previousPage) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);
      return nextPage === previousPage ? previousPage : nextPage;
    });
  };

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="mt-6 flex flex-col items-center gap-3 text-sm text-slate-600">
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:-translate-y-0.5 hover:text-indigo-600 disabled:translate-y-0 disabled:text-slate-300"
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
                      : "text-slate-600 hover:-translate-y-0.5 hover:text-indigo-600"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:-translate-y-0.5 hover:text-indigo-600 disabled:translate-y-0 disabled:text-slate-300"
          >
            <LuChevronRight className="text-lg" />
          </button>
        </div>
        <div className="text-xs font-medium text-slate-500">
          Showing {pageStart}-{pageEnd} of {allTasks.length}
        </div>
      </div>
    );
  };

  const metaChips = [
    isPersonalView ? "Scope: Personal Tasks" : "Scope: Assigned Tasks",
    `Status: ${filterStatus}`,
    `${allTasks.length || 0} total`,
  ];

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="page-shell space-y-5 sm:space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.08),transparent_36%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <h1 className="text-[28px] font-bold text-slate-900 sm:text-[30px]">
                  My Tasks
                </h1>
                <p className="text-sm text-slate-600">
                  Your personal and assigned work, organized in one place.
                </p>
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
                value={taskType}
                onChange={(event) => {
                  updateTaskListParams({
                    tab: event.target.value,
                    page: 1,
                  });
                }}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-44"
              >
                <option value="assigned">Assigned Tasks</option>
                <option value="personal">Personal Tasks</option>
              </select>
              {isPersonalView && (
                <button
                  type="button"
                  onClick={() => setIsTaskFormOpen(true)}
                  className="add-btn h-11"
                >
                  Add Personal Task
                </button>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <LoadingOverlay message="Loading your tasks..." className="py-24" />
        ) : (
          <>
            {tabs?.[0]?.count > 0 && (
              <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-800/70 dark:bg-slate-900/75 lg:flex-row">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 text-white shadow-[0_12px_28px_rgba(79,70,229,0.35)]">
                    <LuSparkles className="text-base" />
                  </span>
                  Filter tasks by status to keep momentum.
                </div>

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
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedTasks?.map((item) => (
                <TaskCard
                  key={item._id}
                  title={item.title}
                  description={item.description}
                  priority={item.priority}
                  status={item.status}
                  progress={item.progress}
                  startDate={item.startDate}
                  createdAt={item.createdAt}
                  dueDate={item.dueDate}
                  assignedTo={
                    Array.isArray(item.assignedTo)
                      ? item.assignedTo
                      : item.assignedTo
                      ? [item.assignedTo]
                      : []
                  }
                  attachmentCount={item.attachments?.length || 0}
                  completedTodoCount={item.completedTodoCount || 0}
                  todoChecklist={item.todoChecklist || []}
                  unreadCount={getUnreadCount(item)}
                  onClick={() => {
                    handleClick(item._id);
                  }}
                />
              ))}

              {!allTasks.length && (
                <div className="md:col-span-2 xl:col-span-3">
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    No {isPersonalView ? "personal" : "assigned"} tasks found for the selected status.
                  </div>
                </div>
              )}
            </section>

            {allTasks.length > 0 && renderPagination()}
          </>
        )}
      </div>

      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSuccess={() => {
          refetch?.();
          setIsTaskFormOpen(false);
        }}
        mode="personal"
      />
    </DashboardLayout>
  );
};

export default MyTasks;
