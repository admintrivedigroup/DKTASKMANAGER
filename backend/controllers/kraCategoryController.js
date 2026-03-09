const mongoose = require("mongoose");
const KraCategory = require("../models/KraCategory");
const {
  resolveEmployeeIdForRead,
  resolveEmployeeIdFromRequest,
} = require("../utils/kraAccessUtils");

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const roundToTwoDecimals = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const createStatusError = (statusCode, message, details = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, details);
  return error;
};

const isTransactionUnsupportedError = (error) => {
  const message =
    typeof error?.message === "string" ? error.message.toLowerCase() : "";
  const codeName = typeof error?.codeName === "string" ? error.codeName : "";

  return (
    message.includes("transaction numbers are only allowed") ||
    message.includes("replica set") ||
    codeName === "IllegalOperation"
  );
};

const runWithOptionalTransaction = async (work) => {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupportedError(error)) {
      return work(null);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

const parseNumberField = (value, fieldName) => {
  if (value === null || value === undefined || value === "") {
    return { valid: false, message: `${fieldName} is required` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { valid: false, message: `${fieldName} must be a valid number` };
  }

  return { valid: true, value: parsed };
};

const parseRequiredWeightageField = (value) => {
  if (value === null || value === undefined || value === "") {
    return { valid: false, message: "weightage is required" };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { valid: false, message: "weightage must be a valid number" };
  }

  if (parsed < 1 || parsed > 100) {
    return { valid: false, message: "weightage must be between 1 and 100" };
  }

  return { valid: true, value: roundToTwoDecimals(parsed) };
};

const parseBooleanField = (value, fieldName) => {
  if (typeof value === "boolean") {
    return { valid: true, value };
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return { valid: true, value: true };
    }
    if (normalized === "false") {
      return { valid: true, value: false };
    }
  }

  if (typeof value === "number") {
    if (value === 1) {
      return { valid: true, value: true };
    }
    if (value === 0) {
      return { valid: true, value: false };
    }
  }

  return { valid: false, message: `${fieldName} must be true or false` };
};

const getActiveWeightageTotal = async ({ employeeId, excludeCategoryId, session }) => {
  const filter = {
    employeeId: new mongoose.Types.ObjectId(employeeId),
    isActive: true,
  };

  if (excludeCategoryId && mongoose.Types.ObjectId.isValid(excludeCategoryId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeCategoryId) };
  }

  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ["$weightage", 0] } },
      },
    },
  ];

  const aggregateQuery = KraCategory.aggregate(pipeline);
  const result = session
    ? await aggregateQuery.session(session)
    : await aggregateQuery;
  return roundToTwoDecimals(result?.[0]?.total || 0);
};

const getWeightageLimitErrorPayload = ({
  employeeId,
  currentActiveTotal,
  attemptedTotal,
  attemptedWeightage,
}) => ({
  message: `Active category weightage cannot exceed 100%. Current active total: ${roundToTwoDecimals(
    currentActiveTotal
  )}%. Attempted total: ${roundToTwoDecimals(attemptedTotal)}%.`,
  employeeId,
  currentActiveTotal: roundToTwoDecimals(currentActiveTotal),
  attemptedTotal: roundToTwoDecimals(attemptedTotal),
  attemptedWeightage: roundToTwoDecimals(attemptedWeightage),
});

const getKraCategories = async (req, res) => {
  try {
    const resolvedEmployeeId = await resolveEmployeeIdForRead(
      req,
      req.query?.employeeId
    );
    if (!resolvedEmployeeId.valid) {
      return res
        .status(resolvedEmployeeId.statusCode)
        .json({ message: resolvedEmployeeId.message });
    }
    const employeeId = resolvedEmployeeId.value;

    let activeOnly = true;
    if (req.query?.activeOnly !== undefined) {
      const parsedActiveOnly = parseBooleanField(req.query.activeOnly, "activeOnly");
      if (!parsedActiveOnly.valid) {
        return res.status(400).json({ message: parsedActiveOnly.message });
      }

      activeOnly = parsedActiveOnly.value;
    }

    const filter = { employeeId, deletedAt: null };
    if (activeOnly) {
      filter.isActive = true;
    }

    const categories = await KraCategory.find(filter).sort({ createdAt: -1 });

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createKraCategory = async (req, res) => {
  try {
    const resolvedEmployeeId = await resolveEmployeeIdFromRequest(
      req.body?.employeeId
    );
    if (!resolvedEmployeeId.valid) {
      return res
        .status(resolvedEmployeeId.statusCode)
        .json({ message: resolvedEmployeeId.message });
    }

    const employeeId = resolvedEmployeeId.value;
    const name = normalizeString(req.body?.name);

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const parsedBasePoints = parseNumberField(req.body?.basePoints, "basePoints");
    if (!parsedBasePoints.valid) {
      return res.status(400).json({ message: parsedBasePoints.message });
    }

    const parsedWeightage = parseRequiredWeightageField(req.body?.weightage);
    if (!parsedWeightage.valid) {
      return res.status(400).json({ message: parsedWeightage.message });
    }

    let isActive;
    if (req.body?.isActive !== undefined) {
      const parsedIsActive = parseBooleanField(req.body.isActive, "isActive");
      if (!parsedIsActive.valid) {
        return res.status(400).json({ message: parsedIsActive.message });
      }

      isActive = parsedIsActive.value;
    }

    let requiresApproval;
    if (req.body?.requiresApproval !== undefined) {
      const parsedRequiresApproval = parseBooleanField(
        req.body.requiresApproval,
        "requiresApproval"
      );
      if (!parsedRequiresApproval.valid) {
        return res.status(400).json({ message: parsedRequiresApproval.message });
      }

      requiresApproval = parsedRequiresApproval.value;
    }

    const payload = {
      employeeId,
      name,
      basePoints: parsedBasePoints.value,
      weightage: parsedWeightage.value,
      isActive: isActive !== undefined ? isActive : true,
      requiresApproval:
        requiresApproval !== undefined ? requiresApproval : false,
    };

    const category = await runWithOptionalTransaction(async (session) => {
      if (payload.isActive) {
        const currentActiveTotal = await getActiveWeightageTotal({
          employeeId,
          session,
        });
        const attemptedTotal = roundToTwoDecimals(
          currentActiveTotal + payload.weightage
        );

        if (attemptedTotal > 100) {
          throw createStatusError(
            400,
            "Active category weightage limit exceeded",
            getWeightageLimitErrorPayload({
              employeeId,
              currentActiveTotal,
              attemptedTotal,
              attemptedWeightage: payload.weightage,
            })
          );
        }
      }

      const [createdCategory] = await KraCategory.create([payload], { session });
      return createdCategory;
    });

    res.status(201).json({
      message: "KRA category created successfully",
      category,
    });
  } catch (error) {
    if (error?.statusCode) {
      const responsePayload = { message: error.message };
      if (error.currentActiveTotal !== undefined) {
        responsePayload.currentActiveTotal = error.currentActiveTotal;
      }
      if (error.attemptedTotal !== undefined) {
        responsePayload.attemptedTotal = error.attemptedTotal;
      }
      if (error.attemptedWeightage !== undefined) {
        responsePayload.attemptedWeightage = error.attemptedWeightage;
      }
      if (error.employeeId !== undefined) {
        responsePayload.employeeId = error.employeeId;
      }
      return res.status(error.statusCode).json(responsePayload);
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateKraCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "A valid category id is required" });
    }

    if (!Object.prototype.hasOwnProperty.call(req.body, "weightage")) {
      return res.status(400).json({ message: "weightage is required" });
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = normalizeString(req.body.name);
      if (!name) {
        return res.status(400).json({ message: "name is required" });
      }

      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "basePoints")) {
      const parsedBasePoints = parseNumberField(req.body.basePoints, "basePoints");
      if (!parsedBasePoints.valid) {
        return res.status(400).json({ message: parsedBasePoints.message });
      }

      updates.basePoints = parsedBasePoints.value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "weightage")) {
      const parsedWeightage = parseRequiredWeightageField(req.body.weightage);
      if (!parsedWeightage.valid) {
        return res.status(400).json({ message: parsedWeightage.message });
      }

      updates.weightage = parsedWeightage.value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "isActive")) {
      const parsedIsActive = parseBooleanField(req.body.isActive, "isActive");
      if (!parsedIsActive.valid) {
        return res.status(400).json({ message: parsedIsActive.message });
      }

      updates.isActive = parsedIsActive.value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "requiresApproval")) {
      const parsedRequiresApproval = parseBooleanField(
        req.body.requiresApproval,
        "requiresApproval"
      );
      if (!parsedRequiresApproval.valid) {
        return res.status(400).json({ message: parsedRequiresApproval.message });
      }

      updates.requiresApproval = parsedRequiresApproval.value;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        message:
          "Provide at least one field to update: name, basePoints, weightage, isActive, requiresApproval",
      });
    }

    const category = await runWithOptionalTransaction(async (session) => {
      const existingCategoryQuery = KraCategory.findOne({
        _id: id,
        deletedAt: null,
      });
      const existingCategory = session
        ? await existingCategoryQuery.session(session)
        : await existingCategoryQuery;
      if (!existingCategory) {
        throw createStatusError(404, "KRA category not found");
      }

      const nextIsActive =
        updates.isActive !== undefined ? updates.isActive : existingCategory.isActive;
      const nextWeightage =
        updates.weightage !== undefined ? updates.weightage : existingCategory.weightage;

      if (nextIsActive) {
        const currentActiveTotal = await getActiveWeightageTotal({
          employeeId: existingCategory.employeeId,
          excludeCategoryId: existingCategory._id,
          session,
        });
        const attemptedTotal = roundToTwoDecimals(currentActiveTotal + nextWeightage);

        if (attemptedTotal > 100) {
          throw createStatusError(
            400,
            "Active category weightage limit exceeded",
            getWeightageLimitErrorPayload({
              employeeId: existingCategory.employeeId,
              currentActiveTotal,
              attemptedTotal,
              attemptedWeightage: nextWeightage,
            })
          );
        }
      }

      Object.assign(existingCategory, updates);
      await existingCategory.save({ session });
      return existingCategory;
    });

    res.json({
      message: "KRA category updated successfully",
      category,
    });
  } catch (error) {
    if (error?.statusCode) {
      const responsePayload = { message: error.message };
      if (error.currentActiveTotal !== undefined) {
        responsePayload.currentActiveTotal = error.currentActiveTotal;
      }
      if (error.attemptedTotal !== undefined) {
        responsePayload.attemptedTotal = error.attemptedTotal;
      }
      if (error.attemptedWeightage !== undefined) {
        responsePayload.attemptedWeightage = error.attemptedWeightage;
      }
      if (error.employeeId !== undefined) {
        responsePayload.employeeId = error.employeeId;
      }
      return res.status(error.statusCode).json(responsePayload);
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteKraCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "A valid category id is required" });
    }

    const category = await KraCategory.findOne({ _id: id, deletedAt: null });
    if (!category) {
      return res.status(404).json({ message: "KRA category not found" });
    }

    category.isActive = false;
    category.deletedAt = new Date();
    await category.save();

    res.json({
      message: "KRA category deleted successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getKraCategories,
  createKraCategory,
  updateKraCategory,
  deleteKraCategory,
};
