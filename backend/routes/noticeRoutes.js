const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  publishNotice,
  getActiveNotices,
  getAllNotices,
  deleteNotice,
} = require("../controllers/noticeController");

const router = express.Router();

router.post("/", protect, adminOnly, publishNotice);
router.get("/", protect, adminOnly, getAllNotices);
router.get("/active", protect, getActiveNotices);
router.delete("/:id", protect, adminOnly, deleteNotice);

module.exports = router;