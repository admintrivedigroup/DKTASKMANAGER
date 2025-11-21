import React, { useEffect, useMemo, useState } from "react";
import {
  LuMinus,
  LuPlus,
  LuRefreshCw,
  LuSave,
} from "react-icons/lu";

import Modal from "../Modal";
import { formatDateInputValue } from "../../utils/dateUtils";

const createLineItem = () => ({
  date: "",
  particulars: "",
  amount: "",
});

const sanitizeText = (value) => (typeof value === "string" ? value.trim() : "");

const sanitizeAmount = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return "";
  }

  return parsed;
};

const sanitizeLineItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      date: sanitizeText(item?.date),
      particulars: sanitizeText(item?.particulars),
      amount: sanitizeAmount(item?.amount),
    }))
    .filter((item) => item.date || item.particulars || item.amount !== "");
};

const normalizeExistingLineItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [createLineItem()];
  }

  const normalized = items
    .map((item) => ({
      date: sanitizeText(item?.date),
      particulars: sanitizeText(item?.particulars || item?.description),
      amount:
        item?.amount !== undefined && item?.amount !== null && item.amount !== ""
          ? `${item.amount}`
          : sanitizeText(item?.total || item?.value || ""),
    }))
    .filter((item) => item.date || item.particulars || item.amount);

  return normalized.length > 0 ? normalized : [createLineItem()];
};

const normalizeDateForInput = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return sanitizeText(value) || fallback;
  }

  return formatDateInputValue(parsed);
};

const buildInitialState = (matter, invoice) => {
  const today = formatDateInputValue(new Date());
  const matterTitle = matter?.title || "";
  const matterNumber = matter?.matterNumber || "";
  const inferredMatterReference = matterTitle || matterNumber;
  const clientName =
    matter?.client?.name ||
    matter?.clientName ||
    (typeof matter?.client === "string" ? matter.client : "");

  const baseState = {
    recipient: clientName,
    matterAdvance: "",
    advanceAmount: "",
    invoiceNumber: "",
    billingAddress: "",
    invoiceDate: today,
    dueDate: "",
    inMatter: inferredMatterReference,
    subject: matterTitle ? `Professional services for ${matterTitle}` : "",
    professionalFees: [createLineItem()],
    expenses: [createLineItem()],
    governmentFees: [createLineItem()],
    accountHolder: "",
  };

  if (!invoice) {
    return baseState;
  }

  return {
    ...baseState,
    recipient: sanitizeText(invoice.recipient) || baseState.recipient,
    matterAdvance:
      sanitizeText(invoice.matterAdvance) || baseState.matterAdvance,
    advanceAmount:
      invoice.advanceAmount !== undefined && invoice.advanceAmount !== null
        ? `${invoice.advanceAmount}`
        : baseState.advanceAmount,
    invoiceNumber:
      sanitizeText(invoice.invoiceNumber || invoice.number) ||
      baseState.invoiceNumber,
    billingAddress:
      sanitizeText(invoice.billingAddress) || baseState.billingAddress,
    invoiceDate: normalizeDateForInput(
      invoice.invoiceDate || invoice.issuedOn,
      baseState.invoiceDate
    ),
    dueDate: normalizeDateForInput(invoice.dueDate, baseState.dueDate),
    inMatter: sanitizeText(invoice.inMatter) || baseState.inMatter,
    subject: sanitizeText(invoice.subject) || baseState.subject,
    professionalFees:
      normalizeExistingLineItems(invoice.professionalFees) ||
      baseState.professionalFees,
    expenses:
      normalizeExistingLineItems(invoice.expenses) || baseState.expenses,
    governmentFees:
      normalizeExistingLineItems(invoice.governmentFees) ||
      baseState.governmentFees,
    accountHolder:
      sanitizeText(invoice.accountHolder) || baseState.accountHolder,
  };
};

const InvoiceModal = ({
  isOpen,
  onClose,
  matter,
  onSubmit,
  accountHolders,
  invoice,
}) => {
  const [formState, setFormState] = useState(() =>
    buildInitialState(matter, invoice)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState(buildInitialState(matter, invoice));
  }, [invoice, isOpen, matter]);

  const availableAccountHolders = useMemo(() => {
    if (Array.isArray(accountHolders) && accountHolders.length > 0) {
      return accountHolders.map((holder) => sanitizeText(holder)).filter(Boolean);
    }

    return [
      "Firm Operating Account",
      "Client Trust Account",
      "Matter Escrow Account",
    ];
  }, [accountHolders]);

  const handleFieldChange = ({ target: { name, value } }) => {
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateLineItem = (section, index, field, value) => {
    setFormState((prev) => {
      const currentItems = Array.isArray(prev[section]) ? prev[section] : [];
      const nextItems = currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      );

      return {
        ...prev,
        [section]: nextItems,
      };
    });
  };

  const addLineItem = (section) => {
    setFormState((prev) => {
      const currentItems = Array.isArray(prev[section]) ? prev[section] : [];
      return {
        ...prev,
        [section]: [...currentItems, createLineItem()],
      };
    });
  };

  const removeLineItem = (section, index) => {
    setFormState((prev) => {
      const currentItems = Array.isArray(prev[section]) ? prev[section] : [];
      if (currentItems.length <= 1) {
        return prev;
      }

      const nextItems = currentItems.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        [section]: nextItems.length > 0 ? nextItems : [createLineItem()],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const invoiceIdentifier =
      invoice?._id ||
      invoice?.id ||
      invoice?.invoiceId ||
      invoice?.invoiceNumber ||
      null;

    const payload = {
      recipient: sanitizeText(formState.recipient),
      matterAdvance: sanitizeText(formState.matterAdvance),
      advanceAmount: sanitizeText(formState.advanceAmount),
      invoiceNumber: sanitizeText(formState.invoiceNumber),
      billingAddress: sanitizeText(formState.billingAddress),
      invoiceDate: sanitizeText(formState.invoiceDate),
      dueDate: sanitizeText(formState.dueDate),
      inMatter: sanitizeText(formState.inMatter),
      subject: sanitizeText(formState.subject),
      professionalFees: sanitizeLineItems(formState.professionalFees),
      expenses: sanitizeLineItems(formState.expenses),
      governmentFees: sanitizeLineItems(formState.governmentFees),
      accountHolder: sanitizeText(formState.accountHolder),
      matterId: matter?._id || "",
      invoiceId: invoiceIdentifier,      
    };

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSubmit?.(payload));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLineItems = (section, label) => {
    const items = Array.isArray(formState[section])
      ? formState[section]
      : [createLineItem()];

    return (
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </h3>
          <button
            type="button"
            onClick={() => addLineItem(section)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <LuPlus className="h-4 w-4" /> Add row
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={`${section}_${index}`}
              className="grid gap-4 md:grid-cols-[minmax(0,160px)_1fr_minmax(0,160px)]"
            >
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Date
                </label>
                <input
                  type="date"
                  value={item.date}
                  onChange={(event) =>
                    updateLineItem(section, index, "date", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Particulars
                </label>
                <input
                  type="text"
                  value={item.particulars}
                  onChange={(event) =>
                    updateLineItem(
                      section,
                      index,
                      "particulars",
                      event.target.value
                    )
                  }
                  placeholder="Describe the service or expense"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(event) =>
                      updateLineItem(
                        section,
                        index,
                        "amount",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLineItem(section, index)}
                  disabled={items.length <= 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300"
                  aria-label="Remove row"
                >
                  <LuMinus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Invoice"
      maxWidthClass="max-w-6xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              To
            </label>
            <input
              type="text"
              name="recipient"
              value={formState.recipient}
              onChange={handleFieldChange}
              placeholder="Select or enter a recipient"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Matter Advance
            </label>
            <input
              type="text"
              name="matterAdvance"
              value={formState.matterAdvance}
              onChange={handleFieldChange}
              placeholder="Select or enter an advance type"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Advance Amount
            </label>
            <input
              type="text"
              name="advanceAmount"
              value={formState.advanceAmount}
              onChange={handleFieldChange}
              placeholder="Enter advance amount"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Invoice No.
            </label>
            <input
              type="text"
              name="invoiceNumber"
              value={formState.invoiceNumber}
              onChange={handleFieldChange}
              placeholder="Enter invoice number"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Address
          </label>
          <textarea
            name="billingAddress"
            value={formState.billingAddress}
            onChange={handleFieldChange}
            rows={3}
            placeholder="Enter the billing address"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Date
            </label>
            <input
              type="date"
              name="invoiceDate"
              value={formState.invoiceDate}
              onChange={handleFieldChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              value={formState.dueDate}
              onChange={handleFieldChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              In Matter
            </label>
            <input
              type="text"
              name="inMatter"
              value={formState.inMatter}
              onChange={handleFieldChange}
              placeholder="Link this invoice to a matter"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={formState.subject}
              onChange={handleFieldChange}
              placeholder="Add a subject for the invoice"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="space-y-5">
          {renderLineItems("professionalFees", "Professional Fees")}
          {renderLineItems("expenses", "Expenses")}
          {renderLineItems("governmentFees", "Government Fees")}
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Account Holder
          </label>
          <select
            name="accountHolder"
            value={formState.accountHolder}
            onChange={handleFieldChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
          >
            <option value="">Select an account holder</option>
            {availableAccountHolders.map((holder) => (
              <option key={holder} value={holder}>
                {holder}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LuRefreshCw className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <LuSave className="h-4 w-4" /> Save Invoice
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InvoiceModal;