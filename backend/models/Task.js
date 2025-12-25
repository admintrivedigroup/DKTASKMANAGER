const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },  
});

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    status: { type: String, enum: ["Draft", "Pending", "In Progress", "Completed"], default: "Pending" },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    reminderMinutesBefore: { type: Number, min: 0, max: 10080, default: null },
    recurrence: {
      type: String,
      enum: ["None", "Daily", "Weekly", "Monthly"],
      default: "None",
    },
    recurrenceEndDate: { type: Date, default: null },
    matter: { type: mongoose.Schema.Types.ObjectId, ref: "Matter" },
    caseFile: { type: mongoose.Schema.Types.ObjectId, ref: "CaseFile" },    
    assignedTo: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],
    isPersonal: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachments: [{ type: String }],
    todoChecklist: [todoSchema],
    estimatedHours: { type: Number, min: 0, max: 1000, default: null },
    progress: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },
    relatedDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],    
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
