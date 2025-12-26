import React, { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { formatDateInputValue, formatDateTimeLabel } from "../utils/dateUtils";
import toast from "react-hot-toast";

const TaskChannel = ({ task, user, isAssigned, isPrivileged }) => {
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

  const canRequestDueDate = Boolean(isAssigned);
  const canManageRequests = Boolean(isPrivileged);

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
    if (!requestForm.proposedDueDate && task?.dueDate) {
      setRequestForm((prev) => ({
        ...prev,
        proposedDueDate: formatDateInputValue(task.dueDate),
      }));
    }
  }, [requestForm.proposedDueDate, task?.dueDate]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmed = newMessage.trim();
    if (!trimmed || !taskId) {
      return;
    }

    try {
      setIsSending(true);
      const response = await axiosInstance.post(
        API_PATHS.TASKS.POST_TASK_MESSAGE(taskId),
        { text: trimmed }
      );
      const createdMessage = response.data?.message;
      if (createdMessage) {
        setMessages((prev) => [...prev, createdMessage]);
      }
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error("Message failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitRequest = async (event) => {
    event.preventDefault();

    if (!taskId) {
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

    try {
      setIsRequesting(true);
      await axiosInstance.post(
        API_PATHS.TASKS.CREATE_DUE_DATE_REQUEST(taskId),
        { proposedDueDate, reason }
      );
      setRequestForm((prev) => ({
        ...prev,
        reason: "",
      }));
      await fetchMessages();
      toast.success("Due date request submitted.");
    } catch (error) {
      console.error("Failed to request due date change", error);
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

  const statusStyles = useMemo(
    () => ({
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-emerald-100 text-emerald-700",
      rejected: "bg-rose-100 text-rose-700",
    }),
    []
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="form-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Task Channel</h3>
            <p className="text-sm text-slate-500">
              Collaborate with assignees and track due date requests.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
            onClick={fetchMessages}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-400">
              Loading channel messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-400">
              No messages yet. Start the discussion below.
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem
                key={message._id}
                message={message}
                currentUser={user}
                onDecision={handleRequestDecision}
                canManageRequests={canManageRequests}
                statusStyles={statusStyles}
                isUpdatingRequest={isUpdatingRequest}
              />
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="mt-6 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            New Message
          </label>
          <textarea
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            rows={3}
            placeholder="Share an update or ask a question..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="add-btn h-10"
              disabled={isSending || !newMessage.trim()}
            >
              {isSending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>

      <aside className="form-card space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Due Date Request
        </h3>
        <p className="text-sm text-slate-500">
          Assignees can request an extension with a proposed due date and reason.
        </p>

        {canRequestDueDate ? (
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                Proposed Due Date
              </label>
              <input
                type="date"
                value={requestForm.proposedDueDate}
                onChange={(event) =>
                  setRequestForm((prev) => ({
                    ...prev,
                    proposedDueDate: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
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
                placeholder="Explain why you need more time..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              />
            </div>
            <button
              type="submit"
              className="add-btn h-10 w-full"
              disabled={isRequesting}
            >
              {isRequesting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Only assigned members can request due date extensions.
          </div>
        )}
      </aside>
    </div>
  );
};

const MessageItem = ({
  message,
  currentUser,
  onDecision,
  canManageRequests,
  statusStyles,
  isUpdatingRequest,
}) => {
  const authorName = message?.author?.name || "System";
  const authorId = message?.author?._id || "";
  const currentUserId = currentUser?._id || "";
  const isMine = authorId && currentUserId && authorId.toString() === currentUserId.toString();
  const createdLabel = formatDateTimeLabel(message?.createdAt, "");

  if (message.messageType === "system") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        {message.text}
        {createdLabel && (
          <span className="ml-2 text-xs text-slate-400">{createdLabel}</span>
        )}
      </div>
    );
  }

  if (message.messageType === "due_date_request") {
    const request = message.dueDateRequest || {};
    const status = request.status || "pending";
    const statusClass = statusStyles[status] || statusStyles.pending;
    const proposedDate = formatDateTimeLabel(request.proposedDueDate, "N/A");

    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Due date request from {authorName}
            </p>
            {createdLabel && (
              <p className="text-xs text-slate-400">{createdLabel}</p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
          >
            {status}
          </span>
        </div>

        <div className="mt-3 grid gap-3 text-sm text-slate-600">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Proposed Due Date
            </span>
            <p className="mt-1 text-slate-700">{proposedDate}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Reason
            </span>
            <p className="mt-1 text-slate-700">{request.reason}</p>
          </div>
        </div>

        {canManageRequests && status === "pending" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300"
              onClick={() => onDecision(message._id, "approve")}
              disabled={isUpdatingRequest}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300"
              onClick={() => onDecision(message._id, "reject")}
              disabled={isUpdatingRequest}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-sm shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${
        isMine
          ? "border-indigo-200 bg-indigo-50 text-slate-700"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-600">{authorName}</span>
        <span>{createdLabel}</span>
      </div>
      <p className="text-sm text-slate-700">{message.text}</p>
    </div>
  );
};

export default TaskChannel;
