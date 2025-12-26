import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import {
  formatDateLabel,
  formatDateTimeLabel,
  formatDateTimeLocal,
} from "../utils/dateUtils";
import { matchesRole } from "../utils/roleUtils";
import { connectSocket } from "../utils/socket";
import Modal from "./Modal";
import toast from "react-hot-toast";

const TaskChannel = ({
  task,
  user,
  isAssigned,
  isPrivileged,
  isFullscreen = false,
}) => {
  const taskId = task?._id || task?.id;
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [requestForm, setRequestForm] = useState({
    proposedDueDate: "",
    reason: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const requestPanelRef = useRef(null);
  const messagesBodyRef = useRef(null);
  const hasScrolledOnLoad = useRef(false);

  const isTaskCompleted = task?.status === "Completed";
  const canSendMessage = (isAssigned || isPrivileged) && !isTaskCompleted;
  const canRequestDueDate = Boolean(isAssigned);
  const canManageRequests = Boolean(isPrivileged);
  const isRequestDisabled =
    !canRequestDueDate || isTaskCompleted || isRequesting;
  const composerDisabled = !canSendMessage;
  const currentUserId = user?._id ? user._id.toString() : "";
  const isMemberRole = matchesRole(user?.role, "member");
  const showRequestPanel = !isMemberRole;

  const fetchMessages = useCallback(async () => {
    if (!taskId) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_TASK_MESSAGES(taskId)
      );
      setMessages(response.data?.messages || []);
    } catch (error) {
      console.error("Failed to load task messages", error);
      toast.error("Unable to load channel messages.");
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    hasScrolledOnLoad.current = false;
  }, [taskId]);

  useEffect(() => {
    if (!requestForm.proposedDueDate && task?.dueDate) {
      setRequestForm((prev) => ({
        ...prev,
        proposedDueDate: formatDateTimeLocal(task.dueDate),
      }));
    }
  }, [requestForm.proposedDueDate, task?.dueDate]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmed = newMessage.trim();
    if (!trimmed || !taskId || composerDisabled) {
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      _id: optimisticId,
      messageType: "message",
      text: trimmed,
      author: user,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    try {
      setIsSending(true);
      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");

      const response = await axiosInstance.post(
        API_PATHS.TASKS.POST_TASK_MESSAGE(taskId),
        { text: trimmed }
      );
      const createdMessage = response.data?.message;
      if (createdMessage) {
        setMessages((prev) =>
          prev.filter((item) => item._id !== optimisticId)
        );
        upsertMessage(createdMessage);
      }
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages((prev) => prev.filter((item) => item._id !== optimisticId));
      toast.error("Message failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitRequest = async (event) => {
    event.preventDefault();

    if (!taskId || !canRequestDueDate) {
      return;
    }

    const proposedDueDate = requestForm.proposedDueDate;
    const reason = requestForm.reason.trim();

    if (!proposedDueDate) {
      toast.error("Please select a proposed due date.");
      return;
    }

    if (!reason) {
      toast.error("Please add a reason for the request.");
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      _id: optimisticId,
      messageType: "due_date_request",
      author: user,
      createdAt: new Date().toISOString(),
      dueDateRequest: {
        proposedDueDate,
        reason,
        status: "pending",
      },
      isOptimistic: true,
    };

    try {
      setIsRequesting(true);
      setMessages((prev) => [...prev, optimisticMessage]);

      const response = await axiosInstance.post(
        API_PATHS.TASKS.CREATE_DUE_DATE_REQUEST(taskId),
        { proposedDueDate, reason }
      );
      const createdMessage = response.data?.message;
      if (createdMessage) {
        setMessages((prev) =>
          prev.filter((item) => item._id !== optimisticId)
        );
        upsertMessage(createdMessage);
      }

      setRequestForm((prev) => ({
        ...prev,
        reason: "",
      }));
      setIsRequestModalOpen(false);
      toast.success("Due date request submitted.");
    } catch (error) {
      console.error("Failed to request due date change", error);
      setMessages((prev) => prev.filter((item) => item._id !== optimisticId));
      toast.error("Unable to submit the request.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRequestDecision = async (requestId, decision) => {
    if (!requestId) {
      return;
    }

    try {
      setIsUpdatingRequest(true);
      const endpoint =
        decision === "approve"
          ? API_PATHS.DUE_DATE_REQUESTS.APPROVE(requestId)
          : API_PATHS.DUE_DATE_REQUESTS.REJECT(requestId);
      await axiosInstance.post(endpoint);
      await fetchMessages();
      toast.success(
        decision === "approve"
          ? "Due date request approved."
          : "Due date request rejected."
      );
    } catch (error) {
      console.error("Failed to update due date request", error);
      toast.error("Unable to update this request.");
    } finally {
      setIsUpdatingRequest(false);
    }
  };

  const groupedMessages = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    const sorted = [...messages].sort(
      (a, b) => new Date(a?.createdAt).getTime() - new Date(b?.createdAt).getTime()
    );

    return sorted.reduce((acc, message) => {
      const createdAt = new Date(message?.createdAt);
      const safeDate = Number.isNaN(createdAt.getTime())
        ? new Date()
        : createdAt;
      const dayKey = safeDate.toISOString().slice(0, 10);
      const label = getDayLabel(safeDate);
      const lastGroup = acc[acc.length - 1];

      if (!lastGroup || lastGroup.key !== dayKey) {
        acc.push({ key: dayKey, label, items: [message] });
      } else {
        lastGroup.items.push(message);
      }

      return acc;
    }, []);
  }, [messages]);

  const statusStyles = useMemo(
    () => ({
      pending: "border-amber-200 bg-amber-100 text-amber-700",
      approved: "border-emerald-200 bg-emerald-100 text-emerald-700",
      rejected: "border-rose-200 bg-rose-100 text-rose-700",
    }),
    []
  );

  const upsertMessage = useCallback((incoming) => {
    if (!incoming || !incoming._id) {
      return;
    }

    setMessages((prev) => {
      const existingIndex = prev.findIndex((item) => item._id === incoming._id);
      const filtered = prev.filter((item) => {
        if (!item?.isOptimistic) {
          return true;
        }

        const sameAuthor =
          item?.author?._id &&
          incoming?.author?._id &&
          item.author._id.toString() === incoming.author._id.toString();

        return !(
          sameAuthor &&
          item?.messageType === incoming?.messageType &&
          item?.text === incoming?.text
        );
      });

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...incoming, isOptimistic: false };
        return next;
      }

      return [...filtered, incoming];
    });
  }, []);

  useEffect(() => {
    if (!taskId) {
      return undefined;
    }

    const socket = connectSocket();

    const handleNewMessage = (payload) => {
      if (payload?.message) {
        upsertMessage(payload.message);
      }
    };

    const handleDueDateRequested = (payload) => {
      if (payload?.message) {
        upsertMessage(payload.message);
      }
    };

    const handleDueDateApproved = (payload) => {
      if (payload?.request) {
        upsertMessage(payload.request);
      }
    };

    const handleDueDateRejected = (payload) => {
      if (payload?.request) {
        upsertMessage(payload.request);
      }
    };

    const handleRoomError = (payload) => {
      if (payload?.message) {
        toast.error(payload.message);
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("due-date-requested", handleDueDateRequested);
    socket.on("due-date-approved", handleDueDateApproved);
    socket.on("due-date-rejected", handleDueDateRejected);
    socket.on("room-error", handleRoomError);

    socket.emit("join-task-room", { taskId }, (response) => {
      if (response?.error) {
        toast.error(response.error);
      }
    });

    return () => {
      socket.emit("leave-task-room", { taskId });
      socket.off("new-message", handleNewMessage);
      socket.off("due-date-requested", handleDueDateRequested);
      socket.off("due-date-approved", handleDueDateApproved);
      socket.off("due-date-rejected", handleDueDateRejected);
      socket.off("room-error", handleRoomError);
    };
  }, [taskId, upsertMessage]);

  useEffect(() => {
    if (isLoading || hasScrolledOnLoad.current || messages.length === 0) {
      return;
    }

    const container = messagesBodyRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
    hasScrolledOnLoad.current = true;
  }, [isLoading, messages.length]);

  const lastMessageId = messages.length ? messages[messages.length - 1]?._id : "";
  const lastMessageAuthorId = messages.length
    ? messages[messages.length - 1]?.author?._id?.toString?.() || ""
    : "";

  useEffect(() => {
    if (!hasScrolledOnLoad.current || messages.length === 0) {
      return;
    }

    const container = messagesBodyRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom < 120;
    const lastIsMine = currentUserId && lastMessageAuthorId === currentUserId;

    if (isNearBottom || lastIsMine) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, currentUserId, lastMessageId, lastMessageAuthorId]);

  const containerClasses = [
    showRequestPanel ? "grid gap-6 lg:grid-cols-[2fr,1fr]" : "grid gap-6",
    isFullscreen ? "h-full min-h-0" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const columnClasses = [
    "form-card flex flex-col",
    isFullscreen ? "h-full min-h-0" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const messageShellClasses = [
    "mt-6 flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white",
    isFullscreen ? "min-h-0" : "min-h-[1000px]",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses}>
      <div className={columnClasses}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Task Channel</h3>
            <p className="text-sm text-slate-500">
              Threaded updates, due date requests, and system timeline events.
            </p>
          </div>
        </div>

        <div className={messageShellClasses}>
          <div
            ref={messagesBodyRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
          >
            {isLoading ? (
              <ChannelSkeleton />
            ) : groupedMessages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-8">
                {groupedMessages.map((group) => (
                  <div key={group.key} className="space-y-6">
                    <DateSeparator label={group.label} />
                    <div className="space-y-6">
                      {group.items.map((message, index) => (
                        <MessageItem
                          key={message._id}
                          message={message}
                          previousMessage={group.items[index - 1]}
                          currentUser={user}
                          onDecision={handleRequestDecision}
                          canManageRequests={canManageRequests}
                          statusStyles={statusStyles}
                          isUpdatingRequest={isUpdatingRequest}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="shrink-0 border-t border-slate-200/70 bg-white/95 px-4 py-4 backdrop-blur"
          >
            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
            rows={1}
              disabled={composerDisabled}
              placeholder={
                composerDisabled
                  ? "Messaging is disabled for this task."
                  : "Share an update or ask a question..."
              }
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
                  disabled
                >
                  ➕ Attachment
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    if (isMemberRole) {
                      setIsRequestModalOpen(true);
                      return;
                    }

                    requestPanelRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  disabled={!canRequestDueDate || isTaskCompleted}
                >
                  ⏳ Request Extension
                </button>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isSending || !newMessage.trim() || composerDisabled}
              >
                ➤ {isSending ? "Sending..." : "Send"}
              </button>
            </div>
            {composerDisabled && (
              <p className="mt-2 text-xs text-slate-500">
                {isTaskCompleted
                  ? "Task is completed. Messaging is closed."
                  : "You do not have permission to send messages."}
              </p>
            )}
          </form>
        </div>
      </div>

      {showRequestPanel && (
        <aside
          ref={requestPanelRef}
          className={`form-card space-y-5 ${isFullscreen ? "h-full overflow-y-auto" : ""}`}
        >
          {!canRequestDueDate && (
            <p className="text-xs text-slate-500">
              Only assigned members can request due date extensions.
            </p>
          )}
          {canRequestDueDate && (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Proposed Due Date
                </label>
                <input
                  type="datetime-local"
                  value={requestForm.proposedDueDate}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      proposedDueDate: event.target.value,
                    }))
                  }
                  disabled={isRequestDisabled}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Reason
                </label>
                <textarea
                  rows={4}
                  value={requestForm.reason}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                  disabled={isRequestDisabled}
                  placeholder="Explain why you need more time..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-amber-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isRequestDisabled}
              >
                {isRequesting ? "Submitting..." : "Submit Request"}
              </button>
              {isTaskCompleted && (
                <p className="text-xs text-slate-500">
                  Task is completed. Extensions are locked.
                </p>
              )}
            </form>
          )}
        </aside>
      )}

      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Due Date Extension"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Proposed Due Date
            </label>
            <input
              type="datetime-local"
              value={requestForm.proposedDueDate}
              onChange={(event) =>
                setRequestForm((prev) => ({
                  ...prev,
                  proposedDueDate: event.target.value,
                }))
              }
              disabled={isRequestDisabled}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Reason
            </label>
            <textarea
              rows={4}
              value={requestForm.reason}
              onChange={(event) =>
                setRequestForm((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              disabled={isRequestDisabled}
              placeholder="Explain why you need more time..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full bg-amber-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isRequestDisabled}
            >
              {isRequesting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
          {isTaskCompleted && (
            <p className="text-xs text-slate-500">
              Task is completed. Extensions are locked.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
};

const MessageItem = ({
  message,
  previousMessage,
  currentUser,
  onDecision,
  canManageRequests,
  statusStyles,
  isUpdatingRequest,
}) => {
  const author = message?.author || {};
  const authorName = author?.name || "System";
  const authorId = author?._id || "";
  const currentUserId = currentUser?._id || "";
  const isMine =
    authorId && currentUserId && authorId.toString() === currentUserId.toString();
  const createdLabel = formatDateTimeLabel(message?.createdAt, "");
  const previousAuthorId = previousMessage?.author?._id || "";
  const isSameAuthor =
    previousMessage &&
    previousMessage.messageType === "message" &&
    authorId &&
    authorId.toString() === previousAuthorId.toString();
  const showAuthor = !isMine && message.messageType === "message" && !isSameAuthor;

  if (message.messageType === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[520px] rounded-full border border-slate-200/70 bg-slate-100 px-4 py-2 text-center text-xs italic text-slate-500">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.messageType === "due_date_request") {
    const request = message.dueDateRequest || {};
    const status = request.status || "pending";
    const statusClass = statusStyles[status] || statusStyles.pending;
    const proposedDate = formatDateTimeLabel(request.proposedDueDate, "N/A");
    const decidedByName =
      request.decidedBy?.name || request.decidedBy?.email || "";
    const decidedAtLabel = formatDateTimeLabel(request.decidedAt, "");
    const decisionLabel =
      status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "";

    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="w-full max-w-[560px] rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <span className="text-base">⏳</span>
              <span>Due Date Extension Request</span>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">From:</span>
            {!isMine && <Avatar user={author} />}
            <span className="font-semibold text-slate-700">
              {isMine ? "You" : authorName}
            </span>
            {!isMine && <RoleBadge role={author?.role} />}
            {createdLabel && (
              <span className="text-slate-400">· {createdLabel}</span>
            )}
          </div>

          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Proposed Due Date
              </p>
              <p className="mt-1 font-medium text-slate-800">{proposedDate}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Reason
              </p>
              <blockquote className="mt-1 rounded-xl border border-amber-100 bg-white/70 px-3 py-2 text-sm italic text-slate-700">
                “{request.reason || "No reason provided."}”
              </blockquote>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            {status === "pending" && canManageRequests ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onDecision(message._id, "approve")}
                  disabled={isUpdatingRequest}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onDecision(message._id, "reject")}
                  disabled={isUpdatingRequest}
                >
                  Reject
                </button>
              </div>
            ) : status === "pending" ? (
              <span className="text-slate-500">Awaiting admin review.</span>
            ) : (
              <span className="text-slate-500">
                {decisionLabel}
                {decidedByName ? ` by ${decidedByName}` : ""}
                {decidedAtLabel ? ` · ${decidedAtLabel}` : ""}
              </span>
            )}

            {status === "approved" && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Final due date: {proposedDate}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[78%] items-end gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
        {!isMine && showAuthor ? (
          <Avatar user={author} />
        ) : !isMine ? (
          <div className="h-9 w-9" aria-hidden="true" />
        ) : null}

        <div className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
          {showAuthor && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">{authorName}</span>
              <RoleBadge role={author?.role} />
            </div>
          )}
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              isMine
                ? "rounded-br-md bg-indigo-600 text-white"
                : "rounded-bl-md border border-slate-200/70 bg-white text-slate-700"
            }`}
          >
            {message.text}
          </div>
          {createdLabel && (
            <span className="text-[11px] text-slate-400">{createdLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const Avatar = ({ user }) => {
  const name = user?.name || user?.fullName || "";
  const email = user?.email || "";
  const initials = getInitials(name, email);
  const imageUrl = user?.profileImageUrl;

  return (
    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name || "User avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        initials || "?"
      )}
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const badge = getRoleBadge(role);

  if (!badge) {
    return null;
  }

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
};

const ChannelSkeleton = () => {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((row) => (
        <div key={row} className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="flex items-end gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-12 w-64 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
          <div className="flex justify-end">
            <div className="h-12 w-56 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      <span className="text-2xl">💬</span>
      <p className="font-medium text-slate-600">
        No messages yet. Start the conversation.
      </p>
    </div>
  );
};

const DateSeparator = ({ label }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200/70" />
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-200/70" />
    </div>
  );
};

const getInitials = (name, email) => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return `${first}${last}`.toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "";
};

const getRoleBadge = (role) => {
  if (matchesRole(role, "super_admin")) {
    return {
      label: "⭐ Super Admin",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (matchesRole(role, "admin")) {
    return {
      label: "🛡️ Admin",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (matchesRole(role, "member")) {
    return {
      label: "👤 Member",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  return null;
};

const getDayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) {
    return "Today";
  }

  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  return formatDateLabel(date, "N/A");
};

const isSameDay = (first, second) => {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};

export default TaskChannel;
