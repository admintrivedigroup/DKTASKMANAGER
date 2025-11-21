import { addDays, formatDateLabel } from "./dateUtils";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const toValidDate = (value, fallback = new Date()) => {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallbackDate = fallback ? new Date(fallback) : new Date();
  if (Number.isNaN(fallbackDate.getTime())) {
    return new Date();
  }

  return fallbackDate;
};

const clamp = (value, min, max) => {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toStartOfDay = (value) => {
  const date = toValidDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const differenceInDays = (left, right = new Date()) => {
  const startLeft = toStartOfDay(left).getTime();
  const startRight = toStartOfDay(right).getTime();
  return Math.round((startLeft - startRight) / (24 * 60 * 60 * 1000));
};

export const formatCurrency = (value) => {
  const numericValue = toNumber(value, 0);
  return currencyFormatter.format(numericValue);
};

const resolveInvoiceStatus = ({ balanceDue, totalAmount, dueDate }) => {
  const normalizedBalance = Math.max(toNumber(balanceDue, 0), 0);
  const normalizedTotal = Math.max(toNumber(totalAmount, 0), 0);
  const dueInDays = differenceInDays(dueDate, new Date());

  if (normalizedTotal <= 0 || normalizedBalance <= 0) {
    return "paid";
  }

  if (dueInDays < 0) {
    return "overdue";
  }

  if (dueInDays <= 7) {
    return "dueSoon";
  }

  const outstandingRatio = normalizedTotal
    ? normalizedBalance / normalizedTotal
    : 0;

  if (outstandingRatio >= 0.6) {
    return "paymentDue";
  }

  return "partial";
};

const buildInvoiceNumber = (matter, index) => {
  if (matter?.matterNumber) {
    return `INV-${matter.matterNumber}`;
  }

  const rawId =
    matter?._id?.toString() || matter?.id?.toString() || `MATTER-${index + 1}`;

  const suffix = rawId.slice(-6).toUpperCase();
  return `INV-${suffix}`;
};

const resolveClientIdentity = (matter = {}) => {
  if (matter.client && typeof matter.client === "object") {
    return {
      id: matter.client._id || matter.client.id || matter.clientId || null,
      name:
        matter.client.name ||
        matter.client.fullName ||
        matter.client.displayName ||
        matter.clientName ||
        "",
      email: matter.client.email || matter.clientEmail || "",
    };
  }

  return {
    id: matter.client || matter.clientId || null,
    name: matter.clientName || "",
    email: matter.clientEmail || "",
  };
};

const resolveLeadAttorney = (matter = {}) => {
  if (matter.leadAttorney && typeof matter.leadAttorney === "object") {
    return {
      id: matter.leadAttorney._id || matter.leadAttorney.id || null,
      name:
        matter.leadAttorney.name ||
        matter.leadAttorney.fullName ||
        matter.leadAttorney.displayName ||
        "",
      email: matter.leadAttorney.email || "",
    };
  }

  if (matter.leadAttorneyName) {
    return {
      id: matter.leadAttorneyId || null,
      name: matter.leadAttorneyName,
      email: matter.leadAttorneyEmail || "",
    };
  }

  return {
    id: null,
    name: "",
    email: "",
  };
};

const buildInvoiceFromMatter = (matter, index) => {
  const client = resolveClientIdentity(matter);
  const leadAttorney = resolveLeadAttorney(matter);

  const openedOn = toValidDate(matter.openedDate, matter.createdAt);
  const updatedOn = toValidDate(matter.updatedAt, openedOn);
  const issuedOn = addDays(updatedOn, -clamp(index * 2, 0, 12));
  const baseDueDate = addDays(issuedOn, 30 + clamp(index * 3, 0, 18));

  const openTasks = toNumber(matter?.stats?.openTaskCount, 0);
  const closedTasks = toNumber(matter?.stats?.closedTaskCount, 0);
  const totalTasks = Math.max(openTasks + closedTasks, 0);

  const complexityFactor = 1 + clamp(totalTasks * 0.04, 0, 0.45);
  const baseAmount = 12000 + totalTasks * 1800;
  const totalAmount = Math.round(baseAmount * complexityFactor);

  const progress = totalTasks > 0 ? clamp(closedTasks / totalTasks, 0, 1) : 0.35;
  const paidAmount = Math.round(totalAmount * clamp(progress + 0.2, 0.35, 1));
  const balanceDue = Math.max(totalAmount - paidAmount, 0);

  const status = resolveInvoiceStatus({
    balanceDue,
    totalAmount,
    dueDate: baseDueDate,
  });

  const dueInDays = differenceInDays(baseDueDate, new Date());

  return {
    id: matter?._id?.toString() || `invoice-${index}`,
    invoiceNumber: buildInvoiceNumber(matter, index),
    matterId: matter?._id?.toString() || matter?.id?.toString() || "",
    matterTitle: matter?.title || matter?.name || "Untitled Matter",
    matterStatus: matter?.status || "",
    practiceArea: matter?.practiceArea || "",
    client,
    leadAttorney,
    issuedOn,
    issuedOnLabel: formatDateLabel(issuedOn, "Not issued"),
    dueDate: baseDueDate,
    dueDateLabel: formatDateLabel(baseDueDate, "Not set"),
    totalAmount,
    paidAmount,
    balanceDue,
    progress,
    openTasks,
    closedTasks,
    totalTasks,
    status,
    dueInDays,
    tags: Array.isArray(matter?.tags) ? matter.tags : [],
    keyContacts: Array.isArray(matter?.keyContacts) ? matter.keyContacts : [],
    description: matter?.description || "",
  };
};

export const deriveInvoicesFromMatters = (
  matters = [],
  { viewerRole = "admin", viewerId } = {}
) => {
  const normalizedMatters = Array.isArray(matters) ? matters : [];
  const filteredMatters = normalizedMatters.filter((matter) => {
    if (matter?.billing?.invoiceSuppressed) {
      return false;
    }

    if (viewerRole !== "client") {
      return true;
    }

    const client = resolveClientIdentity(matter);
    if (!client?.id || !viewerId) {
      return false;
    }

    return client.id.toString() === viewerId.toString();
  });

  return filteredMatters.map((matter, index) =>
    buildInvoiceFromMatter(matter, index)
  );
};

export const summarizeInvoices = (invoices = []) => {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return {
      totalInvoices: 0,
      outstandingBalance: 0,
      totalBilled: 0,
      totalCollected: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      paidCount: 0,
      collectionRate: 0,
    };
  }

  return invoices.reduce(
    (summary, invoice) => {
      const outstanding = Math.max(toNumber(invoice.balanceDue, 0), 0);
      const billed = Math.max(toNumber(invoice.totalAmount, 0), 0);
      const collected = Math.max(toNumber(invoice.paidAmount, 0), 0);

      const nextSummary = {
        totalInvoices: summary.totalInvoices + 1,
        outstandingBalance: summary.outstandingBalance + outstanding,
        totalBilled: summary.totalBilled + billed,
        totalCollected: summary.totalCollected + collected,
        overdueCount:
          summary.overdueCount + (invoice.status === "overdue" ? 1 : 0),
        dueSoonCount:
          summary.dueSoonCount + (invoice.status === "dueSoon" ? 1 : 0),
        paidCount: summary.paidCount + (invoice.status === "paid" ? 1 : 0),
      };

      return nextSummary;
    },
    {
      totalInvoices: 0,
      outstandingBalance: 0,
      totalBilled: 0,
      totalCollected: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      paidCount: 0,
    }
  );
};

export const computeCollectionRate = ({ totalBilled, totalCollected }) => {
  if (!totalBilled) {
    return 0;
  }

  const rate = (Math.max(totalCollected, 0) / Math.max(totalBilled, 1)) * 100;
  return Math.round(rate);
};

export const STATUS_LABELS = {
  overdue: "Overdue",
  dueSoon: "Due soon",
  paymentDue: "Payment due",
  partial: "Partially paid",
  paid: "Paid",
};

export const STATUS_BADGE_STYLES = {
  overdue:
    "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  dueSoon:
    "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  paymentDue:
    "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200",
  partial:
    "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  paid:
    "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
};

export const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "overdue", label: STATUS_LABELS.overdue },
  { value: "dueSoon", label: STATUS_LABELS.dueSoon },
  { value: "paymentDue", label: STATUS_LABELS.paymentDue },
  { value: "partial", label: STATUS_LABELS.partial },
  { value: "paid", label: STATUS_LABELS.paid },
];

export const buildSearchIndex = (invoice) => {
  if (!invoice) {
    return "";
  }

  const parts = [
    invoice.invoiceNumber,
    invoice.matterTitle,
    invoice.client?.name,
    invoice.client?.email,
    invoice.practiceArea,
    invoice.matterStatus,
  ];

  return parts
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
    .toLowerCase();
};

export const filterInvoices = (invoices, { searchQuery = "", status = "all" }) => {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const normalizedStatus = status.trim();

  return invoices.filter((invoice) => {
    if (
      normalizedStatus &&
      normalizedStatus !== "all" &&
      invoice.status !== normalizedStatus
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return buildSearchIndex(invoice).includes(normalizedSearch);
  });
};

export const sortInvoicesByDueDate = (invoices = []) => {
  return [...invoices].sort((invoiceA, invoiceB) => {
    const dueA = toValidDate(invoiceA?.dueDate).getTime();
    const dueB = toValidDate(invoiceB?.dueDate).getTime();

    if (Number.isNaN(dueA) && Number.isNaN(dueB)) {
      return 0;
    }

    if (Number.isNaN(dueA)) {
      return 1;
    }

    if (Number.isNaN(dueB)) {
      return -1;
    }

    return dueA - dueB;
  });
};

export const getStatusMeta = (status) => {
  const normalizedStatus = typeof status === "string" ? status.trim() : "";

  return {
    label: STATUS_LABELS[normalizedStatus] || "Draft",
    badgeClass:
      STATUS_BADGE_STYLES[normalizedStatus] ||
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/40 dark:bg-slate-800/70 dark:text-slate-200",
  };
};

const resolveClientFromInvoice = (invoice = {}, matter = {}) => {
  const matterClient = matter?.client;

  if (matterClient && typeof matterClient === "object") {
    return {
      id:
        matterClient._id ||
        matterClient.id ||
        matterClient.clientId ||
        null,
      name:
        matterClient.name ||
        matterClient.fullName ||
        matterClient.displayName ||
        matter?.clientName ||
        invoice?.clientName ||
        "",
      email:
        matterClient.email ||
        matterClient.contactEmail ||
        invoice?.clientEmail ||
        "",
    };
  }

  if (matterClient) {
    return {
      id: matterClient,
      name: matter?.clientName || invoice?.clientName || "",
      email: invoice?.clientEmail || "",
    };
  }

  if (invoice?.client && typeof invoice.client === "object") {
    return {
      id:
        invoice.client._id ||
        invoice.client.id ||
        invoice.client.clientId ||
        invoice.clientId ||
        null,
      name:
        invoice.client.name ||
        invoice.client.fullName ||
        invoice.client.displayName ||
        invoice.clientName ||
        matter?.clientName ||
        "",
      email: invoice.client.email || invoice.clientEmail || "",
    };
  }

  return {
    id: invoice?.clientId || null,
    name: invoice?.clientName || matter?.clientName || "",
    email: invoice?.clientEmail || "",
  };
};

const resolveLeadAttorneyFromInvoice = (invoice = {}, matter = {}) => {
  const matterLead = matter?.leadAttorney;

  if (matterLead && typeof matterLead === "object") {
    return {
      id: matterLead._id || matterLead.id || matterLead.leadAttorneyId || null,
      name:
        matterLead.name ||
        matterLead.fullName ||
        matterLead.displayName ||
        matter?.leadAttorneyName ||
        invoice?.leadAttorneyName ||
        "",
      email: matterLead.email || matter?.leadAttorneyEmail || "",
    };
  }

  if (matterLead) {
    return {
      id: matterLead,
      name:
        matter?.leadAttorneyName ||
        invoice?.leadAttorneyName ||
        "",
      email: matter?.leadAttorneyEmail || "",
    };
  }

  if (invoice?.leadAttorney && typeof invoice.leadAttorney === "object") {
    return {
      id:
        invoice.leadAttorney._id ||
        invoice.leadAttorney.id ||
        invoice.leadAttorney.leadAttorneyId ||
        null,
      name:
        invoice.leadAttorney.name ||
        invoice.leadAttorney.fullName ||
        invoice.leadAttorney.displayName ||
        invoice.leadAttorneyName ||
        "",
      email: invoice.leadAttorney.email || "",
    };
  }

  if (invoice?.leadAttorneyId || invoice?.leadAttorneyName) {
    return {
      id: invoice.leadAttorneyId || null,
      name: invoice.leadAttorneyName || "",
      email: invoice.leadAttorneyEmail || "",
    };
  }

  return { id: null, name: "", email: "" };
};

const resolveMatterReference = (invoice = {}, fallbackMatter = null) => {
  if (invoice?.matter && typeof invoice.matter === "object") {
    return invoice.matter;
  }

  if (fallbackMatter && typeof fallbackMatter === "object") {
    return fallbackMatter;
  }

  return null;
};

const resolveMatterId = (invoice = {}, matter = null) => {
  if (typeof invoice?.matter === "string" && invoice.matter.trim().length > 0) {
    return invoice.matter;
  }

  if (invoice?.matterId) {
    return invoice.matterId;
  }

  if (matter?.id) {
    return matter.id.toString();
  }

  if (matter?._id) {
    return matter._id.toString();
  }

  return "";
};

export const normalizeInvoiceRecord = (invoice, fallbackMatter = null) => {
  if (!invoice) {
    return null;
  }

  const matter = resolveMatterReference(invoice, fallbackMatter);
  const matterId = resolveMatterId(invoice, matter);

  const issuedOn =
    invoice?.invoiceDate ||
    invoice?.issuedOn ||
    invoice?.createdAt ||
    (matter?.updatedAt || matter?.openedDate || null);
  const dueDate = invoice?.dueDate || invoice?.paymentDueDate || invoice?.dueOn || null;

  const professionalTotal = Number(invoice?.professionalFeesTotal ?? 0);
  const expensesTotal = Number(invoice?.expensesTotal ?? 0);
  const governmentTotal = Number(invoice?.governmentFeesTotal ?? 0);

  const advanceAmount = Math.max(Number(invoice?.advanceAmount ?? 0) || 0, 0);
  const inferredAdvanceApplied = Math.min(advanceAmount, Math.max(expensesTotal, 0));
  const advanceAppliedCandidate = Number(
    invoice?.advanceApplied ?? inferredAdvanceApplied
  );
  const advanceApplied = Number.isFinite(advanceAppliedCandidate)
    ? Math.max(advanceAppliedCandidate, 0)
    : Math.max(inferredAdvanceApplied, 0);
  const advanceBalanceCandidate = Number(
    invoice?.advanceBalance ?? advanceAmount - advanceApplied
  );
  const advanceBalance = Number.isFinite(advanceBalanceCandidate)
    ? Math.max(advanceBalanceCandidate, 0)
    : Math.max(advanceAmount - advanceApplied, 0);

  const netExpensesCandidate = Number(
    invoice?.netExpensesTotal ?? expensesTotal - advanceApplied
  );
  const netExpensesTotal = Number.isFinite(netExpensesCandidate)
    ? Math.max(netExpensesCandidate, 0)
    : Math.max(expensesTotal - advanceApplied, 0);

  const grossTotalCandidate = Number(
    invoice?.grossTotalAmount ??
      (Number.isFinite(professionalTotal + expensesTotal + governmentTotal)
        ? professionalTotal + expensesTotal + governmentTotal
        : 0)
  );
  const grossTotalAmount = Number.isFinite(grossTotalCandidate)
    ? Math.max(grossTotalCandidate, 0)
    : Math.max(professionalTotal + expensesTotal + governmentTotal, 0);

  const totalAmountCandidate = Number(
    invoice?.totalAmount ??
      (Number.isFinite(professionalTotal + governmentTotal + netExpensesTotal)
        ? professionalTotal + governmentTotal + netExpensesTotal        
        : invoice?.balanceDue ?? 0)
  );

  const totalAmount = Number.isFinite(totalAmountCandidate)
    ? Math.max(totalAmountCandidate, 0)
   : Math.max(professionalTotal + governmentTotal + netExpensesTotal, 0);

  let paidAmount = Number(invoice?.paidAmount ?? invoice?.amountPaid ?? 0);
  if (!Number.isFinite(paidAmount)) {
    paidAmount = 0;
  }

  let balanceDue = Number(
    invoice?.balanceDue ??
      invoice?.amountDue ??
      (Number.isFinite(totalAmount - paidAmount)
        ? totalAmount - paidAmount
        : totalAmount)
  );

  if (!Number.isFinite(balanceDue)) {
    balanceDue = totalAmount;
  }

  balanceDue = Math.max(balanceDue, 0);

  const normalizedStatus = typeof invoice?.status === "string"
    ? invoice.status.trim()
    : typeof invoice?.invoiceStatus === "string"
      ? invoice.invoiceStatus.trim()
      : "";

  const status = normalizedStatus || resolveInvoiceStatus({
    balanceDue,
    totalAmount,
    dueDate,
  });

  const client = resolveClientFromInvoice(invoice, matter || {});
  const leadAttorney = resolveLeadAttorneyFromInvoice(invoice, matter || {});

  const openTasksCandidate = Number(
    invoice?.openTasks ?? matter?.stats?.openTaskCount ?? 0
  );
  const closedTasksCandidate = Number(
    invoice?.closedTasks ?? matter?.stats?.closedTaskCount ?? 0
  );

  const openTasks = Number.isFinite(openTasksCandidate)
    ? Math.max(openTasksCandidate, 0)
    : 0;
  const closedTasks = Number.isFinite(closedTasksCandidate)
    ? Math.max(closedTasksCandidate, 0)
    : 0;
  const totalTasksCandidate = Number(invoice?.totalTasks);
  const totalTasks = Number.isFinite(totalTasksCandidate)
    ? Math.max(totalTasksCandidate, 0)
    : Math.max(openTasks + closedTasks, 0);

  const progress = totalAmount > 0
    ? clamp(Math.max(totalAmount - balanceDue, 0) / totalAmount, 0, 1)
    : 0;

  return {
    id:
      invoice?._id?.toString() ||
      invoice?.id?.toString() ||
      invoice?.invoiceId?.toString() ||
      (typeof invoice?.invoiceNumber === "string" && invoice.invoiceNumber
        ? invoice.invoiceNumber
        : `invoice-${Date.now()}`),
    invoiceNumber:
      invoice?.invoiceNumber ||
      invoice?.number ||
      invoice?.reference ||
      `Invoice ${new Date().getFullYear()}`,
    issuedOn,
    issuedOnLabel: formatDateLabel(issuedOn, "Not set"),
    dueDate,
    dueDateLabel: formatDateLabel(dueDate, "Not set"),
    totalAmount,
    paidAmount: Math.max(paidAmount, 0),
    balanceDue,
    status,
    progress,
    openTasks,
    closedTasks,
    totalTasks,
    matterId,
    matterTitle: matter?.title || invoice?.matterTitle || "Untitled Matter",
    matterStatus: matter?.status || invoice?.matterStatus || "",
    practiceArea: matter?.practiceArea || invoice?.practiceArea || "",
    client,
    leadAttorney,
    advanceAmount,
    advanceApplied,
    advanceBalance,
    netExpensesTotal,
    grossTotalAmount,    
    raw: invoice,
    rawMatter: matter || null,
  };
};

export const filterInvoicesForViewer = (
  invoices = [],
  { viewerRole = "admin", viewerId } = {}
) => {
  if (viewerRole !== "client") {
    return invoices;
  }

  if (!viewerId) {
    return [];
  }

  return invoices.filter((invoice) => {
    const clientId = invoice?.client?.id || invoice?.clientId;
    if (!clientId) {
      return false;
    }

    try {
      return clientId.toString() === viewerId.toString();
    } catch (error) {
      return clientId === viewerId;
    }
  });  
};