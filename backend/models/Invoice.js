const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    date: { type: Date },
    particulars: { type: String, trim: true },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    matter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Matter",
      required: true,
    },
    recipient: { type: String, trim: true },
    matterAdvance: { type: String, trim: true },
    advanceAmount: { type: Number, default: 0 },
    advanceApplied: { type: Number, default: 0 },
    advanceBalance: { type: Number, default: 0 },    
    invoiceNumber: { type: String, trim: true },
    billingAddress: { type: String, trim: true },
    invoiceDate: { type: Date },
    dueDate: { type: Date },
    inMatter: { type: String, trim: true },
    subject: { type: String, trim: true },
    professionalFees: [lineItemSchema],
    expenses: [lineItemSchema],
    governmentFees: [lineItemSchema],
    professionalFeesTotal: { type: Number, default: 0 },
    expensesTotal: { type: Number, default: 0 },
    governmentFeesTotal: { type: Number, default: 0 },
    netExpensesTotal: { type: Number, default: 0 },    
    totalAmount: { type: Number, default: 0 },
    grossTotalAmount: { type: Number, default: 0 },    
    balanceDue: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "overdue", "dueSoon", "paymentDue", "partial", "paid"],
      default: "draft",
    },
    accountHolder: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

invoiceSchema.index({ matter: 1, invoiceNumber: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);