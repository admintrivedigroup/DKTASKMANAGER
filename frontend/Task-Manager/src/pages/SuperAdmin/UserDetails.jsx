import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDateLabel } from "../../utils/dateUtils.js";
import { LuArrowLeft, LuExternalLink, LuLoader } from "react-icons/lu";
import { FaUser } from "react-icons/fa6";

import DashboardLayout from "../../components/layouts/DashboardLayout.jsx";
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../utils/apiPaths.js";
import { UserContext } from "../../context/userContext.jsx";
import { getPrivilegedBasePath, normalizeRole } from "../../utils/roleUtils.js";
import TaskFormModal from "../../components/TaskFormModal.jsx";
import { formatCurrency } from "../../utils/invoiceUtils.js";

const statusBadgeStyles = {
  Pending: "bg-amber-100 text-amber-600 border-amber-200",
  "In Progress": "bg-sky-100 text-sky-600 border-sky-200",
  Completed: "bg-emerald-100 text-emerald-600 border-emerald-200",
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
        <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-primary via-indigo-500 to-purple-500 px-4 py-7 text-white shadow-[0_20px_45px_rgba(126,58,242,0.28)] sm:px-6 sm:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.16),_transparent_60%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              {userData?.profileImageUrl ? (
                <img
                  src={userData.profileImageUrl}
                  alt={userData.name}
                  className="h-16 w-16 rounded-2xl border-4 border-white object-cover shadow-[0_14px_32px_rgba(79,70,229,0.3)]"
                />
              ) : (
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-white/20 shadow-[0_14px_32px_rgba(79,70,229,0.3)] ${
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
              className={`relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]`}
            >
              <span className={`absolute inset-0 -z-10 bg-gradient-to-br ${item.gradient} opacity-10`} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {item.displayValue ?? formatCount(item.value)}
              </p>
              {item.caption ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                  {item.caption}
                </p>
              ) : null}              
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Assigned Tasks</h3>
              <p className="mt-1 text-sm text-slate-500">
                Every task shared with {userData?.name?.split(" ")[0] || "this account"}.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
              {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-sm text-slate-500">
              No tasks have been assigned to this account yet.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    <th scope="col" className="px-4 py-3">Task</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Priority</th>
                    <th scope="col" className="px-4 py-3">Due Date</th>
                    <th scope="col" className="px-4 py-3">Checklist</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <tr key={task._id} className="transition hover:bg-slate-50/60">
                      <td className="max-w-[220px] px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900 line-clamp-2">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                            statusBadgeStyles[task.status] || "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700">{formatDate(task.dueDate)}</td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700">
                        {task.completedTodoCount || 0} / {task.todoChecklist?.length || 0}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenTaskDetails(task._id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700"
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
        </section>
      </div>
    );
  };

  return (
    <DashboardLayout activeMenu={backNavigationLabel}>
      <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
        <button
          type="button"
          onClick={handleBackToTeam}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <LuArrowLeft className="text-base" /> Back to {backNavigationLabel}
        </button>
        {userData?.name && (
          <span className="text-xs font-semibold uppercase tracking-[0.42em] text-slate-400">
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
