import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  sortTasks,
  buildStatusTabs,
  extractStatusSummary,
} from "../src/utils/taskHelpers.js";

describe("taskHelpers", () => {
  test("sortTasks orders by status, priority and due date", () => {
    const tasks = [
      { _id: "1", status: "In Progress", priority: "Medium", dueDate: "2025-03-10" },
      { _id: "2", status: "Pending", priority: "High", dueDate: "2025-02-01" },
      { _id: "3", status: "Pending", priority: "Low", dueDate: "2025-01-01" },
      { _id: "4", status: "Completed", priority: "High", dueDate: "2024-12-01" },
    ];

    const sorted = sortTasks(tasks, { includePrioritySort: true });

    assert.deepEqual(sorted.map((task) => task._id), ["2", "1", "3", "4"]);
  });

  test("sortTasks skips priority ordering when disabled", () => {
    const tasks = [
      { _id: "1", status: "Pending", priority: "Low", dueDate: "2025-01-02" },
      { _id: "2", status: "Pending", priority: "High", dueDate: "2025-01-01" },
    ];

    const sorted = sortTasks(tasks, { includePrioritySort: false });
    assert.deepEqual(sorted.map((task) => task._id), ["2", "1"]);
  });

  test("buildStatusTabs returns counts with defaults", () => {
    const tabs = buildStatusTabs({
      all: 10,
      pendingTasks: 4,
      inProgressTasks: 3,
      completedTasks: 3,
    });

    assert.deepEqual(tabs, [
      { label: "All", count: 10 },
      { label: "Pending", count: 4 },
      { label: "In Progress", count: 3 },
      { label: "Completed", count: 3 },
    ]);
  });

  test("extractStatusSummary coerces missing values to zero", () => {
    const summary = extractStatusSummary({ inProgressTasks: "2" });
    assert.deepEqual(summary, {
      all: 0,
      pendingTasks: 0,
      inProgressTasks: 2,
      completedTasks: 0,
    });
  });
});