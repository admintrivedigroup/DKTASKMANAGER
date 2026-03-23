const {
  EmployeeMonthlyManualKraPoint,
  MONTH_KEYS,
} = require("../models/EmployeeMonthlyManualKraPoint");
const Task = require("../models/Task");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpError");
const {
  ensureEmployeeSystemKraColumn,
  SYSTEM_COLUMN_TYPE,
} = require("../utils/employeeKraColumnSystem");
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

const roundPercentage = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
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

const getTaskSheetDate = (task) => {
  const candidates = [task?.dueDate, task?.createdAt];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalizedDate = new Date(candidate);
    if (!Number.isNaN(normalizedDate.getTime())) {
      return normalizedDate;
    }
  }

  return null;
};

const isOverAndBeyondColumn = (column) =>
  Boolean(
    column &&
      (column.columnType === SYSTEM_COLUMN_TYPE || column.isSystemColumn === true)
  );

const isKraEligibleRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "member";
};

const buildMonthRow = (month, columns) => {
  const reversePoints = {};
  const points = {};
  const weightage = {};
  const finalScore = {};
  const totalTaskCounts = {};
  const completedTaskCounts = {};

  columns.forEach((column) => {
    const columnId = column.id;
    reversePoints[columnId] = isOverAndBeyondColumn(column) ? "N/A" : 0;
    points[columnId] = 0;
    weightage[columnId] = Number(column.weightage || 0);
    finalScore[columnId] = 0;
    totalTaskCounts[columnId] = 0;
    completedTaskCounts[columnId] = 0;
  });

  return {
    month,
    reversePoints,
    points,
    weightage,
    finalScore,
    totalTaskCounts,
    completedTaskCounts,
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
    reversePoints[columnId] = isOverAndBeyondColumn(column) ? "N/A" : 0;
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

    if (!isKraEligibleRole(employee.role)) {
      throw createHttpError(
        "KRA/KPI matrix can only be generated for admin and member accounts",
        400
      );
    }

    const columns = await ensureEmployeeSystemKraColumn(employeeId);

    const { start, end } = getFinancialYearRange(fyStartYear);
    const tasks = await Task.find({
      assignedTo: employeeId,
      kraColumnId: { $ne: null },
      $or: [
        {
          dueDate: {
            $gte: start,
            $lt: end,
          },
        },
        {
          dueDate: null,
          createdAt: {
            $gte: start,
            $lt: end,
          },
        },
      ],
    }).select("kraColumnId status dueDate createdAt");
    const manualPointRecords = await EmployeeMonthlyManualKraPoint.find({
      employeeId,
      fyStartYear,
    }).select("kraColumnId monthKey manualPoints");

    const normalizedColumns = columns.map((column) => column.toJSON());
    const monthMap = new Map(
      MONTH_SEQUENCE.map((month) => [month, buildMonthRow(month, normalizedColumns)])
    );
    const columnMap = new Map(normalizedColumns.map((column) => [column.id, column]));
    const manualPointMap = new Map(
      manualPointRecords.map((record) => [
        `${record.monthKey}:${record.kraColumnId.toString()}`,
        Number(record.manualPoints || 0),
      ])
    );

    tasks.forEach((task) => {
      const columnId =
        task.kraColumnId && typeof task.kraColumnId.toString === "function"
          ? task.kraColumnId.toString()
          : "";
      const taskSheetDate = getTaskSheetDate(task);
      const monthLabel = getFinancialMonthLabel(taskSheetDate);

      if (!columnId || !monthLabel || !columnMap.has(columnId) || !monthMap.has(monthLabel)) {
        return;
      }

      const column = columnMap.get(columnId);
      if (isOverAndBeyondColumn(column)) {
        return;
      }

      const monthRow = monthMap.get(monthLabel);
      monthRow.totalTaskCounts[columnId] = Number(monthRow.totalTaskCounts[columnId] || 0) + 1;

      if (task.status === "Completed") {
        monthRow.completedTaskCounts[columnId] =
          Number(monthRow.completedTaskCounts[columnId] || 0) + 1;
      }
    });

    const months = MONTH_SEQUENCE.map((month) => {
      const monthRow = monthMap.get(month);

      normalizedColumns.forEach((column) => {
        const columnId = column.id;
        const columnWeightage = Number(column.weightage || 0);
        if (isOverAndBeyondColumn(column)) {
          monthRow.reversePoints[columnId] = "N/A";
          monthRow.points[columnId] = roundValue(
            Number(manualPointMap.get(`${month}:${columnId}`) || 0)
          );
        } else {
          const totalTaskCount = Number(monthRow.totalTaskCounts[columnId] || 0);
          const completedTaskCount = Number(monthRow.completedTaskCounts[columnId] || 0);
          const notCompletedTaskCount = Math.max(0, totalTaskCount - completedTaskCount);

          if (totalTaskCount > 0) {
            monthRow.reversePoints[columnId] = roundPercentage(
              (notCompletedTaskCount / totalTaskCount) * 100
            );
            monthRow.points[columnId] = roundPercentage(
              100 - Number(monthRow.reversePoints[columnId] || 0)
            );
          } else {
            monthRow.reversePoints[columnId] = 0;
            monthRow.points[columnId] = 0;
          }
        }

        const points = Number(monthRow.points[columnId] || 0);
        monthRow.finalScore[columnId] = roundValue(points * (columnWeightage / 100));
      });

      delete monthRow.totalTaskCounts;
      delete monthRow.completedTaskCounts;
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
        if (!isOverAndBeyondColumn(column)) {
          annualScoreRow.reversePoints[columnId] = roundValue(
            annualScoreRow.reversePoints[columnId] + Number(monthRow.reversePoints[columnId] || 0)
          );
        }
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
      if (!isOverAndBeyondColumn(column)) {
        averageRow.reversePoints[columnId] = roundValue(
          annualScoreRow.reversePoints[columnId] / divisor
        );
      }
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

const getRequesterId = (user) =>
  user?._id && typeof user._id.toString === "function" ? user._id.toString() : "";

const ensureKraEmployeeExists = async (employeeId) => {
  const employee = await User.findById(employeeId).select(
    "_id name email role employeeRole profileImageUrl"
  );

  if (!employee) {
    throw createHttpError("Employee not found", 404);
  }

  if (!isKraEligibleRole(employee.role)) {
    throw createHttpError(
      "KRA/KPI data can only be generated for admin and member accounts",
      400
    );
  }

  return employee;
};

const ensureOverAndBeyondColumn = async (employeeId, kraColumnId) => {
  const columns = await ensureEmployeeSystemKraColumn(employeeId);
  const kraColumn = columns.find((column) => column._id.toString() === kraColumnId);

  if (!kraColumn) {
    throw createHttpError("KRA column not found", 404);
  }

  if (
    kraColumn.employeeId.toString() !== employeeId ||
    (kraColumn.columnType !== SYSTEM_COLUMN_TYPE && !kraColumn.isSystemColumn)
  ) {
    throw createHttpError(
      "kraColumnId must belong to the employee's Over & Beyond column",
      400
    );
  }

  return kraColumn;
};

const getKraKpiManualPoints = async (req, res, next) => {
  try {
    const { employeeId, fyStartYear } = req.query;
    const requesterId = getRequesterId(req.user);

    if (!hasPrivilegedAccess(req.user?.role) && requesterId !== employeeId) {
      throw createHttpError(
        "You are not authorized to view this employee's manual KRA points",
        403
      );
    }

    await ensureKraEmployeeExists(employeeId);
    const columns = await ensureEmployeeSystemKraColumn(employeeId);
    const overAndBeyondColumn = columns.find(
      (column) => isOverAndBeyondColumn(column)
    );

    if (!overAndBeyondColumn) {
      throw createHttpError("Over & Beyond column not found", 404);
    }

    const pointRecords = await EmployeeMonthlyManualKraPoint.find({
      employeeId,
      kraColumnId: overAndBeyondColumn._id,
      fyStartYear,
    }).sort({ updatedAt: 1 });

    const manualPointsByMonth = Object.fromEntries(
      MONTH_KEYS.map((monthKey) => [monthKey, null])
    );

    pointRecords.forEach((record) => {
      manualPointsByMonth[record.monthKey] = {
        id: record._id.toString(),
        employeeId: record.employeeId.toString(),
        kraColumnId: record.kraColumnId.toString(),
        fyStartYear: record.fyStartYear,
        monthKey: record.monthKey,
        manualPoints: Number(record.manualPoints),
        updatedBy:
          record.updatedBy && typeof record.updatedBy.toString === "function"
            ? record.updatedBy.toString()
            : record.updatedBy,
        updatedAt: record.updatedAt,
      };
    });

    res.json({
      employeeId,
      fyStartYear,
      kraColumnId: overAndBeyondColumn._id.toString(),
      columnLabel: overAndBeyondColumn.label,
      monthKeys: MONTH_KEYS,
      manualPointsByMonth,
    });
  } catch (error) {
    next(error);
  }
};

const upsertKraKpiManualPoint = async (req, res, next) => {
  try {
    const { employeeId, kraColumnId, fyStartYear, monthKey, manualPoints } = req.body;

    await ensureKraEmployeeExists(employeeId);
    await ensureOverAndBeyondColumn(employeeId, kraColumnId);

    const pointRecord = await EmployeeMonthlyManualKraPoint.findOneAndUpdate(
      {
        employeeId,
        kraColumnId,
        fyStartYear,
        monthKey,
      },
      {
        $set: {
          employeeId,
          kraColumnId,
          fyStartYear,
          monthKey,
          manualPoints,
          updatedBy: req.user._id,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json(pointRecord);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKraKpiMatrix,
  getKraKpiManualPoints,
  upsertKraKpiManualPoint,
};
