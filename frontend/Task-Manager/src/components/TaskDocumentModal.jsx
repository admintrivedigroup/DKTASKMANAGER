import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LuCloudUpload, LuX } from "react-icons/lu";

import Modal from "./Modal";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import {
  DOCUMENT_UPLOAD_DISABLED_MESSAGE,
  DOCUMENT_UPLOAD_ENABLED,
} from "../utils/featureFlags";

const createDefaultFormState = () => ({
  title: "",
  documentType: "",
  description: "",
});

const TaskDocumentModal = ({ isOpen, onClose, taskId, onSuccess }) => {
  const [formState, setFormState] = useState(createDefaultFormState());
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFormState(createDefaultFormState());
      setSelectedFile(null);
      setIsSubmitting(false);
      setError("");
    }
  }, [isOpen]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();

    if (!DOCUMENT_UPLOAD_ENABLED) {
      setError(DOCUMENT_UPLOAD_DISABLED_MESSAGE);
      return;
    }

    if (!taskId) {
      setError("Please save the task before uploading documents.");
      return;
    }

    if (!formState.title.trim()) {
      setError("Document title is required.");
      return;
    }

    if (!selectedFile) {
      setError("Select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("title", formState.title.trim());

    if (formState.documentType.trim()) {
      formData.append("documentType", formState.documentType.trim());
    }

    if (formState.description.trim()) {
      formData.append("description", formState.description.trim());
    }

    formData.append("file", selectedFile);

    try {
      setIsSubmitting(true);
      setError("");

      const response = await axiosInstance.post(
        API_PATHS.TASKS.UPLOAD_DOCUMENT(taskId),
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const responseDocument = response.data?.document;
      toast.success(response.data?.message || "Document uploaded successfully.");
      onSuccess?.(responseDocument);
      onClose?.();
    } catch (requestError) {
      console.error("Failed to upload document:", requestError);
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Failed to upload document.";
      toast.error(message);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          onClose?.();
        }
      }}
      title={DOCUMENT_UPLOAD_ENABLED ? "Upload Document" : "Document Upload Unavailable"}
    >
      {DOCUMENT_UPLOAD_ENABLED ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Document Title
            </label>
            <input
              type="text"
              name="title"
              value={formState.title}
              onChange={handleInputChange}
              className="form-input mt-0 h-11 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="e.g. Evidence Summary"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Document Type
            </label>
            <input
              type="text"
              name="documentType"
              value={formState.documentType}
              onChange={handleInputChange}
              className="form-input mt-0 h-11 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="e.g. PDF, Statement, Transcript"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Description
            </label>
            <textarea
              name="description"
              value={formState.description}
              onChange={handleInputChange}
              className="form-input mt-0 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/10"
              rows={3}
              placeholder="Provide any helpful context about this document"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              File
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-primary/60 hover:bg-primary/5">
              <LuCloudUpload className="text-2xl text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">
                  {selectedFile ? selectedFile.name : "Choose a file"}
                </p>
                <p className="text-xs text-slate-500">
                  PDF, Word, Excel or image files up to 25MB
                </p>
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
            </label>
            {selectedFile && !isSubmitting && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-500"
                onClick={() => setSelectedFile(null)}
              >
                <LuX className="text-sm" /> Remove file
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm font-medium text-rose-500">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              onClick={() => {
                if (!isSubmitting) {
                  onClose?.();
                }
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">{DOCUMENT_UPLOAD_DISABLED_MESSAGE}</p>
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              onClick={() => {
                if (!isSubmitting) {
                  onClose?.();
                }
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TaskDocumentModal;