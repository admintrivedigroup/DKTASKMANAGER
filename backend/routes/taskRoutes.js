const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const documentUpload = require("../middlewares/documentUploadMiddleware");
const { validateBody, validateQuery } = require("../middlewares/validationMiddleware");
const {
  validateCreateTaskPayload,
  validateUpdateTaskPayload,
  validateStatusPayload,
  validateChecklistPayload,
  validateTaskQuery,
} = require("../validators/taskValidators");
const {
  getDashboardData,
  getNotifications,
  getUserDashboardData,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  uploadTaskDocument,
} = require("../controllers/taskController");

const router = express.Router();

// Task Management Routes
router.get("/dashboard-data", protect, getDashboardData);
router.get("/notifications", protect, getNotifications);
router.get("/user-dashboard-data", protect, getUserDashboardData);
router.get("/", protect, validateQuery(validateTaskQuery), getTasks); // Get all tasks (Admin: all, User: assigned)
router.get("/:id", protect, getTaskById); // Get task by ID
router.post(
  "/",
  protect,
  adminOnly,
  validateBody(validateCreateTaskPayload),
  createTask
); // Create a task (Admin only)
router.put(
  "/:id",
  protect,
  validateBody(validateUpdateTaskPayload),
  updateTask
); // Update task details
router.delete("/:id", protect, adminOnly, deleteTask); // Delete a task (Admin only)
router.put(
  "/:id/status",
  protect,
  validateBody(validateStatusPayload),
  updateTaskStatus
); // Update task status
router.put(
  "/:id/todo",
  protect,
  validateBody(validateChecklistPayload),
  updateTaskChecklist
); // Update task checklist
router.post(
  "/:id/documents",
  protect,
  documentUpload.single("file"),
  uploadTaskDocument
);

module.exports = router;