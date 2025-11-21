import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowUpRight,
  LuClipboardCheck,
  LuClock3,
  LuEllipsisVertical,  
  LuFileText,
  LuRefreshCw,
  LuSearch,
  LuShieldCheck,
} from "react-icons/lu";
import toast from "react-hot-toast";

import DashboardLayout from "../layouts/DashboardLayout.jsx";
import LoadingOverlay from "../LoadingOverlay.jsx";
import { UserContext } from "../../context/userContext.jsx";
import { useUserAuth } from "../../hooks/useUserAuth.jsx";
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../utils/apiPaths.js";
import {
  computeCollectionRate,
  filterInvoices,
  filterInvoicesForViewer,  
  formatCurrency,
  getStatusMeta,
  normalizeInvoiceRecord,  
  sortInvoicesByDueDate,
  STATUS_FILTERS,
  summarizeInvoices,
} from "../../utils/invoiceUtils.js";
import { getPrivilegedBasePath, resolvePrivilegedPath } from "../../utils/roleUtils.js";
import InvoiceModal from "../modals/InvoiceModal.jsx";
import { buildInvoiceModalInitialValues } from "../../utils/invoiceEditing.js";

const SummaryCard = ({ icon: Icon, title, value, hint, accent }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition dark:border-slate-700/60 dark:bg-slate-900/60">
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent} opacity-10`}
    />
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          {title}
        </p>
        <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {value}
        </p>
        {hint && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        )}
      </div>
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-primary shadow-[0_12px_24px_rgba(79,70,229,0.18)] dark:border-slate-600/60 dark:bg-slate-900/70 dark:text-indigo-200">
          <Icon className="h-5 w-5" />
        </span>
      )}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};

const InvoiceCard = ({
  invoice,
  onViewMatter,
  showClientDetails,
  onToggleMenu,
  onUpdate,
  onDelete,
  isMenuOpen,  
}) => {
  const progressPercentage = Math.round(Math.min(Math.max(invoice.progress * 100, 0), 100));

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.1)] transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_60px_rgba(79,70,229,0.2)] dark:border-slate-700/60 dark:bg-slate-900/60">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.12),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.22),_transparent_55%)]" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {invoice.invoiceNumber}
            </h3>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {invoice.matterTitle}
            {invoice.practiceArea && ` • ${invoice.practiceArea}`}
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <dt className="font-semibold uppercase tracking-[0.3em] text-slate-400">Issued</dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                {invoice.issuedOnLabel}
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-[0.3em] text-slate-400">Due</dt>
              <dd
                className={`mt-1 text-slate-600 dark:text-slate-300 ${
                  invoice.status === "overdue"
                    ? "text-rose-600 dark:text-rose-300"
                    : invoice.status === "dueSoon"
                    ? "text-amber-600 dark:text-amber-300"
                    : ""
                }`}
              >
                {invoice.dueDateLabel}
              </dd>
            </div>
            {invoice.matterStatus && (
              <div>
                <dt className="font-semibold uppercase tracking-[0.3em] text-slate-400">Matter status</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">
                  {invoice.matterStatus}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Amount</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(invoice.totalAmount)}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Balance {formatCurrency(invoice.balanceDue)}
            </p>
            {invoice.advanceAmount > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Advance balance {formatCurrency(invoice.advanceBalance)}
              </p>
            )}            
          </div>
          <div
            className="relative flex-shrink-0"
            data-invoice-actions-root="true"
          >
            <button
              type="button"
              onClick={() => onToggleMenu?.(invoice)}
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
                  onClick={() => onUpdate?.(invoice)}
                  className="flex w-full items-center px-4 py-2 text-left text-slate-600 transition hover:bg-primary/10 hover:text-primary dark:text-slate-300"
                >
                  Update
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => onDelete?.(invoice)}
                  className="flex w-full items-center px-4 py-2 text-left text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Collected {formatCurrency(invoice.paidAmount)}</span>
            <span>{progressPercentage}% settled</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60">
            <div
              className={`h-full rounded-full ${
                invoice.status === "paid"
                  ? "bg-emerald-500"
                  : invoice.status === "overdue"
                  ? "bg-rose-500"
                  : invoice.status === "dueSoon"
                  ? "bg-amber-500"
                  : "bg-primary"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="space-y-1">
            {showClientDetails && invoice.client?.name && (
              <p>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Client:
                </span>{" "}
                {invoice.client.name}
              </p>
            )}
            {invoice.leadAttorney?.name && (
              <p>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Lead counsel:
                </span>{" "}
                {invoice.leadAttorney.name}
              </p>
            )}
            {invoice.openTasks + invoice.closedTasks > 0 && (
              <p>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Workload:
                </span>{" "}
                {invoice.closedTasks} completed · {invoice.openTasks} in progress
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onViewMatter(invoice)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/20 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:border-indigo-300/60 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100"
          >
            View matter
            <LuArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

const InvoicesWorkspace = ({
  viewerRole = "admin",
  heading = "Invoice Operations",
  description = "Track billing progress, receivables, and matter-level realization in one place.",
  showClientDetails = true,
  activeMenu = "Invoices",
}) => {
  useUserAuth();
  const { user } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openInvoiceActionsId, setOpenInvoiceActionsId] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceBeingEdited, setInvoiceBeingEdited] = useState(null);
  const [matterLookup, setMatterLookup] = useState({});  

  const navigate = useNavigate();

  const fetchInvoices = useCallback(async () => {
    try {
      const params = {};
      if (viewerRole === "client" && user?._id) {
        params.clientId = user._id;
      }

      const response = await axiosInstance.get(API_PATHS.INVOICES.GET_ALL, {
        params,
      });

      const fetchedInvoices = Array.isArray(response.data?.invoices)
        ? response.data.invoices
        : [];

      const normalized = fetchedInvoices
        .map((invoice) =>
          normalizeInvoiceRecord(invoice, invoice?.matter || null)
        )
        .filter(Boolean);

      const scopedInvoices = filterInvoicesForViewer(normalized, {
        viewerRole,
        viewerId: user?._id,
      });

      const lookup = scopedInvoices.reduce((accumulator, invoice) => {
        if (invoice?.matterId) {
          accumulator[invoice.matterId] =
            invoice.rawMatter || accumulator[invoice.matterId] || null;
        }
        return accumulator;
      }, {});

      setMatterLookup(lookup);
      setInvoices(sortInvoicesByDueDate(scopedInvoices));
    } catch (error) {
      console.error("Failed to load invoices", error);
      toast.error(
        error.response?.data?.message ||
          "We couldn't load invoices right now. Please try again."
      );
      throw error;
    }
  }, [user?._id, viewerRole]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        await fetchInvoices();
      } catch {
        // Error already handled in fetchInvoices
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [fetchInvoices]);

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

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      await fetchInvoices();
      toast.success("Invoice view refreshed");
    } catch {
      // Error surfaced in fetchInvoices
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredInvoices = useMemo(
    () =>
      filterInvoices(invoices, {
        searchQuery,
        status: statusFilter,
      }),
    [invoices, searchQuery, statusFilter]
  );

  const summary = useMemo(() => summarizeInvoices(invoices), [invoices]);
  const collectionRate = useMemo(
    () => computeCollectionRate(summary),
    [summary]
  );

  const activeBasePath = useMemo(() => {
    if (viewerRole === "client") {
      return "/client/projects";
    }

    const basePath = getPrivilegedBasePath(viewerRole);
    return `${basePath}/matters`;
  }, [viewerRole]);

  const handleViewMatter = (invoice) => {
    if (!invoice?.matterId) {
      navigate(activeBasePath);
      return;
    }

    if (viewerRole === "client") {
      navigate("/client/projects", {
        state: { focusMatterId: invoice.matterId },
      });
      return;
    }

    const target = resolvePrivilegedPath(
      `/admin/matters/${invoice.matterId}`,
      viewerRole
    );
    navigate(target);
  };

  const handleToggleInvoiceMenu = useCallback((invoice) => {
    if (!invoice) {
      setOpenInvoiceActionsId(null);
      return;
    }

    setOpenInvoiceActionsId((previous) =>
      previous === invoice.id ? null : invoice.id
    );
  }, []);

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

      setOpenInvoiceActionsId(null);

      if (!confirmed) {
        return;
      }

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

      setInvoices((previous) =>
        previous.filter((entry) => entry.id !== invoice.id)
      );

      if (wasEditing) {
        setInvoiceBeingEdited(null);
        setIsInvoiceModalOpen(false);
      }

      try {
        await axiosInstance.delete(API_PATHS.INVOICES.DELETE(invoiceId));
        toast.success("Invoice deleted successfully.");
      } catch (error) {
        console.error("Failed to delete invoice", error);
        toast.error(
          error.response?.data?.message ||
            "We couldn't remove this invoice. Please try again."
        );

        setInvoices((previous) =>
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

  const handleInvoiceDrafted = useCallback(
    async (invoiceData) => {
      const isEditing = Boolean(invoiceBeingEdited);
      const invoiceId =
        invoiceBeingEdited?.raw?._id ||
        invoiceBeingEdited?._id ||
        invoiceBeingEdited?.id ||
        invoiceData?.invoiceId;

      try {
        let response;

        if (isEditing && invoiceId) {
          response = await axiosInstance.put(
            API_PATHS.INVOICES.UPDATE(invoiceId),
            invoiceData
          );
        } else {
          response = await axiosInstance.post(
            API_PATHS.INVOICES.CREATE,
            invoiceData
          );
        }

        const savedInvoice = response.data?.invoice;

        if (!savedInvoice) {
          throw new Error("Invoice response missing required data");
        }

        const normalized = normalizeInvoiceRecord(
          savedInvoice,
          savedInvoice?.matter || invoiceBeingEdited?.rawMatter || null
        );

        setInvoices((previous) => {
          const next = isEditing
            ? previous.map((entry) =>
                entry.id === normalized.id || entry.raw?._id === savedInvoice._id
                  ? normalized
                  : entry
              )
            : [...previous, normalized];

          return sortInvoicesByDueDate(next);
        });

        if (normalized?.matterId && normalized.rawMatter) {
          setMatterLookup((prev) => ({
            ...prev,
            [normalized.matterId]: normalized.rawMatter,
          }));
        }

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
    [invoiceBeingEdited]
  );

  const invoiceModalInitialValues = useMemo(
    () => buildInvoiceModalInitialValues(invoiceBeingEdited),
    [invoiceBeingEdited]
  );

  const selectedMatterForModal = useMemo(() => {
    if (!invoiceBeingEdited) {
      return null;
    }

    return (
      matterLookup[invoiceBeingEdited.matterId] ||
      invoiceBeingEdited.rawMatter ||
      null
    );
  }, [invoiceBeingEdited, matterLookup]);
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="relative">
          <LoadingOverlay message="Preparing invoice workspace..." />
        </div>
      );
    }

    if (invoices.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          <LuFileText className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-600 dark:text-slate-300">
            No invoices available yet
          </p>
          <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            We’ll surface invoices as soon as matters start billing activity. Try refreshing this view after new matters or cases have been updated.
          </p>
        </div>
      );
    }

    if (filteredInvoices.length === 0) {
      return (
        <div className="rounded-[28px] border border-amber-200/60 bg-amber-50/70 p-6 text-sm text-amber-700 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-medium">No invoices match your filters.</p>
          <p className="mt-1 text-sm">Try adjusting your search or status filters to see more billing activity.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            showClientDetails={showClientDetails}
            onViewMatter={handleViewMatter}
            onToggleMenu={handleToggleInvoiceMenu}
            onUpdate={handleInvoiceUpdate}
            onDelete={handleInvoiceDelete}
            isMenuOpen={openInvoiceActionsId === invoice.id}            
          />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout activeMenu={activeMenu}>
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-800 to-sky-700 px-5 py-8 text-white shadow-[0_24px_50px_rgba(30,64,175,0.35)] sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.18),_transparent_55%)]" />
        <div className="relative space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.28em] text-white/70">
            <LuFileText className="h-3.5 w-3.5" />
            Billing Center
          </span>
          <div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {heading}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/75">{description}</p>
          </div>
          <div className="inline-flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-white/60">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Invoices</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Revenue Health</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={LuShieldCheck}
          title="Outstanding Balance"
          value={formatCurrency(summary.outstandingBalance)}
          hint={`${summary.totalInvoices} invoice${summary.totalInvoices === 1 ? "" : "s"} tracked`}
          accent="from-indigo-500 via-sky-500 to-cyan-400"
        />
        <SummaryCard
          icon={LuClock3}
          title="Due within 7 days"
          value={`${summary.dueSoonCount} invoice${summary.dueSoonCount === 1 ? "" : "s"}`}
          hint="Keep these on your radar"
          accent="from-amber-500 via-orange-500 to-rose-400"
        />
        <SummaryCard
          icon={LuClipboardCheck}
          title="Collection Rate"
          value={`${collectionRate}%`}
          hint={`${formatCurrency(summary.totalCollected)} collected to date`}
          accent="from-emerald-500 via-teal-500 to-cyan-400"
        />
        <SummaryCard
          icon={LuFileText}
          title="Fully Paid"
          value={`${summary.paidCount} invoice${summary.paidCount === 1 ? "" : "s"}`}
          hint="Closed without balance"
          accent="from-violet-500 via-purple-500 to-fuchsia-400"
        />
      </section>

      <section className="rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-slate-800/60 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search"
                className="w-full rounded-xl border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-600 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                {STATUS_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
            >
              <LuRefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {renderContent()}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={handleInvoiceModalClose}
        matter={selectedMatterForModal}
        invoice={invoiceModalInitialValues}
        onSubmit={handleInvoiceDrafted}
      />
    </DashboardLayout>
  );
};

export default InvoicesWorkspace;