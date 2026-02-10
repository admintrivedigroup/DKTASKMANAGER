const mongoose = require("mongoose");

const actorSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, trim: true },
    role: { type: String, trim: true },
    email: { type: String, trim: true },
  },
  { _id: false }
);

const taskNotificationSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: actorSchema,
    type: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "task_assigned",
        "message",
        "due_date_request",
        "due_date_approved",
        "due_date_rejected",
      ],
    },
    text: { type: String, trim: true },
    redirectUrl: { type: String, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

taskNotificationSchema.index({ recipient: 1, task: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("TaskNotification", taskNotificationSchema);
