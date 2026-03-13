const mongoose = require("mongoose");
const EmployeeKraColumn = require("../models/EmployeeKraColumn");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpError");
const { normalizeRole } = require("../utils/roleUtils");

const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

const ensureEmployeeExists = async (employeeId) => {
  const employee = await User.findById(employeeId).select("_id role");

  if (!employee) {
    throw createHttpError("Employee not found", 404);
  }

  if (normalizeRole(employee.role) === "client") {
    throw createHttpError("Columns must belong to an employee", 400);
  }

  return employee;
};

const getEmployeeKraColumns = async (req, res, next) => {
  try {
    await ensureEmployeeExists(req.query.employeeId);

    const columns = await EmployeeKraColumn.find({
      employeeId: req.query.employeeId,
    }).sort({ order: 1, createdAt: 1 });

    res.json(columns);
  } catch (error) {
    next(error);
  }
};

const createEmployeeKraColumn = async (req, res, next) => {
  try {
    await ensureEmployeeExists(req.body.employeeId);

    const column = await EmployeeKraColumn.create(req.body);
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

    Object.assign(column, req.body);
    await column.save();

    res.json(column);
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

    await column.deleteOne();

    res.json({ message: "KRA column deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeKraColumns,
  createEmployeeKraColumn,
  updateEmployeeKraColumn,
  deleteEmployeeKraColumn,
};
