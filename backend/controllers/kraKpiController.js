const EmployeeKraColumn = require("../models/EmployeeKraColumn");
const Task = require("../models/Task");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpError");
const { hasPrivilegedAccess, normalizeRole } = require("../utils/roleUtils");

const MONTH_SEQUENCE = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

const roundValue = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(4));
};

const getFinancialYearRange = (fyStartYear) => {
  return {
    start: new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(fyStartYear + 1, 3, 1, 0, 0, 0, 0)),
  };
};

const getFinancialMonthLabel = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return MONTH_SEQUENCE[date.getUTCMonth() >= 3 ? date.getUTCMonth() - 3 : date.getUTCMonth() + 9];
};

const buildMonthRow = (month, columns) => {
  const reversePoints = {};
  const points = {};
  const weightage = {};
  const finalScore = {};

  columns.forEach((column) => {
    const columnId = column.id;
    reversePoints[columnId] = 0;
    points[columnId] = 0;
    weightage[columnId] = Number(column.weightage || 0);
    finalScore[columnId] = 0;
  });

  return {
    month,
    reversePoints,
    points,
    weightage,
    finalScore,
    monthFinalScore: 0,
  };
};

const buildSummaryRow = (label, columns) => {
  const reversePoints = {};
  const points = {};
  const weightage = {};
  const finalScore = {};

  columns.forEach((column) => {
    const columnId = column.id;
    reversePoints[columnId] = 0;
    points[columnId] = 0;
    weightage[columnId] = Number(column.weightage || 0);
    finalScore[columnId] = 0;
  });

  return {
    label,
    reversePoints,
    points,
    weightage,
    finalScore,
    monthFinalScore: 0,
  };
};

const getKraKpiMatrix = async (req, res, next) => {
  try {
    const { employeeId, fyStartYear } = req.query;
    const requesterId =
      req.user?._id && typeof req.user._id.toString === "function"
        ? req.user._id.toString()
        : "";

    if (!hasPrivilegedAccess(req.user?.role) && requesterId !== employeeId) {
      throw createHttpError("You are not authorized to view this employee's KRA/KPI matrix", 403);
    }

    const employee = await User.findById(employeeId).select(
      "_id name email role employeeRole profileImageUrl"
    );

    if (!employee) {
      throw createHttpError("Employee not found", 404);
    }

    if (normalizeRole(employee.role) === "client") {
      throw createHttpError("KRA/KPI matrix can only be generated for an employee", 400);
    }

    const columns = await EmployeeKraColumn.find({
      employeeId,
    }).sort({ order: 1, createdAt: 1 });

    const { start, end } = getFinancialYearRange(fyStartYear);
    const tasks = await Task.find({
      assignedTo: employeeId,
      status: "Completed",
      kraColumnId: { $ne: null },
      completedAt: {
        $gte: start,
        $lt: end,
      },
    }).select("kraColumnId earnedPoints lostPoints completedAt");

    const normalizedColumns = columns.map((column) => column.toJSON());
    const monthMap = new Map(
      MONTH_SEQUENCE.map((month) => [month, buildMonthRow(month, normalizedColumns)])
    );
    const columnMap = new Map(normalizedColumns.map((column) => [column.id, column]));

    tasks.forEach((task) => {
      const columnId =
        task.kraColumnId && typeof task.kraColumnId.toString === "function"
          ? task.kraColumnId.toString()
          : "";
      const monthLabel = getFinancialMonthLabel(task.completedAt);

      if (!columnId || !monthLabel || !columnMap.has(columnId) || !monthMap.has(monthLabel)) {
        return;
      }

      const monthRow = monthMap.get(monthLabel);
      monthRow.reversePoints[columnId] = roundValue(
        Number(monthRow.reversePoints[columnId] || 0) + Number(task.lostPoints || 0)
      );
      monthRow.points[columnId] = roundValue(
        Number(monthRow.points[columnId] || 0) + Number(task.earnedPoints || 0)
      );
    });

    const months = MONTH_SEQUENCE.map((month) => {
      const monthRow = monthMap.get(month);

      normalizedColumns.forEach((column) => {
        const columnId = column.id;
        const columnWeightage = Number(column.weightage || 0);
        const points = Number(monthRow.points[columnId] || 0);
        monthRow.finalScore[columnId] = roundValue(points * (columnWeightage / 100));
      });

      monthRow.monthFinalScore = roundValue(
        Object.values(monthRow.finalScore).reduce(
          (sum, value) => sum + Number(value || 0),
          0
        )
      );

      return monthRow;
    });

    const annualScoreRow = buildSummaryRow("Annual Score", normalizedColumns);
    months.forEach((monthRow) => {
      normalizedColumns.forEach((column) => {
        const columnId = column.id;
        annualScoreRow.reversePoints[columnId] = roundValue(
          annualScoreRow.reversePoints[columnId] + Number(monthRow.reversePoints[columnId] || 0)
        );
        annualScoreRow.points[columnId] = roundValue(
          annualScoreRow.points[columnId] + Number(monthRow.points[columnId] || 0)
        );
        annualScoreRow.finalScore[columnId] = roundValue(
          annualScoreRow.finalScore[columnId] + Number(monthRow.finalScore[columnId] || 0)
        );
      });

      annualScoreRow.monthFinalScore = roundValue(
        annualScoreRow.monthFinalScore + Number(monthRow.monthFinalScore || 0)
      );
    });

    const divisor = MONTH_SEQUENCE.length || 1;
    const averageRow = buildSummaryRow("Average", normalizedColumns);
    normalizedColumns.forEach((column) => {
      const columnId = column.id;
      averageRow.reversePoints[columnId] = roundValue(
        annualScoreRow.reversePoints[columnId] / divisor
      );
      averageRow.points[columnId] = roundValue(annualScoreRow.points[columnId] / divisor);
      averageRow.finalScore[columnId] = roundValue(
        annualScoreRow.finalScore[columnId] / divisor
      );
    });
    averageRow.monthFinalScore = roundValue(annualScoreRow.monthFinalScore / divisor);

    res.json({
      employee: {
        id: employee._id.toString(),
        name: employee.name,
        email: employee.email,
        role: employee.role,
        employeeRole: employee.employeeRole || "",
        profileImageUrl: employee.profileImageUrl || null,
      },
      columns: normalizedColumns,
      months,
      averageRow,
      annualScoreRow,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKraKpiMatrix,
};
