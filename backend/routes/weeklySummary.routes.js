const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  runWeeklySummary,
} = require("../controllers/weeklySummary.controller");

const router = express.Router();

router.post("/run", runWeeklySummary);

module.exports = router;
