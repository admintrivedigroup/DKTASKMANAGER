const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Matter = require("../models/Matter");
const {
  buildFieldChanges,
  logEntityActivity,
} = require("../utils/activityLogger");

const sanitizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const parseNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeLineItems = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      date: parseDate(item?.date),
      particulars: sanitizeString(item?.particulars || item?.description),
      amount: parseNumber(item?.amount),
    }))
    .filter((item) => item.particulars || item.amount || item.date);
};

const computeTotal = (items = []) =>
  items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const inferInvoiceStatus = ({ totalAmount, balanceDue, dueDate }) => {
  const normalizedTotal = Math.max(Number(totalAmount) || 0, 0);
  const normalizedBalance = Math.max(Number(balanceDue) || 0, 0);

  if (!normalizedTotal || normalizedBalance <= 0) {
    return "paid";
  }

  const parsedDue = parseDate(dueDate);
  if (!parsedDue) {
    return "paymentDue";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedDue.setHours(0, 0, 0, 0);

  const diffInMs = parsedDue.getTime() - today.getTime();
  const diffInDays = Math.round(diffInMs / (24 * 60 * 60 * 1000));

  if (diffInDays < 0) {
    return "overdue";
  }

  if (diffInDays <= 7) {
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

const buildHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const handleErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.statusCode ? error.message : "Server error",
    error: error.statusCode ? undefined : error.message,
  });
};

const resolveObjectId = (value) => {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string" ||
    value instanceof mongoose.Types.ObjectId ||
    mongoose.Types.ObjectId.isValid(value)
  ) {
    return value.toString();
  }

  if (typeof value === "object") {
    return (
      resolveObjectId(value._id) ||
      resolveObjectId(value.id) ||
      resolveObjectId(value.value) ||
      null
    );
  }

  return null;
};

const normalizeInvoicePayload = async (payload = {}) => {
  const matterId = resolveObjectId(payload.matterId || payload.matter);
  if (!matterId || !mongoose.Types.ObjectId.isValid(matterId)) {
    throw buildHttpError("A valid matter is required for invoices.");
  }

  const matter = await Matter.findById(matterId)
    .select("title client clientName leadAttorney")
    .lean();

  if (!matter) {
    throw buildHttpError("Referenced matter could not be found.");
  }

  const professionalFees = normalizeLineItems(payload.professionalFees);
  const expenses = normalizeLineItems(payload.expenses);
  const governmentFees = normalizeLineItems(payload.governmentFees);

  const professionalTotal = computeTotal(professionalFees);
  const expensesTotal = computeTotal(expenses);
  const governmentFeesTotal = computeTotal(governmentFees);

  const advanceAmount = Math.max(parseNumber(payload.advanceAmount, 0), 0);
  const advanceApplied = Math.min(advanceAmount, expensesTotal);
  const advanceBalance = Math.max(advanceAmount - advanceApplied, 0);
  const netExpensesTotal = Math.max(expensesTotal - advanceApplied, 0);
  const grossTotalAmount = professionalTotal + expensesTotal + governmentFeesTotal;
  const totalAmount = professionalTotal + governmentFeesTotal + netExpensesTotal;

  const invoiceDate = parseDate(payload.invoiceDate) || new Date();
  const dueDate = parseDate(payload.dueDate);

  const balanceDue = Math.max(
    parseNumber(payload.balanceDue, totalAmount),
    0
  );
  const paidAmount = Math.max(parseNumber(payload.paidAmount, 0), 0);

  const status = payload.status
    ? sanitizeString(payload.status)
    : inferInvoiceStatus({ totalAmount, balanceDue, dueDate });

  return {
    matterId: matter._id,
    invoice: {
      matter: matter._id,
      recipient: sanitizeString(payload.recipient),
      matterAdvance: sanitizeString(payload.matterAdvance),
      advanceAmount,
      advanceApplied,
      advanceBalance,
      invoiceNumber: sanitizeString(payload.invoiceNumber),
      billingAddress: sanitizeString(payload.billingAddress),
      invoiceDate,
      dueDate,
      inMatter: sanitizeString(payload.inMatter),
      subject: sanitizeString(payload.subject),
      professionalFees,
      expenses,
      governmentFees,
      professionalFeesTotal: professionalTotal,
      expensesTotal,
      governmentFeesTotal,
      netExpensesTotal,      
      totalAmount,
      balanceDue,
      grossTotalAmount,
      paidAmount,
      status: status || "paymentDue",
      accountHolder: sanitizeString(payload.accountHolder),
    },
  };
};

const buildInvoiceResponse = (invoice) => {
  if (!invoice) {
    return null;
  }

  const plainInvoice = { ...invoice };
  const total = Math.max(Number(plainInvoice.totalAmount) || 0, 0);
  const grossTotal = Math.max(
    Number(
      plainInvoice.grossTotalAmount !== undefined
        ? plainInvoice.grossTotalAmount
        : total
    ) || 0,
    0
  );
  const expensesTotal = Math.max(Number(plainInvoice.expensesTotal) || 0, 0);
  const advanceAmount = Math.max(Number(plainInvoice.advanceAmount) || 0, 0);
  const inferredAdvanceApplied = Math.min(advanceAmount, expensesTotal);
  const advanceApplied = Math.max(
    Number(
      plainInvoice.advanceApplied !== undefined
        ? plainInvoice.advanceApplied
        : inferredAdvanceApplied
    ) || 0,
    0
  );
  const advanceBalance = Math.max(
    Number(
      plainInvoice.advanceBalance !== undefined
        ? plainInvoice.advanceBalance
        : advanceAmount - advanceApplied
    ) || 0,
    0
  );
  const netExpensesTotal = Math.max(
    Number(
      plainInvoice.netExpensesTotal !== undefined
        ? plainInvoice.netExpensesTotal
        : expensesTotal - advanceApplied
    ) || 0,
    0
  );  
  const balance = Math.max(Number(plainInvoice.balanceDue) || 0, 0);
  const paid = Math.max(Number(plainInvoice.paidAmount) || 0, 0);
  const progress = total > 0 ? clamp((total - balance) / total, 0, 1) : 0;

  return {
    ...plainInvoice,
    totalAmount: total,
    grossTotalAmount: grossTotal,
    netExpensesTotal,
    advanceAmount,
    advanceApplied,
    advanceBalance,    
    progress,
  };
};

const INVOICE_ACTIVITY_FIELDS = [
  { path: "invoiceNumber", label: "Invoice Number" },
  { path: "invoiceDate", label: "Invoice Date" },
  { path: "dueDate", label: "Due Date" },
  { path: "totalAmount", label: "Total Amount" },
  { path: "balanceDue", label: "Balance Due" },
  { path: "status", label: "Status" },
];

const getInvoices = async (req, res) => {
  try {
    const { matterId, status, clientId } = req.query;
    const filter = {};

    if (matterId) {
      filter.matter = matterId;
    }

    if (status) {
      filter.status = status;
    }

    const invoices = await Invoice.find(filter)
      .sort({ invoiceDate: -1, createdAt: -1 })
      .populate({
        path: "matter",
        select:
          "title status practiceArea client clientName leadAttorney leadAttorneyName leadAttorneyEmail stats openedDate updatedAt",
        populate: [
          { path: "client", select: "name email" },
          { path: "leadAttorney", select: "name email" },
        ],
      })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .lean();

    const filteredInvoices = clientId
      ? invoices.filter((invoice) => {
          const matterClient = invoice?.matter?.client;
          const matterClientId =
            typeof matterClient === "object"
              ? matterClient?._id || matterClient?.id
              : matterClient;

          if (!matterClientId) {
            return false;
          }

          return matterClientId.toString() === clientId.toString();
        })
      : invoices;

    res.json({
      invoices: filteredInvoices.map((invoice) => buildInvoiceResponse(invoice)),
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    const invoice = await Invoice.findById(id)
      .populate({
        path: "matter",
        select:
          "title status practiceArea client clientName leadAttorney leadAttorneyName leadAttorneyEmail stats openedDate updatedAt",
        populate: [
          { path: "client", select: "name email" },
          { path: "leadAttorney", select: "name email" },
        ],
      })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({ invoice: buildInvoiceResponse(invoice) });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const createInvoice = async (req, res) => {
  try {
    const { matterId, invoice } = await normalizeInvoicePayload(req.body);

    const created = await Invoice.create({
      ...invoice,
      createdBy: req.user?._id || undefined,
      updatedBy: req.user?._id || undefined,
    });

    const populatedInvoice = await Invoice.findById(created._id)
      .populate({
        path: "matter",
        select:
          "title status practiceArea client clientName leadAttorney leadAttorneyName leadAttorneyEmail stats openedDate updatedAt",
        populate: [
          { path: "client", select: "name email" },
          { path: "leadAttorney", select: "name email" },
        ],
      })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .lean();

    await logEntityActivity({
      entityType: "invoice",
      action: "created",
      entityId: created._id,
      entityName: invoice.invoiceNumber || created._id.toString(),
      actor: req.user,
      details: buildFieldChanges({}, created.toObject(), INVOICE_ACTIVITY_FIELDS),
      meta: { matter: matterId },
    });

    res.status(201).json({
      message: "Invoice created successfully",
      invoice: buildInvoiceResponse(populatedInvoice),
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    const existing = await Invoice.findById(id);

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const original = existing.toObject();
    const { invoice } = await normalizeInvoicePayload({
      ...req.body,
      matterId: existing.matter,
    });

    Object.assign(existing, invoice, {
      updatedBy: req.user?._id || existing.updatedBy,
    });

    await existing.save();

    const populatedInvoice = await Invoice.findById(existing._id)
      .populate({
        path: "matter",
        select:
          "title status practiceArea client clientName leadAttorney leadAttorneyName leadAttorneyEmail stats openedDate updatedAt",
        populate: [
          { path: "client", select: "name email" },
          { path: "leadAttorney", select: "name email" },
        ],
      })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .lean();

    await logEntityActivity({
      entityType: "invoice",
      action: "updated",
      entityId: existing._id,
      entityName: invoice.invoiceNumber || existing.invoiceNumber,
      actor: req.user,
      details: buildFieldChanges(original, existing.toObject(), INVOICE_ACTIVITY_FIELDS),
      meta: { matter: existing.matter },
    });

    res.json({
      message: "Invoice updated successfully",
      invoice: buildInvoiceResponse(populatedInvoice),
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    await Invoice.deleteOne({ _id: invoice._id });

    await logEntityActivity({
      entityType: "invoice",
      action: "deleted",
      entityId: invoice._id,
      entityName: invoice.invoiceNumber || invoice._id.toString(),
      actor: req.user,
      meta: { matter: invoice.matter },
    });

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    handleErrorResponse(res, error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};