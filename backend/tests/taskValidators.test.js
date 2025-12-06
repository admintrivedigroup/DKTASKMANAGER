const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  validateCreateTaskPayload,
  validateUpdateTaskPayload,
  validateStatusPayload,
  validateChecklistPayload,
  validateTaskQuery,
} = require("../validators/taskValidators");
const { HttpError } = require("../utils/httpError");

describe("taskValidators", () => {
  test("validateCreateTaskPayload normalizes identifiers and strips whitespace", () => {
    const payload = {
      title: "  Launch product  ",
      description: "  Coordinate launch tasks  ",
      priority: "High",
      dueDate: "2025-01-12T00:00:00.000Z",
      startDate: "2025-01-10T08:00:00.000Z",
      reminderMinutesBefore: "90",
      recurrence: "Weekly",
      recurrenceEndDate: "2025-02-10T00:00:00.000Z",
      estimatedHours: "12.5",
      assignedTo: [
        { _id: "abc123" },
        "def456",
        "abc123", // duplicate should be removed
      ],
      attachments: [{ name: "brief.pdf" }],
      todoChecklist: [
        "Draft announcement",
        {
          _id: "todo1",
          text: "Review copy",
          assignedTo: { _id: "def456" },
          completed: true,
        },
      ],
      matter: "   matter-1   ",
      caseFile: "case-9",
      relatedDocuments: ["doc-1", "doc-2", "doc-1"],
    };

    const result = validateCreateTaskPayload(payload);

    assert.deepEqual(result, {
      title: "Launch product",
      description: "Coordinate launch tasks",
      priority: "High",
      dueDate: "2025-01-12T00:00:00.000Z",
      startDate: "2025-01-10T08:00:00.000Z",
      reminderMinutesBefore: 90,
      recurrence: "Weekly",
      recurrenceEndDate: "2025-02-10T00:00:00.000Z",
      estimatedHours: 12.5,
      assignedTo: ["abc123", "def456"],
      todoChecklist: [
        "Draft announcement",
        {
          _id: "todo1",
          text: "Review copy",
          assignedTo: "def456",
          completed: true,
        },
      ],
      attachments: [{ name: "brief.pdf" }],
      matter: "matter-1",
      caseFile: "case-9",
      relatedDocuments: ["doc-1", "doc-2"],
    });
  });

  test("validateCreateTaskPayload throws when required fields are missing", () => {
    assert.throws(
      () =>
        validateCreateTaskPayload({
          title: "",
          description: "",
          priority: "Low",
          dueDate: "",
          assignedTo: [],
        }),
      (error) => error instanceof HttpError && /title is required/.test(error.message)
    );
  });

  test("validateUpdateTaskPayload requires at least one updatable field", () => {
    assert.throws(
      () => validateUpdateTaskPayload({}),
      (error) =>
        error instanceof HttpError &&
        /Provide at least one field to update/.test(error.message)
    );
  });

  test("validateUpdateTaskPayload sanitizes provided fields", () => {
    const payload = {
      title: "  Updated title ",
      description: "  Updated description ",
      priority: "Medium",
      dueDate: "2025-02-01T12:00:00.000Z",
      assignedTo: ["user-1", "user-2"],
      todoChecklist: ["Refine scope"],
      attachments: [{ name: "notes.txt" }],
      matter: "new-matter",
      relatedDocuments: ["doc-a"],
      status: "In Progress",
      startDate: "2025-01-09T09:00:00.000Z",
      reminderMinutesBefore: 45,
      recurrence: "Monthly",
      recurrenceEndDate: "2025-06-01T00:00:00.000Z",
      estimatedHours: 40,
    };

    const result = validateUpdateTaskPayload(payload);

    assert.deepEqual(result, {
      title: "Updated title",
      description: "Updated description",
      priority: "Medium",
      dueDate: "2025-02-01T12:00:00.000Z",
      assignedTo: ["user-1", "user-2"],
      todoChecklist: ["Refine scope"],
      attachments: [{ name: "notes.txt" }],
      matter: "new-matter",
      relatedDocuments: ["doc-a"],
      status: "In Progress",
      startDate: "2025-01-09T09:00:00.000Z",
      reminderMinutesBefore: 45,
      recurrence: "Monthly",
      recurrenceEndDate: "2025-06-01T00:00:00.000Z",
      estimatedHours: 40,
    });
  });

  test("validateCreateTaskPayload rejects startDate after dueDate", () => {
    assert.throws(
      () =>
        validateCreateTaskPayload({
          title: "Bad schedule",
          description: "Start after due",
          priority: "Low",
          dueDate: "2025-01-01T00:00:00.000Z",
          startDate: "2025-01-02T00:00:00.000Z",
          assignedTo: ["user-1"],
          todoChecklist: ["Prep"],
        }),
      (error) =>
        error instanceof HttpError &&
        /startDate cannot be after dueDate/.test(error.message)
    );
  });

  test("validateCreateTaskPayload requires end date when recurrence is set", () => {
    assert.throws(
      () =>
        validateCreateTaskPayload({
          title: "Repeating",
          description: "Missing end date",
          priority: "Medium",
          dueDate: "2025-03-01T00:00:00.000Z",
          recurrence: "Daily",
          assignedTo: ["user-1"],
          todoChecklist: ["Prep"],
        }),
      (error) =>
        error instanceof HttpError &&
        /recurrenceEndDate is required when recurrence is enabled/.test(
          error.message
        )
    );
  });

  test("validateUpdateTaskPayload enforces recurrence end date when recurrence changes", () => {
    assert.throws(
      () =>
        validateUpdateTaskPayload({
          recurrence: "Weekly",
        }),
      (error) =>
        error instanceof HttpError &&
        /recurrenceEndDate is required when recurrence is enabled/.test(
          error.message
        )
    );
  });

  test("validateStatusPayload enforces allowed statuses", () => {
    const result = validateStatusPayload({ status: "Completed" });
    assert.deepEqual(result, { status: "Completed" });

    assert.throws(
      () => validateStatusPayload({ status: "Archived" }),
      (error) => error instanceof HttpError && /status must be one of/.test(error.message)
    );
  });

  test("validateChecklistPayload rejects missing payload", () => {
    assert.throws(
      () => validateChecklistPayload({}),
      (error) =>
        error instanceof HttpError && /todoChecklist is required/.test(error.message)
    );
  });

  test("validateChecklistPayload accepts partial checklist updates", () => {
    const payload = {
      todoChecklist: [
        { _id: "item-1", completed: true },
        { _id: "item-2", completed: false },
      ],
    };

    const result = validateChecklistPayload(payload);

    assert.deepEqual(result, {
      todoChecklist: [
        { _id: "item-1", completed: true },
        { _id: "item-2", completed: false },
      ],
    });
  });

  test("validateChecklistPayload requires identifiers for partial updates", () => {
    assert.throws(
      () =>
        validateChecklistPayload({
          todoChecklist: [{ completed: true }],
        }),
      (error) =>
        error instanceof HttpError &&
        /todoChecklist\[0\]._id is required when updating the checklist/.test(
          error.message
        )
    );
  });

  test("validateTaskQuery drops unknown and empty filters", () => {
    const result = validateTaskQuery({
      status: "Pending",
      scope: "all",
      matter: "matter-1",
      caseFile: "",
      page: "1",
    });

    assert.deepEqual(result, {
      status: "Pending",
      scope: "all",
      matter: "matter-1",
    });
  });
});
