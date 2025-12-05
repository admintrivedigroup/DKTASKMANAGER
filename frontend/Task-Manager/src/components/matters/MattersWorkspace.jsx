import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuBriefcase,
  LuFolderTree,
  LuPlus,
  LuReceipt,
  LuRefreshCw,
  LuUser,
  LuUsers,
  LuCalendarDays,
  LuTag,
  LuSearch,
  LuEllipsisVertical, 
} from "react-icons/lu";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import LoadingOverlay from "../LoadingOverlay";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatDateLabel, formatMediumDateTime } from "../../utils/dateUtils";
import {
  formatCurrency,
  getStatusMeta,
  normalizeInvoiceRecord,  
  sortInvoicesByDueDate,
} from "../../utils/invoiceUtils";
import { buildInvoiceModalInitialValues } from "../../utils/invoiceEditing.js";
import MatterFormModal from "./MatterFormModal";
import CaseFormModal from "./CaseFormModal";
import DeleteMatterModal from "../modals/DeleteMatterModal";
import DeleteCaseModal from "../modals/DeleteCaseModal";
import InvoiceModal from "../modals/InvoiceModal";
import TaskListTable from "../TaskListTable";
import useTasks from "../../hooks/useTasks";

const trimSlashes = (value, { keepLeading = false } = {}) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  const withoutLeading = keepLeading
    ? trimmed.replace(/\/+$/g, "")
    : trimmed.replace(/^\/+/, "").replace(/\/+$/g, "");

  if (keepLeading) {
    return withoutLeading.startsWith("/")
      ? withoutLeading
      : `/${withoutLeading.replace(/^\/+/, "")}`;
  }

  return withoutLeading;
};

const joinPaths = (...parts) => {
  const filtered = parts
    .filter((part) => part !== null && part !== undefined && `${part}`.trim().length > 0)
    .map((part) => `${part}`);

  if (filtered.length === 0) {
    return "/";
  }

  const [first, ...rest] = filtered;
  let base = trimSlashes(first, { keepLeading: true });

  if (!base) {
    base = "/";
  }

  if (rest.length === 0) {
    return base === "/" ? "/" : base.replace(/\/+$/g, "");
  }

  const tail = rest
    .map((segment) => trimSlashes(segment))
    .filter((segment) => segment.length > 0);

  if (tail.length === 0) {
    return base === "/" ? "/" : base.replace(/\/+$/g, "");
  }

  return `${base.replace(/\/+$/g, "")}/${tail.join("/")}`.replace(/\/+$/g, "");
};

const SummaryItem = ({ label, value, icon = null }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
      {icon && <span className="text-slate-400">{icon}</span>}
      {label}
    </p>
    <p className="mt-2 text-base font-medium text-slate-700 dark:text-slate-200">
      {value || "—"}
    </p>
  </div>
);

const renderChipList = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-sm text-slate-500 dark:text-slate-400">No entries</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:bg-primary/20"
        >
          <LuTag className="h-3.5 w-3.5" />
          {item}
        </span>
      ))}
    </div>
  );
};

const MattersWorkspace = ({ basePath = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { matterId, caseId } = useParams();
  const isMatterView = Boolean(matterId);
  const isCaseView = Boolean(matterId && caseId);

  const [matters, setMatters] = useState([]);
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMatterFormOpen, setIsMatterFormOpen] = useState(false);
  const [isCaseFormOpen, setIsCaseFormOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMatterActionsId, setOpenMatterActionsId] = useState(null);
  const [openCaseActionsId, setOpenCaseActionsId] = useState(null);
  const [editingMatter, setEditingMatter] = useState(null);
  const [editingCase, setEditingCase] = useState(null);  
  const [matterPendingDelete, setMatterPendingDelete] = useState(null);
  const [isDeleteMatterModalOpen, setIsDeleteMatterModalOpen] = useState(false);
  const [casePendingDelete, setCasePendingDelete] = useState(null);
  const [isDeleteCaseModalOpen, setIsDeleteCaseModalOpen] = useState(false); 
  const [matterInvoices, setMatterInvoices] = useState([]);
  const [openInvoiceActionsId, setOpenInvoiceActionsId] = useState(null);
  const [invoiceBeingEdited, setInvoiceBeingEdited] = useState(null);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const hasSearchQuery = normalizedSearchQuery.length > 0;  

  const baseRoute = useMemo(() => {
    if (basePath) {
      return joinPaths(basePath);
    }

    const segments = location.pathname.split("/").filter(Boolean);

    if (!matterId) {
      return joinPaths(`/${segments.join("/")}`);
    }

    if (matterId && !caseId) {
      const baseSegments = segments.slice(0, -1);
      return joinPaths(`/${baseSegments.join("/")}`);
    }

    const baseSegments = segments.slice(0, -3);
    return joinPaths(`/${baseSegments.join("/")}`);
  }, [basePath, location.pathname, matterId, caseId]);

  const taskDetailsBaseRoute = useMemo(() => {
    const source = basePath || location.pathname || "/admin";
    const trimmed = trimSlashes(source, { keepLeading: true });
    const segments = trimmed.split("/").filter(Boolean);

    if (!segments.length) {
      return "/admin";
    }

    return `/${segments[0]}`;
  }, [basePath, location.pathname]);

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const [mattersResponse, casesResponse] = await Promise.all([
        axiosInstance.get(API_PATHS.MATTERS.GET_ALL),
        axiosInstance.get(API_PATHS.CASES.GET_ALL),
      ]);

      const fetchedMatters = Array.isArray(mattersResponse.data?.matters)
        ? mattersResponse.data.matters
        : [];
      const fetchedCases = Array.isArray(casesResponse.data?.cases)
        ? casesResponse.data.cases
        : [];

      setMatters(fetchedMatters);
      setCases(fetchedCases);
    } catch (error) {
      console.error("Failed to fetch matters workspace data", error);
      toast.error(
        error.response?.data?.message ||
          "We were unable to load matters right now. Please try again."
      );
      throw error;
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        await fetchWorkspaceData();
      } catch {
        // Error already handled in fetchWorkspaceData
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [fetchWorkspaceData]);

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    try {
      setIsRefreshing(true);
      await fetchWorkspaceData();
      toast.success("Workspace refreshed");
    } catch {
      // Error already surfaced in fetchWorkspaceData
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMatterModalClose = useCallback(() => {
    setIsMatterFormOpen(false);
    setEditingMatter(null);
  }, []);

  const handleMatterFormSuccess = useCallback(
    async () => {
      try {
        await fetchWorkspaceData();
      } catch {
        // Error already surfaced in fetchWorkspaceData
      } finally {
        handleMatterModalClose();
      }
    },
    [fetchWorkspaceData, handleMatterModalClose]
  );

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteMatterModalOpen(false);
    setMatterPendingDelete(null);
  }, []);

  const handleMatterDeleted = useCallback(
    async (deletedMatter) => {
      try {
        await fetchWorkspaceData();
      } catch {
        // Error already surfaced in fetchWorkspaceData
      } finally {
        handleDeleteModalClose();

        if (deletedMatter?._id && deletedMatter._id === matterId) {
          navigate(joinPaths(baseRoute), { replace: true });
        }
      }
    },
    [baseRoute, fetchWorkspaceData, handleDeleteModalClose, matterId, navigate]
  );

  const handleCaseModalClose = useCallback(() => {
    setIsCaseFormOpen(false);
    setEditingCase(null);
  }, []);

  const handleCaseFormSuccess = useCallback(
    async (savedCase) => {
      const wasEditing = Boolean(editingCase?._id);

      try {
        await fetchWorkspaceData();

        if (!wasEditing && savedCase?._id && matterId) {
          navigate(joinPaths(baseRoute, matterId, "cases", savedCase._id));
        }
      } catch {
        // Error already surfaced in fetchWorkspaceData
      } finally {
        setIsCaseFormOpen(false);
        setEditingCase(null);        
      }
    },
    [baseRoute, editingCase, fetchWorkspaceData, matterId, navigate]
  );

  const handleCaseDeleteModalClose = useCallback(() => {
    setIsDeleteCaseModalOpen(false);
    setCasePendingDelete(null);
  }, []);

  const handleCaseDeleted = useCallback(
    async (deletedCase) => {
      try {
        await fetchWorkspaceData();
      } catch {
        // Error already surfaced in fetchWorkspaceData
      } finally {
        handleCaseDeleteModalClose();

        if (deletedCase?._id && deletedCase._id === caseId) {
          navigate(joinPaths(baseRoute, matterId), { replace: true });
        }
      }
    },
    [baseRoute, caseId, fetchWorkspaceData, handleCaseDeleteModalClose, matterId, navigate]
  );

  const matterLookup = useMemo(() => {
    const lookup = new Map();
    matters.forEach((matter) => {
      if (matter?._id) {
        lookup.set(matter._id, matter);
      }
    });
    return lookup;
  }, [matters]);

  const matterFolders = useMemo(() => {
    const folderMap = new Map();

    matters.forEach((matter) => {
      if (!matter?._id) {
        return;
      }

      folderMap.set(matter._id, {
        matter,
        cases: [],
      });
    });

    cases.forEach((caseFile) => {
      const relatedMatterId = caseFile?.matter?._id || caseFile?.matter;
      if (!relatedMatterId) {
        return;
      }

      if (!folderMap.has(relatedMatterId)) {
        const fallbackMatter = matterLookup.get(relatedMatterId) || {
          _id: relatedMatterId,
          title: "Unassigned Matter",
        };

        folderMap.set(relatedMatterId, {
          matter: fallbackMatter,
          cases: [],
        });
      }

      folderMap.get(relatedMatterId).cases.push({ caseFile });
    });

    return Array.from(folderMap.values()).sort((a, b) => {
      const titleA = a.matter?.title || "";
      const titleB = b.matter?.title || "";
      return titleA.localeCompare(titleB);
    });
  }, [cases, matterLookup, matters]);

  const filteredMatterFolders = useMemo(() => {
    if (!normalizedSearchQuery) {
      return matterFolders;
    }

    const lowerQuery = normalizedSearchQuery;

    return matterFolders.filter((folder) => {
      const matterTitle = (folder.matter?.title || "").toLowerCase();
      const matterNumber = (folder.matter?.matterNumber || "").toLowerCase();
      const clientName = (
        folder.matter?.client?.name || folder.matter?.clientName || ""
      ).toLowerCase();

      if (
        matterTitle.includes(lowerQuery) ||
        matterNumber.includes(lowerQuery) ||
        clientName.includes(lowerQuery)
      ) {
        return true;
      }

      return folder.cases.some((caseEntry) => {
        const title = (caseEntry.caseFile?.title || "").toLowerCase();
        const status = (caseEntry.caseFile?.status || "").toLowerCase();
        const leadCounsel = (
          caseEntry.caseFile?.leadCounsel?.name || ""
        ).toLowerCase();

        return (
          title.includes(lowerQuery) ||
          status.includes(lowerQuery) ||
          leadCounsel.includes(lowerQuery)
        );
      });
    });
  }, [matterFolders, normalizedSearchQuery]);

  const selectedMatter = useMemo(() => {
    if (!matterId) {
      return null;
    }

    return matterFolders.find((folder) => folder.matter?._id === matterId) || null;
  }, [matterFolders, matterId]);

  const selectedCase = useMemo(() => {
    if (!caseId || !selectedMatter) {
      return null;
    }

    return (
      selectedMatter.cases.find((entry) => {
        const entryId = entry.caseFile?._id || entry.caseFile?.id;
        return entryId === caseId;
      }) || null
    );
  }, [caseId, selectedMatter]);

  const selectedMatterId = selectedMatter?.matter?._id;
  const selectedCaseId = selectedCase?.caseFile?._id || selectedCase?.caseFile?.id || null;

  const filteredMatterCases = useMemo(() => {
    if (!selectedMatter) {
      return [];
    }

    const caseEntries = selectedMatter.cases || [];

    if (!normalizedSearchQuery) {
      return caseEntries;
    }

    const lowerQuery = normalizedSearchQuery;

    return caseEntries.filter((caseEntry) => {
      const title = (caseEntry.caseFile?.title || "").toLowerCase();
      const status = (caseEntry.caseFile?.status || "").toLowerCase();
      const leadCounsel = (
        caseEntry.caseFile?.leadCounsel?.name || ""
      ).toLowerCase();

      return (
        title.includes(lowerQuery) ||
        status.includes(lowerQuery) ||
        leadCounsel.includes(lowerQuery)
      );
    });
  }, [normalizedSearchQuery, selectedMatter]);

  const { tasks: matterTasks, isLoading: isLoadingMatterTasks } = useTasks({
    enabled: Boolean(isMatterView && !isCaseView && selectedMatterId),
    matterId: selectedMatterId,
    errorMessage: "We couldn't load tasks for this matter. Please try again.",
  });

  const { tasks: caseTasks, isLoading: isLoadingCaseTasks } = useTasks({
    enabled: Boolean(isCaseView && selectedMatterId && selectedCaseId),
    matterId: selectedMatterId,
    caseFileId: selectedCaseId,
    errorMessage: "We couldn't load tasks for this case. Please try again.",
  });

  useEffect(() => {
    let isCancelled = false;

    const loadInvoices = async () => {
      if (!selectedMatterId) {
        setMatterInvoices([]);
        setInvoiceBeingEdited(null);
        setOpenInvoiceActionsId(null);
        return;
      }

      try {
        const response = await axiosInstance.get(
          API_PATHS.INVOICES.GET_ALL,
          {
            params: { matterId: selectedMatterId },
          }
        );

        if (isCancelled) {
          return;
        }

        const invoices = Array.isArray(response.data?.invoices)
          ? response.data.invoices
          : [];

        const normalized = invoices
          .map((invoice) =>
            normalizeInvoiceRecord(
              invoice,
              invoice?.matter || selectedMatter?.matter || null
            )
          )
          .filter(Boolean);

        setMatterInvoices(sortInvoicesByDueDate(normalized));
        setInvoiceBeingEdited(null);
        setOpenInvoiceActionsId(null);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error("Failed to load matter invoices", error);
        toast.error(
          error.response?.data?.message ||
            "We couldn't load invoices for this matter. Please try again."
        );
        setMatterInvoices([]);
        setInvoiceBeingEdited(null);
        setOpenInvoiceActionsId(null);
      }
    };

    loadInvoices();

    return () => {
      isCancelled = true;
    };
  }, [selectedMatterId, selectedMatter?.matter]);

  useEffect(() => {
    if (!isLoading && matterId && !selectedMatter) {
      toast.error("We couldn't find that matter folder.");
      navigate(joinPaths(baseRoute), { replace: true });
    }
  }, [baseRoute, isLoading, matterId, navigate, selectedMatter]);

  useEffect(() => {
    if (!isLoading && caseId && selectedMatter && !selectedCase) {
      toast.error("We couldn't find that case file.");
      navigate(joinPaths(baseRoute, matterId), { replace: true });
    }
  }, [baseRoute, caseId, isLoading, matterId, navigate, selectedCase, selectedMatter]);

  useEffect(() => {
    if (!openMatterActionsId) {
      return undefined;
    }

    const handleDocumentClick = (event) => {
      const { target } = event;

      if (target && typeof target.closest === "function") {
        const withinMenu = target.closest('[data-matter-actions-root="true"]');

        if (withinMenu) {
          return;
        }
      }

      setOpenMatterActionsId(null);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenMatterActionsId(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMatterActionsId]);

    useEffect(() => {
    if (!openInvoiceActionsId) {
      return undefined;
    }

    const handleDocumentClick = (event) => {
      const { target } = event;

      if (target && typeof target.closest === "function") {
        const withinMenu = target.closest('[data-invoice-actions-root="true"]');

        if (withinMenu) {
          return;
        }
      }

      setOpenInvoiceActionsId(null);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenInvoiceActionsId(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openInvoiceActionsId]);

  useEffect(() => {
    if (!openCaseActionsId) {
      return undefined;
    }

    const handleDocumentClick = (event) => {
      const { target } = event;

      if (target && typeof target.closest === "function") {
        const withinMenu = target.closest('[data-case-actions-root="true"]');

        if (withinMenu) {
          return;
        }
      }

      setOpenCaseActionsId(null);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenCaseActionsId(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openCaseActionsId]);

  const handleOpenMatter = (targetMatterId) => {
    if (!targetMatterId) {
      return;
    }

    setOpenMatterActionsId(null);
    setOpenInvoiceActionsId(null);
    setInvoiceBeingEdited(null);
    setOpenCaseActionsId(null);    
    navigate(joinPaths(baseRoute, targetMatterId));
  };

  const handleOpenCase = (targetCaseId) => {
    if (!targetCaseId || !matterId) {
      return;
    }

    setOpenCaseActionsId(null);    
    navigate(joinPaths(baseRoute, matterId, "cases", targetCaseId));
  };

  const handleViewTaskDetails = useCallback(
    (task) => {
      if (!task) {
        return;
      }

      const taskId =
        typeof task === "string"
          ? task
          : task?._id || task?.id || task?.taskId;

      if (!taskId) {
        return;
      }

      navigate(joinPaths(taskDetailsBaseRoute, "task-details", taskId));
    },
    [navigate, taskDetailsBaseRoute]
  );

    const handleInvoiceUpdate = useCallback((invoice) => {
    if (!invoice) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to update this invoice?"
    );

    if (!confirmed) {
      setOpenInvoiceActionsId(null);
      return;
    }

    setOpenInvoiceActionsId(null);
    setInvoiceBeingEdited(invoice);
    setIsInvoiceModalOpen(true);
  }, []);

  const handleInvoiceDelete = useCallback(
    async (invoice) => {
      if (!invoice) {
        return;
      }

      const confirmed = window.confirm(
        "Are you sure you want to delete this invoice?"
      );

      if (!confirmed) {
        setOpenInvoiceActionsId(null);
        return;
      }

      setOpenInvoiceActionsId(null);

      const invoiceId =
        invoice?.raw?._id ||
        invoice?._id ||
        invoice?.id ||
        invoice?.invoiceId;

      if (!invoiceId) {
        toast.error("We couldn't determine which invoice to delete.");
        return;
      }

      const invoiceEntry = invoice;
      const wasEditing = invoiceBeingEdited?.id === invoice.id;

      setMatterInvoices((previous) =>
        previous.filter((entry) => entry.id !== invoice.id)
      );

      if (wasEditing) {
        setInvoiceBeingEdited(null);
        setIsInvoiceModalOpen(false);
      }

      try {
        await axiosInstance.delete(API_PATHS.INVOICES.DELETE(invoiceId));
        toast.success("Invoice removed from matter.");
      } catch (error) {
        console.error("Failed to delete invoice", error);
        toast.error(
          error.response?.data?.message ||
            "We couldn't remove this invoice. Please try again."
        );

        setMatterInvoices((previous) =>
          sortInvoicesByDueDate([...previous, invoiceEntry])
        );

        if (wasEditing) {
          setInvoiceBeingEdited(invoiceEntry);
          setIsInvoiceModalOpen(true);
        }
      }
    },
    [invoiceBeingEdited]
  );

  const handleInvoiceModalClose = useCallback(() => {
    setIsInvoiceModalOpen(false);
    setInvoiceBeingEdited(null);
  }, []);

  const handleBackToMatters = () => {
    navigate(joinPaths(baseRoute));
  };

  const handleBackToMatter = () => {
    if (!matterId) {
      handleBackToMatters();
      return;
    }

    navigate(joinPaths(baseRoute, matterId));
  };

  const renderMatterList = () => (
    <div className="rounded-[30px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
      {filteredMatterFolders.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {matterFolders.length === 0
            ? "No matters have been created yet."
            : hasSearchQuery
              ? "No matters match your search."
              : "No matters have been created yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredMatterFolders.map((folder) => {
            const stats = folder.matter?.stats || {};
            const caseCount = stats.caseCount ?? folder.cases.length;
            const clientLabel = folder.matter?.client?.name || folder.matter?.clientName || "Unassigned client";
            const matterKey = folder.matter?._id || Math.random();
            const isMenuOpen = openMatterActionsId === folder.matter?._id;

            return (
              <li key={matterKey}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenMatter(folder.matter?._id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenMatter(folder.matter?._id);
                    }
                  }}
                  className="group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-left text-base font-medium text-slate-700 transition hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-primary/50 dark:hover:bg-slate-800/70"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                      <LuBriefcase className="h-5 w-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
                      <span className="truncate">{folder.matter?.title || "Untitled Matter"}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {clientLabel}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    {caseCount} case{caseCount === 1 ? "" : "s"}
                  </span>
                  <div
                    className="relative ml-2 flex-shrink-0"
                    data-matter-actions-root="true"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        setOpenMatterActionsId((previous) =>
                          previous === folder.matter?._id ? null : folder.matter?._id
                        );
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-slate-300"
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      aria-label="Matter options"
                    >
                      <LuEllipsisVertical className="h-5 w-5" />
                    </button>
                    {isMenuOpen && (
                      <div
                        role="menu"
                        data-matter-actions-menu="true"
                        className="dropdown-panel absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            setOpenMatterActionsId(null);
                            setEditingMatter(folder.matter);
                            setIsMatterFormOpen(true);
                          }}
                          className="flex w-full items-center px-4 py-2 text-left text-slate-600 transition hover:bg-primary/10 hover:text-primary dark:text-slate-300"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            setOpenMatterActionsId(null);
                            setMatterPendingDelete(folder.matter);
                            setIsDeleteMatterModalOpen(true);
                          }}
                          className="flex w-full items-center px-4 py-2 text-left text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const renderMatterDetail = () => {
    if (!selectedMatter) {
      return null;
    }

    const caseEntries = selectedMatter.cases || [];
    const displayCases = filteredMatterCases;
    const hasCaseEntries = caseEntries.length > 0;    
    const stats = selectedMatter.matter?.stats || {};
    const tags = Array.isArray(selectedMatter.matter?.tags)
      ? selectedMatter.matter.tags.filter((tag) => tag)
      : [];
    const teamMembers = Array.isArray(selectedMatter.matter?.teamMembers)
      ? selectedMatter.matter.teamMembers
          .map((member) => member?.name || member?.email)
          .filter((name) => name)
      : [];

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={handleBackToMatters}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-primary/40 hover:bg-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
        >
          <LuArrowLeft className="h-4 w-4" />
          Back to all matters
        </button>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
                <LuBriefcase className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {selectedMatter.matter?.title || "Untitled Matter"}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedMatter.matter?.client?.name || selectedMatter.matter?.clientName || "Unassigned client"}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 dark:text-slate-500">
              <p>Created {formatMediumDateTime(selectedMatter.matter?.createdAt, "Recently created")}</p>
              <p>Updated {formatMediumDateTime(selectedMatter.matter?.updatedAt, "Just now")}</p>
            </div>
          </div>

          {selectedMatter.matter?.description && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              {selectedMatter.matter.description}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Tags
              </p>
              <div className="mt-2">{renderChipList(tags)}</div>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryItem
            label="Client"
            value={
              selectedMatter.matter?.client?.name ||
              selectedMatter.matter?.clientName ||
              "Unassigned"
            }
            icon={<LuUser className="h-4 w-4" />}
          />
          <SummaryItem
            label="Matter Number"
            value={selectedMatter.matter?.matterNumber || "Not set"}
            icon={<LuTag className="h-4 w-4" />}
          />
          <SummaryItem
            label="Practice Area"
            value={selectedMatter.matter?.practiceArea || "Not set"}
            icon={<LuBriefcase className="h-4 w-4" />}
          />
          <SummaryItem
            label="Status"
            value={selectedMatter.matter?.status || "Unknown"}
            icon={<LuFolderTree className="h-4 w-4" />}
          />
          <SummaryItem
            label="Opened"
            value={formatDateLabel(selectedMatter.matter?.openedDate, "Not set")}
            icon={<LuCalendarDays className="h-4 w-4" />}
          />
          <SummaryItem
            label="Lead Attorney"
            value={selectedMatter.matter?.leadAttorney?.name || "Unassigned"}
            icon={<LuUser className="h-4 w-4" />}
          />
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Team Members
          </h3>
          <div className="mt-3">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No team members assigned.</p>
            ) : (
              <ul className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
                {teamMembers.map((member) => (
                  <li
                    key={member}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 dark:border-slate-700"
                  >
                    <LuUsers className="h-4 w-4 text-slate-400" />
                    {member}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

       <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <LuReceipt className="h-4 w-4" />
              Invoices
            </h3>
            {matterInvoices.length > 0 && (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                {matterInvoices.length} invoice{matterInvoices.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {matterInvoices.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              No invoices have been recorded for this matter yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {matterInvoices.map((invoice) => {
                const statusMeta = getStatusMeta(invoice.status);
                const isMenuOpen = openInvoiceActionsId === invoice.id;

                return (
                  <li key={invoice.id}>
                    <div className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 transition hover:border-primary/40 hover:bg-primary/10 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-primary/50 dark:hover:bg-slate-800/70">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-base font-medium text-slate-700 dark:text-slate-200">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>Issued {invoice.issuedOnLabel}</span>
                            <span>Due {invoice.dueDateLabel}</span>
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        <div
                          className="relative ml-auto flex-shrink-0"
                          data-invoice-actions-root="true"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenInvoiceActionsId((previous) =>
                                previous === invoice.id ? null : invoice.id
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-slate-300"
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-label="Invoice options"
                          >
                            <LuEllipsisVertical className="h-5 w-5" />
                          </button>
                          {isMenuOpen && (
                            <div
                              role="menu"
                              data-invoice-actions-menu="true"
                              className="dropdown-panel absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleInvoiceUpdate(invoice)}
                                className="flex w-full items-center px-4 py-2 text-left text-slate-600 transition hover:bg-primary/10 hover:text-primary dark:text-slate-300"
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleInvoiceDelete(invoice)}
                                className="flex w-full items-center px-4 py-2 text-left text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-end justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-base font-semibold text-slate-700 dark:text-slate-100">
                          {formatCurrency(invoice.totalAmount)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Balance {formatCurrency(invoice.balanceDue)}
                        </span>
                        {invoice.advanceAmount > 0 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Advance balance {formatCurrency(invoice.advanceBalance)}
                          </span>
                        )}                        
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Matter Tasks
            </h3>
            {!isLoadingMatterTasks && (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                {matterTasks.length} task{matterTasks.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {isLoadingMatterTasks ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading tasks for this matter...</p>
          ) : matterTasks.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              No tasks have been linked to this matter yet.
            </p>
          ) : (
            <TaskListTable
              className="mt-6"
              tableData={matterTasks}
              onTaskClick={handleViewTaskDetails}
            />
          )}
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Matter Stats
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryItem label="Cases" value={stats.caseCount ?? selectedMatter.cases.length} />
            <SummaryItem label="Open Tasks" value={stats.openTaskCount ?? 0} />
            <SummaryItem label="Closed Tasks" value={stats.closedTaskCount ?? 0} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Case Files
          </h3>
          {displayCases.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {hasCaseEntries && hasSearchQuery
                ? "No case files match your search."
                : "No case files have been created for this matter yet."}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {displayCases
                .slice()
                .sort((a, b) => {
                  const titleA = a.caseFile?.title || "";
                  const titleB = b.caseFile?.title || "";
                  return titleA.localeCompare(titleB);
                })
                .map((caseEntry) => {
                  const targetCaseId = caseEntry.caseFile?._id || caseEntry.caseFile?.id;
                  const status = caseEntry.caseFile?.status || "Unknown";
                  const leadCounsel = caseEntry.caseFile?.leadCounsel?.name || "Unassigned";
                  const isMenuOpen = targetCaseId && openCaseActionsId === targetCaseId;                  

                  return (
                    <li key={targetCaseId || Math.random()}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenCase(targetCaseId)}
                         onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenCase(targetCaseId);
                          }
                        }}
                      className="group relative flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-primary/50 dark:hover:bg-slate-800/70"
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                            <LuFolderTree className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-base font-medium text-slate-700 dark:text-slate-200">
                                {caseEntry.caseFile?.title || "Untitled Case"}
                              </span>
                              {targetCaseId && (
                                <div
                                  className="relative flex-shrink-0"
                                  data-case-actions-root="true"
                                >
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      event.preventDefault();
                                      setOpenMatterActionsId(null);
                                      setOpenCaseActionsId((previous) =>
                                        previous === targetCaseId ? null : targetCaseId
                                      );
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-slate-300"
                                    aria-haspopup="menu"
                                    aria-expanded={Boolean(isMenuOpen)}
                                    aria-label="Case options"
                                  >
                                    <LuEllipsisVertical className="h-5 w-5" />
                                  </button>
                                  {isMenuOpen && (
                                    <div
                                      role="menu"
                                      data-case-actions-menu="true"
                                      className="dropdown-panel absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
                                    >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          event.preventDefault();
                                          setOpenCaseActionsId(null);
                                          setEditingCase(caseEntry.caseFile);
                                          setIsCaseFormOpen(true);
                                        }}
                                        className="flex w-full items-center px-4 py-2 text-left text-slate-600 transition hover:bg-primary/10 hover:text-primary dark:text-slate-300"
                                      >
                                        Update
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          event.preventDefault();
                                          setOpenCaseActionsId(null);
                                          setCasePendingDelete(caseEntry.caseFile);
                                          setIsDeleteCaseModalOpen(true);
                                        }}
                                        className="flex w-full items-center px-4 py-2 text-left text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                              Status: {status} • Lead Counsel: {leadCounsel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const renderCaseDetail = () => {
    if (!selectedMatter || !selectedCase) {
      return null;
    }

    const { caseFile } = selectedCase;
    const tags = Array.isArray(caseFile?.tags)
      ? caseFile.tags.filter((tag) => tag)
      : [];
    const keyDates = Array.isArray(caseFile?.keyDates)
      ? caseFile.keyDates.filter(
          (entry) => entry && (entry.label || entry.date || entry.notes)
        )
      : [];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleBackToMatters}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-primary/40 hover:bg-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
          >
            <LuArrowLeft className="h-4 w-4" />
            All matters
          </button>
          <button
            type="button"
            onClick={handleBackToMatter}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-primary/40 hover:bg-primary/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
          >
            <LuArrowLeft className="h-4 w-4" />
            {selectedMatter.matter?.title || "Back to matter"}
          </button>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
                <LuFolderTree className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {caseFile?.title || "Untitled Case"}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedMatter.matter?.title || "Linked matter"}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 dark:text-slate-500">
              <p>Created {formatMediumDateTime(caseFile?.createdAt, "Recently created")}</p>
              <p>Updated {formatMediumDateTime(caseFile?.updatedAt, "Just now")}</p>
            </div>
          </div>

          {caseFile?.description && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              {caseFile.description}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Tags
              </p>
              <div className="mt-2">{renderChipList(tags)}</div>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryItem label="Case Number" value={caseFile?.caseNumber || "Not set"} icon={<LuTag className="h-4 w-4" />} />
          <SummaryItem label="Status" value={caseFile?.status || "Unknown"} icon={<LuFolderTree className="h-4 w-4" />} />
          <SummaryItem label="Jurisdiction" value={caseFile?.jurisdiction || "Not set"} icon={<LuBriefcase className="h-4 w-4" />} />
          <SummaryItem label="Court" value={caseFile?.court || "Not set"} icon={<LuBriefcase className="h-4 w-4" />} />
          <SummaryItem label="Lead Counsel" value={caseFile?.leadCounsel?.name || "Unassigned"} icon={<LuUser className="h-4 w-4" />} />
          <SummaryItem
            label="Filing Date"
            value={formatDateLabel(caseFile?.filingDate, "Not set")}
            icon={<LuCalendarDays className="h-4 w-4" />}
          />
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Key Dates
          </h3>
          {keyDates.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No key dates captured for this case.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {keyDates.map((entry, index) => (
                <li
                  key={`${entry.label || "key-date"}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                >
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{entry.label || "Key Date"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateLabel(entry.date, "Date not set")}
                  </p>
                  {entry.notes && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Case Tasks
            </h3>
            {!isLoadingCaseTasks && (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                {caseTasks.length} task{caseTasks.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {isLoadingCaseTasks ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading tasks for this case...</p>
          ) : caseTasks.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              No tasks have been linked to this case yet.
            </p>
          ) : (
            <TaskListTable
              className="mt-6"
              tableData={caseTasks}
              onTaskClick={handleViewTaskDetails}
            />
          )}
        </div>

        {caseFile?.notes && (
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/70">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Internal Notes
            </h3>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{caseFile.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const handleInvoiceDrafted = useCallback(
    async (invoiceData) => {
      const isEditing = Boolean(invoiceBeingEdited);
      const invoiceId =
        invoiceBeingEdited?.raw?._id ||
        invoiceBeingEdited?._id ||
        invoiceBeingEdited?.id ||
        invoiceData?.invoiceId;

      const payload = {
        ...invoiceData,
        matterId:
          invoiceData?.matterId ||
          invoiceBeingEdited?.matterId ||
          selectedMatter?.matter?._id,
      };

      if (!payload.matterId) {
        toast.error(
          "We couldn't determine which matter this invoice belongs to."
        );
        return;
      }

      try {
        let response;

        if (isEditing && invoiceId) {
          response = await axiosInstance.put(
            API_PATHS.INVOICES.UPDATE(invoiceId),
            payload
          );
        } else {
          response = await axiosInstance.post(
            API_PATHS.INVOICES.CREATE,
            payload
          );
        }

        const savedInvoice = response.data?.invoice;

        if (!savedInvoice) {
          throw new Error("Invoice response missing required data");
        }

        const normalized = normalizeInvoiceRecord(
          savedInvoice,
          savedInvoice?.matter || selectedMatter?.matter || null
        );

        setMatterInvoices((previous) => {
          const next = isEditing
            ? previous.map((invoice) =>
                invoice.id === normalized.id || invoice.raw?._id === savedInvoice._id
                  ? normalized
                  : invoice
              )
            : [...previous, normalized];

          return sortInvoicesByDueDate(next);
        });

        toast.success(
          isEditing
            ? "Invoice updated successfully."
            : "Invoice created successfully."
        );
      } catch (error) {
        console.error("Failed to save invoice", error);
        toast.error(
          error.response?.data?.message ||
            "We couldn't save this invoice. Please try again."
        );
      } finally {
        setIsInvoiceModalOpen(false);
        setInvoiceBeingEdited(null);
        setOpenInvoiceActionsId(null);
      }
    },
    [invoiceBeingEdited, selectedMatter?.matter]
  );

  const invoiceModalInitialValues = useMemo(
    () => buildInvoiceModalInitialValues(invoiceBeingEdited),
    [invoiceBeingEdited]
  );

  useEffect(() => {
    if (!isMatterView) {
      setIsInvoiceModalOpen(false);
    }
  }, [isMatterView]);

  if (isLoading) {
    return (
      <div className="relative">
        <LoadingOverlay message="Loading matters..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Matters</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse matters, inspect case files, and review key information.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-3">
          <div className="relative w-full md:w-72">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search matters"
              className="w-full rounded-xl border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-600 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:self-start">
            {isMatterView ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedMatter) {
                      return;
                    }

                    setOpenCaseActionsId(null);
                    setEditingCase(null);
                    setIsCaseFormOpen(true);
                  }}
                  disabled={!selectedMatter}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LuPlus className="h-4 w-4" />
                  Case
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedMatter) {
                      return;
                    }

                    setIsInvoiceModalOpen(true);
                  }}
                  disabled={!selectedMatter}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LuReceipt className="h-4 w-4" />
                  Invoice
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingMatter(null);
                  setIsMatterFormOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <LuPlus className="h-4 w-4" />
                Matter
              </button>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
            >
              <LuRefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {!isMatterView && renderMatterList()}
      {isMatterView && !isCaseView && renderMatterDetail()}
      {isCaseView && renderCaseDetail()}

      <CaseFormModal
        isOpen={isCaseFormOpen}
        onClose={handleCaseModalClose}
        onSuccess={handleCaseFormSuccess}
        matterId={selectedMatter?.matter?._id}
        matterTitle={selectedMatter?.matter?.title}
        caseFile={editingCase}        
      />
      <MatterFormModal
        isOpen={isMatterFormOpen}
        onClose={handleMatterModalClose}
        onSuccess={handleMatterFormSuccess}
        matter={editingMatter}
      />
      <DeleteCaseModal
        isOpen={isDeleteCaseModalOpen}
        onClose={handleCaseDeleteModalClose}
        caseFile={casePendingDelete}
        onDeleted={handleCaseDeleted}
      />      
      <DeleteMatterModal
        isOpen={isDeleteMatterModalOpen}
        onClose={handleDeleteModalClose}
        matter={matterPendingDelete}
        onDeleted={handleMatterDeleted}
      />
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={handleInvoiceModalClose}
        matter={selectedMatter?.matter}
        invoice={invoiceModalInitialValues}        
        onSubmit={handleInvoiceDrafted}
      />
    </div>
  );
};

export default MattersWorkspace;
