const mongoose = require("mongoose");
const KraCategory = require("../models/KraCategory");

const STRICT_WEIGHTAGE_TARGET = 100;
const STRICT_WEIGHTAGE_EPS = 0.01;

const roundToTwoDecimals = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getActiveWeightageTotal = async (employeeId) => {
  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    return 0;
  }

  const categories = await KraCategory.find({
    employeeId: new mongoose.Types.ObjectId(employeeId),
    isActive: true,
  })
    .select("weightage")
    .lean();

  return categories.reduce(
    (total, category) => total + toSafeNumber(category?.weightage),
    0
  );
};

const isStrictWeightageValid = (total) => {
  const normalizedTotal = toSafeNumber(total);
  return Math.abs(normalizedTotal - STRICT_WEIGHTAGE_TARGET) <= STRICT_WEIGHTAGE_EPS;
};

const getEmployeeActiveWeightageTotal = async (employeeId) => {
  const total = await getActiveWeightageTotal(employeeId);
  return roundToTwoDecimals(total);
};

module.exports = {
  STRICT_WEIGHTAGE_TARGET,
  STRICT_WEIGHTAGE_EPS,
  getActiveWeightageTotal,
  isStrictWeightageValid,
  getEmployeeActiveWeightageTotal,
  roundToTwoDecimals,
};
