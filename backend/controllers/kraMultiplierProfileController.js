const KraMultiplierProfile = require("../models/KraMultiplierProfile");
const {
  resolveEmployeeIdForRead,
  resolveEmployeeIdFromRequest,
} = require("../utils/kraAccessUtils");
const {
  DEFAULT_PRIORITY_MULTIPLIERS,
  DEFAULT_TIMELINESS_MULTIPLIERS,
} = require("../utils/taskScoring");

const PRIORITY_KEYS = ["low", "medium", "high", "urgent"];

const buildDefaultProfile = (employeeId) => ({
  employeeId,
  priorityMultipliers: { ...DEFAULT_PRIORITY_MULTIPLIERS },
  timelinessMultipliers: DEFAULT_TIMELINESS_MULTIPLIERS.map((rule) => ({
    ...rule,
  })),
});

const parsePositiveNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false };
  }

  return { valid: true, value: parsed };
};

const validatePriorityMultipliers = (priorityMultipliers) => {
  if (!priorityMultipliers || Array.isArray(priorityMultipliers)) {
    return { valid: false, message: "priorityMultipliers is required" };
  }

  const missingKeys = PRIORITY_KEYS.filter(
    (key) => !Object.prototype.hasOwnProperty.call(priorityMultipliers, key)
  );
  if (missingKeys.length) {
    return {
      valid: false,
      message: `priorityMultipliers must include: ${PRIORITY_KEYS.join(", ")}`,
    };
  }

  const normalized = {};
  for (const key of PRIORITY_KEYS) {
    const parsed = parsePositiveNumber(priorityMultipliers[key]);
    if (!parsed.valid) {
      return {
        valid: false,
        message: `priorityMultipliers.${key} must be a number greater than 0`,
      };
    }

    normalized[key] = parsed.value;
  }

  return { valid: true, value: normalized };
};

const validateTimelinessMultipliers = (timelinessMultipliers) => {
  if (!Array.isArray(timelinessMultipliers) || !timelinessMultipliers.length) {
    return {
      valid: false,
      message: "timelinessMultipliers must be a non-empty array",
    };
  }

  const normalized = [];
  let previousMaxLateDays = -Infinity;

  for (let index = 0; index < timelinessMultipliers.length; index += 1) {
    const rule = timelinessMultipliers[index];
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      return {
        valid: false,
        message: `timelinessMultipliers[${index}] must be an object`,
      };
    }

    const maxLateDays = Number(rule.maxLateDays);
    if (!Number.isInteger(maxLateDays) || maxLateDays < 0) {
      return {
        valid: false,
        message: `timelinessMultipliers[${index}].maxLateDays must be a non-negative integer`,
      };
    }

    const parsedMultiplier = parsePositiveNumber(rule.multiplier);
    if (!parsedMultiplier.valid) {
      return {
        valid: false,
        message: `timelinessMultipliers[${index}].multiplier must be a number greater than 0`,
      };
    }

    if (maxLateDays < previousMaxLateDays) {
      return {
        valid: false,
        message: "timelinessMultipliers must be sorted by maxLateDays in ascending order",
      };
    }

    previousMaxLateDays = maxLateDays;
    normalized.push({
      maxLateDays,
      multiplier: parsedMultiplier.value,
    });
  }

  return { valid: true, value: normalized };
};

const getMultiplierProfile = async (req, res) => {
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

    const profile = await KraMultiplierProfile.findOne({ employeeId }).lean();
    if (profile) {
      return res.json({ profile });
    }

    return res.json({
      profile: buildDefaultProfile(employeeId),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const upsertMultiplierProfile = async (req, res) => {
  try {
    const resolvedEmployeeId = await resolveEmployeeIdFromRequest(
      req.query?.employeeId
    );
    if (!resolvedEmployeeId.valid) {
      return res
        .status(resolvedEmployeeId.statusCode)
        .json({ message: resolvedEmployeeId.message });
    }
    const employeeId = resolvedEmployeeId.value;

    const parsedPriorityMultipliers = validatePriorityMultipliers(
      req.body?.priorityMultipliers
    );
    if (!parsedPriorityMultipliers.valid) {
      return res.status(400).json({ message: parsedPriorityMultipliers.message });
    }

    const parsedTimelinessMultipliers = validateTimelinessMultipliers(
      req.body?.timelinessMultipliers
    );
    if (!parsedTimelinessMultipliers.valid) {
      return res.status(400).json({ message: parsedTimelinessMultipliers.message });
    }

    const profile = await KraMultiplierProfile.findOneAndUpdate(
      { employeeId },
      {
        $set: {
          employeeId,
          priorityMultipliers: parsedPriorityMultipliers.value,
          timelinessMultipliers: parsedTimelinessMultipliers.value,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      message: "KRA multiplier profile saved successfully",
      profile,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  DEFAULT_PRIORITY_MULTIPLIERS,
  DEFAULT_TIMELINESS_MULTIPLIERS,
  getMultiplierProfile,
  upsertMultiplierProfile,
};
