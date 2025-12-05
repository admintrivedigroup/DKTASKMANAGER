import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LuCalendarDays, LuTrash2 } from "react-icons/lu";
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
import { formatDateInputValue } from "../utils/dateUtils";

const createDefaultTaskData = () => ({
  title: "",
  description: "",
  priority: "Low",
  dueDate: "",
  assignedTo: [],
  todoChecklist: [],
});

const TaskFormModal = ({ isOpen, onClose, taskId, onSuccess }) => {
  const [taskData, setTaskData] = useState(createDefaultTaskData());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [isFetchingTask, setIsFetchingTask] = useState(false);
  const [assignedUserDetails, setAssignedUserDetails] = useState([]);

  const isEditing = useMemo(() => Boolean(taskId), [taskId]);
  const assigneeCount = taskData.assignedTo?.length || 0;

  const resetState = useCallback(() => {
    setTaskData(createDefaultTaskData());
    setCurrentTask(null);
    setError("");
    setLoading(false);
    setOpenDeleteAlert(false);
    setIsFetchingTask(false);
    setAssignedUserDetails([]);
  }, []);

  const handleValueChange = (key, value) => {
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
        todoChecklist: Array.isArray(value) ? value : [],
      }));
      return;
    }

    setTaskData((prevState) => ({ ...prevState, [key]: value }));
  };

  const mapChecklistPayload = useCallback(
    (checklistItems) => {
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
          const assignedTo = assignedValue ? assignedValue.toString() : "";

          if (!assignedTo) {
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
            assignedTo,
            completed,
          };

          if (item?._id) {
            payloadItem._id = item._id;
          }

          return payloadItem;
        })
        .filter(Boolean);
    },
    [currentTask?.todoChecklist, isEditing]
  );

  const handleAssignedUserDetailsUpdate = useCallback((details) => {
    setAssignedUserDetails(Array.isArray(details) ? details.filter(Boolean) : []);
  }, []);

  const clearData = useCallback(() => {
    setTaskData(createDefaultTaskData());
    setError("");
    setAssignedUserDetails([]);
  }, []);

  const handleCreateTask = async () => {
    setLoading(true);

    try {
      const dueDateValue = taskData.dueDate ? new Date(taskData.dueDate) : null;
      if (!dueDateValue || Number.isNaN(dueDateValue.getTime())) {
        throw new Error("Invalid due date value");
      }

      const todoChecklist = mapChecklistPayload(taskData.todoChecklist);

      const payload = {
        ...taskData,
        dueDate: dueDateValue.toISOString(),
        todoChecklist,
      };

      await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, payload);

      toast.success("Task created successfully");
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
      const dueDateValue = taskData.dueDate ? new Date(taskData.dueDate) : null;
      if (!dueDateValue || Number.isNaN(dueDateValue.getTime())) {
        throw new Error("Invalid due date value");
      }

      const todoChecklist = mapChecklistPayload(taskData.todoChecklist);

      const payload = {
        ...taskData,
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

    if (!taskData.dueDate) {
      setError("Due date is required.");
      return;
    }

    if (!taskData.assignedTo?.length) {
      setError("Assign the task to at least one member.");
      return;
    }

    if (!taskData.todoChecklist?.length) {
      setError("Add at least one todo item.");
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
      return;
    }

    if (isEditing) {
      handleUpdateTask();
      return;
    }

    handleCreateTask();
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    setError("");

    if (!isEditing) {
      clearData();
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
          dueDate: taskInfo.dueDate
            ? formatDateInputValue(taskInfo.dueDate)
            : "",
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
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
  }, [isOpen]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose?.();
          resetState();
        }}
        title={isEditing ? "Update Task" : "Create Task"}
        maxWidthClass="max-w-6xl"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 shadow-inner shadow-white/40 ring-1 ring-white/60 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                  {isEditing ? "Refine & reship" : "Task Blueprint"}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {isEditing
                    ? "Make adjustments and keep the team aligned."
                    : "Share the details your team needs to get started."}
                </p>
              </div>
              {isEditing && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-500 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:border-rose-400 dark:hover:bg-rose-500/20"
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
                  <div className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800/80">
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
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                          Task Title
                        </label>
                        <input
                          placeholder="Create App UI"
                          className="form-input mt-0 h-12 w-full rounded-xl border border-slate-200 bg-white/80 text-slate-800 shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                          value={taskData.title}
                          onChange={({ target }) => handleValueChange("title", target.value)}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                          Description
                        </label>
                        <textarea
                          placeholder="Describe task"
                          className="form-input mt-0 min-h-[150px] w-full rounded-xl border border-slate-200 bg-white/80 text-slate-800 shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                          rows={4}
                          value={taskData.description}
                          onChange={({ target }) => handleValueChange("description", target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800/80">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 transition-colors duration-300 dark:text-slate-100">
                          Todo Checklist
                        </p>
                        <p className="text-xs text-slate-500 transition-colors duration-300 dark:text-slate-400">
                          Break the work into smaller action items for better progress tracking.
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 transition-colors duration-300 dark:text-slate-500">
                        Tasks
                      </span>
                    </div>
                    <TodoListInput
                      todoList={taskData.todoChecklist}
                      setTodoList={(value) => handleValueChange("todoChecklist", value)}
                      assignedUsers={assignedUserDetails}
                      disabled={loading || !taskData.assignedTo.length}
                    />
                  </div>
                </div>

                <aside className="space-y-5">
                  <div className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800/80">
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
                        {assigneeCount} {assigneeCount === 1 ? "member" : "members"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                          Priority
                        </label>
                        <div className="form-input mt-0 h-12 rounded-xl border border-slate-200 bg-white/80 p-0 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60">
                          <SelectDropdown
                            options={PRIORITY_DATA}
                            value={taskData.priority}
                            onChange={(value) => handleValueChange("priority", value)}
                            placeholder="Select Priority"
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                          Due Date
                        </label>
                        <div className="relative">
                          <input
                            className="form-input mt-0 h-12 rounded-xl border border-slate-200 bg-white/80 pr-11 text-slate-800 shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                            value={taskData.dueDate}
                            onChange={({ target }) => handleValueChange("dueDate", target.value)}
                            type="date"
                            disabled={loading}
                          />
                          <LuCalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                          Assign To
                        </label>

                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 transition-colors duration-300 shadow-inner shadow-white/50 dark:border-slate-700/70 dark:bg-slate-900/60">
                          <SelectUsers
                            selectedUsers={taskData.assignedTo}
                            setSelectedUsers={(value) => handleValueChange("assignedTo", value)}
                            onSelectedUsersDetails={handleAssignedUserDetailsUpdate}
                          />
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Assign at least one member to enable the checklist.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Double-check details, then publish the task for the team.
                </p>
                <button
                  type="button"
                  className="add-btn self-start sm:self-auto"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : isEditing
                    ? "Update Task"
                    : "Create Task"}
                </button>
              </div>
            </div>
          )}
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
