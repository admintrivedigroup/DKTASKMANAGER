import React, { useMemo, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { LuScale } from "react-icons/lu";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import MatterCard from "../../components/Cards/MatterCard";
import LoadingOverlay from "../../components/LoadingOverlay";
import useTasks from "../../hooks/useTasks";

const ClientProjects = () => {
  const viewCopy = useMemo(
    () => ({
      activeMenu: "",
      heroBadge: "Matter Room",
      heroTitle: "Matter Progress",
      heroDescription:
        "Track every case in motion with a clear view of milestones, Super Admins, and next steps.",
      filterPrompt: "Filter case updates by status to focus on what matters most.",
      loadingMessage: "Loading your matters...",
      emptyState: "No matters found for the selected status.",
    }),
    []
  );

  const [filterStatus, setFilterStatus] = useState("All");
  const navigate = useNavigate();

  const { tasks: fetchedTasks, tabs, isLoading } = useTasks({
    statusFilter: filterStatus,
    includePrioritySort: false,
    errorMessage: "Error fetching client matters",
  });

  const allTasks = useMemo(() => fetchedTasks, [fetchedTasks]);

  const handleViewDetails = (taskId) => {
    navigate(`/client/task-details/${taskId}`);
  };

  const matterSummaries = useMemo(() => {
    if (!allTasks.length) {
      return [];
    }

    const map = new Map();

    const getValidDateValue = (value, fallbackValue) => {
      if (value) {
        const parsed = new Date(value).getTime();
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      if (fallbackValue) {
        const parsedFallback = new Date(fallbackValue).getTime();
        if (!Number.isNaN(parsedFallback)) {
          return parsedFallback;
        }
      }
      return Number.MAX_SAFE_INTEGER;
    };

    const getRecentDateValue = (task) => {
      const dates = [task.updatedAt, task.dueDate, task.createdAt].filter(Boolean);
      const parsedDates = dates
        .map((date) => {
          const parsed = new Date(date).getTime();
          return Number.isNaN(parsed) ? null : parsed;
        })
        .filter((date) => date !== null);

      if (!parsedDates.length) {
        return 0;
      }

      return Math.max(...parsedDates);
    };

    allTasks.forEach((task) => {
      const matterData =
        task?.matter && typeof task.matter === "object" ? task.matter : null;
      const caseData =
        task?.caseFile && typeof task.caseFile === "object" ? task.caseFile : null;

      const matterId =
        matterData?._id ||
        matterData?.id ||
        task?.matterId ||
        caseData?._id ||
        caseData?.id ||
        caseData?.caseNumber ||
        `task-${task._id}`;

      if (!matterId) {
        return;
      }

      if (!map.has(matterId)) {
        const matterTitle =
          matterData?.title ||
          matterData?.name ||
          caseData?.title ||
          caseData?.name ||
          caseData?.caseNumber ||
          "Untitled Matter";

        const clientName =
          (matterData?.client &&
            (matterData.client.name || matterData.client.fullName)) ||
          matterData?.clientName ||
          caseData?.clientName ||
          task?.clientName ||
          "";

        const reference =
          caseData?.caseNumber ||
          caseData?.reference ||
          matterData?.reference ||
          matterData?.fileNumber ||
          "";

        const stage =
          matterData?.stage ||
          matterData?.status ||
          caseData?.stage ||
          caseData?.status ||
          "";

        map.set(matterId, {
          matterId,
          title: matterTitle,
          clientName,
          reference,
          stage,
          tasks: [],
        });
      }

      const matterEntry = map.get(matterId);
      matterEntry.tasks.push(task);
    });

    const results = Array.from(map.values()).map((matter) => {
      const tasks = matter.tasks;
      const totalTasks = tasks.length;
      const filteredTasks =
        filterStatus === "All"
          ? tasks
          : tasks.filter((task) => task.status === filterStatus);

      const progressSum = tasks.reduce((total, task) => {
        const numericProgress = Number(task.progress);
        return !Number.isNaN(numericProgress) ? total + numericProgress : total;
      }, 0);

      const overallProgress = totalTasks
        ? Math.min(100, Math.max(0, Math.round(progressSum / totalTasks)))
        : 0;

      const statusBreakdown = tasks.reduce(
        (accumulator, task) => {
          const statusKey = task.status || "Pending";
          accumulator[statusKey] = (accumulator[statusKey] || 0) + 1;
          return accumulator;
        },
        { Pending: 0, "In Progress": 0, Completed: 0 }
      );

      const upcomingTask = [...tasks]
        .filter((task) => task.status !== "Completed")
        .sort((taskA, taskB) =>
          getValidDateValue(taskA.dueDate, taskA.createdAt) -
          getValidDateValue(taskB.dueDate, taskB.createdAt)
        )[0];

      const recentUpdates = [...tasks]
        .sort((taskA, taskB) => getRecentDateValue(taskB) - getRecentDateValue(taskA))
        .slice(0, 3);

      const defaultTaskId =
        (upcomingTask && upcomingTask._id) ||
        (recentUpdates[0] && recentUpdates[0]._id) ||
        (tasks[0] && tasks[0]._id) ||
        null;

      return {
        ...matter,
        totalTasks,
        filteredTasksCount: filteredTasks.length,
        overallProgress,
        statusBreakdown,
        upcomingTask: upcomingTask || null,
        recentUpdates,
        defaultTaskId,
      };
    });

    results.sort((matterA, matterB) => {
      const aDate = matterA.upcomingTask
        ? getValidDateValue(
            matterA.upcomingTask.dueDate,
            matterA.upcomingTask.createdAt
          )
        : Number.MAX_SAFE_INTEGER;
      const bDate = matterB.upcomingTask
        ? getValidDateValue(
            matterB.upcomingTask.dueDate,
            matterB.upcomingTask.createdAt
          )
        : Number.MAX_SAFE_INTEGER;

      if (aDate !== bDate) {
        return aDate - bDate;
      }

      return matterA.overallProgress - matterB.overallProgress;
    });

    if (filterStatus === "All") {
      return results;
    }

    return results.filter((matter) => matter.filteredTasksCount > 0);
  }, [allTasks, filterStatus]);

  useEffect(() => {
    getAllTasks();
  }, [getAllTasks]);

  return (
    <DashboardLayout activeMenu={viewCopy.activeMenu}>
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-700 to-sky-600 px-4 py-7 text-white shadow-[0_20px_45px_rgba(30,64,175,0.35)] sm:px-6 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.2),_transparent_60%)]" />
        <div className="relative flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-white/60">
            {viewCopy.heroBadge}
          </p>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {viewCopy.heroTitle}
          </h2>
          <p className="text-sm text-white/70">{viewCopy.heroDescription}</p>
        </div>
      </section>

      {isLoading ? (
        <LoadingOverlay message={viewCopy.loadingMessage} className="py-24" />
      ) : (
        <>
          {tabs?.[0]?.count > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] lg:flex-row">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 text-white shadow-[0_12px_28px_rgba(79,70,229,0.35)]">
                  <LuScale className="text-base" />
                </span>
                {viewCopy.filterPrompt}
              </div>

              <TaskStatusTabs
                tabs={tabs}
                activeTab={filterStatus}
                setActiveTab={setFilterStatus}
              />
            </div>
          )}

          <section className="grid gap-5 xl:grid-cols-2">
            {matterSummaries.map((matter) => (
              <MatterCard
                key={matter.matterId}
                matter={matter}
                onViewDetails={handleViewDetails}
              />
            ))}

            {!matterSummaries.length && (
              <div className="xl:col-span-2">
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  {viewCopy.emptyState}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
};

export default ClientProjects;