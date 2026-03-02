const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { getKraKpiSummary } = require("../controllers/kraKpiController");

const router = express.Router();

router.get("/summary", protect, getKraKpiSummary);

module.exports = router;
