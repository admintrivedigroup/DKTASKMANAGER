const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  approveDueDateRequest,
  rejectDueDateRequest,
} = require("../controllers/taskMessageController");

const router = express.Router();

router.post("/:id/approve", protect, approveDueDateRequest);
router.post("/:id/reject", protect, rejectDueDateRequest);

module.exports = router;
