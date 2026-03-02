const mongoose = require("mongoose");

const kraCategorySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    basePoints: { type: Number, required: true },
    weightage: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "kra_categories",
  }
);

module.exports = mongoose.model("KraCategory", kraCategorySchema);
