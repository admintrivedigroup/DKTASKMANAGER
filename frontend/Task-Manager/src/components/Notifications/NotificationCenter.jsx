import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LuBell,
  LuSquareCheck,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleX,
  LuInfo,
  LuLoader,
  LuRefreshCcw,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatMediumDateTime, formatRelativeTimeFromNow } from "../../utils/dateUtils";
import LoadingOverlay from "../../components/LoadingOverlay";
import { UserContext } from "../../context/userContext.jsx";
import { getRoleLabel } from "../../utils/roleUtils";
import { useUserAuth } from "../../hooks/useUserAuth.jsx";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 10;

const STATUS_VARIANTS = {
  info: {
    icon: LuInfo,
    badgeClass:
      "inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600",
  },
  warning: {
    icon: LuCircleAlert,
    badgeClass:
      "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-600",
  },
  success: {
    icon: LuCircleCheck,
    badgeClass:
      "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600",
  },
  danger: {
    icon: LuCircleX,
    badgeClass:
      "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-600",
  },
};

const parseNotificationDate = (notification) => {
  if (!notification?.date) {
    return 0;
  }

  const timestamp = Date.parse(notification.date);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getNotificationIndicator = (notification) => {
  if (!notification) {
    return "★";
  }

  if (notification.action === "created") {
    return "+";
  }

  if (notification.action === "updated") {
    return "↻";
  }

  if (notification.action === "deleted") {
    return "−";
  }

  if (notification.type === "task_due_soon") {
    return "!";
  }

  if (notification.type === "task_completed") {
    return "✓";
  }

  return "★";
};

const getActionLabel = (notification) => {
  if (!notification?.action || typeof notification.action !== "string") {
    return "";
  }

  return notification.action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getMeaningfulDetails = (details) => {
  if (!Array.isArray(details)) {
    return [];
  }

  return details
    .filter((detail) => detail)
    .map((detail) => {
      const beforeValue =
        typeof detail.before === "string" ? detail.before.trim() : "";
      const afterValue =
        typeof detail.after === "string" ? detail.after.trim() : "";

      if (!beforeValue && !afterValue) {
        return null;
      }

      return {
        field: detail.field,
        label: detail.label,
        before: beforeValue,
        after: afterValue,
      };
    })
    .filter(Boolean);
};

const getNotificationId = (notification) =>
  notification?.notificationId || notification?._id || "";

const NotificationCenter = () => {
  useUserAuth();

  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const storageKey = user ? `notifications:lastSeen:${user._id}` : null;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState([]);

  const fetchNotifications = useCallback(
    async (showInlineSpinner = false) => {
      if (!user) {
        return;
      }

      setError("");

      if (showInlineSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await axiosInstance.get(
          API_PATHS.TASKS.GET_NOTIFICATIONS
        );
        const fetchedNotifications = response.data?.notifications || [];
        setNotifications(fetchedNotifications);
        setCurrentPage(1);
      } catch (err) {
        setError("We couldn't load your notifications. Please try again.");
        console.error("Failed to fetch notifications", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchNotifications(false);
  }, [fetchNotifications, user]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) {
      return;
    }

    const newestTimestamp = notifications.reduce((latest, notification) => {
      const timestamp = parseNotificationDate(notification);
      return timestamp > latest ? timestamp : latest;
    }, 0);

    const timestampToPersist = newestTimestamp || Date.now();

    window.localStorage.setItem(
      storageKey,
      new Date(timestampToPersist).toISOString()
    );
  }, [notifications, storageKey]);

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil((notifications.length || 0) / ITEMS_PER_PAGE)
    );

    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, notifications.length]);

  useEffect(() => {
    setSelectedNotificationIds((previous) =>
      previous.filter((id) =>
        notifications.some(
          (notification) => getNotificationId(notification) === id
        )
      )
    );
  }, [notifications]);

  const totalNotifications = notifications.length;
  const totalPages = Math.max(
    1,
    Math.ceil((totalNotifications || 0) / ITEMS_PER_PAGE)
  );

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return notifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, notifications]);

  const currentPageNotificationIds = useMemo(
    () =>
      paginatedNotifications
        .map((notification) => getNotificationId(notification))
        .filter(Boolean),
    [paginatedNotifications]
  );

  const hasDeletableNotifications = useMemo(
    () => notifications.some((notification) => getNotificationId(notification)),
    [notifications]
  );

  const allCurrentPageSelected =
    selectionMode &&
    currentPageNotificationIds.length > 0 &&
    currentPageNotificationIds.every((id) =>
      selectedNotificationIds.includes(id)
    );

  const selectedCount = selectedNotificationIds.length;

  const handleToggleSelectionMode = () => {
    setSelectionMode((previous) => {
      if (previous) {
        setSelectedNotificationIds([]);
      }
      return !previous;
    });
  };

  const handleToggleNotification = (notificationId) => {
    if (!notificationId) {
      return;
    }

    setSelectedNotificationIds((previous) =>
      previous.includes(notificationId)
        ? previous.filter((id) => id !== notificationId)
        : [...previous, notificationId]
    );
  };

  const handleToggleSelectAll = () => {
    if (currentPageNotificationIds.length === 0) {
      return;
    }

    setSelectedNotificationIds((previous) => {
      if (allCurrentPageSelected) {
        return previous.filter(
          (id) => !currentPageNotificationIds.includes(id)
        );
      }

      const next = new Set(previous);
      currentPageNotificationIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleDeleteSelected = async () => {
    if (!selectedNotificationIds.length) {
      return;
    }

    const confirmationMessage =
      selectedNotificationIds.length === 1
        ? "Are you sure you want to delete this notification?"
        : `Are you sure you want to delete ${selectedNotificationIds.length} notifications?`;
    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) {
      return;
    }

    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE_NOTIFICATIONS, {
        data: { notificationIds: selectedNotificationIds },
      });

      setNotifications((previous) =>
        previous.filter(
          (notification) =>
            !selectedNotificationIds.includes(getNotificationId(notification))
        )
      );
      setSelectedNotificationIds([]);
    } catch (err) {
      console.error("Failed to delete notifications", err);
      window.alert(
        "We couldn't delete the selected notifications. Please try again."
      );
    }
  };

  const renderStatusBadge = (notification) => {
    const statusKey = notification?.status || "info";
    const variant = STATUS_VARIANTS[statusKey] || STATUS_VARIANTS.info;
    const Icon = variant.icon || LuInfo;

    return (
      <span className={variant.badgeClass}>
        <Icon className="h-3.5 w-3.5" />
        <span className="uppercase tracking-[0.16em]">
          {statusKey.replace(/_/g, " ")}
        </span>
      </span>
    );
  };

  const resolveNotificationRedirect = (notification) => {
    if (notification?.meta?.redirectUrl) {
      return notification.meta.redirectUrl;
    }

    if (notification?.taskId) {
      return `/tasks/${notification.taskId}?tab=channel`;
    }

    return "";
  };

  return (
    <DashboardLayout activeMenu="Notifications">
      <section className="rounded-[32px] border border-white/60 bg-gradient-to-br from-indigo-600 via-primary to-sky-500 px-5 py-8 text-white shadow-[0_24px_52px_rgba(79,70,229,0.35)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.48em] text-white/60">
              Activity Feed
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Notifications Center
            </h1>
            <p className="text-sm text-white/80">
              Review every update across your matters, tasks, and shared workspaces.
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/40 bg-white/20 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
            <LuBell className="text-3xl" />
          </div>
        </div>
      </section>

      <div className="mt-3 rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[0_24px_52px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent notifications
            </h2>
            <p className="text-sm text-slate-500">
              Showing {paginatedNotifications.length} of {totalNotifications} total updates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectionMode}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
              disabled={
                loading || totalNotifications === 0 || !hasDeletableNotifications
              }
              aria-pressed={selectionMode}
            >
              {selectionMode ? (
                <>
                  <LuX className="h-4 w-4" />
                  Cancel selection
                </>
              ) : (
                <>
                  <LuSquareCheck className="h-4 w-4" />
                  Select
                </>
              )}
            </button>
            {selectionMode && selectedCount > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
              >
                <LuTrash2 className="h-4 w-4" />
                Delete selected ({selectedCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchNotifications(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <LuLoader className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <LuRefreshCcw className="h-4 w-4" />
                  Refresh list
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingOverlay
            message="Loading notifications..."
            className="py-20"
          />
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-dashed border-rose-200 bg-rose-50/80 px-6 py-10 text-center text-sm text-rose-600">
            {error}
          </div>
        ) : totalNotifications === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
            You're all caught up! New notifications will appear here as soon as they're available.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/60 bg-white">
            <div className="max-h-[600px] overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    {selectionMode && (
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                          checked={allCurrentPageSelected}
                          onChange={handleToggleSelectAll}
                          aria-label="Select all notifications on this page"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      S.No.
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Update
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Actor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedNotifications.map((notification, index) => {
                    const serialNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    const indicator = getNotificationIndicator(notification);
                    const actionLabel = getActionLabel(notification);
                    const notificationId = getNotificationId(notification);
                    const isSelected =
                      selectionMode &&
                      notificationId &&
                      selectedNotificationIds.includes(notificationId);
                    const actorRoleLabel = notification.actor?.role
                      ? getRoleLabel(notification.actor.role) ||
                        notification.actor.role.replace(/_/g, " ")
                      : "";
                    const details = getMeaningfulDetails(notification.details);

                    return (
                      <tr key={notification.id || notification._id} className="align-top">
                        {selectionMode && (
                          <td className="px-6 py-5 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                              checked={Boolean(isSelected)}
                              onChange={() => handleToggleNotification(notificationId)}
                              disabled={!notificationId}
                              aria-label={`Select notification ${serialNumber}`}
                            />
                          </td>
                        )}
                        <td className="px-6 py-5 text-sm font-semibold text-slate-900">
                          {serialNumber}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                              {indicator}
                            </span>
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {notification.title}
                                </p>
                                {actionLabel ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    {actionLabel}
                                  </span>
                                ) : null}
                              </div>
                              {notification.message ? (
                                <p className="text-xs text-slate-500">
                                  {notification.message}
                                </p>
                              ) : null}
                              {(() => {
                                const redirectUrl = resolveNotificationRedirect(
                                  notification
                                );
                                if (!redirectUrl) {
                                  return null;
                                }

                                return (
                                  <button
                                    type="button"
                                    onClick={() => navigate(redirectUrl)}
                                    className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-700 transition hover:-translate-y-0.5 hover:border-indigo-300"
                                  >
                                    Open Channel
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {details.length > 0 ? (
                            <ul className="space-y-1 text-xs text-slate-500">
                              {details.map((detail) => (
                                <li key={`${notification.id || notification._id}-${detail.field}-${detail.after}`}>
                                  <span className="font-medium text-slate-600">
                                    {detail.label || detail.field}
                                  </span>
                                  <span className="ml-2 text-slate-400">→</span>
                                  {detail.after ? (
                                    <span className="ml-2 text-slate-600">
                                      {detail.after}
                                    </span>
                                  ) : (
                                    <span className="ml-2 text-slate-400">—</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-slate-400">No additional details</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-600">
                          {notification.actor?.name ? (
                            <div className="space-y-1">
                              <p className="font-medium text-slate-700">
                                {notification.actor.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {[actorRoleLabel, notification.actor.email]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">System</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-600">
                          {renderStatusBadge(notification)}
                        </td>
                        <td className="px-6 py-5 text-xs text-slate-500">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-600">
                              {formatMediumDateTime(notification.date, "")}
                            </p>
                            <p className="uppercase tracking-[0.2em] text-slate-400">
                              {formatRelativeTimeFromNow(notification.date)}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const pageNumber = index + 1;
                  const isActive = pageNumber === currentPage;

                  return (
                    <button
                      key={`page_${pageNumber}`}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? "bg-primary text-white shadow"
                          : "border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationCenter;
