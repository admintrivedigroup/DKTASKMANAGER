import React, { useContext, useMemo } from "react";
import { FaUser } from "react-icons/fa6";
import {
  LuClock3,
  LuKeyRound,
  LuPencil,
  LuLoader,
  LuMail,
  LuMapPin,
  LuShieldCheck,
  LuTrash2,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext.jsx";
import {
  getRoleLabel,
  normalizeRole,
  resolvePrivilegedPath,
} from "../../utils/roleUtils";

const ROLE_BADGE_STYLES = {
  super_admin:
    "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-100 dark:ring-rose-400/40",
  admin:
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/40",
  member:
    "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-100 dark:ring-indigo-400/40",
  default:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700",
};

const STATUS_STYLES = {
  Pending: {
    icon: LuClock3,
    badge:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/40",
  },
  "In Progress": {
    icon: LuLoader,
    badge:
      "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/40",
  },
  Completed: {
    icon: LuShieldCheck,
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-400/40",
  },
  default: {
    icon: LuClock3,
    badge:
      "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  },
};

const UserCard = ({ userInfo, onDelete, onResetPassword, onEdit }) => {
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
  const roleBadgeTone =
    ROLE_BADGE_STYLES[normalizedRole] || ROLE_BADGE_STYLES.default;

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

  const avatarAccentClass =
    normalizedGender === "female"
      ? "bg-rose-50 text-rose-500 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-100 dark:ring-rose-400/40"
      : normalizedGender === "male"
      ? "bg-indigo-50 text-indigo-500 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-100 dark:ring-indigo-400/40"
      : "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700";

  return (
    <div className="user-card h-full">
      <div
        className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none dark:focus-visible:ring-indigo-500/70 dark:focus-visible:ring-offset-slate-900"
        role="button"
        tabIndex={0}
        onClick={handleNavigateToDetails}
        onKeyDown={handleKeyDown}
      >
        <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,rgba(99,102,241,0.08),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(14,165,233,0.08),transparent_32%)] dark:opacity-70" />

        <div className="relative flex items-start gap-3">
          <div className="relative">
            {userInfo?.profileImageUrl ? (
              <img
                src={userInfo?.profileImageUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-sm dark:ring-slate-800"
              />
            ) : (
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full ring-4 ring-white shadow-sm ${avatarAccentClass}`}
              >
                <FaUser className="text-xl" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {userInfo?.name || "Unknown user"}
              </p>
              {showRoleBadge && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ring-inset ${roleBadgeTone}`}
                >
                  <LuShieldCheck className="text-xs" />
                  {roleLabel}
                </span>
              )}
            </div>
            {userInfo?.email && (
              <p className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                <LuMail className="text-base text-slate-400 dark:text-slate-400" />
                <span className="truncate">{userInfo.email}</span>
              </p>
            )}
            {userInfo?.officeLocation && (
              <p className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                <LuMapPin className="text-base text-slate-400 dark:text-slate-400" />
                <span className="truncate">{userInfo.officeLocation}</span>
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-4 flex flex-1 flex-col gap-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-[inset_0_1px_0_rgba(15,23,42,0.6)]">
            <div className="grid grid-cols-3 gap-3">
              {stats.map((item) => {
                const meta = STATUS_STYLES[item.label] || STATUS_STYLES.default;
                const Icon = meta.icon;
                return (
                  <div
                    key={item.label}
                    className="flex flex-col gap-1.5 rounded-lg bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:bg-slate-800/70 dark:shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset ${meta.badge}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-50">
                        {item.count}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(typeof onDelete === "function" ||
            typeof onResetPassword === "function" ||
            typeof onEdit === "function") && (
            <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              {typeof onEdit === "function" && (
                <button
                  type="button"
                  onClick={(event) => handleActionClick(event, onEdit)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-auto"
                >
                  <LuPencil className="text-base" />
                  Edit
                </button>
              )}
              {typeof onResetPassword === "function" && (
                <button
                  type="button"
                  onClick={(event) => handleActionClick(event, onResetPassword)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-900/40 sm:w-auto"
                >
                  <LuKeyRound className="text-base" />
                  Change Password
                </button>
              )}
              {typeof onDelete === "function" && (
                <button
                  type="button"
                  onClick={(event) => handleActionClick(event, onDelete)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100 dark:hover:border-rose-400 dark:hover:bg-rose-500/25 dark:hover:text-rose-50 dark:focus:ring-rose-900/40 sm:w-auto"
                >
                  <LuTrash2 className="text-base" />
                  Delete User
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
