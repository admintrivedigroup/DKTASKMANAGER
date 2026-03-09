const mongoose = require("mongoose");
const KraCategory = require("./KraCategory");
const KraMultiplierProfile = require("./KraMultiplierProfile");
const {
  COMPLETED_STATUS,
  buildScoringConfig,
  calculateTaskScoring,
  toNumberOrZero,
} = require("../utils/taskScoring");

const clearScoringSnapshots = (task) => {
  task.basePointsSnapshot = null;
  task.priorityMultiplierSnapshot = null;
  task.timelinessMultiplierSnapshot = null;
  task.earnedPoints = null;
};

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
    status: {
      type: String,
      enum: ["Draft", "Pending", "In Progress", "Pending Approval", "Completed"],
      default: "Pending",
    },
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
    kraCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KraCategory",
      default: null,
    },
    basePointsSnapshot: { type: Number, default: null },
    priorityMultiplierSnapshot: { type: Number, default: null },
    timelinessMultiplierSnapshot: { type: Number, default: null },
    earnedPoints: { type: Number, default: null },
    completedAt: { type: Date, default: null },
    completionRequestedAt: { type: Date, default: null },
    completionRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", null],
      default: null,
    },
    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reminderSentAt: { type: Date, default: null },
    relatedDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],    
  },
  { timestamps: true }
);

taskSchema.pre("save", async function scoreTaskOnCompletion(next) {
  try {
    const shouldProcessStatusTransition = this.isNew
      ? this.status === COMPLETED_STATUS
      : this.isModified("status");

    if (!shouldProcessStatusTransition) {
      return next();
    }

    if (this.status !== COMPLETED_STATUS) {
      this.completedAt = null;
      clearScoringSnapshots(this);
      return next();
    }

    const completedAt = new Date();
    this.completedAt = completedAt;

    let hasCategory = false;
    let basePoints = 0;
    let profileEmployeeId = null;

    if (this.kraCategoryId && mongoose.Types.ObjectId.isValid(this.kraCategoryId)) {
      const category = await KraCategory.findById(this.kraCategoryId)
        .select("basePoints employeeId")
        .lean();

      if (category) {
        hasCategory = true;
        basePoints = toNumberOrZero(category.basePoints);
        profileEmployeeId = category.employeeId || null;
      }
    }

    if (!profileEmployeeId) {
      profileEmployeeId =
        this.createdBy ||
        (Array.isArray(this.assignedTo) && this.assignedTo.length
          ? this.assignedTo[0]
          : null);
    }

    let scoringConfig = buildScoringConfig();

    if (profileEmployeeId && mongoose.Types.ObjectId.isValid(profileEmployeeId)) {
      const profile = await KraMultiplierProfile.findOne({
        employeeId: profileEmployeeId,
        isActive: true,
      })
        .select("priorityMultipliers timelinessMultipliers")
        .lean();

      scoringConfig = buildScoringConfig(profile);
    }

    const scoring = calculateTaskScoring({
      status: this.status,
      priority: this.priority,
      dueDate: this.dueDate,
      completedAt,
      categoryBasePoints: basePoints,
      hasCategory,
      scoringConfig,
      asOfDate: completedAt,
    });

    if (scoring.isUnscored) {
      this.basePointsSnapshot = null;
      this.priorityMultiplierSnapshot = null;
      this.timelinessMultiplierSnapshot = null;
      this.earnedPoints = 0;
      return next();
    }

    this.basePointsSnapshot = scoring.categoryBasePoints;
    this.priorityMultiplierSnapshot = scoring.priorityMultiplier;
    this.timelinessMultiplierSnapshot = scoring.timelinessMultiplier;
    this.earnedPoints = scoring.taskPointsEarned;

    return next();
  } catch (error) {
    return next(error);
  }
});

module.exports = mongoose.model("Task", taskSchema);
