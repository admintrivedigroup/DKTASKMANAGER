import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import AvatarGroup from "../../components/AvatarGroup";
import { LuSquareArrowOutUpRight } from "react-icons/lu";
import LoadingOverlay from "../../components/LoadingOverlay";
import { formatDateTimeLabel } from "../../utils/dateUtils";
import toast from "react-hot-toast";
import { UserContext } from "../../context/userContext.jsx";
import { hasPrivilegedAccess } from "../../utils/roleUtils";
import TaskFormModal from "../../components/TaskFormModal";

const ViewTaskDetails = ({ activeMenu = "My Tasks" }) => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const { user } = useContext(UserContext);

  const tasksRoute = useMemo(() => {
    const role = user?.role;

    switch (role) {
      case "admin":
        return "/admin/tasks";
      case "super_admin":
        return "/super-admin/tasks";
      default:
        return "/user/tasks";
    }
  }, [user?.role]);

  const getStatusTagColor = (status) => {
    switch (status) {
      case "In Progress":
        return "bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 text-white";
      case "Completed":
        return "bg-gradient-to-r from-emerald-500 via-lime-400 to-green-500 text-white";
      default:
        return "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white";
    }
  };

  // Fetch Task info by ID
  const getTaskDetailsByID = useCallback(async () => {
    try {
      setIsLoading(true);
      setTask(null);

      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_TASK_BY_ID(id)
      );
    
      if (response.data) {
        const taskInfo = response.data;
        setTask(taskInfo);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // handle todo check
  const updateTodoCheckList = async (todoId) => {
    if (!task) {
      return;
    }

    const todoChecklist = Array.isArray(task.todoChecklist)
      ? task.todoChecklist.map((item) => ({ ...item }))
      : [];

    const itemIndex = todoChecklist.findIndex((item) => {
      const itemId = item?._id || item?.id;
      return itemId && itemId.toString() === todoId;
    });

    if (itemIndex === -1) {
      return;
    }

    const currentItem = todoChecklist[itemIndex];

    if (!hasTaskStarted) {
      toast.error("Checklist items can be completed once the task start time is reached.");
      return;
    }

    const assignedValue =
      currentItem?.assignedTo?._id || currentItem?.assignedTo || "";
    const assignedId = assignedValue ? assignedValue.toString() : "";
    const userId = user?._id ? user._id.toString() : "";
    const isPrivilegedUser = hasPrivilegedAccess(user?.role);
    const isAssignedToUser = assignedId && userId && assignedId === userId;

    if (!isPrivilegedUser && !isAssignedToUser) {
      toast.error("Only the assigned member can complete this item.");
      return;
    }

    const previousChecklist = todoChecklist.map((item) => ({ ...item }));
    const updatedChecklist = todoChecklist.map((item, index) =>
      index === itemIndex ? { ...item, completed: !item.completed } : item
    );

    setTask((prevTask) =>
      prevTask ? { ...prevTask, todoChecklist: updatedChecklist } : prevTask
    );

    try {
      const response = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(id),
        {
          todoChecklist: updatedChecklist.map((item) => ({
            _id: item?._id,
            completed: !!item?.completed,
          })),
        }
      );

      if (response.status === 200) {
        setTask((prevTask) =>
          response.data?.task ||
          (prevTask
            ? { ...prevTask, todoChecklist: updatedChecklist }
            : prevTask)
        );
      } else {
        setTask((prevTask) =>
          prevTask
            ? { ...prevTask, todoChecklist: previousChecklist }
            : prevTask
        );       
      }
    } catch (error) {
      console.error("Failed to update checklist", error);
      setTask((prevTask) =>
        prevTask ? { ...prevTask, todoChecklist: previousChecklist } : prevTask
      );
      toast.error("Failed to update checklist");      
    }
  };
  

  // Handle attachment link lick
  const handleLinkClick = (link) => {
    if (!/^https?:\/\//i.test(link)) {
      link = "https://" + link; // Default to HTTPS
    }
    window.open(link, "_blank");
  };

  useEffect(() => {
    if (id) {
      getTaskDetailsByID();
    }
  }, [getTaskDetailsByID, id]);

  const assignedMembers = Array.isArray(task?.assignedTo)
    ? task.assignedTo
    : task?.assignedTo
    ? [task.assignedTo]
    : [];

  const todoChecklistItems = Array.isArray(task?.todoChecklist)
    ? task.todoChecklist
    : [];

  const normalizedUserId = user?._id ? user._id.toString() : "";
  const isPrivilegedUser = hasPrivilegedAccess(user?.role);
  const isPersonalTask = Boolean(task?.isPersonal);
  const isAssignedToCurrentUser = assignedMembers.some((member) => {
    const memberId =
      member?._id || member?.id || (typeof member === "string" ? member : null);
    return memberId && normalizedUserId && memberId.toString() === normalizedUserId;
  });
  const hasTaskStarted = useMemo(() => {
    if (!task?.startDate) {
      return true;
    }

    const parsed = new Date(task.startDate);
    if (Number.isNaN(parsed.getTime())) {
      return true;
    }

    return parsed.getTime() <= Date.now();
  }, [task?.startDate]);

  return (
    <DashboardLayout activeMenu={activeMenu}>
      {isLoading ? (
        <LoadingOverlay message="Loading task details..." className="py-24" />
      ) : (
        <>
          <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.08),transparent_36%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <h1 className="text-[28px] font-bold text-slate-900 sm:text-[30px]">
                    {task?.title || "Task"}
                  </h1>
                  <p className="text-sm text-slate-600">
                    Task details, status, and checklist progress.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {task?.status && (
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white ${getStatusTagColor(task.status)}`}>
                      Status: {task.status}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                    Priority: {task?.priority || "N/A"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                    Due: {formatDateTimeLabel(task?.dueDate, "N/A")}
                  </span>
                </div>
              </div>

              <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {isPersonalTask && isAssignedToCurrentUser && (
                  <button
                    type="button"
                    className="add-btn h-11"
                    onClick={() => setIsTaskFormOpen(true)}
                  >
                    Update Task
                  </button>
                )}
                <Link
                  to={tasksRoute}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
                >
                  Back to Tasks
                </Link>
              </div>
            </div>
          </section>

          {task ? (
            <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <div className="form-card">
                <div className="grid grid-cols-1 gap-6">
                    <InfoBox label="Description" value={task?.description} />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <InfoBox label="Priority" value={task?.priority} />
                    <InfoBox
                      label="Start Date"
                      value={formatDateTimeLabel(task?.startDate, "N/A")}
                    />
                    <InfoBox
                      label="Due Date"
                      value={formatDateTimeLabel(task?.dueDate, "N/A")}
                    />
                                        <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Assigned To</p>
                      <div className="mt-2 rounded-2xl border border-white/60 bg-white/80 p-3">
                        <AvatarGroup
                          avatars={assignedMembers?.map?.((item) => item?.profileImageUrl)}
                          maxVisible={5}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Todo Checklist</p>
                    <div className="mt-3 space-y-3">
                      {todoChecklistItems?.map?.((item, index) => {
                        const todoIdValue = item?._id || item?.id || null;
                        const todoId = todoIdValue
                          ? todoIdValue.toString()
                          : null;
                        const assignedValue =
                          item?.assignedTo?._id || item?.assignedTo || "";
                        const assignedId = assignedValue
                          ? assignedValue.toString()
                          : "";

                        const assigneeDetails =
                          (typeof item?.assignedTo === "object" &&
                            item?.assignedTo !== null
                            ? item.assignedTo
                            : null) ||
                          assignedMembers.find((member) => {
                            const memberId = member?._id || member?.id || member;
                            return memberId && memberId.toString() === assignedId;
                          });

                        const assigneeName = assigneeDetails?.name || "";
                        const canToggleUser =
                          isPrivilegedUser ||
                          (assignedId && assignedId === normalizedUserId);
                        const canToggle = hasTaskStarted && canToggleUser;
                        const disabledMessage = !hasTaskStarted
                          ? "Checklist unlocks once the task start time is reached."
                          : !canToggleUser
                          ? assigneeName
                            ? `Only ${assigneeName} can mark this item complete.`
                            : "Only the assigned member can mark this item complete."
                          : "";

                        return (
                          <TodoCheckList
                            key={`todo_${todoId || index}`}
                            text={item.text}
                            isChecked={item?.completed}
                            onChange={() => {
                              if (canToggle && todoId) {
                                updateTodoCheckList(todoId);
                              }
                            }}
                            disabled={!canToggle || !todoId}
                            assigneeName={assigneeName}
                            disabledMessage={disabledMessage}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {task?.attachments?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Attachments</p>
                      <div className="mt-3 space-y-3">
                        {task?.attachments?.map?.((link, index) => (
                          <Attachment
                            key={`link_${index}`}
                            link={link}
                            index={index}
                            onClick={() => handleLinkClick(link)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <aside className="form-card space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Project Pulse</h3>
                <p className="text-sm text-slate-500">
                  Track status, due dates and collaboration at a glance.
                </p>
                <Link
                  to={tasksRoute}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-slate-900 hover:to-indigo-600 hover:text-white"
                >
                  Back to Tasks
                </Link>
              </aside>
            </section>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Unable to load this task. Please return to your task list.
            </div>
          )}
        </>
      )}

      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSuccess={() => {
          getTaskDetailsByID();
          setIsTaskFormOpen(false);
        }}
        taskId={isPersonalTask && isAssignedToCurrentUser ? id : null}
        mode="personal"
      />
    </DashboardLayout>
  );
};

export default ViewTaskDetails;

const InfoBox = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
};

const TodoCheckList = ({
  text,
  isChecked,
  onChange,
  disabled,
  assigneeName,
  disabledMessage,
}) => {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 h-5 w-5 cursor-pointer rounded-full border border-slate-300 text-primary focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="space-y-1">
        <p className="text-sm text-slate-700">{text}</p>
        {assigneeName && (
          <p className="text-xs text-slate-500">Assigned to {assigneeName}</p>
        )}
        {disabled && (
          <p className="text-[11px] text-slate-400">
            {disabledMessage ||
              (assigneeName
                ? `Only ${assigneeName} can mark this item complete.`
                : "Only the assigned member can mark this item complete.")}
          </p>
        )}
      </div>
    </div>
  );
};

const Attachment = ({ link, index, onClick }) => {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-left text-sm text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
      onClick={onClick}
    >
      <div className="flex flex-1 items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          {index < 9 ? `0${index + 1}` : index + 1}
        </span>

        <p className="line-clamp-1 text-sm">{link}</p>
      </div>

      <LuSquareArrowOutUpRight className="text-base" />
    </button>
  );
};
