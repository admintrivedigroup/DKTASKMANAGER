import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LuBriefcase, LuRefreshCw, LuUser, LuUsers } from "react-icons/lu";
import toast from "react-hot-toast";

import Modal from "../Modal";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { getRoleLabel, normalizeRole } from "../../utils/roleUtils";
import SearchableSelect from "../SearchableSelect";

const MATTER_STATUSES = ["Intake", "Active", "On Hold", "Closed"];

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
  matterNumber: "",
  practiceArea: "",
  status: "Active",
  client: "",
  leadAttorney: "",
  openedDate: "",
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

const MatterFormModal = ({ isOpen, onClose, onSuccess, matter }) => {
  const [formData, setFormData] = useState(defaultFormState);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [leadAttorneySearchTerm, setLeadAttorneySearchTerm] = useState("");
  const [teamMemberSearchTerm, setTeamMemberSearchTerm] = useState("");

  const isEditMode = Boolean(matter?._id);

  const resetForm = useCallback(() => {
    setFormData(defaultFormState);
    setTeamMembers([]);
  }, []);

  const handleModalClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    resetForm();
    setClients([]);
    setUsers([]);
    setIsLoadingMetadata(false);
    setClientSearchTerm("");
    setLeadAttorneySearchTerm("");
    setTeamMemberSearchTerm("");    
    onClose?.();
  }, [isSubmitting, onClose, resetForm]);

  const applyMatterToForm = useCallback(
    (targetMatter) => {
      if (!targetMatter) {
        resetForm();
        return;
      }

      const normalizedClient =
        targetMatter?.client?._id || targetMatter?.client || "";
      const normalizedLeadAttorney =
        targetMatter?.leadAttorney?._id || targetMatter?.leadAttorney || "";
      const normalizedTeamMembers = Array.isArray(targetMatter?.teamMembers)
        ? targetMatter.teamMembers
            .map((member) =>
              typeof member === "string" ? member : member?._id || ""
            )
            .filter(Boolean)
        : [];
      const normalizedTags = Array.isArray(targetMatter?.tags)
        ? targetMatter.tags.join(", ")
        : typeof targetMatter?.tags === "string"
        ? targetMatter.tags
        : "";

      setFormData({
        title: targetMatter?.title || "",
        matterNumber: targetMatter?.matterNumber || "",
        practiceArea: targetMatter?.practiceArea || "",
        status: targetMatter?.status || "Active",
        client: normalizedClient,
        leadAttorney: normalizedLeadAttorney,
        openedDate: formatDateForInput(targetMatter?.openedDate),
        description: targetMatter?.description || "",
        notes: targetMatter?.notes || "",
        tags: normalizedTags,
      });
      setTeamMembers(normalizedTeamMembers);
    },
    [resetForm]
  );

  const fetchMetadata = useCallback(async () => {
    try {
      setIsLoadingMetadata(true);
      const [clientsResponse, usersResponse] = await Promise.all([
        axiosInstance.get(API_PATHS.MATTERS.GET_CLIENTS),
        axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS),
      ]);

      const normalizedClients = Array.isArray(clientsResponse.data?.clients)
        ? clientsResponse.data.clients
        : [];
      setClients(normalizedClients);

      const normalizedUsers = Array.isArray(usersResponse.data)
        ? usersResponse.data
        : [];

      const staffUsers = normalizedUsers.filter(
        (user) => normalizeRole(user?.role) !== "client"
      );

      const sortedUsers = [...staffUsers].sort((userA, userB) =>
        (userA?.name || "").localeCompare(userB?.name || "")
      );
      setUsers(sortedUsers);
    } catch (error) {
      console.error("Failed to load matter metadata", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to load matter data.";
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

    if (isEditMode && matter) {
      applyMatterToForm(matter);
    } else {
      resetForm();
    }

    fetchMetadata();
  }, [applyMatterToForm, fetchMetadata, isEditMode, isOpen, matter, resetForm]);

  const handleValueChange = (key, value) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleTeamMembersChange = (event) => {
    const selected = Array.from(event.target.selectedOptions || []).map(
      (option) => option.value
    );
    setTeamMembers(selected);
  };

  const getClientOptionValue = useCallback(
    (client) => client?._id || client?.id || "",
    []
  );

  const getClientOptionLabel = useCallback((client) => {
    if (!client) {
      return "";
    }

    if (client?.name && client?.email) {
      return `${client.name} (${client.email})`;
    }

    return client?.name || client?.email || "";
  }, []);

  const getClientSearchLabel = useCallback(
    (client) =>
      [client?.name, client?.email]
        .filter(Boolean)
        .join(" ")
        .trim(),
    []
  );

  const leadAttorneyOptions = useMemo(() => users, [users]);

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

  const filteredClients = useMemo(
    () =>
      filterOptions(
        clients,
        clientSearchTerm,
        getClientOptionValue,
        getClientSearchLabel,
        formData.client
      ),
    [clientSearchTerm, clients, formData.client, getClientOptionValue, getClientSearchLabel]
  );

  const filteredLeadAttorneys = useMemo(
    () =>
      filterOptions(
        leadAttorneyOptions,
        leadAttorneySearchTerm,
        getUserOptionValue,
        getUserSearchLabel,
        formData.leadAttorney
      ),
    [
      formData.leadAttorney,
      getUserOptionValue,
      getUserSearchLabel,
      leadAttorneyOptions,
      leadAttorneySearchTerm,
    ]
  );

  const filteredTeamMembers = useMemo(
    () =>
      filterOptions(
        users,
        teamMemberSearchTerm,
        getUserOptionValue,
        getUserSearchLabel,
        teamMembers
      ),
    [
      getUserOptionValue,
      getUserSearchLabel,
      teamMemberSearchTerm,
      teamMembers,
      users,
    ]
  );

  const teamMemberHelperText = useMemo(() => {
    if (!teamMembers.length) {
      return "Select the team members who will collaborate on this matter.";
    }

    const names = teamMembers
      .map((memberId) =>
        users.find((user) => user?._id === memberId)?.name || ""
      )
      .filter(Boolean);

    if (!names.length) {
      return "Select the team members who will collaborate on this matter.";
    }

    return `Assigned: ${names.join(", ")}`;
  }, [teamMembers, users]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedTitle = formData.title.trim();

    if (!trimmedTitle) {
      toast.error("Matter title is required.");
      return;
    }

    if (!formData.client) {
      toast.error("Please select a client for this matter.");
      return;
    }

    const payload = {
      title: trimmedTitle,
      client: formData.client,
      status: formData.status,
    };

    if (formData.matterNumber.trim()) {
      payload.matterNumber = formData.matterNumber.trim();
    }

    if (formData.practiceArea.trim()) {
      payload.practiceArea = formData.practiceArea.trim();
    }

    if (formData.description.trim()) {
      payload.description = formData.description.trim();
    }

    if (formData.notes.trim()) {
      payload.notes = formData.notes.trim();
    }

    if (formData.openedDate) {
      payload.openedDate = formData.openedDate;
    }

    if (formData.leadAttorney) {
      payload.leadAttorney = formData.leadAttorney;
    }

    if (teamMembers.length) {
      payload.teamMembers = teamMembers;
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
      let response;

      if (isEditMode && matter?._id) {
        response = await axiosInstance.put(
          API_PATHS.MATTERS.UPDATE(matter._id),
          payload
        );
      } else {
        response = await axiosInstance.post(
          API_PATHS.MATTERS.CREATE,
          payload
        );
      }

      const message =
        response.data?.message ||
        (isEditMode
          ? "Matter updated successfully"
          : "Matter created successfully");
      toast.success(message);
      onSuccess?.(response.data?.matter || matter);

      if (!isEditMode) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to submit matter", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        (isEditMode
          ? "Failed to update matter."
          : "Failed to create matter.");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isEditMode ? "Update Matter" : "Create Matter"}
      maxWidthClass="max-w-3xl"
    >
      {isLoadingMetadata ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LuRefreshCw className="h-4 w-4 animate-spin" />
          Loading matter details...
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Title
              <div className="relative">
                <LuBriefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => handleValueChange("title", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  placeholder="Matter title"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Matter Number
              <input
                type="text"
                value={formData.matterNumber}
                onChange={(event) => handleValueChange("matterNumber", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                placeholder="Optional tracking number"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Practice Area
              <input
                type="text"
                value={formData.practiceArea}
                onChange={(event) => handleValueChange("practiceArea", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                placeholder="E.g. Corporate Law"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
              <select
                value={formData.status}
                onChange={(event) => handleValueChange("status", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                {MATTER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Client
              <SearchableSelect
                value={formData.client}
                onChange={(nextValue) => handleValueChange("client", nextValue)}
                options={clients}
                filteredOptions={filteredClients}
                getOptionValue={getClientOptionValue}
                getOptionLabel={getClientOptionLabel}
                placeholder="Select a client"
                searchTerm={clientSearchTerm}
                onSearchTermChange={setClientSearchTerm}
                searchPlaceholder="Search clients"
                noResultsMessage={
                  clients.length
                    ? "No clients match your search."
                    : "No client accounts available."
                }
              />
              {!clients.length ? (
                <p className="text-xs font-medium text-amber-600">
                  No client accounts available. Create a client user first.
                </p>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Lead Attorney
              <SearchableSelect
                value={formData.leadAttorney}
                onChange={(nextValue) => handleValueChange("leadAttorney", nextValue)}
                options={leadAttorneyOptions}
                filteredOptions={filteredLeadAttorneys}
                getOptionValue={getUserOptionValue}
                getOptionLabel={getUserOptionLabel}
                placeholder="Select a lead attorney"
                searchTerm={leadAttorneySearchTerm}
                onSearchTermChange={setLeadAttorneySearchTerm}
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
              Opened Date
              <input
                type="date"
                value={formData.openedDate}
                onChange={(event) => handleValueChange("openedDate", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Team Members
              <div className="space-y-2">
                <input
                  type="search"
                  value={teamMemberSearchTerm}
                  onChange={(event) => setTeamMemberSearchTerm(event.target.value)}
                  placeholder="Search team members"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                />
                <div className="relative">
                  <LuUsers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    multiple
                    value={teamMembers}
                    onChange={handleTeamMembersChange}
                    className="h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  >
                    {filteredTeamMembers.map((user) => {
                      const roleLabel = getRoleLabel(user?.role);
                      return (
                        <option key={user._id} value={user._id}>
                          {user.name || user.email}
                          {roleLabel ? ` • ${roleLabel}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </label>
            {teamMemberSearchTerm.trim() && filteredTeamMembers.length === 0 && users.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">No team members match your search.</p>
            )}            
            <p className="text-xs text-slate-500 dark:text-slate-400">{teamMemberHelperText}</p>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Description
            <textarea
              value={formData.description}
              onChange={(event) => handleValueChange("description", event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              placeholder="Brief summary of the matter"
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
            <input
              type="text"
              value={formData.tags}
              onChange={(event) => handleValueChange("tags", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              placeholder="Comma separated (e.g. High Priority, VIP Client)"
            />
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
              disabled={isSubmitting || isLoadingMetadata}
            >
              {isSubmitting ? (
                <>
                  <LuRefreshCw className="h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Update Matter" : "Create Matter"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default MatterFormModal;