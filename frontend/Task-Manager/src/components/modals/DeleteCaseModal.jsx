import React, { useCallback, useMemo, useState } from "react";
import { LuTriangleAlert, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import toast from "react-hot-toast";

import Modal from "../Modal";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const DeleteCaseModal = ({ isOpen, onClose, caseFile, onDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const caseId = caseFile?._id;

  const caseTitle = useMemo(() => {
    if (!caseFile) {
      return "this case file";
    }

    return caseFile?.title || "this case file";
  }, [caseFile]);

  const matterTitle = useMemo(() => {
    if (!caseFile) {
      return "";
    }

    if (typeof caseFile?.matter === "string") {
      return "";
    }

    return caseFile?.matter?.title || "";
  }, [caseFile]);

  const handleCancel = useCallback(() => {
    if (isDeleting) {
      return;
    }

    onClose?.();
  }, [isDeleting, onClose]);

  const handleDelete = useCallback(async () => {
    if (!caseId || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      await axiosInstance.delete(API_PATHS.CASES.DELETE(caseId));
      toast.success("Case file deleted successfully");
      await Promise.resolve(onDeleted?.(caseFile));
    } catch (error) {
      console.error("Failed to delete case file", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete case file.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [caseFile, caseId, isDeleting, onDeleted]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Delete Case File"
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200">
          <LuTriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">This action is permanent.</p>
            <p className="mt-1 text-xs text-rose-500 dark:text-rose-200/80">
              Deleting <span className="font-medium">{caseTitle}</span>
              {matterTitle ? (
                <>
                  {" "}
                  from <span className="font-medium">{matterTitle}</span>
                </>
              ) : null}
              {" "}will remove its associated tasks. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400/60 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!caseId || isDeleting}
          >
            {isDeleting ? (
              <>
                <LuRefreshCw className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <LuTrash2 className="h-4 w-4" />
                Delete Case
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteCaseModal;
