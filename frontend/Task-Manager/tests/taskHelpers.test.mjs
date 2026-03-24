import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  buildStatusTabs,
  extractStatusSummary,
  getTaskSortLabel,
  sortTasks,
} from "../src/utils/taskHelpers.js";

describe("taskHelpers", () => {
  test("sortTasks keeps the default status, priority and due date order", () => {
    const tasks = [
      { _id: "1", status: "In Progress", priority: "Medium", dueDate: "2025-03-10" },
      { _id: "2", status: "Pending", priority: "High", dueDate: "2025-02-01" },
      { _id: "3", status: "Pending", priority: "Low", dueDate: "2025-01-01" },
      { _id: "4", status: "Completed", priority: "High", dueDate: "2024-12-01" },
    ];

    const sorted = sortTasks(tasks, {
      includePrioritySort: true,
      mode: "default",
    });

    assert.deepEqual(sorted.map((task) => task._id), ["2", "1", "3", "4"]);
  });

  test("sortTasks orders by assigned newest to oldest", () => {
    const tasks = [
      { _id: "1", createdAt: "2025-01-03T09:00:00.000Z" },
      { _id: "2", createdAt: "2025-01-01T09:00:00.000Z" },
      { _id: "3", createdAt: "2025-01-05T09:00:00.000Z" },
    ];

    const sorted = sortTasks(tasks, { mode: "assigned-newest" });
    assert.deepEqual(sorted.map((task) => task._id), ["3", "1", "2"]);
  });

  test("sortTasks orders by priority high to low", () => {
    const tasks = [
      { _id: "1", priority: "Low", dueDate: "2025-01-01" },
      { _id: "2", priority: "High", dueDate: "2025-01-02" },
      { _id: "3", priority: "Medium", dueDate: "2025-01-03" },
    ];

    const sorted = sortTasks(tasks, { mode: "priority-high" });
    assert.deepEqual(sorted.map((task) => task._id), ["2", "3", "1"]);
  });

  test("sortTasks orders by due date near to far", () => {
    const tasks = [
      { _id: "1", dueDate: "2025-01-03" },
      { _id: "2", dueDate: "2025-01-01" },
      { _id: "3", dueDate: "2025-01-02" },
    ];

    const sorted = sortTasks(tasks, { mode: "due-nearest" });
    assert.deepEqual(sorted.map((task) => task._id), ["2", "3", "1"]);
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
      { label: "Drafts", count: 0 },
      { label: "Pending", count: 4 },
      { label: "In Progress", count: 3 },
      { label: "Pending Approval", count: 0 },
      { label: "Completed", count: 3 },
    ]);
  });

  test("extractStatusSummary coerces missing values to zero", () => {
    const summary = extractStatusSummary({ inProgressTasks: "2" });
    assert.deepEqual(summary, {
      all: 0,
      draftTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 2,
      pendingApprovalTasks: 0,
      completedTasks: 0,
    });
  });

  test("getTaskSortLabel returns a readable fallback label", () => {
    assert.equal(getTaskSortLabel("priority-high"), "Priority: High to Low");
    assert.equal(getTaskSortLabel("unknown"), "Default");
  });
});
