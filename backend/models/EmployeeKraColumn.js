const mongoose = require("mongoose");

const BASE_POINTS_CAP = 100;

const employeeKraColumnSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    weightage: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "weightage must be numeric",
      },
    },
    targetText: {
      type: String,
      default: "",
      trim: true,
    },
    sourceText: {
      type: String,
      default: "",
      trim: true,
    },
    frequencyText: {
      type: String,
      default: "",
      trim: true,
    },
    basePoints: {
      type: Number,
      required: true,
      min: 0,
      max: BASE_POINTS_CAP,
      validate: {
        validator: Number.isFinite,
        message: "basePoints must be numeric",
      },
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isFinite,
        message: "order must be numeric",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

employeeKraColumnSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

module.exports = mongoose.model("EmployeeKraColumn", employeeKraColumnSchema);
