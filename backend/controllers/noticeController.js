const Notice = require("../models/Notice");

// @desc    Publish a new notice (Admin only)
// @route   POST /api/notices
// @access  Private (Admin)
const publishNotice = async (req, res) => {
  try {
    const { message, startsAt, expiresAt } = req.body;

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Notice message is required" });
    }

    if (!expiresAt) {
      return res
        .status(400)
        .json({ message: "An expiration date is required" });
    }

    const trimmedMessage = message.trim();
    const now = new Date();

    const startDate = startsAt ? new Date(startsAt) : now;
    const endDate = new Date(expiresAt);

    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ message: "Invalid start date" });
    }

    if (Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid expiration date" });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        message: "Expiration must be after the start time",
      });
    }


    const notice = await Notice.create({
      message: trimmedMessage,
      createdBy: req.user._id,
      startsAt: startDate,
      expiresAt: endDate,
      isActive: endDate >= now && startDate <= now,
    });

    res.status(201).json({
      message: "Notice published successfully",
      notice,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to publish notice",
      error: error.message,
    });
  }
};

// @desc all active notices
// @route   GET /api/notices/active
// @access  Private
const getActiveNotices = async (req, res) => {
  try {
    const now = new Date();

    await Notice.updateMany(
      { isActive: true, expiresAt: { $lt: now } },
      { isActive: false, deactivatedAt: now }
    );

    const notices = await Notice.find({
      isDeleted: false,
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gte: now },
    })
      .sort({ startsAt: 1 })
      .populate("createdBy", "name");

    res.json({ notices });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch active notices",
      error: error.message,
    });
  }
};

// @desc    Get all notices (Admin only)
// @route   GET /api/notices
// @access  Private (Admin)
const getAllNotices = async (req, res) => {
  try {
    const now = new Date();

    await Notice.updateMany(
      { isActive: true, expiresAt: { $lt: now } },
      { isActive: false, deactivatedAt: now }
    );

    const notices = await Notice.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name");

    res.json({ notices });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch notices",
      error: error.message,
    });
  }
};

// @desc    Delete a notice (Admin only)
// @route   DELETE /api/notices/:id
// @access  Private (Admin)
const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findOne({ _id: id, isDeleted: false });

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    notice.isActive = false;
    notice.isDeleted = true;
    notice.deletedAt = new Date();
    notice.deactivatedAt = new Date();
    await notice.save();

    res.json({ message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete notice",
      error: error.message,
    });
  }
};

module.exports = {
  publishNotice,
  getActiveNotices,
  getAllNotices,
  deleteNotice,
};