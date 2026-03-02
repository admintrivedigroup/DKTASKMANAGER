const DEFAULT_PRIORITY_MULTIPLIERS = {
  low: 1,
  medium: 1.25,
  high: 1.5,
  urgent: 2,
};

const DEFAULT_TIMELINESS_MULTIPLIERS = [
  { maxLateDays: 0, multiplier: 1 },
  { maxLateDays: 2, multiplier: 0.75 },
  { maxLateDays: 7, multiplier: 0.5 },
  { maxLateDays: 9999, multiplier: 0.25 },
];

const COMPLETED_STATUS = "Completed";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toPositiveNumber = (value, fallbackValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const toNumberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundToTwoDecimals = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

const getPriorityKey = (priority) => {
  const normalized =
    typeof priority === "string" ? priority.trim().toLowerCase() : "";

  if (normalized === "low") return "low";
  if (normalized === "high") return "high";
  if (normalized === "urgent") return "urgent";
  return "medium";
};

const normalizeTimelinessSlabs = (slabs) => {
  const normalized = Array.isArray(slabs)
    ? slabs
        .map((slab) => ({
          maxLateDays: Number(slab?.maxLateDays),
          multiplier: Number(slab?.multiplier),
        }))
        .filter(
          (slab) =>
            Number.isInteger(slab.maxLateDays) &&
            slab.maxLateDays >= 0 &&
            Number.isFinite(slab.multiplier) &&
            slab.multiplier > 0
        )
        .sort((firstSlab, secondSlab) => firstSlab.maxLateDays - secondSlab.maxLateDays)
    : [];

  if (normalized.length) {
    return normalized;
  }

  return DEFAULT_TIMELINESS_MULTIPLIERS.map((slab) => ({ ...slab }));
};

const getTimelinessMultiplier = (slabs, lateDays) => {
  const normalizedSlabs = normalizeTimelinessSlabs(slabs);
  const matchedSlab = normalizedSlabs.find((slab) => lateDays <= slab.maxLateDays);

  if (matchedSlab) {
    return matchedSlab.multiplier;
  }

  return normalizedSlabs[normalizedSlabs.length - 1].multiplier;
};

const calculateLateDays = (asOfDate, dueDate) => {
  if (!dueDate) {
    return 0;
  }

  const asOfDateValue = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  if (Number.isNaN(asOfDateValue.getTime())) {
    return 0;
  }

  const dueDateValue = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(dueDateValue.getTime())) {
    return 0;
  }

  const diffInMs = asOfDateValue.getTime() - dueDateValue.getTime();
  if (diffInMs <= 0) {
    return 0;
  }

  return Math.ceil(diffInMs / MS_PER_DAY);
};

const buildScoringConfig = (profile) => {
  const priorityMultipliers = {
    low: toPositiveNumber(
      profile?.priorityMultipliers?.low,
      DEFAULT_PRIORITY_MULTIPLIERS.low
    ),
    medium: toPositiveNumber(
      profile?.priorityMultipliers?.medium,
      DEFAULT_PRIORITY_MULTIPLIERS.medium
    ),
    high: toPositiveNumber(
      profile?.priorityMultipliers?.high,
      DEFAULT_PRIORITY_MULTIPLIERS.high
    ),
    urgent: toPositiveNumber(
      profile?.priorityMultipliers?.urgent,
      DEFAULT_PRIORITY_MULTIPLIERS.urgent
    ),
  };

  const timelinessMultipliers = normalizeTimelinessSlabs(
    profile?.timelinessMultipliers
  );

  return {
    priorityMultipliers,
    timelinessMultipliers,
  };
};

const calculateTaskScoring = ({
  status,
  priority,
  dueDate,
  completedAt,
  categoryBasePoints,
  hasCategory = true,
  scoringConfig,
  asOfDate = new Date(),
}) => {
  const normalizedScoringConfig = buildScoringConfig(scoringConfig);
  const isCompleted = status === COMPLETED_STATUS;
  const isUnscored = !hasCategory;
  const safeBasePoints = isUnscored ? 0 : toNumberOrZero(categoryBasePoints);
  const priorityKey = getPriorityKey(priority);
  const priorityMultiplier = toPositiveNumber(
    normalizedScoringConfig.priorityMultipliers[priorityKey],
    DEFAULT_PRIORITY_MULTIPLIERS.medium
  );
  const taskPointsPotential = roundToTwoDecimals(safeBasePoints * priorityMultiplier);

  if (!isCompleted) {
    return {
      isCompleted,
      isUnscored,
      lateDays: calculateLateDays(asOfDate, dueDate),
      categoryBasePoints: safeBasePoints,
      priorityMultiplier,
      timelinessMultiplier: null,
      taskPointsPotential,
      taskPointsEarned: 0,
    };
  }

  const lateDays = calculateLateDays(completedAt || asOfDate, dueDate);
  const timelinessMultiplier = isUnscored
    ? null
    : getTimelinessMultiplier(
        normalizedScoringConfig.timelinessMultipliers,
        lateDays
      );
  const taskPointsEarned = isUnscored
    ? 0
    : roundToTwoDecimals(
        safeBasePoints * priorityMultiplier * timelinessMultiplier
      );

  return {
    isCompleted,
    isUnscored,
    lateDays,
    categoryBasePoints: safeBasePoints,
    priorityMultiplier,
    timelinessMultiplier,
    taskPointsPotential,
    taskPointsEarned,
  };
};

module.exports = {
  DEFAULT_PRIORITY_MULTIPLIERS,
  DEFAULT_TIMELINESS_MULTIPLIERS,
  COMPLETED_STATUS,
  toPositiveNumber,
  toNumberOrZero,
  roundToTwoDecimals,
  getPriorityKey,
  normalizeTimelinessSlabs,
  getTimelinessMultiplier,
  calculateLateDays,
  buildScoringConfig,
  calculateTaskScoring,
};
