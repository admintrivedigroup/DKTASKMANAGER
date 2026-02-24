const mongoose = require("mongoose");
const Leave = require("../models/Leave");

const getCurrentUserId = (req) => req.user?._id || req.user?.id || null;
const isPrivilegedRole = (role) =>
  ["admin", "super_admin"].includes(String(role || "").trim().toLowerCase());

const parseValidDate = (value) => {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const ALLOWED_LEAVE_TYPES = new Set(["Casual", "Sick", "Paid", "Unpaid", "Other"]);

const createLeaveRequest = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }
    const { startDate, endDate, type, reason } = req.body || {};

    const parsedStartDate = parseValidDate(startDate);
    const parsedEndDate = parseValidDate(endDate);

    if (!parsedStartDate || !parsedEndDate) {
      return res
        .status(400)
        .json({ message: "Valid start and end dates are required" });
    }

    if (parsedEndDate < parsedStartDate) {
      return res
        .status(400)
        .json({ message: "End date cannot be earlier than start date" });
    }

    const overlappingLeave = await Leave.findOne({
      employee: currentUserId,
      status: { $in: ["Pending", "Approved"] },
      startDate: { $lte: parsedEndDate },
      endDate: { $gte: parsedStartDate },
    }).lean();

    if (overlappingLeave) {
      return res.status(400).json({
        message:
          "A pending/approved leave request already exists for this date range",
      });
    }

    const resolvedLeaveType = ALLOWED_LEAVE_TYPES.has(type) ? type : "Casual";

    const leaveRequest = await Leave.create({
      employee: currentUserId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      type: resolvedLeaveType,
      reason,
      status: "Pending",
    });

    const populatedLeaveRequest = await Leave.findById(leaveRequest._id)
      .populate("employee", "name email")
      .lean();

    return res.status(201).json({
      message: "Leave request submitted successfully",
      leave: populatedLeaveRequest,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to create leave request", error: error.message });
  }
};

const getMyLeaveRequests = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const leaves = await Leave.find({ employee: currentUserId })
      .sort({ startDate: -1, createdAt: -1 })
      .populate("reviewedBy", "name email")
      .lean();

    return res.json(leaves);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch leave requests", error: error.message });
  }
};

const getPendingLeaveRequests = async (req, res) => {
  try {
    const includeReviewed =
      String(req.query?.includeReviewed || "").trim().toLowerCase() === "true";
    const filter = includeReviewed ? {} : { status: "Pending" };

    const leaves = await Leave.find(filter)
      .sort(includeReviewed ? { createdAt: -1 } : { startDate: 1, createdAt: 1 })
      .populate("employee", "name email role")
      .populate("reviewedBy", "name email")
      .lean();

    return res.json(leaves);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch pending requests", error: error.message });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body || {};
    const currentUserId = getCurrentUserId(req);

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid leave request ID" });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be either Approved or Rejected" });
    }

    const leaveRequest = await Leave.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status === status) {
      return res.status(400).json({
        message: `This request is already ${leaveRequest.status.toLowerCase()}`,
      });
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = currentUserId;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.reviewNote =
      typeof reviewNote === "string" ? reviewNote.trim() : "";

    await leaveRequest.save();

    const updatedLeave = await Leave.findById(id)
      .populate("employee", "name email role")
      .populate("reviewedBy", "name email")
      .lean();

    return res.json({
      message: `Leave request status updated to ${status.toLowerCase()} successfully`,
      leave: updatedLeave,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update leave request", error: error.message });
  }
};

const deleteLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = getCurrentUserId(req);

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid leave request ID" });
    }

    const leaveRequest = await Leave.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    const requesterIsPrivileged = isPrivilegedRole(req.user?.role);
    const isRequestOwner =
      leaveRequest.employee?.toString() === currentUserId.toString();

    if (!requesterIsPrivileged && !isRequestOwner) {
      return res
        .status(403)
        .json({ message: "You are not allowed to delete this leave request" });
    }

    await leaveRequest.deleteOne();

    return res.json({ message: "Leave request deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete leave request", error: error.message });
  }
};

module.exports = {
  createLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  updateLeaveStatus,
  deleteLeaveRequest,
};
