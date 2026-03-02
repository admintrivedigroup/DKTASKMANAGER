const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildScoringConfig,
  calculateTaskScoring,
} = require("../utils/taskScoring");

describe("taskScoring", () => {
  test("non-completed task uses potential = base points * priority multiplier", () => {
    const scoring = calculateTaskScoring({
      status: "Pending",
      priority: "High",
      dueDate: new Date("2026-01-01T00:00:00.000Z"),
      categoryBasePoints: 10,
      hasCategory: true,
      scoringConfig: buildScoringConfig(),
      asOfDate: new Date("2026-01-10T00:00:00.000Z"),
    });

    assert.equal(scoring.taskPointsPotential, 15);
    assert.equal(scoring.taskPointsEarned, 0);
    assert.equal(scoring.lateDays, 9);
  });

  test("completed task applies timeliness multiplier based on lateness bucket", () => {
    const scoring = calculateTaskScoring({
      status: "Completed",
      priority: "High",
      dueDate: new Date("2026-01-01T00:00:00.000Z"),
      completedAt: new Date("2026-01-04T00:00:00.000Z"),
      categoryBasePoints: 10,
      hasCategory: true,
      scoringConfig: buildScoringConfig(),
    });

    assert.equal(scoring.lateDays, 3);
    assert.equal(scoring.taskPointsPotential, 15);
    assert.equal(scoring.taskPointsEarned, 7.5);
  });

  test("missing category marks task as unscored with zero points", () => {
    const scoring = calculateTaskScoring({
      status: "Completed",
      priority: "Medium",
      dueDate: new Date("2026-01-01T00:00:00.000Z"),
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
      categoryBasePoints: 42,
      hasCategory: false,
      scoringConfig: buildScoringConfig(),
    });

    assert.equal(scoring.isUnscored, true);
    assert.equal(scoring.taskPointsPotential, 0);
    assert.equal(scoring.taskPointsEarned, 0);
    assert.equal(scoring.timelinessMultiplier, null);
  });

  test("points are rounded to two decimals", () => {
    const scoring = calculateTaskScoring({
      status: "Completed",
      priority: "Low",
      dueDate: new Date("2026-01-01T00:00:00.000Z"),
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
      categoryBasePoints: 1.333,
      hasCategory: true,
      scoringConfig: buildScoringConfig({
        priorityMultipliers: {
          low: 1.333,
          medium: 1.25,
          high: 1.5,
          urgent: 2,
        },
      }),
    });

    assert.equal(scoring.taskPointsPotential, 1.78);
    assert.equal(scoring.taskPointsEarned, 1.33);
  });
});
