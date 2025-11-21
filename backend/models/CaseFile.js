const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    date: { type: Date },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const caseFileSchema = new mongoose.Schema(
  {
    matter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Matter",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    caseNumber: { type: String, trim: true },
    jurisdiction: { type: String, trim: true },
    court: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Pre-Filing", "Active", "Discovery", "Trial", "Closed"],
      default: "Active",
    },
    leadCounsel: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    opposingCounsel: { type: String, trim: true },
    filingDate: { type: Date },
    description: { type: String },
    keyDates: [milestoneSchema],
    tags: [{ type: String, trim: true }],
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CaseFile", caseFileSchema);