const EmployeeKraColumn = require("../models/EmployeeKraColumn");

const SYSTEM_COLUMN_LABEL = "Over & Beyond (Action)";
const SYSTEM_COLUMN_TYPE = "over_and_beyond";

const isSystemKraColumn = (column) =>
  Boolean(
    column &&
      (column.isSystemColumn ||
        column.columnType === SYSTEM_COLUMN_TYPE ||
        column.label === SYSTEM_COLUMN_LABEL)
  );

const getColumnTimestamp = (column) => {
  const value = column?.createdAt ? new Date(column.createdAt).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
};

const sortColumns = (columns) =>
  [...columns].sort((firstColumn, secondColumn) => {
    const orderDifference =
      Number(firstColumn?.order || 0) - Number(secondColumn?.order || 0);

    if (orderDifference !== 0) {
      return orderDifference;
    }

    return getColumnTimestamp(firstColumn) - getColumnTimestamp(secondColumn);
  });

const getSystemColumnDefaults = (employeeId, order) => ({
  employeeId,
  label: SYSTEM_COLUMN_LABEL,
  columnType: SYSTEM_COLUMN_TYPE,
  isSystemColumn: true,
  weightage: 100,
  targetText: "0%",
  sourceText: "Observbation by Partners",
  frequencyText: "MONTHLY",
  basePoints: 0,
  requiresApproval: false,
  order,
  isActive: true,
});

const normalizeSystemColumnFields = (column, order) => {
  let changed = false;
  const desiredFields = getSystemColumnDefaults(column.employeeId, order);

  Object.entries(desiredFields).forEach(([key, value]) => {
    const currentValue =
      key === "employeeId" && column[key] && typeof column[key].toString === "function"
        ? column[key].toString()
        : column[key];
    const normalizedValue =
      key === "employeeId" && value && typeof value.toString === "function"
        ? value.toString()
        : value;

    if (currentValue !== normalizedValue) {
      column[key] = value;
      changed = true;
    }
  });

  return changed;
};

const normalizeRegularColumnFields = (column, order) => {
  let changed = false;

  if (column.columnType !== "standard") {
    column.columnType = "standard";
    changed = true;
  }

  if (column.isSystemColumn) {
    column.isSystemColumn = false;
    changed = true;
  }

  if (Number(column.order || 0) !== order) {
    column.order = order;
    changed = true;
  }

  return changed;
};

const ensureEmployeeSystemKraColumn = async (employeeId) => {
  let columns = await EmployeeKraColumn.find({ employeeId }).sort({ order: 1, createdAt: 1 });
  const sortedColumns = sortColumns(columns);

  const explicitSystemColumn = sortedColumns.find(
    (column) => column.isSystemColumn || column.columnType === SYSTEM_COLUMN_TYPE
  );
  let systemColumn =
    explicitSystemColumn ||
    sortedColumns.find((column) => column.label === SYSTEM_COLUMN_LABEL);
  if (!systemColumn) {
    systemColumn = await EmployeeKraColumn.create(
      getSystemColumnDefaults(employeeId, sortedColumns.length + 1)
    );
    columns = [...sortedColumns, systemColumn];
  } else {
    columns = sortedColumns;
  }

  const duplicateSystemColumnIds = columns
    .filter((column) => column._id.toString() !== systemColumn._id.toString())
    .filter((column) => column.isSystemColumn || column.columnType === SYSTEM_COLUMN_TYPE)
    .map((column) => column._id);

  if (duplicateSystemColumnIds.length) {
    await EmployeeKraColumn.deleteMany({ _id: { $in: duplicateSystemColumnIds } });
    columns = columns.filter(
      (column) => !duplicateSystemColumnIds.some((id) => id.toString() === column._id.toString())
    );
  }

  const regularColumns = sortColumns(
    columns.filter((column) => column._id.toString() !== systemColumn._id.toString())
  );
  const reorderedColumns = [...regularColumns, systemColumn];
  const saveOperations = [];

  regularColumns.forEach((column, index) => {
    if (normalizeRegularColumnFields(column, index + 1)) {
      saveOperations.push(column.save());
    }
  });

  if (normalizeSystemColumnFields(systemColumn, regularColumns.length + 1)) {
    saveOperations.push(systemColumn.save());
  }

  if (saveOperations.length) {
    await Promise.all(saveOperations);
  }

  return EmployeeKraColumn.find({ employeeId }).sort({ order: 1, createdAt: 1 });
};

module.exports = {
  SYSTEM_COLUMN_LABEL,
  SYSTEM_COLUMN_TYPE,
  ensureEmployeeSystemKraColumn,
  getSystemColumnDefaults,
  isSystemKraColumn,
};
