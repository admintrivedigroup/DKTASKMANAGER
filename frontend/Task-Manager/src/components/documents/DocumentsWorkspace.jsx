import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuFileText,
  LuFolder,
  LuFolderTree,
  LuEllipsisVertical,  
  LuRefreshCw,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import LoadingOverlay from "../LoadingOverlay";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import { formatMediumDateTime } from "../../utils/dateUtils";
import {
  DOCUMENT_UPLOAD_DISABLED_MESSAGE,
  DOCUMENT_UPLOAD_ENABLED,
} from "../../utils/featureFlags";

const Panel = ({
  children,
  className = "",
  tone = "default",
  roundedClass = "rounded-3xl",
}) => {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-100"
      : "border-white/60 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70";

  return (
    <div
      className={`${roundedClass} border p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] ${toneClasses} ${className}`}
    >
      {children}
    </div>
  );
};

const FolderSummary = ({ icon: Icon, title, subtitle, iconClassName = "" }) => (
  <Panel>
    <div className="flex items-center gap-3">
      {Icon && (
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 ${iconClassName}`}
        >
          <Icon className="h-6 w-6" />
        </span>
      )}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && (
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>
        )}
      </div>
    </div>
  </Panel>
);

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

const resolveDocumentUrl = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== "string") {
    return "";
  }

  if (/^https?:\/\//iu.test(fileUrl)) {
    return fileUrl;
  }

  const envBaseUrl =
    (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL) || "";
  const axiosBaseUrl =
    (axiosInstance?.defaults && typeof axiosInstance.defaults.baseURL === "string"
      ? axiosInstance.defaults.baseURL
      : "");
  const selectedBaseUrl =
    envBaseUrl.trim() || axiosBaseUrl.trim() || (BASE_URL ? BASE_URL.trim() : "");

  const normalizedBase = selectedBaseUrl.replace(/\/+$/g, "");
  const normalizedPath = fileUrl.replace(/^\/+/, "");

  if (!normalizedBase) {
    return `/${normalizedPath}`.replace(/\/+$/g, "");
  }

  return `${normalizedBase}/${normalizedPath}`;
};

const safeDateValue = (value) => {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getDocumentTitle = (document) =>
  document?.title || document?.fileName || document?.name || document?.originalName || "Untitled Document";

const getDocumentOwnerDisplay = (document) => {
  if (!document) {
    return "";
  }

  const uploadedBy = document.uploadedBy || document.owner;
  if (uploadedBy && typeof uploadedBy === "object") {
    const name = uploadedBy.name || uploadedBy.fullName || uploadedBy.username;
    const email = uploadedBy.email || uploadedBy.mail;

    if (name && email) {
      return `${name} (${email})`;
    }

    return name || email || "";
  }

  if (typeof uploadedBy === "string") {
    return uploadedBy;
  }

  const fallbackFields = [
    document.uploadedByName,
    document.ownerName,
    document.uploadedByEmail,
    document.ownerEmail,
  ];

  return fallbackFields.find((value) => typeof value === "string" && value.trim().length > 0) || "";
};

const DocumentsWorkspace = ({ basePath = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { matterId, caseId } = useParams();

  const [matters, setMatters] = useState([]);
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [documentSort, setDocumentSort] = useState("recent");
  const [error, setError] = useState(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [activeDocumentMenu, setActiveDocumentMenu] = useState(null);
  const isDocumentUploadEnabled = DOCUMENT_UPLOAD_ENABLED;

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  const documentMenuRefs = useRef(new Map());

  const registerDocumentMenuRef = useCallback((key, node) => {
    if (!key) {
      return;
    }

    if (node) {
      documentMenuRefs.current.set(key, node);
    } else {
      documentMenuRefs.current.delete(key);
    }
  }, []);

  useEffect(() => {
    if (!activeDocumentMenu) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      const menuElement = documentMenuRefs.current.get(activeDocumentMenu);

      if (menuElement && menuElement.contains(event.target)) {
        return;
      }

      setActiveDocumentMenu(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveDocumentMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDocumentMenu]);

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

  const fetchWorkspaceData = useCallback(async () => {
    setError(null);

    try {
      const [mattersResponse, casesResponse, documentsResponse] = await Promise.all([
        axiosInstance.get(API_PATHS.MATTERS.GET_ALL),
        axiosInstance.get(API_PATHS.CASES.GET_ALL),
        axiosInstance.get(API_PATHS.DOCUMENTS.GET_ALL),
      ]);

      const fetchedMatters = Array.isArray(mattersResponse.data?.matters)
        ? mattersResponse.data.matters
        : [];
      const fetchedCases = Array.isArray(casesResponse.data?.cases)
        ? casesResponse.data.cases
        : [];
      const fetchedDocuments = Array.isArray(documentsResponse.data?.documents)
        ? documentsResponse.data.documents
        : [];

      setMatters(fetchedMatters);
      setCases(fetchedCases);
      setDocuments(fetchedDocuments);
      setHasLoadedData(true);
      return true;
    } catch (caughtError) {
      console.error("Failed to fetch document workspace data", caughtError);
      const message =
        caughtError.response?.data?.message ||
        "We were unable to load the documents workspace. Please try again.";

      toast.error(message);
      setError(message);
      return false;   
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await fetchWorkspaceData();
      setIsLoading(false);
    };

    initialize();
  }, [fetchWorkspaceData]);

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    try {
      setIsRefreshing(true);
      const success = await fetchWorkspaceData();
      if (success) {
        toast.success("Workspace refreshed");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

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
        documents: [],
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
          documents: [],
          cases: [],
        });
      }

      folderMap.get(relatedMatterId).cases.push({
        caseFile,
        documents: [],
      });
    });

    documents.forEach((document) => {
      const relatedMatterId = document?.matter?._id || document?.matter;
      const relatedCaseId = document?.caseFile?._id || document?.caseFile;

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
          documents: [],
          cases: [],
        });
      }

      if (relatedCaseId) {
        const targetMatter = folderMap.get(relatedMatterId);
        let targetCase = targetMatter.cases.find((entry) => {
          const entryId = entry.caseFile?._id || entry.caseFile?.id;
          return entryId === relatedCaseId;
        });

        if (!targetCase) {
          targetCase = {
            caseFile: {
              _id: relatedCaseId,
              title: document.caseFile?.title || "Case Folder",
            },
            documents: [],
          };
          targetMatter.cases.push(targetCase);
        }

        targetCase.documents.push(document);
      } else {
        folderMap.get(relatedMatterId).documents.push(document);
      }
    });

    return Array.from(folderMap.values()).sort((a, b) => {
      const titleA = a.matter?.title || "";
      const titleB = b.matter?.title || "";
      return titleA.localeCompare(titleB);
    });
  }, [cases, documents, matterLookup, matters]);

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

      const caseMatch = folder.cases.some((caseEntry) =>
        (caseEntry.caseFile?.title || "").toLowerCase().includes(lowerQuery)
      );

      if (caseMatch) {
        return true;
      }

      return folder.documents.some((document) => {
        const title = (document?.title || "").toLowerCase();
        const fileName = (
          document?.fileName ||
          document?.name ||
          ""
        ).toLowerCase();
        return title.includes(lowerQuery) || fileName.includes(lowerQuery);
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
      return title.includes(lowerQuery) || status.includes(lowerQuery);
    });
  }, [normalizedSearchQuery, selectedMatter]);

  useEffect(() => {
    if (!isLoading && matterId && !selectedMatter) {
      toast.error("We couldn't find that matter folder.");
      navigate(joinPaths(baseRoute), { replace: true });
    }
  }, [baseRoute, isLoading, matterId, navigate, selectedMatter]);

  useEffect(() => {
    if (!isLoading && caseId && selectedMatter && !selectedCase) {
      toast.error("We couldn't find that subfolder.");
      navigate(joinPaths(baseRoute, matterId), { replace: true });
    }
  }, [baseRoute, caseId, isLoading, matterId, navigate, selectedCase, selectedMatter]);

  const handleOpenMatter = (targetMatterId) => {
    if (!targetMatterId) {
      return;
    }

    navigate(joinPaths(baseRoute, targetMatterId));
  };

  const handleOpenCase = (targetCaseId) => {
    if (!targetCaseId || !matterId) {
      return;
    }

     navigate(joinPaths(baseRoute, matterId, "cases", targetCaseId));
  };

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

  const handleOpenDocument = (documentUrl) => {
    if (!documentUrl) {
      toast.error("Document link is unavailable.");
      return;
    }

    window.open(documentUrl, "_blank", "noopener,noreferrer");
  };

  const handleDocumentKeyDown = (event, documentUrl) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenDocument(documentUrl);
    }
  };

  const handleToggleDocumentMenu = (event, documentKey) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveDocumentMenu((current) => (current === documentKey ? null : documentKey));
  };

  const handleDeleteDocument = async (event, documentId) => {
    event.preventDefault();
    event.stopPropagation();

    if (!documentId) {
      toast.error("Unable to delete this document.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this document?");
    if (!confirmed) {
      return;
    }

    try {
      await axiosInstance.delete(API_PATHS.DOCUMENTS.DELETE(documentId));
      toast.success("Document deleted");
      setDocuments((prevDocuments) =>
        Array.isArray(prevDocuments)
          ? prevDocuments.filter((entry) => {
              const entryId = entry?._id || entry?.id || entry?.uuid;
              return entryId !== documentId;
            })
          : prevDocuments
      );
    } catch (caughtError) {
      console.error("Failed to delete document", caughtError);
      const message =
        caughtError.response?.data?.message || "We were unable to delete the document. Please try again.";
      toast.error(message);
    } finally {
      setActiveDocumentMenu(null);
    }
  };

  const visibleDocuments = useMemo(() => {
    if (caseId && selectedCase) {
      return selectedCase.documents;
    }

    if (matterId && selectedMatter) {
      return selectedMatter.documents;
    }

    return [];
  }, [caseId, matterId, selectedCase, selectedMatter]);

  const filteredVisibleDocuments = useMemo(() => {
    const documentsToFilter = Array.isArray(visibleDocuments)
      ? [...visibleDocuments]
      : [];

    const lowerQuery = normalizedSearchQuery;
    const filtered = lowerQuery
      ? documentsToFilter.filter((document) => {
          const title = (document?.title || "").toLowerCase();
          const fileName = (
            document?.fileName ||
            document?.name ||
            document?.originalName ||
            ""
          ).toLowerCase();
          const versionLabel = document?.version ? `v${document.version}` : "";
          const versionText = versionLabel.toLowerCase();

          return (
            title.includes(lowerQuery) ||
            fileName.includes(lowerQuery) ||
            versionText.includes(lowerQuery)
          );
        })
      : documentsToFilter;

    return filtered
      .slice()
      .sort((a, b) => {
        if (documentSort === "az") {
          const titleA = getDocumentTitle(a).toLowerCase();
          const titleB = getDocumentTitle(b).toLowerCase();
          return titleA.localeCompare(titleB);
        }

        const dateA = safeDateValue(a.updatedAt || a.createdAt);
        const dateB = safeDateValue(b.updatedAt || b.createdAt);

        if (documentSort === "oldest") {
          return dateA - dateB;
        }

        // Default to most recent first.
        return dateB - dateA;
      });
  }, [documentSort, normalizedSearchQuery, visibleDocuments]);

  const renderDocumentList = () => {
    const hasAnyDocuments = Array.isArray(visibleDocuments)
      ? visibleDocuments.length > 0
      : false;
    const totalDocuments = hasAnyDocuments ? visibleDocuments.length : 0;
    const visibleDocumentsCount = filteredVisibleDocuments.length;

    if (!filteredVisibleDocuments || visibleDocumentsCount === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p>
            {hasSearchQuery && hasAnyDocuments
              ? "No documents match your search."
              : hasLoadedData
                ? "No documents available in this folder yet."
                : "We couldn't load documents for this folder."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing {visibleDocumentsCount} of {totalDocuments} document{totalDocuments === 1 ? "" : "s"}
          {hasSearchQuery && totalDocuments > 0 ? ` for “${searchQuery.trim()}”` : ""}.
        </p>
        <ul className="space-y-3">
            {filteredVisibleDocuments.map((document, index) => {
            const documentId = document?._id || document?.id || document?.uuid;
            const documentUrl = resolveDocumentUrl(document?.fileUrl);
            const updatedLabel = formatMediumDateTime(
              document?.updatedAt || document?.createdAt,
              "Recently updated"
            );
            const fileName = document?.fileName || document?.name || document?.originalName;
            const documentKey = documentId || documentUrl || `${getDocumentTitle(document)}-${index}`;
            const ownerDisplay = getDocumentOwnerDisplay(document);
            const isMenuOpen = activeDocumentMenu === documentKey;
            const canOpenDocument = Boolean(documentUrl);

            return (
              <li key={documentKey}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenDocument(documentUrl)}
                  onKeyDown={(event) => handleDocumentKeyDown(event, documentUrl)}
                  className={`group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-left text-sm shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-slate-700 dark:bg-slate-900/70 md:flex-row md:items-center md:justify-between ${
                    canOpenDocument ? "cursor-pointer hover:border-primary/40 hover:shadow-md" : "cursor-default"
                  }`}
                >
                  <div className="flex flex-1 items-start gap-3">
                    <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                      <LuFileText className="h-5 w-5" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {getDocumentTitle(document)}
                      </p>
                      {fileName && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">{fileName}</p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400">{updatedLabel}</p>
                      {ownerDisplay && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">Uploaded by {ownerDisplay}</p>
                      )}
                      {document?.version && (
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">v{document.version}</p>
                      )}
                    </div>
                  </div>
                  <div
                    className="relative flex shrink-0 items-start md:self-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
                      onClick={(event) => handleToggleDocumentMenu(event, documentKey)}
                      onMouseDown={(event) => event.stopPropagation()}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      aria-label="Document options"
                    >
                      <LuEllipsisVertical className="h-4 w-4" />
                    </button>
                    {isMenuOpen && (
                      <div
                        ref={(node) => registerDocumentMenuRef(documentKey, node)}
                        className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left text-sm shadow-xl dark:border-slate-700 dark:bg-slate-800"
                        role="menu"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          onClick={(event) => handleDeleteDocument(event, documentId)}
                        >
                          <LuTrash2 className="h-4 w-4" />
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
      </div>
    );
  };

  const renderMatterList = () => {
    const totalMatters = matterFolders.length;
    const visibleMatters = filteredMatterFolders.length;

    return (
      <Panel roundedClass="rounded-[30px]">
        <div className="mb-4 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>
            {visibleMatters === totalMatters
              ? `${totalMatters} matter ${totalMatters === 1 ? "folder" : "folders"}`
              : `Showing ${visibleMatters} of ${totalMatters} matter folders`}
            {hasSearchQuery && totalMatters > 0 ? ` for “${searchQuery.trim()}”` : ""}.
          </span>
          {hasSearchQuery && (
            <span className="italic">
              {visibleMatters > 0
                ? "Search results are highlighted below."
                : hasLoadedData
                  ? "Try refining your search."
                  : "We couldn't load folders to search."}
            </span>
          )}
        </div>

        {filteredMatterFolders.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hasLoadedData
              ? hasSearchQuery
                ? "No folders match your search."
                : "No matter folders are available yet."
              : "We couldn't load the matter folders just yet."}
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredMatterFolders.map((folder, index) => {
              const matterIdForKey = folder.matter?._id || folder.matter?.id;
              const matterKey = matterIdForKey || `matter-${index}`;
              const matterTitle = folder.matter?.title || "Untitled Matter";
              const matterNumber = folder.matter?.matterNumber;
              const clientName = folder.matter?.client?.name || folder.matter?.clientName;
              const status = folder.matter?.status;
              const matterMeta = [matterNumber, clientName, status].filter(Boolean).join(" • ");
              const totalCaseCount = folder.cases.length;
              const totalDocumentCount =
                folder.documents.length +
                folder.cases.reduce(
                  (count, caseEntry) => count + (caseEntry.documents?.length || 0),
                  0
                );

              return (
                <li key={matterKey}>
                  <button
                    type="button"
                    onClick={() => handleOpenMatter(folder.matter?._id)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-left text-base font-medium text-slate-700 transition hover:border-primary/40 hover:bg-primary/10 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-primary/50 dark:hover:bg-slate-800/70"
                  >
                    <span className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                        <LuFolder className="h-5 w-5" />
                      </span>
                      <span className="flex flex-col text-left">
                        <span>{matterTitle}</span>
                        {matterMeta && (
                          <span className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">{matterMeta}</span>
                        )}
                        <span className="mt-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                          {totalCaseCount} {totalCaseCount === 1 ? "subfolder" : "subfolders"} • {totalDocumentCount} {totalDocumentCount === 1 ? "document" : "documents"}
                        </span>
                      </span>
                    </span>
                    <LuFolderTree className="h-5 w-5 text-slate-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    );
  };        

  const renderMatterDetail = () => {
    if (!selectedMatter) {
      return null;
    }

    const caseEntries = selectedMatter.cases || [];
    const displayCases = filteredMatterCases;
    const hasCaseEntries = caseEntries.length > 0;
    const sortedDisplayCases = displayCases
      .slice()
      .sort((a, b) => {
        const titleA = (a.caseFile?.title || "").toLowerCase();
        const titleB = (b.caseFile?.title || "").toLowerCase();
        return titleA.localeCompare(titleB);
      });
    const matterTitle = selectedMatter.matter?.title || "Untitled Matter";
    const matterNumber = selectedMatter.matter?.matterNumber;
    const clientName = selectedMatter.matter?.client?.name || selectedMatter.matter?.clientName;
    const status = selectedMatter.matter?.status;
    const matterMeta = [matterNumber, clientName, status].filter(Boolean).join(" • ");
    const matterDocumentTotal =
      (selectedMatter.documents?.length || 0) +
      caseEntries.reduce((count, caseEntry) => count + (caseEntry.documents?.length || 0), 0);    

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

        <FolderSummary
          icon={LuFolder}
          title={matterTitle}
          subtitle={
            <>
              {matterMeta && <div>{matterMeta}</div>}
              <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {caseEntries.length} {caseEntries.length === 1 ? "subfolder" : "subfolders"} • {matterDocumentTotal} {matterDocumentTotal === 1 ? "document" : "documents"}
              </div>
            </>
          }
        />

        <Panel>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Subfolders</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {sortedDisplayCases.length} of {caseEntries.length} subfolders showing
              {hasSearchQuery && caseEntries.length > 0 ? ` for “${searchQuery.trim()}”` : ""}.
            </span>
          </div>
          {sortedDisplayCases.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {hasCaseEntries && hasSearchQuery
                ? "No subfolders match your search."
                : hasCaseEntries
                  ? "All subfolders are hidden by the current filters."
                  : "No case subfolders are available for this matter."}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sortedDisplayCases.map((caseEntry, index) => {
                const targetCaseId = caseEntry.caseFile?._id || caseEntry.caseFile?.id;
                const caseKey = targetCaseId || `case-${index}`;
                const caseTitle = caseEntry.caseFile?.title || "Untitled Case";
                const caseStatus = caseEntry.caseFile?.status;
                const caseMeta = [caseStatus].filter(Boolean).join(" • ");
                const caseDocumentCount = caseEntry.documents?.length || 0;

                return (
                  <li key={caseKey}>
                    <button
                      type="button"
                      onClick={() => handleOpenCase(targetCaseId)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-left text-base font-medium text-slate-700 transition hover:border-primary/40 hover:bg-primary/10 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-primary/50 dark:hover:bg-slate-800/70"
                    >
                      <span className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                          <LuFolderTree className="h-5 w-5" />
                        </span>
                        <span className="flex flex-col text-left">
                          <span>{caseTitle}</span>
                          {caseMeta && (
                            <span className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">{caseMeta}</span>
                          )}
                          <span className="mt-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                            {caseDocumentCount} {caseDocumentCount === 1 ? "document" : "documents"}
                          </span>
                        </span>
                      </span>
                      <LuFolderTree className="h-5 w-5 text-slate-400" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Documents in this folder</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Viewing matter-level documents only.
            </span>
          </div>
          <div className="mt-4">{renderDocumentList()}</div>
        </Panel>      
      </div>
    );
  };

  const renderCaseDetail = () => {
    if (!selectedMatter || !selectedCase) {
      return null;
    }

    const caseTitle = selectedCase.caseFile?.title || "Untitled Case";
    const caseStatus = selectedCase.caseFile?.status;
    const caseDocumentCount = selectedCase.documents?.length || 0;
    const parentMatterTitle = selectedMatter.matter?.title || "Matter";
    const caseSubtitle = (
      <>
        {caseStatus && <div>{caseStatus}</div>}
        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
          {caseDocumentCount} {caseDocumentCount === 1 ? "document" : "documents"}
        </div>
      </>
    );

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

        <FolderSummary icon={LuFolderTree} title={caseTitle} subtitle={caseSubtitle} />

        <Panel>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Documents in this subfolder</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Parent matter: {parentMatterTitle}
            </span>
          </div>
          <div className="mt-4">{renderDocumentList()}</div>
        </Panel>
      </div>
    );
  };

  if (isLoading) {
      return (
      <div className="relative">
        <LoadingOverlay message="Loading documents..." />
      </div>
    );
  }

  const isMatterView = Boolean(matterId);
  const isCaseView = Boolean(matterId && caseId);
  const searchSummary = hasSearchQuery ? `Filtering workspace for “${searchQuery.trim()}”.` : "";
  const showErrorPanel = Boolean(error);  

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Documents
          </h1>
          {searchSummary && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{searchSummary}</p>
          )}
          {!isDocumentUploadEnabled && (
            <p className="mt-2 text-xs font-medium text-rose-500 dark:text-rose-300">
              {DOCUMENT_UPLOAD_DISABLED_MESSAGE}
            </p>
          )}        
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
          <div className="relative w-full md:w-64">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search documents"
              aria-label="Search documents"
              className="w-full rounded-xl border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-600 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="whitespace-nowrap">Sort</span>
              <select
                value={documentSort}
                onChange={(event) => setDocumentSort(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="az">A → Z</option>
              </select>
            </label>            
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

      {showErrorPanel && (
        <Panel tone="error">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">We hit a snag loading your workspace.</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-300 bg-white/80 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/60 dark:bg-transparent dark:text-rose-100"
            >
              <LuRefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Try again
            </button>
          </div>
        </Panel>
      )}

      {!isMatterView && renderMatterList()}
      {isMatterView && !isCaseView && renderMatterDetail()}
      {isCaseView && renderCaseDetail()}
    </div>
  );
};

export default DocumentsWorkspace;