import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { LuClock3, LuLink, LuSend } from "react-icons/lu";

const ACTIVE_TASK_STORAGE_KEY = "taskChannel:activeTaskId";

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
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editText, setEditText] = useState("");
  const [mentionState, setMentionState] = useState({
    isActive: false,
    query: "",
    start: -1,
    end: -1,
    selectedIndex: 0,
  });
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const requestPanelRef = useRef(null);
  const messagesBodyRef = useRef(null);
  const socketRef = useRef(null);
  const lastSeenMessageIdRef = useRef("");
  const isAtBottomRef = useRef(true);
  const hasScrolledOnLoad = useRef(false);
  const composerRef = useRef(null);
  const mentionCursorRef = useRef(null);

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
    if (!taskId) {
      return undefined;
    }

    try {
      window.localStorage?.setItem(ACTIVE_TASK_STORAGE_KEY, taskId.toString());
    } catch (error) {
      // Ignore storage write failures.
    }

    const markNotificationsRead = async () => {
      try {
        await axiosInstance.post(
          API_PATHS.TASKS.MARK_TASK_NOTIFICATIONS_READ(taskId)
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("task-notifications-cleared", {
              detail: { taskId },
            })
          );
        }
      } catch (error) {
        console.error("Failed to mark task notifications as read", error);
      }
    };

    markNotificationsRead();

    return () => {
      try {
        if (
          window.localStorage?.getItem(ACTIVE_TASK_STORAGE_KEY) ===
          taskId.toString()
        ) {
          window.localStorage.removeItem(ACTIVE_TASK_STORAGE_KEY);
        }
      } catch (error) {
        // Ignore storage cleanup failures.
      }
    };
  }, [taskId]);

  useEffect(() => {
    hasScrolledOnLoad.current = false;
    lastSeenMessageIdRef.current = "";
  }, [taskId]);

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }

    const handleClose = () => setContextMenu(null);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("click", handleClose);
    window.addEventListener("contextmenu", handleClose);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("contextmenu", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!requestForm.proposedDueDate && task?.dueDate) {
      setRequestForm((prev) => ({
        ...prev,
        proposedDueDate: formatDateTimeLocal(task.dueDate),
      }));
    }
  }, [requestForm.proposedDueDate, task?.dueDate]);

  const channelUsers = useMemo(() => {
    const assigned = Array.isArray(task?.assignedTo)
      ? task.assignedTo
      : task?.assignedTo
      ? [task.assignedTo]
      : [];
    const combined = [...assigned];
    if (user) {
      combined.push(user);
    }

    const seen = new Set();
    return combined.filter((member) => {
      const id =
        member?._id?.toString?.() ||
        member?.id?.toString?.() ||
        member?.email ||
        "";
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }, [task?.assignedTo, user]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionState.isActive) {
      return [];
    }

    const query = mentionState.query.trim().toLowerCase();
    const filtered = channelUsers.filter((member) => {
      const name = member?.name || member?.fullName || "";
      const email = member?.email || "";
      if (!query) {
        return true;
      }
      return (
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query)
      );
    });

    return filtered.slice(0, 6);
  }, [channelUsers, mentionState.isActive, mentionState.query]);

  useEffect(() => {
    if (!mentionState.isActive) {
      return;
    }

    if (mentionState.selectedIndex >= mentionSuggestions.length) {
      setMentionState((prev) => ({ ...prev, selectedIndex: 0 }));
    }
  }, [mentionState.isActive, mentionState.selectedIndex, mentionSuggestions.length]);

  const detectMention = useCallback((value, cursor) => {
    if (cursor === null || cursor === undefined) {
      return null;
    }

    const uptoCursor = value.slice(0, cursor);
    const atIndex = uptoCursor.lastIndexOf("@");
    if (atIndex === -1) {
      return null;
    }

    if (atIndex > 0 && !/\s/.test(uptoCursor[atIndex - 1])) {
      return null;
    }

    const query = uptoCursor.slice(atIndex + 1);
    if (/\s/.test(query)) {
      return null;
    }

    return { query, start: atIndex, end: cursor };
  }, []);

  const resetMentionState = useCallback(() => {
    setMentionState({
      isActive: false,
      query: "",
      start: -1,
      end: -1,
      selectedIndex: 0,
    });
  }, []);

  const applyMention = useCallback(
    (selectedUser) => {
      if (!selectedUser) {
        return;
      }

      const label = getMentionToken(selectedUser);
      if (!label) {
        return;
      }

      setNewMessage((prev) => {
        const start = mentionState.start;
        const end = mentionState.end;
        if (start < 0 || end < 0) {
          return prev;
        }

        const before = prev.slice(0, start);
        const after = prev.slice(end);
        const mentionText = `@${label}`;
        mentionCursorRef.current = before.length + mentionText.length + 1;
        return `${before}${mentionText} ${after}`;
      });

      resetMentionState();

      window.setTimeout(() => {
        if (composerRef.current && mentionCursorRef.current !== null) {
          const nextCursor = mentionCursorRef.current;
          mentionCursorRef.current = null;
          composerRef.current.focus();
          composerRef.current.setSelectionRange(nextCursor, nextCursor);
        }
      }, 0);
    },
    [mentionState.end, mentionState.start, resetMentionState]
  );

  const handleComposerChange = useCallback(
    (event) => {
      const value = event.target.value;
      setNewMessage(value);

      const cursor = event.target.selectionStart ?? value.length;
      const match = detectMention(value, cursor);

      if (!match) {
        if (mentionState.isActive) {
          resetMentionState();
        }
        return;
      }

      setMentionState((prev) => ({
        isActive: true,
        query: match.query,
        start: match.start,
        end: match.end,
        selectedIndex:
          prev.isActive && prev.query === match.query ? prev.selectedIndex : 0,
      }));
    },
    [detectMention, mentionState.isActive, mentionState.query, resetMentionState]
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
        next[existingIndex] = {
          ...next[existingIndex],
          ...incoming,
          isOptimistic: false,
        };
        return next;
      }

      return [...filtered, incoming];
    });
  }, []);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmed = newMessage.trim();
    if (!trimmed || !taskId || composerDisabled) {
      return;
    }

    const replyToId =
      replyToMessage?._id || replyToMessage?.id || replyToMessage || null;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      _id: optimisticId,
      messageType: "message",
      text: trimmed,
      author: user,
      replyTo: replyToMessage,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    try {
      setIsSending(true);
      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");
      setReplyToMessage(null);
      resetMentionState();

      const response = await axiosInstance.post(
        API_PATHS.TASKS.POST_TASK_MESSAGE(taskId),
        { text: trimmed, replyTo: replyToId }
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

  const handleComposerKeyDown = useCallback(
    (event) => {
      if (mentionState.isActive && mentionSuggestions.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setMentionState((prev) => ({
            ...prev,
            selectedIndex:
              (prev.selectedIndex + 1) % mentionSuggestions.length,
          }));
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setMentionState((prev) => ({
            ...prev,
            selectedIndex:
              (prev.selectedIndex - 1 + mentionSuggestions.length) %
              mentionSuggestions.length,
          }));
          return;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          const selected = mentionSuggestions[mentionState.selectedIndex];
          if (selected) {
            applyMention(selected);
          }
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          resetMentionState();
          return;
        }
      }

      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      if (composerDisabled || !newMessage.trim()) {
        return;
      }

      event.preventDefault();
      handleSendMessage(event);
    },
    [
      applyMention,
      composerDisabled,
      handleSendMessage,
      mentionState.isActive,
      mentionState.selectedIndex,
      mentionSuggestions,
      newMessage,
      resetMentionState,
    ]
  );

  const handleMessageContextMenu = useCallback((event, message, isMine, anchorRect) => {
    if (!message || message.messageType !== "message") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = anchorRect || event.currentTarget?.getBoundingClientRect?.();
    const anchorX =
      rect && rect.width
        ? isMine
          ? rect.right - 8
          : rect.left + 8
        : event.clientX;
    const anchorY = rect && rect.height ? rect.bottom + 8 : event.clientY;

    setContextMenu({
      x: anchorX,
      y: anchorY,
      message,
      isMine,
    });
  }, []);

  const handleReplyToMessage = useCallback((message) => {
    if (!message || message.messageType === "system") {
      return;
    }

    setReplyToMessage(message);
    setContextMenu(null);

    window.setTimeout(() => {
      composerRef.current?.focus();
    }, 0);
  }, []);

  const handleEditMessage = useCallback((message) => {
    if (!message || message.messageType !== "message" || message.isDeleted) {
      return;
    }

    setEditingMessageId(message._id);
    setEditText(message.text || "");
    setContextMenu(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId("");
    setEditText("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId) {
      return;
    }

    const trimmed = editText.trim();
    if (!trimmed) {
      toast.error("Message text is required.");
      return;
    }

    try {
      const response = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TASK_MESSAGE(editingMessageId),
        { text: trimmed }
      );
      if (response.data?.message) {
        upsertMessage(response.data.message);
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Failed to update message", error);
      toast.error("Unable to update this message.");
    }
  }, [editText, editingMessageId, handleCancelEdit, upsertMessage]);

  const handleDeleteMessage = useCallback(async (message) => {
    if (!message?._id) {
      return;
    }

    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) {
      return;
    }

    try {
      await axiosInstance.delete(
        API_PATHS.TASKS.DELETE_TASK_MESSAGE(message._id)
      );
      setMessages((prev) =>
        prev.map((item) =>
          item?._id?.toString?.() === message._id.toString()
            ? { ...item, isDeleted: true, text: "" }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to delete message", error);
      toast.error("Unable to delete this message.");
    } finally {
      setContextMenu(null);
    }
  }, []);

  const handleRequestExtensionClick = useCallback(() => {
    if (isRequestDisabled) {
      return;
    }

    if (isMemberRole) {
      setIsRequestModalOpen(true);
      return;
    }

    if (
      isFullscreen ||
      !requestPanelRef.current ||
      (typeof window !== "undefined" && window.innerWidth < 1024)
    ) {
      setIsRequestModalOpen(true);
      return;
    }

    requestPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [isFullscreen, isMemberRole, isRequestDisabled]);

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

  const markTaskSeen = useCallback(() => {
    if (!taskId || !messages.length) {
      return;
    }

    const lastVisibleMessage = [...messages]
      .reverse()
      .find((message) => message?.messageType !== "system");
    const lastMessageId = lastVisibleMessage?._id?.toString?.() || "";

    if (!lastMessageId || lastSeenMessageIdRef.current === lastMessageId) {
      return;
    }

    lastSeenMessageIdRef.current = lastMessageId;
    socketRef.current?.emit("mark-task-seen", {
      taskId,
      messageId: lastMessageId,
    });

    if (!currentUserId) {
      return;
    }

    setMessages((prev) =>
      prev.map((message) => {
        if (
          !message ||
          message.messageType === "system" ||
          message._id?.toString?.() !== lastMessageId
        ) {
          return message;
        }

        const seenBy = Array.isArray(message.seenBy) ? message.seenBy : [];
        const alreadySeen = seenBy.some((entry) => {
          const userId =
            entry?.user?._id?.toString?.() || entry?.user?.toString?.() || "";
          return userId === currentUserId;
        });

        if (alreadySeen) {
          return message;
        }

        return {
          ...message,
          seenBy: [
            ...seenBy,
            {
              user: { _id: currentUserId, ...user },
              seenAt: new Date().toISOString(),
            },
          ],
        };
      })
    );
  }, [currentUserId, messages, taskId, user]);

  const isNearBottom = useCallback((container) => {
    if (!container) {
      return false;
    }

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceToBottom < 120;
  }, []);

  const seenByByMessageId = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Map();
    }

    const sortedMessages = [...messages].sort(
      (a, b) =>
        new Date(a?.createdAt).getTime() - new Date(b?.createdAt).getTime()
    );

    const latestSeenByUser = new Map();

    sortedMessages.forEach((message, index) => {
      const messageId = message?._id?.toString?.() || message?._id || "";
      if (!messageId || message?.messageType === "system") {
        return;
      }

      const authorId = message?.author?._id?.toString?.() || "";
      const seenBy = Array.isArray(message?.seenBy) ? message.seenBy : [];

      seenBy.forEach((entry) => {
        const userObj = entry?.user || entry;
        const userId =
          userObj?._id?.toString?.() || userObj?.toString?.() || "";

        if (!userId) {
          return;
        }

        if (currentUserId && userId === currentUserId) {
          return;
        }

        if (authorId && userId === authorId) {
          return;
        }

        const existing = latestSeenByUser.get(userId);
        if (!existing || existing.orderIndex < index) {
          latestSeenByUser.set(userId, {
            messageId,
            orderIndex: index,
            user: userObj,
          });
        }
      });
    });

    const byMessage = new Map();
    latestSeenByUser.forEach(({ messageId, user }) => {
      if (!messageId) {
        return;
      }

      const list = byMessage.get(messageId) || [];
      list.push(user);
      byMessage.set(messageId, list);
    });

    return byMessage;
  }, [currentUserId, messages]);

  useEffect(() => {
    if (!taskId) {
      return undefined;
    }

    const socket = connectSocket();
    socketRef.current = socket;

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

    const handleMessageDeleted = (payload) => {
      if (!payload?.messageId) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) => {
          if (!message) {
            return message;
          }

          if (message?._id?.toString?.() === payload.messageId.toString()) {
            return { ...message, isDeleted: true, text: "" };
          }

          return message;
        })
      );
    };

    const handleTaskSeen = (payload) => {
      if (!payload?.user?._id) {
        return;
      }

      if (payload?.taskId && payload.taskId !== taskId) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) => {
          if (!message || message.messageType === "system") {
            return message;
          }

          if (
            payload?.messageId &&
            message?._id?.toString?.() !== payload.messageId
          ) {
            return message;
          }

          const seenBy = Array.isArray(message.seenBy) ? message.seenBy : [];
          const exists = seenBy.some((entry) => {
            const userId =
              entry?.user?._id?.toString?.() || entry?.user?.toString?.() || "";
            return userId === payload.user._id.toString();
          });

          if (exists) {
            return message;
          }

          return {
            ...message,
            seenBy: [
              ...seenBy,
              { user: payload.user, seenAt: payload.seenAt },
            ],
          };
        })
      );
    };

    socket.on("new-message", handleNewMessage);
    socket.on("due-date-requested", handleDueDateRequested);
    socket.on("due-date-approved", handleDueDateApproved);
    socket.on("due-date-rejected", handleDueDateRejected);
    socket.on("message-updated", handleNewMessage);
    socket.on("message-deleted", handleMessageDeleted);
    socket.on("room-error", handleRoomError);
    socket.on("task-seen", handleTaskSeen);

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
      socket.off("message-updated", handleNewMessage);
      socket.off("message-deleted", handleMessageDeleted);
      socket.off("room-error", handleRoomError);
      socket.off("task-seen", handleTaskSeen);
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
    isAtBottomRef.current = true;
    hasScrolledOnLoad.current = true;
    markTaskSeen();
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

    const isNearBottom = isAtBottomRef.current;
    const lastIsMine = currentUserId && lastMessageAuthorId === currentUserId;

    if (isNearBottom || lastIsMine) {
      window.requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
        markTaskSeen();
      });
    }
  }, [
    messages.length,
    currentUserId,
    lastMessageId,
    lastMessageAuthorId,
    markTaskSeen,
  ]);

  useEffect(() => {
    const container = messagesBodyRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      isAtBottomRef.current = isNearBottom(container);
      if (isAtBottomRef.current) {
        markTaskSeen();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isNearBottom, markTaskSeen]);

  const containerClasses = [
    showRequestPanel
      ? "grid gap-4 lg:grid-cols-[2fr,1fr] lg:gap-6"
      : "grid gap-4 lg:gap-6",
    isFullscreen ? "h-full min-h-0" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const columnClasses = [
    "form-card flex flex-col",
    isFullscreen
      ? "h-full min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const messageShellClasses = [
    "flex flex-1 flex-col overflow-hidden bg-white",
    isFullscreen
      ? "mt-0 min-h-0 rounded-none border-0 sm:mt-6 sm:rounded-2xl sm:border sm:border-slate-200/70"
      : "mt-6 min-h-[520px] sm:min-h-[720px] lg:min-h-[1000px] rounded-2xl border border-slate-200/70",
  ]
    .filter(Boolean)
    .join(" ");

  const replyAuthorLabel =
    replyToMessage?.author?.name ||
    replyToMessage?.author?.email ||
    "User";
  const replyPreviewText = replyToMessage?.isDeleted
    ? "Message deleted"
    : replyToMessage?.text || "";

  const contextMenuStyle = useMemo(() => {
    if (!contextMenu) {
      return null;
    }

    const menuWidth = 190;
    const menuHeight = 144;
    const padding = 8;
    const left = contextMenu.isMine
      ? contextMenu.x - menuWidth
      : contextMenu.x;
    const top = contextMenu.y;

    if (typeof window === "undefined") {
      return { left, top };
    }

    const maxLeft = Math.max(
      padding,
      window.innerWidth - menuWidth - padding
    );
    const maxTop = Math.max(
      padding,
      window.innerHeight - menuHeight - padding
    );

    return {
      left: Math.min(Math.max(left, padding), maxLeft),
      top: Math.min(Math.max(top, padding), maxTop),
    };
  }, [contextMenu]);

  const canReplyFromContext =
    contextMenu?.message?.messageType === "message";
  const canEditFromContext =
    contextMenu?.isMine &&
    contextMenu?.message?.messageType === "message" &&
    !contextMenu?.message?.isDeleted;

  return (
    <div className={containerClasses}>
      <div className={columnClasses}>
        {!isFullscreen && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Task Channel
              </h3>
              <p className="text-sm text-slate-500">
                Threaded updates, due date requests, and system timeline events.
              </p>
            </div>
          </div>
        )}

        <div className={messageShellClasses}>
          <div
            ref={messagesBodyRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 sm:py-5"
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
                          seenByUsers={
                            seenByByMessageId.get(
                              message?._id?.toString?.() || message?._id || ""
                            ) || []
                          }
                          onDecision={handleRequestDecision}
                          canManageRequests={canManageRequests}
                          statusStyles={statusStyles}
                          isUpdatingRequest={isUpdatingRequest}
                          onContextMenu={handleMessageContextMenu}
                          isEditing={
                            message?._id?.toString?.() ===
                            editingMessageId.toString()
                          }
                          editText={editText}
                          onEditChange={setEditText}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
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
            className="shrink-0 border-t border-slate-200/70 bg-white/95 px-3 py-4 backdrop-blur sm:px-4"
          >
            {replyToMessage && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Replying to {replyAuthorLabel}
                  </p>
                  <p className="truncate text-[11px] text-slate-600">
                    {replyPreviewText || "Message"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyToMessage(null)}
                  className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="relative mt-2">
              <textarea
                ref={composerRef}
                value={newMessage}
                onChange={handleComposerChange}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                disabled={composerDisabled}
                placeholder={
                  composerDisabled
                    ? "Messaging is disabled for this task."
                    : "Share an update or ask a question..."
                }
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-28 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              {mentionState.isActive && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-full max-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {mentionSuggestions.map((member, index) => {
                      const name = member?.name || member?.fullName || "";
                      const email = member?.email || "";
                      const label = name || email || "User";
                      const secondary = name && email ? email : "";
                      const initials = getInitials(name, email);
                      const imageUrl = member?.profileImageUrl;
                      const key =
                        member?._id?.toString?.() ||
                        member?.id?.toString?.() ||
                        member?.email ||
                        label;
                      const isSelected = index === mentionState.selectedIndex;

                      return (
                        <button
                          key={key}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            applyMention(member);
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${
                            isSelected
                              ? "bg-slate-100 text-slate-700"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-600">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={label}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials || "?"
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-700">
                              {label}
                            </span>
                            {secondary && (
                              <span className="block truncate text-[10px] text-slate-400">
                                {secondary}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled
                  title="Add attachment"
                  aria-label="Add attachment"
                >
                  <LuLink className="text-sm" />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleRequestExtensionClick}
                  disabled={!canRequestDueDate || isTaskCompleted}
                  title="Request extension"
                  aria-label="Request extension"
                >
                  <LuClock3 className="text-sm" />
                </button>
                <button
                  type="submit"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={isSending || !newMessage.trim() || composerDisabled}
                  title="Send message"
                  aria-label="Send message"
                >
                  <LuSend className="text-sm" />
                </button>
              </div>
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
          className={`form-card space-y-5 ${
            isFullscreen
              ? "hidden lg:block lg:h-full lg:overflow-y-auto"
              : ""
          }`}
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

      {contextMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[1300] min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            style={contextMenuStyle || undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col py-2 text-xs font-semibold text-slate-700">
              {canReplyFromContext && (
                <button
                  type="button"
                  onClick={() => handleReplyToMessage(contextMenu.message)}
                  className="px-4 py-2 text-left transition hover:bg-slate-100"
                >
                  Reply
                </button>
              )}
              {canEditFromContext && (
                <button
                  type="button"
                  onClick={() => handleEditMessage(contextMenu.message)}
                  className="px-4 py-2 text-left transition hover:bg-slate-100"
                >
                  Edit message
                </button>
              )}
              {canEditFromContext && (
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(contextMenu.message)}
                  className="px-4 py-2 text-left text-rose-600 transition hover:bg-rose-50"
                >
                  Delete message
                </button>
              )}
            </div>
          </div>,
          document.body
        )}

      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Due Date Extension"
        maxWidthClass="max-w-xl"
        overlayClass={isFullscreen ? "z-[1300]" : ""}
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
  seenByUsers = [],
  onDecision,
  canManageRequests,
  statusStyles,
  isUpdatingRequest,
  onContextMenu,
  isEditing = false,
  editText,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
}) => {
  const bubbleRef = useRef(null);
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
  const replyTarget = message?.replyTo || null;
  const replyAuthorName =
    replyTarget?.author?.name || replyTarget?.author?.email || "User";
  const replyText = replyTarget?.isDeleted
    ? "Message deleted"
    : replyTarget?.text || "";
  const hasReply = Boolean(replyTarget);

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
        <div
          className="w-full max-w-[560px] rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 shadow-sm"
          onContextMenu={(event) => onContextMenu?.(event, message, isMine)}
        >
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
          <SeenByAvatars users={seenByUsers} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
      onContextMenu={(event) =>
        onContextMenu?.(
          event,
          message,
          isMine,
          bubbleRef.current?.getBoundingClientRect()
        )
      }
    >
      <div
        className={`flex max-w-[92%] items-end gap-2 sm:max-w-[78%] sm:gap-3 ${
          isMine ? "flex-row-reverse" : "flex-row"
        }`}
      >
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
            className={`rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm sm:px-4 sm:py-2.5 ${
              isMine
                ? "rounded-br-md bg-indigo-600 text-white"
                : "rounded-bl-md border border-slate-200/70 bg-white text-slate-700"
            }`}
            ref={bubbleRef}
          >
            {hasReply && (
              <div className={`mb-2 rounded-lg px-3 py-2 text-xs ${
                isMine ? "bg-indigo-500/40 text-white/90" : "bg-slate-50 text-slate-500"
              }`}>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Replying to {replyAuthorName}
                </span>
                <span className="block truncate text-[11px]">
                  {replyText || "Message"}
                </span>
              </div>
            )}
            {message.isDeleted ? (
              <span className={isMine ? "text-white/80" : "text-slate-400"}>
                Message deleted.
              </span>
            ) : isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(event) => onEditChange?.(event.target.value)}
                  rows={2}
                  className={`w-full resize-none rounded-xl border px-3 py-2 text-xs shadow-sm ${
                    isMine
                      ? "border-indigo-400/40 bg-indigo-500/20 text-white placeholder:text-white/60"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                />
                <div className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      isMine
                        ? "border border-white/50 text-white"
                        : "border border-slate-200 text-slate-600"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveEdit}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      isMine
                        ? "bg-white text-indigo-600"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              message.text
            )}
          </div>
          {createdLabel && (
            <span className="text-[11px] text-slate-400">{createdLabel}</span>
          )}
          <SeenByAvatars users={seenByUsers} />
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
    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 sm:h-9 sm:w-9">
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

const SeenByAvatars = ({ users = [] }) => {
  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }

  const [activeUserId, setActiveUserId] = useState("");
  const trimmedUsers = users.slice(0, 5);
  const remainingCount = users.length - trimmedUsers.length;

  return (
    <div className="mt-1 flex w-full justify-end">
      <div className="flex items-center -space-x-2">
        {trimmedUsers.map((user) => {
          const name = user?.name || user?.fullName || "";
          const email = user?.email || "";
          const initials = getInitials(name, email);
          const imageUrl = user?.profileImageUrl;
          const userId = user?._id?.toString?.() || email || name;
          const label = name || email || "Seen";
          const isActive = userId && activeUserId === userId;

          return (
            <button
              key={userId}
              type="button"
              onClick={() =>
                setActiveUserId((previous) =>
                  previous === userId ? "" : userId
                )
              }
              className="flex items-center"
              title={label}
            >
              <span
                className={`flex h-5 items-center overflow-hidden rounded-full border border-slate-200 bg-white px-2 text-[9px] font-semibold text-slate-600 shadow-sm transition-all duration-200 ${
                  isActive
                    ? "mr-1 max-w-[140px] opacity-100"
                    : "mr-0 max-w-0 opacity-0"
                }`}
              >
                <span className="truncate">{label}</span>
              </span>
              <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white bg-slate-100 text-[9px] font-semibold text-slate-600 shadow-sm">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name || "User avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials || "?"
                )}
              </span>
            </button>
          );
        })}
        {remainingCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-200 text-[9px] font-semibold text-slate-600">
            +{remainingCount}
          </span>
        )}
      </div>
    </div>
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

const getMentionToken = (user) => {
  const name = user?.name || user?.fullName || "";
  if (name) {
    return name.trim().replace(/\s+/g, "");
  }

  const email = user?.email || "";
  if (email) {
    return email.split("@")[0];
  }

  return "";
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
