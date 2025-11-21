const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    role: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const deadlineSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    date: { type: Date },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const matterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clientName: { type: String, trim: true },
    matterNumber: { type: String, trim: true, unique: true, sparse: true },
    practiceArea: { type: String, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["Intake", "Active", "On Hold", "Closed"],
      default: "Active",
    },
    leadAttorney: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    openedDate: { type: Date },
    closedDate: { type: Date },
    keyContacts: [contactSchema],
    importantDates: [deadlineSchema],
    tags: [{ type: String, trim: true }],
    notes: { type: String },
    billing: {
      invoiceSuppressed: { type: Boolean, default: false },
      invoiceSuppressedAt: { type: Date },
      invoiceSuppressedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },    
  },
  { timestamps: true }
);

module.exports = mongoose.model("Matter", matterSchema);