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

const changeDetailSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, trim: true },
    label: { type: String, trim: true },
    before: { type: String, default: "" },
    after: { type: String, default: "" },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "task",
        "matter",
        "case",
        "document",
        "member",
        "client",
        "invoice",        
      ],
    },
    action: {
      type: String,
      required: true,
      trim: true,
      enum: ["created", "updated", "deleted"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityName: { type: String, trim: true },
    actor: actorSchema,
    details: { type: [changeDetailSchema], default: undefined },
    meta: { type: mongoose.Schema.Types.Mixed },
    deletedFor: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ entityType: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
