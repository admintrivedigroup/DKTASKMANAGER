import { formatDateLabel } from "./dateUtils.js";

const computeLineItemsTotal = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((sum, item) => {
    const amount = Number(item?.amount ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
};

export const inferInvoiceStatus = ({ totalAmount, dueDate }) => {
  if (!totalAmount || totalAmount <= 0) {
    return "paid";
  }

  if (!dueDate) {
    return "paymentDue";
  }

  const parsedDueDate = new Date(dueDate);

  if (Number.isNaN(parsedDueDate.getTime())) {
    return "paymentDue";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedDueDate.setHours(0, 0, 0, 0);

  const diffInMs = parsedDueDate.getTime() - today.getTime();
  const diffInDays = Math.round(diffInMs / (24 * 60 * 60 * 1000));

  if (diffInDays < 0) {
    return "overdue";
  }

  if (diffInDays <= 7) {
    return "dueSoon";
  }

  return "paymentDue";
};

export const buildInvoiceEntryFromPayload = (payload, { fallbackInvoice } = {}) => {
  const issuedOn =
    payload?.invoiceDate ||
    fallbackInvoice?.issuedOn ||
    fallbackInvoice?.raw?.invoiceDate ||
    fallbackInvoice?.raw?.issuedOn ||
    new Date().toISOString();
  const dueDate =
    payload?.dueDate ||
    fallbackInvoice?.dueDate ||
    fallbackInvoice?.raw?.dueDate ||
    "";

  const professionalTotal = computeLineItemsTotal(payload?.professionalFees);
  const expensesTotal = computeLineItemsTotal(payload?.expenses);
  const governmentTotal = computeLineItemsTotal(payload?.governmentFees);
  const hasLineItems = professionalTotal > 0 || expensesTotal > 0 || governmentTotal > 0;

  const fallbackAdvanceAmount = Number(fallbackInvoice?.advanceAmount ?? 0);
  const advanceAmount = Math.max(
    Number(payload?.advanceAmount ?? fallbackAdvanceAmount) || 0,
    0
  );
  const fallbackExpensesTotal = Number(fallbackInvoice?.expensesTotal ?? 0);
  const advanceApplied = hasLineItems
    ? Math.min(advanceAmount, expensesTotal)
    : Math.min(advanceAmount, Math.max(fallbackExpensesTotal, 0));
  const netExpensesTotal = hasLineItems
    ? Math.max(expensesTotal - advanceApplied, 0)
    : Math.max(Number(fallbackInvoice?.netExpensesTotal ?? 0), 0);

  const fallbackTotal = Math.max(Number(fallbackInvoice?.totalAmount) || 0, 0);
  const calculatedTotal = professionalTotal + governmentTotal + netExpensesTotal;
  const totalAmount = hasLineItems ? calculatedTotal : fallbackTotal;
  const fallbackBalance = Math.max(Number(fallbackInvoice?.balanceDue) || fallbackTotal, 0);
  const balanceDue = hasLineItems ? Math.max(calculatedTotal, 0) : fallbackBalance;

  const identifier =
    fallbackInvoice?.id ||
    payload?.invoiceId ||
    payload?.invoiceNumber ||
    `invoice-${Date.now()}`;

  return {
    id: identifier,
    invoiceNumber:
      payload?.invoiceNumber ||
      fallbackInvoice?.invoiceNumber ||
      `Invoice ${new Date().getFullYear()}`,
    issuedOn,
    issuedOnLabel: formatDateLabel(issuedOn, "Not set"),
    dueDate,
    dueDateLabel: formatDateLabel(dueDate, "Not set"),
    totalAmount: Math.max(totalAmount, 0),
    balanceDue,
    status: inferInvoiceStatus({ totalAmount: balanceDue, dueDate }),
    raw: {
      ...fallbackInvoice?.raw,
      ...payload,
    },
  };
};

const resolveInvoiceIdentifier = (invoice) => {
  if (!invoice) {
    return null;
  }

  return (
    invoice._id ||
    invoice.id ||
    invoice.invoiceId ||
    (typeof invoice.invoiceNumber === "string" ? invoice.invoiceNumber : null)
  );
};

export const buildInvoiceModalInitialValues = (invoiceEntry) => {
  if (!invoiceEntry) {
    return null;
  }

  const rawInvoice = invoiceEntry.raw || {};
  const identifier = resolveInvoiceIdentifier(rawInvoice) || resolveInvoiceIdentifier(invoiceEntry);

  return {
    ...invoiceEntry,
    ...rawInvoice,
    id: identifier || invoiceEntry.id,
    _id: rawInvoice._id || identifier || invoiceEntry.id,
    invoiceId: identifier || invoiceEntry.id,
    invoiceNumber:
      rawInvoice.invoiceNumber ||
      rawInvoice.number ||
      invoiceEntry.invoiceNumber ||
      "",
    invoiceDate:
      rawInvoice.invoiceDate ||
      rawInvoice.issuedOn ||
      invoiceEntry.invoiceDate ||
      invoiceEntry.issuedOn ||
      "",
    dueDate: rawInvoice.dueDate || invoiceEntry.dueDate || "",
  };
};