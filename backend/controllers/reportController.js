const Task = require("../models/Task");
const User = require("../models/User");
const Leave = require("../models/Leave");
const excelJS = require("exceljs");

const toDateOnlyUtc = (value) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate()
  );
};

const isTaskDueDuringLeave = (taskDueDate, leaves = []) => {
  const dueDateUtc = toDateOnlyUtc(taskDueDate);

  if (!dueDateUtc) {
    return false;
  }

  return leaves.some((leave) => {
    const startUtc = toDateOnlyUtc(leave.startDate);
    const endUtc = toDateOnlyUtc(leave.endDate);

    if (startUtc === null || endUtc === null) {
      return false;
    }

    return dueDateUtc >= startUtc && dueDateUtc <= endUtc;
  });
};

// @desc    Export all tasks as an Excel file
// @route   GET /api/reports/export/tasks
// @access  Private (Admin)
const exportTasksReport = async (req, res) => {
  try {
    const tasks = await Task.find({ isPersonal: { $ne: true } }).populate(
      "assignedTo",
      "name email"
    );

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks Report");

    worksheet.columns = [
      { header: "Task ID", key: "_id", width: 25 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Status", key: "status", width: 20 },
      { header: "Due Date", key: "dueDate", width: 20 },
      { header: "Assigned To", key: "assignedTo", width: 30 },
    ];

    tasks.forEach((task) => {
      const assignedUsers = Array.isArray(task.assignedTo)
        ? task.assignedTo
        : task.assignedTo
        ? [task.assignedTo]
        : [];

      const assignedTo = assignedUsers
        .filter(Boolean)
        .map((user) => `${user.name} (${user.email})`)
        .join(", ");

      worksheet.addRow({
        _id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : "",
        assignedTo: assignedTo || "Unassigned",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="tasks_report.xlsx"'
    );

    return workbook.xlsx.write(res).then(() => {
      res.end();
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error exporting tasks", error: error.message });
  }
};

// @desc    Export user-task report as an Excel file
// @route   GET /api/reports/export/users
// @access  Private (Admin)
const exportUsersReport = async (req, res) => {
  try {
    const [users, userTasks, approvedLeaves] = await Promise.all([
      User.find().select("name email _id").lean(),
      Task.find({ isPersonal: { $ne: true } }).populate(
        "assignedTo",
        "name email _id"
      ),
      Leave.find({ status: "Approved" }).select("employee startDate endDate").lean(),
    ]);

    const userTaskMap = {};
    users.forEach((user) => {
      const userId = user?._id ? user._id.toString() : "";

      if (!userId) {
        return;
      }

      userTaskMap[userId] = {
        name: user.name,
        email: user.email,
        totalAssignedTasks: 0,
        leaveExcludedTasks: 0,
        taskCount: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
      };
    });

    const leaveMapByUser = {};
    approvedLeaves.forEach((leave) => {
      const userId = leave?.employee ? leave.employee.toString() : "";
      if (!userId) {
        return;
      }

      if (!Array.isArray(leaveMapByUser[userId])) {
        leaveMapByUser[userId] = [];
      }

      leaveMapByUser[userId].push({
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
    });

    userTasks.forEach((task) => {
      if (!task.assignedTo) {
        return;
      }

      const assignedUsers = Array.isArray(task.assignedTo)
        ? task.assignedTo
        : [task.assignedTo];

      assignedUsers.filter(Boolean).forEach((assignedUser) => {
        const userId = assignedUser?._id ? assignedUser._id.toString() : "";

        if (!userId || !userTaskMap[userId]) {
          return;
        }

        userTaskMap[userId].totalAssignedTasks += 1;

        const isExcludedFromKpi = isTaskDueDuringLeave(
          task.dueDate,
          leaveMapByUser[userId] || []
        );

        if (isExcludedFromKpi) {
          userTaskMap[userId].leaveExcludedTasks += 1;
          return;
        }

        userTaskMap[userId].taskCount += 1;

        if (task.status === "Pending") {
          userTaskMap[userId].pendingTasks += 1;
        } else if (task.status === "In Progress") {
          userTaskMap[userId].inProgressTasks += 1;
        } else if (task.status === "Completed") {
          userTaskMap[userId].completedTasks += 1;
        }
      });
    });

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("User Task Report");

    worksheet.columns = [
      { header: "User Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 40 },
      { header: "Total Assigned Tasks", key: "totalAssignedTasks", width: 20 },
      { header: "Leave Excluded Tasks", key: "leaveExcludedTasks", width: 20 },
      { header: "KPI Counted Tasks", key: "taskCount", width: 20 },
      { header: "Pending Tasks", key: "pendingTasks", width: 20 },
      {
        header: "In Progress Tasks",
        key: "inProgressTasks",
        width: 20,
      },
      { header: "Completed Tasks", key: "completedTasks", width: 20 },
    ];

    Object.values(userTaskMap).forEach((user) => {
      worksheet.addRow(user);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="users_report.xlsx"'
    );

    return workbook.xlsx.write(res).then(() => {
      res.end();
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error exporting tasks", error: error.message });
  }
};

module.exports = {
  exportTasksReport,
  exportUsersReport,
};
