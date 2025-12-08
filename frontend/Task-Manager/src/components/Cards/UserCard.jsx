import React, { useContext, useMemo } from "react";
import { FaUser } from "react-icons/fa6";
import { LuTrash2 } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext.jsx";
import {
  getRoleLabel,
  normalizeRole,
  resolvePrivilegedPath,
} from "../../utils/roleUtils";

const UserCard = ({ userInfo, onDelete, onResetPassword }) => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const normalizedGender = useMemo(() => {
    if (typeof userInfo?.gender !== "string") {
      return "";
    }

    return userInfo.gender.trim().toLowerCase();
  }, [userInfo?.gender]);

  const normalizedRole = useMemo(
    () => normalizeRole(userInfo?.role),
    [userInfo?.role],
  );
  const roleLabel = useMemo(
    () => getRoleLabel(normalizedRole),
    [normalizedRole],
  );
  const showRoleBadge = Boolean(roleLabel);

  const stats = useMemo(() => {
    if (normalizedRole === "client") {
      const pendingTasks = userInfo?.pendingTasks ?? 0;
      const totalMatters = userInfo?.totalMatters ?? 0;
      const completedCases = userInfo?.closedMatters ?? 0;

      return [
        {
          label: "Pending Tasks",
          count: pendingTasks,
          unit: pendingTasks === 1 ? "Task" : "Tasks",
        },
        {
          label: "Total Matters",
          count: totalMatters,
          unit: totalMatters === 1 ? "Matter" : "Matters",
        },
        {
          label: "Completed Cases",
          count: completedCases,
          unit: completedCases === 1 ? "Case" : "Cases",
        },
      ];
    }

    const pendingTasks = userInfo?.pendingTasks ?? 0;
    const inProgressTasks = userInfo?.inProgressTasks ?? 0;
    const completedTasks = userInfo?.completedTasks ?? 0;

    return [
      {
        label: "Pending",
        count: pendingTasks,
        unit: pendingTasks === 1 ? "Task" : "Tasks",
      },
      {
        label: "In Progress",
        count: inProgressTasks,
        unit: inProgressTasks === 1 ? "Task" : "Tasks",
      },
      {
        label: "Completed",
        count: completedTasks,
        unit: completedTasks === 1 ? "Task" : "Tasks",
      },
    ];
  }, [
    normalizedRole,
    userInfo?.pendingTasks,
    userInfo?.inProgressTasks,
    userInfo?.completedTasks,
    userInfo?.totalMatters,
    userInfo?.closedMatters,
  ]);

  const handleNavigateToDetails = () => {
    if (userInfo?._id) {
      const destination = resolvePrivilegedPath(
        `/admin/users/${userInfo._id}`,
        user?.role,
      );
      navigate(destination);
    }
  };

  const handleKeyDown = (event) => {
    if (!userInfo?._id) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNavigateToDetails();
    }
  };

  const handleActionClick = (event, callback) => {
    event.stopPropagation();
    if (typeof callback === "function") {
      callback();
    }
  };

  return (
    <div className="user-card">
      <div
        className="relative cursor-pointer overflow-hidden rounded-[26px] border border-white/50 bg-white/70 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(79,70,229,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-800/70 dark:bg-slate-900/75 dark:shadow-slate-950/50 dark:focus-visible:ring-offset-slate-900"
        role="button"
        tabIndex={0}
        onClick={handleNavigateToDetails}
        onKeyDown={handleKeyDown}
      >
        <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.18),_transparent_60%)] dark:opacity-70" />
        <span className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_60%)] dark:opacity-60" />

        <div className="relative flex items-center gap-4">
          {userInfo?.profileImageUrl ? (
            <img
              src={userInfo?.profileImageUrl}
              alt="Avatar"
              className="h-14 w-14 rounded-2xl border-4 border-white object-cover shadow-[0_12px_24px_rgba(79,70,229,0.25)] dark:border-slate-800"
            />
          ) : (
            <FaUser
              className={`h-14 w-14 rounded-2xl border-4 border-white object-cover p-3 ${
                normalizedGender === "female"
                  ? "text-rose-300 shadow-[0_12px_24px_rgba(244,114,182,0.25)]"
                  : normalizedGender === "male"
                  ? "text-primary shadow-[0_12px_24px_rgba(79,70,229,0.25)]"
                  : "text-indigo-300 shadow-[0_12px_24px_rgba(79,70,229,0.18)]"
              } dark:border-slate-800`}
            />
          )}

          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {userInfo?.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {userInfo?.email}
            </p>
            {showRoleBadge && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-100">
                {roleLabel}
              </span>
            )}
            {userInfo?.officeLocation && (
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {userInfo.officeLocation}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/40 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-slate-800/60 dark:bg-slate-900/60 dark:shadow-slate-950/40">
          <div className="grid grid-cols-3 divide-x divide-white/50 dark:divide-slate-800/70">
            {stats.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 py-4 text-center"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
                  {item.label}
                </span>
                <span className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {item.count}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                  {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {(typeof onDelete === "function" || typeof onResetPassword === "function") && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {typeof onResetPassword === "function" && (
              <button
                type="button"
                onClick={(event) => handleActionClick(event, onResetPassword)}
                className="mx-auto flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/25 dark:hover:text-indigo-50"
              >
                Change Password
              </button>
            )}
            {typeof onDelete === "function" && (
              <button
                type="button"
                onClick={(event) => handleActionClick(event, onDelete)}
                className="mx-auto flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-500 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100 dark:hover:border-rose-400 dark:hover:bg-rose-500/25 dark:hover:text-rose-50"
              >
                <LuTrash2 className="text-base" /> Delete User
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;
