const mongoose = require("mongoose");
const EmployeeKraColumn = require("../models/EmployeeKraColumn");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpError");
const {
  SYSTEM_COLUMN_LABEL,
  SYSTEM_COLUMN_TYPE,
  ensureEmployeeSystemKraColumn,
  isSystemKraColumn,
} = require("../utils/employeeKraColumnSystem");
const { normalizeRole } = require("../utils/roleUtils");

const isKraEligibleRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "member";
};

const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

const ensureEmployeeExists = async (employeeId) => {
  const employee = await User.findById(employeeId).select("_id role");

  if (!employee) {
    throw createHttpError("Employee not found", 404);
  }

  if (!isKraEligibleRole(employee.role)) {
    throw createHttpError("KRA columns are only available for admin and member accounts", 400);
  }

  return employee;
};

const getEmployeeKraColumns = async (req, res, next) => {
  try {
    await ensureEmployeeExists(req.query.employeeId);
    const columns = await ensureEmployeeSystemKraColumn(req.query.employeeId);

    res.json(columns);
  } catch (error) {
    next(error);
  }
};

const getEmployeeKraColumnById = async (req, res, next) => {
  try {
    const columnId = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!isValidObjectId(columnId)) {
      throw createHttpError("A valid column id is required", 400);
    }

    const column = await EmployeeKraColumn.findById(columnId);
    if (!column) {
      throw createHttpError("KRA column not found", 404);
    }

    await ensureEmployeeExists(column.employeeId.toString());
    res.json(column);
  } catch (error) {
    next(error);
  }
};

const createEmployeeKraColumn = async (req, res, next) => {
  try {
    await ensureEmployeeExists(req.body.employeeId);

    if (req.body.label === SYSTEM_COLUMN_LABEL) {
      throw createHttpError(`"${SYSTEM_COLUMN_LABEL}" is reserved for the system column`, 400);
    }

    const createdColumn = await EmployeeKraColumn.create({
      ...req.body,
      columnType: "standard",
      isSystemColumn: false,
    });
    const columns = await ensureEmployeeSystemKraColumn(req.body.employeeId);
    const column =
      columns.find((item) => item._id.toString() === createdColumn._id.toString()) || createdColumn;

    res.status(201).json(column);
  } catch (error) {
    next(error);
  }
};

const updateEmployeeKraColumn = async (req, res, next) => {
  try {
    const columnId = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!isValidObjectId(columnId)) {
      throw createHttpError("A valid column id is required", 400);
    }

    if (req.body.employeeId) {
      await ensureEmployeeExists(req.body.employeeId);
    }

    const column = await EmployeeKraColumn.findById(columnId);
    if (!column) {
      throw createHttpError("KRA column not found", 404);
    }

    const previousEmployeeId = column.employeeId.toString();
    const nextEmployeeId =
      typeof req.body.employeeId === "string" ? req.body.employeeId : previousEmployeeId;

    if (isSystemKraColumn(column) && nextEmployeeId !== previousEmployeeId) {
      throw createHttpError("System KRA columns cannot be reassigned", 400);
    }

    if (!isSystemKraColumn(column) && req.body.label === SYSTEM_COLUMN_LABEL) {
      throw createHttpError(`"${SYSTEM_COLUMN_LABEL}" is reserved for the system column`, 400);
    }

    Object.assign(column, req.body);

    if (isSystemKraColumn(column)) {
      column.label = SYSTEM_COLUMN_LABEL;
      column.columnType = SYSTEM_COLUMN_TYPE;
      column.isSystemColumn = true;
      column.isActive = true;
    } else {
      column.columnType = "standard";
      column.isSystemColumn = false;
    }

    await column.save();
    const normalizedPreviousColumns = await ensureEmployeeSystemKraColumn(previousEmployeeId);

    if (nextEmployeeId !== previousEmployeeId) {
      await ensureEmployeeSystemKraColumn(nextEmployeeId);
    }

    const normalizedColumn =
      normalizedPreviousColumns.find((item) => item._id.toString() === column._id.toString()) ||
      (await EmployeeKraColumn.findById(column._id));

    res.json(normalizedColumn);
  } catch (error) {
    next(error);
  }
};

const deleteEmployeeKraColumn = async (req, res, next) => {
  try {
    const columnId = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!isValidObjectId(columnId)) {
      throw createHttpError("A valid column id is required", 400);
    }

    const column = await EmployeeKraColumn.findById(columnId);
    if (!column) {
      throw createHttpError("KRA column not found", 404);
    }

    if (isSystemKraColumn(column)) {
      throw createHttpError("System KRA columns cannot be deleted", 400);
    }

    const employeeId = column.employeeId.toString();
    await column.deleteOne();
    await ensureEmployeeSystemKraColumn(employeeId);

    res.json({ message: "KRA column deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeKraColumns,
  getEmployeeKraColumnById,
  createEmployeeKraColumn,
  updateEmployeeKraColumn,
  deleteEmployeeKraColumn,
};
