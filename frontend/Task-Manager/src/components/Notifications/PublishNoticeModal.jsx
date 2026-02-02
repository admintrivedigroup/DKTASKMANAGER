import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuLoader, LuTrash2, LuX } from "react-icons/lu";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import {
  addDays,
  formatDateTimeLocal,
  formatMediumDateTime,
  toStartOfMinute,
} from "../../utils/dateUtils";

const getDefaultSchedule = () => {
  const now = toStartOfMinute();
  return {
    start: formatDateTimeLocal(now),
    end: formatDateTimeLocal(addDays(now, 7)),
  };
};

const getNoticeStatus = (notice) => {
  const now = new Date();
  const start = notice?.startsAt ? new Date(notice.startsAt) : null;
  const end = notice?.expiresAt ? new Date(notice.expiresAt) : null;

  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    return { label: "Unknown", className: "bg-slate-100 text-slate-500" };
  }

  if (end.getTime() <= now.getTime()) {
    return { label: "Expired", className: "bg-rose-50 text-rose-600" };
  }

  if (start.getTime() > now.getTime()) {
    return { label: "Scheduled", className: "bg-amber-50 text-amber-600" };
  }

  return { label: "Active", className: "bg-emerald-50 text-emerald-600" };
};

const PublishNoticeModal = ({ open, onClose, onSuccess }) => {
  const [message, setMessage] = useState("");
  const [startsAt, setStartsAt] = useState(() => getDefaultSchedule().start);
  const [expiresAt, setExpiresAt] = useState(() => getDefaultSchedule().end);  
  const [submitting, setSubmitting] = useState(false);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [notices, setNotices] = useState([]);
  const [deletingNoticeId, setDeletingNoticeId] = useState(null);

  const fetchNotices = useCallback(async () => {
    try {
      setLoadingNotices(true);
      const response = await axiosInstance.get(API_PATHS.NOTICES.GET_ALL);
      setNotices(response.data?.notices || []);
    } catch (error) {
      console.error("Failed to fetch notices", error);
      const errorMessage =
        error.response?.data?.message || "Failed to load notices";
      toast.error(errorMessage);
    } finally {
      setLoadingNotices(false);
    }
  }, []);  

  useEffect(() => {
    if (open) {
      const defaults = getDefaultSchedule();
      setMessage("");
      setStartsAt(defaults.start);
      setExpiresAt(defaults.end);
      setSubmitting(false);
      fetchNotices();
    } else {      
      setSubmitting(false);
    }
  }, [fetchNotices, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim()) {
      toast.error("Please enter a notice message");
      return;
    }

    const trimmedMessage = message.trim();
    const startDate = startsAt ? new Date(startsAt) : new Date();
    const endDate = expiresAt ? new Date(expiresAt) : null;

    if (Number.isNaN(startDate.getTime())) {
      toast.error("Please provide a valid start time");
      return;
    }

    if (!endDate || Number.isNaN(endDate.getTime())) {
      toast.error("Please provide a valid expiration time");
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      toast.error("Expiration must be after the start time");
      return;
    }

    try {
      setSubmitting(true);
      const response = await axiosInstance.post(API_PATHS.NOTICES.PUBLISH, {
        message: trimmedMessage,
        startsAt: startDate.toISOString(),
        expiresAt: endDate.toISOString(),
      });

      toast.success(
        response.data?.message || "Notice published successfully"
      );

      const defaults = getDefaultSchedule();
      setMessage("");
      setStartsAt(defaults.start);
      setExpiresAt(defaults.end);
      await fetchNotices();

      if (typeof onSuccess === "function") {
        onSuccess(response.data?.notice || null);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to publish notice";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noticeId) => {
    if (!noticeId) return;

    try {
      setDeletingNoticeId(noticeId);
      const response = await axiosInstance.delete(
        API_PATHS.NOTICES.DELETE(noticeId)
      );

      toast.success(response.data?.message || "Notice deleted successfully");
      await fetchNotices();

      if (typeof onSuccess === "function") {
        onSuccess(null);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to delete notice";
      toast.error(errorMessage);
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const handleClose = () => {
    if (submitting || deletingNoticeId) return;
    if (typeof onClose === "function") {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Publish Notice
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            disabled={submitting || deletingNoticeId}
          >
            <LuX className="text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="notice-message"
              className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500"
            >
              Notice Message
            </label>
            <textarea
              id="notice-message"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Write the announcement you want users to see"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="notice-starts"
                className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500"
              >
                Starts At
              </label>
              <input
                id="notice-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={submitting}
              />
            </div>
            <div>
              <label
                htmlFor="notice-expires"
                className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500"
              >
                Expires At
              </label>
              <input
                id="notice-expires"
                type="datetime-local"
                value={expiresAt}
                min={startsAt || undefined}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={submitting}
                required
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Publishing a new notice will replace the current announcement on
            stop showing after its expiration time.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              disabled={submitting || deletingNoticeId}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-6 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-80"
              disabled={submitting}
            >
              {submitting ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
        
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">
              Scheduled Notices
            </h3>
            <span className="text-xs text-slate-500">
              {loadingNotices
                ? "Refreshing..."
                : `${notices.length} ${notices.length === 1 ? "notice" : "notices"}`}
            </span>
          </div>

          {loadingNotices ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <LuLoader className="h-4 w-4 animate-spin" />
              Loading notices...
            </div>
          ) : notices.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No scheduled notices yet. New announcements will appear here.
            </p>
          ) : (
            <div className="relative">
              <div className="notice-scroll-area max-h-72 overflow-y-auto scroll-smooth pr-1">
                <div className="flex flex-col gap-3 pr-1">
                  {notices.map((notice) => {
                    const status = getNoticeStatus(notice);
                    return (
                      <div
                        key={notice._id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${status.className}`}
                              >
                                {status.label}
                              </span>
                              {notice.createdBy?.name && (
                                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                  {`By ${notice.createdBy.name}`}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-slate-700">
                              {notice.message}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              <span>
                                Starts {formatMediumDateTime(notice.startsAt, "Unknown")}
                              </span>
                              <span>
                                Ends {formatMediumDateTime(notice.expiresAt, "Unknown")}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(notice._id)}
                            className="inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.22em] transition btn-danger-soft disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={deletingNoticeId === notice._id || submitting}
                          >
                            {deletingNoticeId === notice._id ? (
                              <span className="inline-flex items-center gap-2">
                                <LuLoader className="h-3.5 w-3.5 animate-spin" />
                                Removing...
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <LuTrash2 className="text-sm" />
                                Remove
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PublishNoticeModal;
