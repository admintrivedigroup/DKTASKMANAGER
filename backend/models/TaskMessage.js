const mongoose = require("mongoose");

const dueDateRequestSchema = new mongoose.Schema(
  {
    proposedDueDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
  },
  { _id: false }
);

const taskMessageSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    messageType: {
      type: String,
      enum: ["message", "due_date_request", "system"],
      default: "message",
      required: true,
    },
    text: { type: String, trim: true },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "TaskMessage", default: null },
    dueDateRequest: { type: dueDateRequestSchema, default: null },
    seenBy: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          seenAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskMessageSchema.index({ task: 1, createdAt: 1 });

module.exports = mongoose.model("TaskMessage", taskMessageSchema);
