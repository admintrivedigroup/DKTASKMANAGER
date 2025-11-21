import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import AvatarGroup from "../../components/AvatarGroup";
import { LuSquareArrowOutUpRight, LuUpload } from "react-icons/lu";
import LoadingOverlay from "../../components/LoadingOverlay";
import { formatDateLabel } from "../../utils/dateUtils";
import toast from "react-hot-toast";
import { UserContext } from "../../context/userContext.jsx";
import { hasPrivilegedAccess } from "../../utils/roleUtils";
import TaskDocumentModal from "../../components/TaskDocumentModal";
import {
  DOCUMENT_UPLOAD_DISABLED_MESSAGE,
  DOCUMENT_UPLOAD_ENABLED,
} from "../../utils/featureFlags";

const ViewTaskDetails = ({ activeMenu = "My Tasks" }) => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const isDocumentUploadEnabled = DOCUMENT_UPLOAD_ENABLED;
  useEffect(() => {
    if (!isDocumentUploadEnabled) {
      setIsDocumentModalOpen(false);
    }
  }, [isDocumentUploadEnabled]); 
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

  const resolveDocumentUrl = (fileUrl) => {
    if (!fileUrl) {
      return "";
    }

    if (/^https?:\/\//i.test(fileUrl)) {
      return fileUrl;
    }

    const baseUrl =
      (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL) ||
      BASE_URL ||
      "";

    const normalizedBase = baseUrl.replace(/\/?$/, "");
    const normalizedPath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;

    return `${normalizedBase}/${normalizedPath}`;
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

  const handleDocumentUploadSuccess = useCallback((document) => {
    if (!document || (!document._id && !document.id)) {
      return;
    }

    const documentId =
      typeof document._id === "object" && document._id !== null
        ? document._id.toString()
        : typeof document._id === "string"
        ? document._id
        : typeof document.id === "string"
        ? document.id
        : "";

    if (!documentId) {
      return;
    }

    const normalizedDocument = {
      _id: documentId,
      title: document.title || "Document",
      documentType: document.documentType || "",
      version: document.version,
      fileUrl: document.fileUrl || "",
    };

    setTask((prevTask) => {
      if (!prevTask) {
        return prevTask;
      }

      const existingDocuments = Array.isArray(prevTask.relatedDocuments)
        ? prevTask.relatedDocuments.map((item) => item)
        : [];

      const alreadyExists = existingDocuments.some((item) => {
        const itemId =
          typeof item === "object" && item !== null
            ? item._id || item.id
            : item;
        return itemId && itemId.toString() === documentId;
      });

      if (alreadyExists) {
        return {
          ...prevTask,
          relatedDocuments: existingDocuments.map((item) => {
            const itemId =
              typeof item === "object" && item !== null
                ? item._id || item.id
                : item;

            if (itemId && itemId.toString() === documentId) {
              return normalizedDocument;
            }

            return item;
          }),
        };
      }

      return {
        ...prevTask,
        relatedDocuments: [...existingDocuments, normalizedDocument],
      };
    });
  }, []);

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

  const matterClientIdRaw = task?.matter?.client
    ? typeof task.matter.client === "object"
      ? task.matter.client._id || task.matter.client.id || task.matter.client
      : task.matter.client
    : null;
  const normalizedMatterClientId = matterClientIdRaw
    ? matterClientIdRaw.toString()
    : "";

  const isAssignedMember = assignedMembers.some((member) => {
    if (!member) {
      return false;
    }

    const memberId =
      typeof member === "object" && member !== null
        ? member._id || member.id
        : member;

    return memberId && normalizedUserId && memberId.toString() === normalizedUserId;
  });

  const isTaskClient =
    normalizedMatterClientId && normalizedMatterClientId === normalizedUserId;

  const canUploadDocumentByRole =
    isPrivilegedUser || isAssignedMember || isTaskClient;
  const canUploadDocument =
    canUploadDocumentByRole && isDocumentUploadEnabled;
  const showUploadDisabledMessage =
    canUploadDocumentByRole && !isDocumentUploadEnabled;

  const matterClientLabel =
    task?.matter?.client?.name || task?.matter?.clientName || "";    
  const matterLabel = task?.matter
    ? `${task.matter?.title || "Matter"}${
        matterClientLabel ? " — " + matterClientLabel : ""
      }`
    : "Not linked";

  const caseLabel = task?.caseFile
    ? task.caseFile?.title || task.caseFile?.caseNumber || "Linked case"
    : task?.matter
    ? "General matter"
    : "Not linked";

  const relatedDocuments = Array.isArray(task?.relatedDocuments)
    ? task.relatedDocuments
    : [];

  return (
    <DashboardLayout activeMenu={activeMenu}>
      {isLoading ? (
        <LoadingOverlay message="Loading task details..." className="py-24" />
      ) : (
        <>
          <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-700 to-sky-600 px-4 py-7 text-white shadow-[0_20px_45px_rgba(30,64,175,0.35)] sm:px-6 sm:py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.2),_transparent_60%)]" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.42em] text-white/60">Task Detail</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{task?.title || "Task"}</h2>
              </div>

              {task?.status && (
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] ${getStatusTagColor(task.status)}`}>
                  {task.status}
                </div>
              )}
            </div>
          </section>

          {task ? (
            <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <div className="form-card">
                <div className="grid grid-cols-1 gap-6">
                  <InfoBox label="Description" value={task?.description} />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InfoBox label="Priority" value={task?.priority} />
                    <InfoBox
                      label="Due Date"
                      value={formatDateLabel(task?.dueDate, "N/A")}
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

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InfoBox label="Matter" value={matterLabel} />
                    <InfoBox label="Case File" value={caseLabel} />
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
                        const canToggle =
                          isPrivilegedUser ||
                          (assignedId && assignedId === normalizedUserId);

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

                {canUploadDocument ? (
                  <button
                    type="button"
                    onClick={() => setIsDocumentModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                  >
                    <LuUpload className="text-sm" /> Upload Document
                  </button>
                ) : (
                  showUploadDisabledMessage && (
                    <p className="text-xs font-medium text-rose-500">
                      {DOCUMENT_UPLOAD_DISABLED_MESSAGE}
                    </p>
                  )                  
                )}

                {relatedDocuments.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                      Linked Documents
                    </p>
                    <div className="space-y-3">
                      {relatedDocuments.map((document, index) => {
                        const documentId = document?._id || `${document.title || "document"}_${index}`;
                        const documentUrl = resolveDocumentUrl(document?.fileUrl || "");

                        return (
                          <div
                            key={documentId}
                            className="space-y-2 rounded-2xl border border-white/60 bg-white/80 p-3 shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                          >
                            <p className="text-sm font-semibold text-slate-800">
                              {document?.title || "Document"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(document?.documentType || "Supporting material").trim() || "Supporting material"} · v{document?.version || 1}
                            </p>
                            {documentUrl && (
                              <a
                                href={documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary transition hover:text-primary/80"
                              >
                                <LuSquareArrowOutUpRight className="text-sm" /> View Document
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}                
              </aside>
            </section>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Unable to load this task. Please return to your task list.
            </div>
          )}
        </>
      )}
      <TaskDocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        taskId={id}
        onSuccess={handleDocumentUploadSuccess}
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

const TodoCheckList = ({ text, isChecked, onChange, disabled, assigneeName }) => {
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
            {assigneeName
              ? `Only ${assigneeName} can mark this item complete.`
              : "Only the assigned member can mark this item complete."}
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