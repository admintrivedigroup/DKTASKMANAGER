const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    matter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Matter",
      required: true,
    },
    caseFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaseFile",
    },
    title: { type: String, required: true, trim: true },
    documentType: { type: String, trim: true },
    description: { type: String },
    fileUrl: { type: String, trim: true },
    storagePath: { type: String, trim: true },
    version: { type: Number, default: 1 },
    isFinal: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tags: [{ type: String, trim: true }],
    relatedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    receivedFrom: { type: String, trim: true },
    producedTo: { type: String, trim: true },
  },
  { timestamps: true }
);

documentSchema.index({ matter: 1, caseFile: 1, documentType: 1 });

module.exports = mongoose.model("Document", documentSchema);