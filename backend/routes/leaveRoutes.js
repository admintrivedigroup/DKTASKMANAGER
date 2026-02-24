const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  createLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  updateLeaveStatus,
  deleteLeaveRequest,
} = require("../controllers/leaveController");

const router = express.Router();

router.post("/", protect, createLeaveRequest);
router.get("/me", protect, getMyLeaveRequests);
router.get("/pending", protect, adminOnly, getPendingLeaveRequests);
router.patch("/:id/status", protect, adminOnly, updateLeaveStatus);
router.delete("/:id", protect, deleteLeaveRequest);

module.exports = router;
