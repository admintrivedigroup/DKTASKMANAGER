const mongoose = require("mongoose");

const priorityMultipliersSchema = new mongoose.Schema(
  {
    low: { type: Number, required: true },
    medium: { type: Number, required: true },
    high: { type: Number, required: true },
    urgent: { type: Number, required: true },
  },
  { _id: false }
);

const timelinessMultiplierRuleSchema = new mongoose.Schema(
  {
    maxLateDays: { type: Number, required: true },
    multiplier: { type: Number, required: true },
  },
  { _id: false }
);

const kraMultiplierProfileSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    priorityMultipliers: {
      type: priorityMultipliersSchema,
      required: true,
    },
    timelinessMultipliers: {
      type: [timelinessMultiplierRuleSchema],
      required: true,
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "kra_multiplier_profiles",
  }
);

module.exports = mongoose.model(
  "KraMultiplierProfile",
  kraMultiplierProfileSchema
);
