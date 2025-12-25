import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDateLabel } from "../../utils/dateUtils";
import { LuArrowLeft, LuExternalLink, LuLoader } from "react-icons/lu";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FaUser } from "react-icons/fa6";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/userContext.jsx";
import { getPrivilegedBasePath, normalizeRole } from "../../utils/roleUtils";
import TaskFormModal from "../../components/TaskFormModal";
import { formatCurrency } from "../../utils/invoiceUtils";
import CustomPieChart from "../../components/Charts/CustomPieChart.jsx";

const statusBadgeStyles = {
  Pending:
    "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-500/30",
  "In Progress":
    "bg-sky-100 text-sky-600 border-sky-200 dark:bg-sky-500/15 dark:text-sky-100 dark:border-sky-500/30",
  Completed:
    "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-500/30",
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const computeKpiFromTasks = (tasks = []) => {
  const completedTasks = tasks.filter((task) => task?.status === "Completed");
  const inProgressTasks = tasks.filter((task) => task?.status === "In Progress");
  const pendingTasks = tasks.filter((task) => task?.status === "Pending");
  const overdueTasks = tasks.filter((task) => {
    if (task?.status === "Overdue") return true;
    const due = parseDate(task?.dueDate);
    if (!due) return false;
    return due.getTime() < Date.now() && task?.status !== "Completed";
  });

  const totalTasks = tasks.length;
  const completionRate = totalTasks
    ? Math.round((completedTasks.length / totalTasks) * 100)
    : 0;

  const onTimeCompleted = completedTasks.filter((task) => {
    const due = parseDate(task?.dueDate);
    const completedAt =
      parseDate(task?.completedAt) ||
      parseDate(task?.updatedAt) ||
      parseDate(task?.createdAt);
    if (!due || !completedAt) return true;
    return completedAt.getTime() <= due.getTime();
  });

  const onTimeRate = completedTasks.length
    ? Math.round((onTimeCompleted.length / completedTasks.length) * 100)
    : 0;

  const avgCompletionTime = (() => {
    if (completedTasks.length === 0) return 0;
    const durations = completedTasks
      .map((task) => {
        const start = parseDate(task?.createdAt);
        const end =
          parseDate(task?.completedAt) ||
          parseDate(task?.updatedAt) ||
          parseDate(task?.dueDate);
        if (!start || !end) return null;
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter((val) => val !== null && Number.isFinite(val));

    if (durations.length === 0) return 0;
    const avg = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    return Number(avg.toFixed(1));
  })();

  const monthlyCompleted = completedTasks.reduce((acc, task) => {
    const date =
      parseDate(task?.completedAt) ||
      parseDate(task?.updatedAt) ||
      parseDate(task?.dueDate) ||
      parseDate(task?.createdAt);
    if (!date) return acc;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleString("en-US", { month: "short" });
    acc[key] = acc[key]
      ? { ...acc[key], completed: acc[key].completed + 1 }
      : { label, completed: 1 };
    return acc;
  }, {});

  const monthlyCompletedArray = Object.values(monthlyCompleted).slice(-6);

  const statusBreakdown = [
    { status: "Completed", count: completedTasks.length },
    { status: "Pending", count: pendingTasks.length },
    { status: "In Progress", count: inProgressTasks.length },
    { status: "Overdue", count: overdueTasks.length },
  ].filter((item) => item.count > 0);

  const tasksTable = tasks.map((task) => {
    const totalChecklist = Array.isArray(task?.todoChecklist)
      ? task.todoChecklist.length
      : 0;
    const completedChecklist = task?.completedTodoCount || 0;
    const baseProgress =
      totalChecklist > 0
        ? Math.round((completedChecklist / totalChecklist) * 100)
        : task?.status === "Completed"
        ? 100
        : task?.status === "In Progress"
        ? 50
        : 0;

    const dueDate =
      parseDate(task?.dueDate) ||
      parseDate(task?.expectedCompletionDate) ||
      parseDate(task?.createdAt);

    return {
      id: task._id || task.id,
      title: task.title || "Task",
      status: task.status || "N/A",
      dueDate,
      progress: Math.min(Math.max(baseProgress, 0), 100),
      owner: task.assignedToName || "",
    };
  });

  return {
    completionRate,
    onTimeRate,
    avgCompletionTime,
    overdueCount: overdueTasks.length,
    monthlyCompleted: monthlyCompletedArray,
    statusBreakdown,
    tasks: tasksTable,
  };
};

const formatDate = (date) => (date ? formatDateLabel(date, "—") : "—");

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const privilegedBasePath = useMemo(
    () => getPrivilegedBasePath(user?.role),
    [user?.role]
  );  

  const [userData, setUserData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskSummary, setTaskSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [clientSummary, setClientSummary] = useState({
    totalMatters: 0,
    totalCases: 0,
    activeCases: 0,
    amountDue: 0,
  });  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 9;

 const normalizedUserGender = useMemo(() => {
    if (typeof userData?.gender !== "string") {
      return "";
    }

    return userData.gender.trim().toLowerCase();
  }, [userData?.gender]);

  const normalizedProfileRole = useMemo(
    () => normalizeRole(userData?.role),
    [userData?.role]
  );
  const isClientProfile = normalizedProfileRole === "client";
  const backNavigationLabel = isClientProfile ? "Clients" : "Employees";

  const fetchUserDetails = useCallback(async () => {
    if (!userId) return;

      try {
        setIsLoading(true);
        const response = await axiosInstance.get(
          API_PATHS.USERS.GET_USER_BY_ID(userId)
        );

        const responseData = response?.data ?? {};
        const normalizedUser =
          responseData.user ||
          responseData.userData ||
          (responseData._id ? responseData : null);

      if (!normalizedUser) {
        throw new Error(
        responseData?.message || "We were unable to find this account."
        );
      }

      const userTasks = Array.isArray(responseData.tasks)
        ? responseData.tasks
        : Array.isArray(responseData.assignedTasks)
        ? responseData.assignedTasks
        : [];
      const summary = responseData.taskSummary || responseData.summary || {};

      setUserData(normalizedUser);
      setTasks(userTasks);
      setTaskSummary({
        total:
          typeof summary.total === "number"
            ? summary.total
            : userTasks.length,
        pending: summary?.pending ?? 0,
        inProgress: summary?.inProgress ?? 0,
        completed: summary?.completed ?? 0,
      });
      const clientSummaryData =
        (responseData.clientSummary && typeof responseData.clientSummary === "object"
          ? responseData.clientSummary
          : {}) || {};
      setClientSummary({
        totalMatters: clientSummaryData?.totalMatters ?? 0,
        totalCases: clientSummaryData?.totalCases ?? 0,
        activeCases: clientSummaryData?.activeCases ?? 0,
        amountDue: clientSummaryData?.amountDue ?? 0,
      });      
      setError("");
    } catch (requestError) {
      console.error("Failed to fetch user details", requestError);
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "We were unable to load this account. Please try again later.";
      setError(message);
      setUserData(null);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

    useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleBackToTeam = useCallback(() => {
    const hasHistory = window?.history?.state?.idx > 0;

    if (hasHistory) {
      navigate(-1);
      return;
    }

    const fallbackPath = isClientProfile ? "clients" : "employees";
    navigate(`${privilegedBasePath}/${fallbackPath}`, { replace: true });
  }, [isClientProfile, navigate, privilegedBasePath]);

  const handleTaskFormClose = () => {
    setIsTaskFormOpen(false);
    setSelectedTaskId(null);
  };

  const handleTaskMutationSuccess = () => {
    fetchUserDetails();
    handleTaskFormClose();
  };

  const handleOpenTaskDetails = (taskId) => {
    if (!taskId) return;
    navigate(`${privilegedBasePath}/tasks`, {
      state: { highlightTaskId: taskId, filterStatus: "All" },
    });
  };

  const formatCount = useCallback((value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "0";
    }
    return value.toLocaleString();
  }, []);

  const summaryItems = useMemo(() => {
    if (isClientProfile) {
      return [
        {
          label: "Total Matters",
          value: clientSummary.totalMatters,
          displayValue: formatCount(clientSummary.totalMatters),
          caption:
            clientSummary.totalMatters === 1 ? "Matter" : "Matters",
          gradient: "from-slate-600 via-slate-500 to-slate-400",
        },
        {
          label: "Total Cases",
          value: clientSummary.totalCases,
          displayValue: formatCount(clientSummary.totalCases),
          caption: clientSummary.totalCases === 1 ? "Case" : "Cases",
          gradient: "from-sky-500 via-cyan-500 to-blue-500",
        },
        {
          label: "Active Cases",
          value: clientSummary.activeCases,
          displayValue: formatCount(clientSummary.activeCases),
          caption: clientSummary.activeCases === 1 ? "Active Case" : "Active Cases",
          gradient: "from-emerald-500 via-green-500 to-lime-400",
        },
        {
          label: "Amount Due",
          value: clientSummary.amountDue,
          displayValue: formatCurrency(clientSummary.amountDue || 0),
          caption: "Outstanding",
          gradient: "from-amber-500 via-orange-400 to-yellow-400",
        },
      ];
    }

    return [
      {
        label: "Total Tasks",
        value: taskSummary.total,
        displayValue: formatCount(taskSummary.total),
        caption: taskSummary.total === 1 ? "Task" : "Tasks",
        gradient: "from-slate-600 via-slate-500 to-slate-400",
      },
      {
        label: "Pending",
        value: taskSummary.pending,
        displayValue: formatCount(taskSummary.pending),
        caption: taskSummary.pending === 1 ? "Task" : "Tasks",
        gradient: "from-amber-500 via-orange-400 to-yellow-400",
      },
      {
        label: "In Progress",
        value: taskSummary.inProgress,
        displayValue: formatCount(taskSummary.inProgress),
        caption: taskSummary.inProgress === 1 ? "Task" : "Tasks",
        gradient: "from-sky-500 via-cyan-500 to-blue-500",
      },
      {
        label: "Completed",
        value: taskSummary.completed,
        displayValue: formatCount(taskSummary.completed),
        caption: taskSummary.completed === 1 ? "Task" : "Tasks",
        gradient: "from-emerald-500 via-green-500 to-lime-400",
      },
    ];
  }, [
    clientSummary.activeCases,
    clientSummary.amountDue,
    clientSummary.totalCases,
    clientSummary.totalMatters,
    formatCount,
    isClientProfile,
    taskSummary.completed,
    taskSummary.inProgress,
    taskSummary.pending,
    taskSummary.total,
  ]);

  const kpiData = useMemo(() => computeKpiFromTasks(tasks), [tasks]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(tasks.length / PAGE_SIZE)),
    [tasks.length]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [tasks]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return tasks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, tasks]);

  const pageStart = tasks.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = tasks.length
    ? Math.min(currentPage * PAGE_SIZE, tasks.length)
    : 0;

  const handlePageChange = (page) => {
    setCurrentPage((previous) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);
      return nextPage === previous ? previous : nextPage;
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-24">
          <LuLoader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-center">
          <h3 className="text-lg font-semibold text-rose-600">{error}</h3>
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(244,63,94,0.35)] transition hover:bg-rose-600"
            onClick={handleBackToTeam}
          >
            <LuArrowLeft className="text-base" /> Back to {backNavigationLabel}
          </button>
        </div>
      );
    }

    if (!userData) {
      return null;
    }

    return (
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-primary via-indigo-500 to-purple-500 px-4 py-7 text-white shadow-[0_20px_45px_rgba(126,58,242,0.28)] dark:border-white/10 dark:from-slate-900 dark:via-indigo-900 dark:to-slate-900 dark:shadow-[0_20px_45px_rgba(15,23,42,0.7)] sm:px-6 sm:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_65%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.16),_transparent_60%)] dark:bg-[radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.2),transparent_60%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              {userData?.profileImageUrl ? (
                <img
                  src={userData.profileImageUrl}
                  alt={userData.name}
                  className="h-16 w-16 rounded-2xl border-4 border-white object-cover shadow-[0_14px_32px_rgba(79,70,229,0.3)] dark:border-slate-900"
                />
              ) : (
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-white/20 shadow-[0_14px_32px_rgba(79,70,229,0.3)] dark:border-slate-900 dark:bg-white/10 ${
                    normalizedUserGender === "female"
                      ? "text-rose-100"
                      : normalizedUserGender === "male"
                      ? "text-primary"
                      : "text-white"
                  }`}
                >
                  <FaUser className="h-7 w-7" />
                </span>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.42em] text-white/70">Account Overview</p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
                  {userData?.name}
                </h2>
                <p className="mt-2 text-sm text-white/80">{userData?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-white/80 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">Office</p>
                <p className="mt-1 text-sm font-medium text-white">{userData?.officeLocation || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">Gender</p>
                <p className="mt-1 text-sm font-medium text-white">{userData?.gender || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">Joined</p>
                <p className="mt-1 text-sm font-medium text-white">{formatDate(userData?.createdAt)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className={`relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-slate-950/50`}
            >
              <span className={`absolute inset-0 -z-10 bg-gradient-to-br ${item.gradient} opacity-10`} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {item.displayValue ?? formatCount(item.value)}
              </p>
             {item.caption ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  {item.caption}
                </p>
              ) : null}              
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-slate-950/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">KPI Performance</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Completion, delivery, and task health for this account.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Completion Rate", value: `${kpiData.completionRate}%` },
              { label: "On-Time Rate", value: `${kpiData.onTimeRate}%` },
              { label: "Avg Completion", value: `${kpiData.avgCompletionTime} days` },
              { label: "Overdue", value: kpiData.overdueCount },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 px-4 py-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Monthly Completed Tasks</p>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Last months
                </span>
              </div>
              <div className="mt-3 h-64">
                {kpiData.monthlyCompleted.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-300">
                    No completion data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kpiData.monthlyCompleted}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "#475569" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#475569" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 30px rgba(15,23,42,0.1)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        formatter={(value) => [`${value} tasks`, "Completed"]}
                      />
                      <Bar
                        dataKey="completed"
                        fill="#6366F1"
                        radius={[12, 12, 6, 6]}
                        maxBarSize={42}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm overflow-hidden dark:border-slate-800/70 dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Task Status</p>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Snapshot
                </span>
              </div>
              <div className="mt-3 h-56">
                {kpiData.statusBreakdown.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-300">
                    No task status data yet.
                  </div>
                ) : (
                  <CustomPieChart
                    data={kpiData.statusBreakdown}
                    colors={["#6366F1", "#0EA5E9", "#F59E0B", "#EF4444"]}
                    height={220}
                    outerRadius="80%"
                    innerRadius="59%"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-slate-950/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Assigned Tasks</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Every task shared with {userData?.name?.split(" ")[0] || "this account"}.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
              {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-sm text-slate-500 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300">
              No tasks have been assigned to this account yet.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600 dark:divide-slate-800 dark:text-slate-300">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                    <th scope="col" className="px-4 py-3">S.No.</th>
                    <th scope="col" className="px-4 py-3">Task</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Priority</th>
                    <th scope="col" className="px-4 py-3">Due Date</th>
                    <th scope="col" className="px-4 py-3">Checklist</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {paginatedTasks.map((task, index) => (
                    <tr key={task._id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="max-w-[220px] px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900 line-clamp-2 dark:text-slate-100">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{task.description}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                            statusBadgeStyles[task.status] ||
                            "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{formatDate(task.dueDate)}</td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {task.completedTodoCount || 0} / {task.todoChecklist?.length || 0}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenTaskDetails(task._id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20"
                        >
                          View <LuExternalLink className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tasks.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Showing {pageStart} – {pageEnd} of {tasks.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:bg-slate-800 dark:hover:text-indigo-200 dark:disabled:border-slate-800 dark:disabled:bg-slate-900/40 dark:disabled:text-slate-500"
                >
                  Prev
                </button>
                <div className="inline-flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, pageIndex) => {
                    const pageNumber = pageIndex + 1;
                    const isActive = pageNumber === currentPage;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => handlePageChange(pageNumber)}
                        className={`h-8 w-8 rounded-full text-xs font-semibold transition ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/40"
                            : "border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:bg-slate-800 dark:hover:text-indigo-200"
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
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:bg-slate-800 dark:hover:text-indigo-200 dark:disabled:border-slate-800 dark:disabled:bg-slate-900/40 dark:disabled:text-slate-500"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <DashboardLayout activeMenu={backNavigationLabel}>
      <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
        <button
          type="button"
          onClick={handleBackToTeam}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <LuArrowLeft className="text-base" /> Back to {backNavigationLabel}
        </button>
        {userData?.name && (
          <span className="text-xs font-semibold uppercase tracking-[0.42em] text-slate-400 dark:text-slate-500">
            {userData.name}
          </span>
        )}
      </div>

      <div className="mt-6">{renderContent()}</div>

      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={handleTaskFormClose}
        taskId={selectedTaskId}
        onSuccess={handleTaskMutationSuccess}
      />      
    </DashboardLayout>
  );
};

export default UserDetails;
