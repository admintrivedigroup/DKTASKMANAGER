const mongoose = require("mongoose");

const MONTH_KEYS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

const employeeMonthlyManualKraPointSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kraColumnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeKraColumn",
      required: true,
      index: true,
    },
    fyStartYear: {
      type: Number,
      required: true,
      min: 2000,
      validate: {
        validator: Number.isFinite,
        message: "fyStartYear must be numeric",
      },
    },
    monthKey: {
      type: String,
      required: true,
      enum: MONTH_KEYS,
      trim: true,
    },
    manualPoints: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isFinite,
        message: "manualPoints must be numeric",
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
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

employeeMonthlyManualKraPointSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

employeeMonthlyManualKraPointSchema.index(
  { employeeId: 1, kraColumnId: 1, fyStartYear: 1, monthKey: 1 },
  { unique: true }
);

module.exports = {
  EmployeeMonthlyManualKraPoint: mongoose.model(
    "EmployeeMonthlyManualKraPoint",
    employeeMonthlyManualKraPointSchema
  ),
  MONTH_KEYS,
};
