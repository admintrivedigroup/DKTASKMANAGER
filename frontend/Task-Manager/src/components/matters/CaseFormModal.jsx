import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuBriefcase,
  LuCalendarDays,
  LuFileText,
  LuRefreshCw,
  LuTag,
  LuUser,
} from "react-icons/lu";
import toast from "react-hot-toast";

import Modal from "../Modal";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { getRoleLabel, normalizeRole } from "../../utils/roleUtils";
import SearchableSelect from "../SearchableSelect";

const CASE_STATUSES = ["Pre-Filing", "Active", "Discovery", "Trial", "Closed"];

const filterOptions = (
  items,
  searchTerm,
  getId,
  getLabel,
  selectedValues = []
) => {
  if (!Array.isArray(items)) {
    return [];
  }

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const matches = !normalizedQuery
    ? items
    : items.filter((item) => {
        const label = getLabel(item) || "";
        return label.toLowerCase().includes(normalizedQuery);
      });

  const normalizedSelected = Array.isArray(selectedValues)
    ? selectedValues
        .filter((value) =>
          ["string", "number"].includes(typeof value) && value !== ""
        )
        .map((value) => value.toString())
    : [selectedValues]
        .filter((value) =>
          ["string", "number"].includes(typeof value) && value !== ""
        )
        .map((value) => value.toString());

  if (!normalizedSelected.length || !normalizedQuery) {
    return matches;
  }

  const matchesById = new Set(
    matches
      .map((item) => {
        const id = getId(item);
        return ["string", "number"].includes(typeof id)
          ? id.toString()
          : "";
      })
      .filter(Boolean)
  );

  const missingSelected = items.filter((item) => {
    const id = getId(item);
    if (!["string", "number"].includes(typeof id) || id === "") {
      return false;
    }

    const normalizedId = id.toString();
    return (
      normalizedSelected.includes(normalizedId) && !matchesById.has(normalizedId)
    );
  });

  return [...missingSelected, ...matches];
};

const defaultFormState = {
  title: "",
  caseNumber: "",
  status: "Active",
  jurisdiction: "",
  court: "",
  leadCounsel: "",
  filingDate: "",
  opposingCounsel: "",
  description: "",
  notes: "",
  tags: "",
};

const formatDateForInput = (value) => {
  if (!value) {
    return "";
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString().split("T")[0];
  } catch (error) {
    console.error("Failed to parse date for input", error);
    return "";
  }
};

const CaseFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  matterId,
  matterTitle,
  caseFile,  
}) => {
  const [formData, setFormData] = useState(defaultFormState);
  const [users, setUsers] = useState([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadCounselSearchTerm, setLeadCounselSearchTerm] = useState("");

  const isEditMode = Boolean(caseFile?._id);
  const caseId = caseFile?._id;

  const resetForm = useCallback(() => {
    setFormData(defaultFormState);
  }, []);

  const handleModalClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    resetForm();
    setUsers([]);
    setIsLoadingMetadata(false);
    setLeadCounselSearchTerm("");    
    onClose?.();
  }, [isSubmitting, onClose, resetForm]);

  const applyCaseToForm = useCallback(
    (targetCase) => {
      if (!targetCase) {
        resetForm();
        return;
      }

      const normalizedLeadCounsel =
        targetCase?.leadCounsel?._id || targetCase?.leadCounsel || "";
      const normalizedTags = Array.isArray(targetCase?.tags)
        ? targetCase.tags.join(", ")
        : typeof targetCase?.tags === "string"
        ? targetCase.tags
        : "";

      setFormData({
        title: targetCase?.title || "",
        caseNumber: targetCase?.caseNumber || "",
        status: targetCase?.status || "Active",
        jurisdiction: targetCase?.jurisdiction || "",
        court: targetCase?.court || "",
        leadCounsel: normalizedLeadCounsel,
        filingDate: formatDateForInput(targetCase?.filingDate),
        opposingCounsel: targetCase?.opposingCounsel || "",
        description: targetCase?.description || "",
        notes: targetCase?.notes || "",
        tags: normalizedTags,
      });
    },
    [resetForm]
  );

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoadingMetadata(true);
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      const normalizedUsers = Array.isArray(response.data) ? response.data : [];
      const staffUsers = normalizedUsers.filter(
        (user) => normalizeRole(user?.role) !== "client"
      );
      const sortedUsers = [...staffUsers].sort((userA, userB) =>
        (userA?.name || "").localeCompare(userB?.name || "")
      );
      setUsers(sortedUsers);
    } catch (error) {
      console.error("Failed to load case metadata", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to load case data.";
      toast.error(message);
    } finally {
      setIsLoadingMetadata(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      return;
    }

    if (isEditMode && caseFile) {
      applyCaseToForm(caseFile);
    } else {
      resetForm();
    }

    if (matterId || isEditMode) {
      fetchUsers();
    }
  }, [
    applyCaseToForm,
    caseFile,
    fetchUsers,
    isEditMode,
    isOpen,
    matterId,
    resetForm,
  ]);

  const handleValueChange = (key, value) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const leadCounselOptions = useMemo(() => users, [users]);

  const getUserOptionValue = useCallback(
    (user) => user?._id || user?.id || "",
    []
  );

  const getUserOptionLabel = useCallback((user) => {
    if (!user) {
      return "";
    }

    const baseLabel = user?.name || user?.email || "";
    const roleLabel = getRoleLabel(user?.role);

    return roleLabel ? `${baseLabel} • ${roleLabel}` : baseLabel;
  }, []);

  const getUserSearchLabel = useCallback(
    (user) =>
      [user?.name, user?.email, getRoleLabel(user?.role)]
        .filter(Boolean)
        .join(" ")
        .trim(),
    []
  );

  const filteredLeadCounselOptions = useMemo(
    () =>
      filterOptions(
        leadCounselOptions,
        leadCounselSearchTerm,
        getUserOptionValue,
        getUserSearchLabel,
        formData.leadCounsel
      ),
    [
      formData.leadCounsel,
      getUserOptionValue,
      getUserSearchLabel,
      leadCounselOptions,
      leadCounselSearchTerm,
    ]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedTitle = formData.title.trim();

    if (!trimmedTitle) {
      toast.error("Case title is required.");
      return;
    }

    const relatedMatterId =
      matterId || caseFile?.matter?._id || caseFile?.matter || "";

    if (!relatedMatterId) {
      toast.error("An active matter is required to save this case file.");
      return;
    }

    const payload = {
      title: trimmedTitle,
      matter: relatedMatterId,
    };

    if (formData.caseNumber.trim()) {
      payload.caseNumber = formData.caseNumber.trim();
    }

    if (formData.status) {
      payload.status = formData.status;
    }

    if (formData.jurisdiction.trim()) {
      payload.jurisdiction = formData.jurisdiction.trim();
    }

    if (formData.court.trim()) {
      payload.court = formData.court.trim();
    }

    if (formData.leadCounsel) {
      payload.leadCounsel = formData.leadCounsel;
    }

    if (formData.opposingCounsel.trim()) {
      payload.opposingCounsel = formData.opposingCounsel.trim();
    }

    if (formData.description.trim()) {
      payload.description = formData.description.trim();
    }

    if (formData.notes.trim()) {
      payload.notes = formData.notes.trim();
    }

    if (formData.filingDate) {
      payload.filingDate = formData.filingDate;
    }

    const tags = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (tags.length) {
      payload.tags = tags;
    }

    try {
      setIsSubmitting(true);

      const request = isEditMode
        ? axiosInstance.put(API_PATHS.CASES.UPDATE(caseId), payload)
        : axiosInstance.post(API_PATHS.CASES.CREATE, payload);

      const response = await request;

      const defaultMessage = isEditMode
        ? "Case file updated successfully"
        : "Case file created successfully";
      const message = response.data?.message || defaultMessage;
      toast.success(message);
      const normalizedCase =
        response.data?.caseFile ||
        (isEditMode && caseFile ? { ...caseFile, ...payload } : null);
      onSuccess?.(normalizedCase);
      resetForm();
    } catch (error) {
      console.error("Failed to save case file", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        (isEditMode
          ? "Failed to update case file."
          : "Failed to create case file.");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMatterMissing = !matterId && !isEditMode;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isEditMode ? "Update Case File" : "Create Case File"}
      maxWidthClass="max-w-3xl"
    >
      {isMatterMissing ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          Select a matter before creating a case file.
        </div>
      ) : isLoadingMetadata ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LuRefreshCw className="h-4 w-4 animate-spin" />
          Loading case details...
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {!isEditMode && matterTitle && (
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary dark:bg-primary/20 dark:text-primary">
              Case will be added to <span className="font-semibold">{matterTitle}</span>
            </div>
          )}
          {isEditMode && matterTitle && (
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
              Linked matter: <span className="font-semibold">{matterTitle}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Title
              <div className="relative">
                <LuBriefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => handleValueChange("title", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  placeholder="Case title"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Case Number
              <div className="relative">
                <LuTag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.caseNumber}
                  onChange={(event) => handleValueChange("caseNumber", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  placeholder="Optional tracking number"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
              <select
                value={formData.status}
                onChange={(event) => handleValueChange("status", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                {CASE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Lead Counsel
              <SearchableSelect
                value={formData.leadCounsel}
                onChange={(nextValue) => handleValueChange("leadCounsel", nextValue)}
                options={leadCounselOptions}
                filteredOptions={filteredLeadCounselOptions}
                getOptionValue={getUserOptionValue}
                getOptionLabel={getUserOptionLabel}
                placeholder="Select a lead counsel"
                searchTerm={leadCounselSearchTerm}
                onSearchTermChange={setLeadCounselSearchTerm}
                searchPlaceholder="Search team members"
                noResultsMessage={
                  users.length
                    ? "No team members match your search."
                    : "No team members available."
                }
                icon={LuUser}
                staticOptions={[{ value: "", label: "Unassigned" }]}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Filing Date
              <div className="relative">
                <LuCalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={formData.filingDate}
                  onChange={(event) => handleValueChange("filingDate", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Jurisdiction
              <input
                type="text"
                value={formData.jurisdiction}
                onChange={(event) => handleValueChange("jurisdiction", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                placeholder="E.g. State of California"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Court
              <input
                type="text"
                value={formData.court}
                onChange={(event) => handleValueChange("court", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                placeholder="Assigning court"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Opposing Counsel
              <input
                type="text"
                value={formData.opposingCounsel}
                onChange={(event) => handleValueChange("opposingCounsel", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                placeholder="Opposing counsel name"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Description
            <textarea
              value={formData.description}
              onChange={(event) => handleValueChange("description", event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              placeholder="Brief summary of the case"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Internal Notes
            <textarea
              value={formData.notes}
              onChange={(event) => handleValueChange("notes", event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              placeholder="Notes visible to your internal team"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Tags
            <div className="relative">
              <LuFileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.tags}
                onChange={(event) => handleValueChange("tags", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                placeholder="Comma separated (e.g. Litigation, High Value)"
              />
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleModalClose}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LuRefreshCw className="h-4 w-4 animate-spin" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Update Case" : "Create Case"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default CaseFormModal;