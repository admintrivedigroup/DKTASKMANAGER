import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LuCalendarDays, LuChevronDown, LuTrash2 } from "react-icons/lu";
import toast from "react-hot-toast";

import Modal from "./Modal";
import SelectDropdown from "./inputs/SelectDropdown";
import SelectUsers from "./inputs/SelectUsers";
import TodoListInput from "./inputs/TodoListInput";
import DeleteAlert from "./DeleteAlert";
import LoadingOverlay from "./LoadingOverlay";

import { PRIORITY_DATA } from "../utils/data";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { formatDateTimeLocal } from "../utils/dateUtils";
import { UserContext } from "../context/userContext.jsx";

const createDefaultTaskData = () => ({
  title: "",
  description: "",
  priority: "Medium",
  startDate: formatDateTimeLocal(new Date()),
  dueDate: "",
  assignedTo: [],
  todoChecklist: [],
});

const TaskFormModal = ({ isOpen, onClose, taskId, onSuccess, mode = "standard" }) => {
  const [taskData, setTaskData] = useState(createDefaultTaskData());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [isFetchingTask, setIsFetchingTask] = useState(false);
  const [assignedUserDetails, setAssignedUserDetails] = useState([]);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const { user } = useContext(UserContext);

  const isPersonalMode = mode === "personal";
  const isEditing = useMemo(() => Boolean(taskId), [taskId]);
  const assigneeCount = taskData.assignedTo?.length || 0;
  const checklistCount = useMemo(() => {
    const items = Array.isArray(taskData.todoChecklist)
      ? taskData.todoChecklist
      : [];

    return items.filter((item) => {
      if (!item) return false;
      if (typeof item === "string") {
        return Boolean(item.trim());
      }
      if (typeof item === "object") {
        if (typeof item.text === "string") {
          return Boolean(item.text.trim());
        }
        return Boolean(item.text);
      }
      return false;
    }).length;
  }, [taskData.todoChecklist]);
  const personalAssigneeId = useMemo(
    () =>
      user?._id && typeof user._id.toString === "function"
        ? user._id.toString()
        : "",
    [user?._id]
  );
  const personalAssigneeDetails = useMemo(
    () =>
      personalAssigneeId
        ? [
            {
              _id: personalAssigneeId,
              name: user?.name,
              email: user?.email,
              profileImageUrl: user?.profileImageUrl,
            },
          ]
        : [],
    [personalAssigneeId, user?.email, user?.name, user?.profileImageUrl]
  );

  const resetState = useCallback(() => {
    setTaskData(createDefaultTaskData());
    setCurrentTask(null);
    setError("");
    setLoading(false);
    setOpenDeleteAlert(false);
    setIsFetchingTask(false);
    setAssignedUserDetails([]);
    setShowMoreOptions(false);
  }, []);

  const handleModalClose = useCallback(() => {
    onClose?.();
    resetState();
  }, [onClose, resetState]);

  const handleValueChange = (key, value) => {
    if (isPersonalMode && key === "assignedTo") {
      if (!personalAssigneeId) {
        return;
      }

      setTaskData((prevState) => ({
        ...prevState,
        assignedTo: [personalAssigneeId],
      }));
      setAssignedUserDetails(personalAssigneeDetails);
      return;
    }

    if (key === "assignedTo") {
      setTaskData((prevState) => {
        const normalizedAssignees = Array.isArray(value)
          ? [...new Set(value.map((assignee) => assignee?.toString()))].filter(
              Boolean
            )
          : [];

        const validAssigneesSet = new Set(normalizedAssignees);

        const updatedChecklist = Array.isArray(prevState.todoChecklist)
          ? prevState.todoChecklist.map((item) => {
              const assignedValue =
                typeof item?.assignedTo === "object"
                  ? item.assignedTo?._id || item.assignedTo
                  : item?.assignedTo;
              const normalizedAssigned = assignedValue
                ? assignedValue.toString()
                : "";

              if (normalizedAssigned && validAssigneesSet.has(normalizedAssigned)) {
                return item;
              }

              return {
                ...item,
                assignedTo: normalizedAssignees[0] || "",
              };
            })
          : [];

        return {
          ...prevState,
          assignedTo: normalizedAssignees,
          todoChecklist: updatedChecklist,
        };
      });
      return;
    }

    if (key === "todoChecklist") {
      setTaskData((prevState) => ({
        ...prevState,
        todoChecklist: Array.isArray(value)
          ? value.map((item) => {
              if (!isPersonalMode || !personalAssigneeId) {
                return item;
              }

              if (typeof item === "string") {
                return { text: item, assignedTo: personalAssigneeId };
              }

              if (typeof item === "object" && item !== null) {
                if (item.assignedTo) {
                  return item;
                }
                return { ...item, assignedTo: personalAssigneeId };
              }

              return item;
            })
          : [],
      }));
      return;
    }

    setTaskData((prevState) => ({ ...prevState, [key]: value }));
  };

  const mapChecklistPayload = useCallback(
    (checklistItems, { allowUnassigned = false } = {}) => {
      if (!Array.isArray(checklistItems)) return [];

      const previousItems = Array.isArray(currentTask?.todoChecklist)
        ? currentTask.todoChecklist
        : [];

      return checklistItems
        .map((item) => {
          const text =
            typeof item === "string"
              ? item.trim()
              : typeof item?.text === "string"
              ? item.text.trim()
              : "";

          if (!text) return null;

          const assignedValue =
            item && typeof item === "object"
              ? item.assignedTo?._id || item.assignedTo || ""
              : "";
          const normalizedAssigned = assignedValue ? assignedValue.toString() : "";
          const fallbackAssignee =
            !normalizedAssigned && isPersonalMode ? personalAssigneeId : "";
          const assignedTo = normalizedAssigned || fallbackAssignee;

          if (!assignedTo && !allowUnassigned) {
            return null;
          }

          const matchedItem = previousItems.find((prevItem) => {
            if (!prevItem) return false;
            if (item?._id && prevItem?._id) {
              return prevItem._id.toString() === item._id.toString();
            }
            return (prevItem?.text || "") === text;
          });

          const completed = isEditing
            ? Boolean(item?.completed ?? matchedItem?.completed ?? false)
            : false;

          const payloadItem = {
            text,
            completed,
          };

          if (assignedTo) {
            payloadItem.assignedTo = assignedTo;
          }

          if (item?._id) {
            payloadItem._id = item._id;
          }

          return payloadItem;
        })
        .filter(Boolean);
    },
    [currentTask?.todoChecklist, isEditing, isPersonalMode, personalAssigneeId]
  );

  const handleAssignedUserDetailsUpdate = useCallback((details) => {
    setAssignedUserDetails(Array.isArray(details) ? details.filter(Boolean) : []);
  }, []);

  const clearData = useCallback(() => {
    setTaskData(createDefaultTaskData());
    setError("");
    setAssignedUserDetails([]);
  }, []);

  const handleCreateTask = async ({
    statusOverride,
    allowUnassignedChecklist = false,
    successMessage,
  } = {}) => {
    setLoading(true);

    try {
      const isDraft = statusOverride === "Draft";
      const startDateValue = taskData.startDate ? new Date(taskData.startDate) : null;
      if (taskData.startDate && Number.isNaN(startDateValue?.getTime())) {
        throw new Error("Invalid start date value");
      }

      const dueDateValue = taskData.dueDate ? new Date(taskData.dueDate) : null;
      if (taskData.dueDate && Number.isNaN(dueDateValue?.getTime())) {
        throw new Error("Invalid due date value");
      }

      if (!isDraft && !dueDateValue) {
        throw new Error("Invalid due date value");
      }

      if (startDateValue && dueDateValue && startDateValue.getTime() > dueDateValue.getTime()) {
        throw new Error("Start date cannot be after due date");
      }

      const todoChecklist = mapChecklistPayload(taskData.todoChecklist, {
        allowUnassigned: allowUnassignedChecklist,
      });

      const payload = {
        ...taskData,
        startDate: startDateValue ? startDateValue.toISOString() : null,
        dueDate: dueDateValue ? dueDateValue.toISOString() : null,
        todoChecklist,
      };

      if (statusOverride) {
        payload.status = statusOverride;
      }

      const createEndpoint = isPersonalMode
        ? API_PATHS.TASKS.CREATE_PERSONAL_TASK
        : API_PATHS.TASKS.CREATE_TASK;

      await axiosInstance.post(createEndpoint, payload);

      toast.success(successMessage || "Task created successfully");
      clearData();
      onSuccess?.();
      onClose?.();
    } catch (requestError) {
      console.error("Error creating task:", requestError);
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Failed to create task. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    setLoading(true);

    try {
      const startDateValue = taskData.startDate ? new Date(taskData.startDate) : null;
      if (!startDateValue || Number.isNaN(startDateValue.getTime())) {
        throw new Error("Invalid start date value");
      }

      const dueDateValue = taskData.dueDate ? new Date(taskData.dueDate) : null;
      if (!dueDateValue || Number.isNaN(dueDateValue.getTime())) {
        throw new Error("Invalid due date value");
      }

      if (startDateValue.getTime() > dueDateValue.getTime()) {
        throw new Error("Start date cannot be after due date");
      }

      const todoChecklist = mapChecklistPayload(taskData.todoChecklist);

      const payload = {
        ...taskData,
        startDate: startDateValue.toISOString(),
        dueDate: dueDateValue.toISOString(),
        todoChecklist,
      };

      await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TASK(taskId),
        payload
      );

      toast.success("Task updated successfully");
      onSuccess?.();
      onClose?.();
    } catch (requestError) {
      console.error("Error updating task:", requestError);
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Failed to update task. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskId) return;

    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE_TASK(taskId));

      toast.success("Task deleted successfully");
      setOpenDeleteAlert(false);
      onSuccess?.();
      onClose?.();
    } catch (requestError) {
      console.error("Error deleting task:", requestError);
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Failed to delete task. Please try again.";
      toast.error(message);
    }
  };

  const handleSubmit = () => {
    setError("");

    if (!taskData.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!taskData.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!taskData.startDate) {
      setError("Start date is required.");
      setShowMoreOptions(true);
      return;
    }

    if (!taskData.dueDate) {
      setError("Due date is required.");
      return;
    }

    if (taskData.startDate && taskData.dueDate) {
      const startDateValue = new Date(taskData.startDate);
      const dueDateValue = new Date(taskData.dueDate);

      if (startDateValue.getTime() > dueDateValue.getTime()) {
        setError("Start date cannot be after due date.");
        return;
      }
    }

    if (!taskData.assignedTo?.length) {
      setError("Assign the task to at least one member.");
      return;
    }

    if (!taskData.todoChecklist?.length) {
      setError("Add at least one todo item.");
      setShowMoreOptions(true);
      return;
    }

    const hasUnassignedTodo = taskData.todoChecklist.some((item) => {
      if (!item) return true;
      if (typeof item === "string") return true;
      const assignedValue =
        typeof item.assignedTo === "object"
          ? item.assignedTo?._id || item.assignedTo
          : item.assignedTo;
      return !assignedValue;
    });

    if (hasUnassignedTodo) {
      setError("Assign each todo item to a team member.");
      setShowMoreOptions(true);
      return;
    }

    if (isEditing) {
      handleUpdateTask();
      return;
    }

    handleCreateTask();
  };

  const handleSaveDraft = () => {
    setError("");

    if (!taskData.title.trim()) {
      setError("Title is required.");
      return;
    }

    handleCreateTask({
      statusOverride: "Draft",
      allowUnassignedChecklist: true,
      successMessage: "Draft saved successfully",
    });
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    setError("");

    if (!isEditing) {
      clearData();
      if (isPersonalMode && personalAssigneeId) {
        setTaskData((previous) => ({
          ...createDefaultTaskData(),
          assignedTo: [personalAssigneeId],
          todoChecklist: Array.isArray(previous.todoChecklist)
            ? previous.todoChecklist.map((item) => {
                if (typeof item === "string") {
                  return { text: item, assignedTo: personalAssigneeId };
                }
                if (typeof item === "object" && item !== null && !item.assignedTo) {
                  return { ...item, assignedTo: personalAssigneeId };
                }
                return item;
              })
            : [],
        }));
        setAssignedUserDetails(personalAssigneeDetails);
      }
      return;
    }

    const fetchTaskDetails = async () => {
      try {
        setIsFetchingTask(true);
        const response = await axiosInstance.get(
          API_PATHS.TASKS.GET_TASK_BY_ID(taskId)
        );

        const taskInfo = response.data;
        if (!taskInfo) {
          throw new Error("Unable to load task details.");
        }

        setCurrentTask(taskInfo);

        const assignedMembers = Array.isArray(taskInfo?.assignedTo)
          ? taskInfo.assignedTo
          : taskInfo?.assignedTo
          ? [taskInfo.assignedTo]
          : [];

        const todoChecklist = Array.isArray(taskInfo?.todoChecklist)
          ? taskInfo.todoChecklist
          : [];

        const normalizedChecklist = todoChecklist
          .map((item) => {
            const text = typeof item?.text === "string" ? item.text.trim() : "";
            if (!text) {
              return null;
            }

            const assignedValue =
              item?.assignedTo?._id || item?.assignedTo || "";

            return {
              _id: item?._id,
              text,
              assignedTo: assignedValue ? assignedValue.toString() : "",
              completed: Boolean(item?.completed),
            };
          })
          .filter(Boolean);

        setAssignedUserDetails(assignedMembers.filter(Boolean));

        setTaskData({
          title: taskInfo.title || "",
          description: taskInfo.description || "",
          priority: taskInfo.priority || "Low",
          startDate: taskInfo.startDate
            ? formatDateTimeLocal(taskInfo.startDate)
            : formatDateTimeLocal(taskInfo.createdAt || new Date()),
          dueDate: taskInfo.dueDate ? formatDateTimeLocal(taskInfo.dueDate) : "",
          assignedTo: assignedMembers
            .map((item) => item?._id || item)
            .filter(Boolean)
            .map((value) => value.toString()),
          todoChecklist: normalizedChecklist,
        });
      } catch (requestError) {
        console.error("Error fetching task:", requestError);
        const message =
          requestError.response?.data?.message ||
          requestError.message ||
          "Failed to load task details.";
        toast.error(message);
        setError(message);
      } finally {
        setIsFetchingTask(false);
      }
    };

    fetchTaskDetails();
  }, [
    isOpen,
    isEditing,
    taskId,
    clearData,
    resetState,
    isPersonalMode,
    personalAssigneeDetails,
    personalAssigneeId,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Smoothly scroll the viewport and modal content to the top when opened
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      const modalScroll = document.querySelector(".task-form-modal-scroll");
      if (modalScroll) {
        modalScroll.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isPersonalMode || !personalAssigneeId || !isOpen) {
      return;
    }

    setAssignedUserDetails(personalAssigneeDetails);
    setTaskData((previous) => {
      const normalizedChecklist = Array.isArray(previous.todoChecklist)
        ? previous.todoChecklist.map((item) => {
            if (typeof item === "string") {
              return { text: item, assignedTo: personalAssigneeId };
            }
            if (typeof item === "object" && item !== null && !item.assignedTo) {
              return { ...item, assignedTo: personalAssigneeId };
            }
            return item;
          })
        : [];

      return {
        ...previous,
        assignedTo: [personalAssigneeId],
        todoChecklist: normalizedChecklist,
      };
    });
  }, [isOpen, isPersonalMode, personalAssigneeDetails, personalAssigneeId]);

  const modalTitle = isEditing
    ? "Update Task"
    : isPersonalMode
    ? "Create Personal Task"
    : "Create Task";
  const isFormBusy = loading || isFetchingTask;
  const isCreateBlocked =
    !taskData.title.trim() || !taskData.assignedTo?.length;
  const isPrimaryDisabled = isFormBusy || (!isEditing && isCreateBlocked);
  const showSaveDraft = !isEditing;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (event.isComposing) {
        return;
      }

      const target = event.target;
      if (!target) {
        return;
      }

      if (target.isContentEditable) {
        return;
      }

      if (
        typeof target.closest === "function" &&
        !target.closest(".task-form-dialog")
      ) {
        return;
      }

      const tagName = target.tagName?.toLowerCase();
      if (tagName === "textarea" || tagName === "button") {
        return;
      }

      if (
        typeof target.closest === "function" &&
        target.closest('[data-skip-enter-submit="true"]')
      ) {
        return;
      }

      if (isPrimaryDisabled) {
        return;
      }

      event.preventDefault();
      handleSubmit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, isOpen, isPrimaryDisabled]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title={modalTitle}
        maxWidthClass="max-w-5xl"
        overlayClass="bg-black/40 backdrop-blur-sm items-start pt-6 sm:pt-10"
        dialogClass="task-form-dialog h-[90vh] max-h-[90vh]"
        bodyClass="task-form-modal-body flex h-full flex-col overflow-hidden px-0 pb-0 sm:px-0"
      >
        <div className="flex h-full flex-col">
          <div className="task-form-modal-scroll flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-8">
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 shadow-inner shadow-white/40 ring-1 ring-white/60 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {isEditing && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                      onClick={() => setOpenDeleteAlert(true)}
                    >
                      <LuTrash2 className="text-base" /> Delete Task
                    </button>
                  )}
                </div>
              </div>

              {isFetchingTask ? (
                <LoadingOverlay message="Loading task details..." className="py-16" />
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-5 lg:grid-cols-[1.1fr_0.95fr]">
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
                        <div className="flex items-center justify-between gap-3 pb-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                              Task Basics
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Name the work and give it context.
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-4">
                          <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                              Task Title
                            </label>
                            <input
                              placeholder="Create App UI"
                              className="form-input mt-0 h-12 w-full rounded-xl border border-slate-200 bg-white/80 text-slate-800 shadow-sm transition duration-200 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.14)] focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                              value={taskData.title}
                              onChange={({ target }) =>
                                handleValueChange("title", target.value)
                              }
                              disabled={loading}
                              autoFocus
                            />
                          </div>

                          <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                              Description
                            </label>
                            <textarea
                              placeholder="Describe task"
                              className="form-input mt-0 min-h-[150px] w-full rounded-xl border border-slate-200 bg-white/80 text-slate-800 shadow-sm transition duration-200 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.14)] focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                              rows={4}
                              value={taskData.description}
                              onChange={({ target }) =>
                                handleValueChange("description", target.value)
                              }
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <aside className="space-y-5">
                      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                              Schedule & Owners
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Balance priority, due date and who is driving.
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary dark:bg-primary/20 dark:text-primary-50">
                            {assigneeCount}{" "}
                            {assigneeCount === 1 ? "member" : "members"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-4">
                          <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                              Priority
                            </label>
                            <div
                              className="form-input mt-0 h-12 rounded-xl border border-slate-200 bg-white/80 p-0 shadow-sm transition duration-200 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.14)] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60"
                              data-skip-enter-submit="true"
                            >
                              <SelectDropdown
                                options={PRIORITY_DATA}
                                value={taskData.priority}
                                onChange={(value) =>
                                  handleValueChange("priority", value)
                                }
                                placeholder="Select Priority"
                                disabled={loading}
                              />
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                              Due Date & Time
                            </label>
                            <div className="relative">
                              <input
                                className="form-input mt-0 h-12 rounded-xl border border-slate-200 bg-white/80 pr-11 text-slate-800 shadow-sm transition duration-200 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.14)] focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                                value={taskData.dueDate}
                                onChange={({ target }) =>
                                  handleValueChange("dueDate", target.value)
                                }
                                type="datetime-local"
                                min={taskData.startDate || undefined}
                                disabled={loading}
                              />
                              <LuCalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                              Assign To
                            </label>

                            {isPersonalMode ? (
                              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-inner shadow-white/50 ring-1 ring-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/30">
                                Assigned to you. Checklist items will be
                                auto-assigned to your profile.
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 transition-colors duration-300 shadow-inner shadow-white/50 dark:border-slate-700/70 dark:bg-slate-900/60">
                                <SelectUsers
                                  selectedUsers={taskData.assignedTo}
                                  setSelectedUsers={(value) =>
                                    handleValueChange("assignedTo", value)
                                  }
                                  onSelectedUsersDetails={
                                    handleAssignedUserDetailsUpdate
                                  }
                                />
                                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                                  Assign a member to enable checklist tracking.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100 dark:text-slate-300 dark:hover:text-white dark:focus-visible:ring-indigo-500/40"
                    onClick={() => setShowMoreOptions((prev) => !prev)}
                    aria-expanded={showMoreOptions}
                  >
                    <span>More options</span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {checklistCount} {checklistCount === 1 ? "item" : "items"}
                    </span>
                    <LuChevronDown
                      className={`text-base transition-transform duration-300 ${
                        showMoreOptions ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                      showMoreOptions
                        ? "pointer-events-auto max-h-[1400px] opacity-100"
                        : "pointer-events-none max-h-0 opacity-0"
                    }`}
                  >
                    <div className="space-y-5 pt-4">
                      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.95fr]">
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 transition-colors duration-300 dark:text-slate-300">
                                  Checklist
                                </p>
                                <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-slate-400">
                                  Break the work into smaller action items for
                                  better progress tracking.
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-slate-500 transition-colors duration-300 dark:text-slate-400">
                                {checklistCount}{" "}
                                {checklistCount === 1 ? "item" : "items"}
                              </span>
                            </div>
                            <TodoListInput
                              todoList={taskData.todoChecklist}
                              setTodoList={(value) =>
                                handleValueChange("todoChecklist", value)
                              }
                              assignedUsers={assignedUserDetails}
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <aside className="space-y-5">
                          <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
                            <div className="flex items-center justify-between gap-3 pb-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                                  Scheduling Details
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  Optional timing refinements.
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 space-y-4">
                              <div className="space-y-2.5">
                                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                                  Start Date & Time
                                </label>
                                <div className="relative">
                                  <input
                                    className="form-input mt-0 h-12 rounded-xl border border-slate-200 bg-white/80 pr-11 text-slate-800 shadow-sm transition duration-200 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.14)] focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                                    value={taskData.startDate}
                                    onChange={({ target }) =>
                                      handleValueChange("startDate", target.value)
                                    }
                                    type="datetime-local"
                                    max={taskData.dueDate || undefined}
                                    disabled={loading}
                                  />
                                  <LuCalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </aside>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-5 py-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Double-check details, then publish the task for the team.
              </p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-white dark:focus:ring-indigo-500/40 sm:w-auto"
                  onClick={handleModalClose}
                  disabled={isFormBusy}
                >
                  Cancel
                </button>
                {showSaveDraft && (
                  <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus:ring-indigo-500/40 sm:w-auto"
                    onClick={handleSaveDraft}
                    disabled={isFormBusy || !taskData.title.trim()}
                  >
                    Save as Draft
                  </button>
                )}
                <button
                  type="button"
                  className="add-btn h-11 w-full sm:w-auto"
                  onClick={handleSubmit}
                  disabled={isPrimaryDisabled}
                >
                  {loading
                    ? "Saving..."
                    : isEditing
                    ? "Update Task"
                    : isPersonalMode
                    ? "Create Personal Task"
                    : "Create Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={openDeleteAlert}
        onClose={() => setOpenDeleteAlert(false)}
        title="Delete Task"
      >
        <DeleteAlert
          content="Are you sure you want to delete this task?"
          onDelete={handleDeleteTask}
        />
      </Modal>
    </>
  );
};

export default TaskFormModal;
