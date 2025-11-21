import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { LuBell, LuLoader } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/userContext.jsx";
import { getRoleLabel, hasPrivilegedAccess } from "../../utils/roleUtils";
import PublishNoticeModal from "./PublishNoticeModal.jsx";
import { formatRelativeTimeFromNow } from "../../utils/dateUtils";

const STATUS_STYLES = {
  info: "bg-blue-50 text-blue-600",
  warning: "bg-amber-50 text-amber-600",
  success: "bg-emerald-50 text-emerald-600",
  danger: "bg-rose-50 text-rose-600",
};

const parseNotificationDate = (notification) => {
  if (!notification?.date) {
    return 0;
  }

  const timestamp = Date.parse(notification.date);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const NotificationBell = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate(); 
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [badgeCount, setBadgeCount] = useState(0);
  const [lastSeenReady, setLastSeenReady] = useState(false);
  const dropdownRef = useRef(null);
  const lastSeenRef = useRef(null);
  const storageKey = user ? `notifications:lastSeen:${user._id}` : null;
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const isPrivilegedUser = hasPrivilegedAccess(user?.role);

  useEffect(() => {
    if (!user) {
      lastSeenRef.current = null;
      setLastSeenReady(false);
      setNotifications([]);
      setBadgeCount(0);
      return;
    }

    setLastSeenReady(false);
    lastSeenRef.current = null;

    if (typeof window !== "undefined" && storageKey) {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue) {
        const parsed = Date.parse(storedValue);
        if (!Number.isNaN(parsed)) {
          lastSeenRef.current = parsed;
        }
      }
    }
    
    setLastSeenReady(true);
  }, [storageKey, user]);

  const fetchNotifications = useCallback(
    async (shouldUpdateBadge = true) => {
      if (!user || !lastSeenReady) return;

      try {
        setLoading(true);
        const response = await axiosInstance.get(
          API_PATHS.TASKS.GET_NOTIFICATIONS
        );
        const fetchedNotifications = response.data?.notifications || [];
        setNotifications(fetchedNotifications);
        if (shouldUpdateBadge) {
          if (!lastSeenRef.current) {
            setBadgeCount(fetchedNotifications.length);
          } else {
            const unreadCount = fetchedNotifications.filter((notification) => {
              const timestamp = parseNotificationDate(notification);
              return timestamp > lastSeenRef.current;
            }).length;
            setBadgeCount(unreadCount);
          }
        }
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      } finally {
        setLoading(false);
      }
    },
    [lastSeenReady, user]
  );

  useEffect(() => {
    if (!user || !lastSeenReady) {
      return;
    }

    fetchNotifications();
  }, [fetchNotifications, lastSeenReady, user]);

  useEffect(() => {
    if (!isPrivilegedUser || !user || !lastSeenReady) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [fetchNotifications, isPrivilegedUser, lastSeenReady, user]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleDropdown = () => {
    if (!open) {
      fetchNotifications(false);
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    setBadgeCount(0);

    const newestTimestamp = notifications.reduce((latest, notification) => {
      const timestamp = parseNotificationDate(notification);
      return timestamp > latest ? timestamp : latest;
    }, 0);

    const nextLastSeen = newestTimestamp || Date.now();
    lastSeenRef.current = nextLastSeen;

    if (typeof window !== "undefined" && storageKey) {
      window.localStorage.setItem(
        storageKey,
        new Date(nextLastSeen).toISOString()
      );
    }
  }, [notifications, open, storageKey]);
  
  const hasNotifications = notifications.length > 0;
  const showBadge = badgeCount > 0;
  const displayBadgeValue = badgeCount > 9 ? "9+" : badgeCount;
  const visibleNotifications = notifications.slice(0, 5);

  const markNotificationsAsSeen = useCallback(() => {
    const now = Date.now();
    lastSeenRef.current = now;
    if (typeof window !== "undefined" && storageKey) {
      window.localStorage.setItem(storageKey, new Date(now).toISOString());
    }
    setBadgeCount(0);
  }, [storageKey]);

  const handleOpenNotificationCenter = () => {
    markNotificationsAsSeen();
    setOpen(false);
    navigate("/notifications");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:text-primary"
      >
        <LuBell className="text-xl" />
        {showBadge && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {displayBadgeValue}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-panel absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {isPrivilegedUser && (
                <button
                  type="button"
                  onClick={() => {
                    setNoticeModalOpen(true);
                    setOpen(false);
                  }}
                                    className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary transition hover:bg-primary/20"
                >
                  Notice
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenNotificationCenter}
                className="text-xs font-medium text-primary transition hover:text-primary/80"
              >
                See all
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                <LuLoader className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : hasNotifications ? (
              visibleNotifications.map((notification) => {
                const statusClass =
                  STATUS_STYLES[notification.status] || STATUS_STYLES.info;
                let indicator = "★";
                if (notification.action === "created") {
                  indicator = "+";
                } else if (notification.action === "updated") {
                  indicator = "↻";
                } else if (notification.action === "deleted") {
                  indicator = "−";
                } else if (notification.type === "task_due_soon") {
                  indicator = "!";
                } else if (notification.type === "task_completed") {
                  indicator = "✓";
                }

                const actionLabel =
                  typeof notification.action === "string" && notification.action
                    ? notification.action
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase())
                    : "";
                const actorRoleLabel = notification.actor?.role
                  ? getRoleLabel(notification.actor.role) ||
                    notification.actor.role.replace(/_/g, " ")
                  : "";
                const changeDetails = Array.isArray(notification.details)
                  ? notification.details.filter((detail) => {
                      if (!detail) {
                        return false;
                      }

                      const beforeValue =
                        typeof detail.before === "string"
                          ? detail.before.trim()
                          : "";
                      const afterValue =
                        typeof detail.after === "string"
                          ? detail.after.trim()
                          : "";

                      return beforeValue !== "" || afterValue !== "";
                    })
                  : [];
                const trimmedDetails = changeDetails.slice(0, 3);
                const remainingDetails = changeDetails.length - trimmedDetails.length;

                return (
                  <div
                    key={notification.id}
                    className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                  >
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${statusClass}`}
                    >
                      {indicator}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
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
                        <p className="mt-1 text-xs text-slate-500">
                          {notification.message}
                        </p>
                      ) : null}
                      {notification.actor?.name ? (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {notification.actor.name}
                          {actorRoleLabel ? ` • ${actorRoleLabel}` : ""}
                          {notification.actor.email
                            ? ` • ${notification.actor.email}`
                            : ""}
                        </p>
                      ) : null}
                      {trimmedDetails.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {trimmedDetails.map((detail) => {
                            const hasBefore =
                              typeof detail.before === "string" && detail.before !== "";
                            const hasAfter =
                              typeof detail.after === "string" && detail.after !== "";

                            return (
                              <li
                                key={`${notification.id}-${detail.field}-${detail.after}`}
                                className="text-[11px] text-slate-500"
                              >
                                <span className="font-medium text-slate-600">
                                  {detail.label || detail.field}
                                </span>
                                <span className="ml-2">
                                  {hasBefore ? (
                                    <span className="text-slate-400 line-through">
                                      {detail.before}
                                    </span>
                                  ) : null}
                                  {hasBefore && hasAfter ? (
                                    <span className="mx-1 text-slate-400">→</span>
                                  ) : null}
                                  {hasAfter ? (
                                    <span className="text-slate-600">{detail.after}</span>
                                  ) : !hasBefore ? (
                                    <span className="text-slate-400">—</span>
                                  ) : null}
                                </span>
                              </li>
                            );
                          })}
                          {remainingDetails > 0 && (
                            <li className="text-[11px] text-slate-400">
                              +{remainingDetails} more change
                              {remainingDetails > 1 ? "s" : ""}
                            </li>
                          )}
                        </ul>
                      )}
                      <span className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        {formatRelativeTimeFromNow(notification.date)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                You're all caught up!
              </div>
            )}
          </div>
        </div>
      )}
      {isPrivilegedUser && (
        <PublishNoticeModal
          open={noticeModalOpen}
          onClose={() => setNoticeModalOpen(false)}
          onSuccess={() => {
            setNoticeModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default NotificationBell;