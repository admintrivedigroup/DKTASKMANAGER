import React, { useCallback, useMemo, useState } from "react";
import { LuTriangleAlert, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import toast from "react-hot-toast";

import Modal from "../Modal";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const DeleteMatterModal = ({ isOpen, onClose, matter, onDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const matterId = matter?._id;

  const matterTitle = useMemo(() => {
    if (!matter) {
      return "this matter";
    }

    return matter?.title || "this matter";
  }, [matter]);

  const handleCancel = useCallback(() => {
    if (isDeleting) {
      return;
    }

    onClose?.();
  }, [isDeleting, onClose]);

  const handleDelete = useCallback(async () => {
    if (!matterId || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      await axiosInstance.delete(API_PATHS.MATTERS.DELETE(matterId));
      toast.success("Matter deleted successfully");
      await Promise.resolve(onDeleted?.(matter));
    } catch (error) {
      console.error("Failed to delete matter", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete matter.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, matter, matterId, onDeleted]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Delete Matter"
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200">
          <LuTriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">This action is permanent.</p>
            <p className="mt-1 text-xs text-rose-500 dark:text-rose-200/80">
              Deleting <span className="font-medium">{matterTitle}</span> will remove all of its cases and files. This action cannot be undone.
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
            disabled={!matterId || isDeleting}
          >
            {isDeleting ? (
              <>
                <LuRefreshCw className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <LuTrash2 className="h-4 w-4" />
                Delete Matter
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteMatterModal;