const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  getKraCategories,
  createKraCategory,
  updateKraCategory,
  deleteKraCategory,
} = require("../controllers/kraCategoryController");
const {
  getMultiplierProfile,
  upsertMultiplierProfile,
} = require("../controllers/kraMultiplierProfileController");
const {
  getPerformanceSummary,
  getPerformanceTasks,
  getWeightageStatus,
} = require("../controllers/kraPerformanceController");

const router = express.Router();

router.get("/categories", protect, getKraCategories);
router.post("/categories", protect, adminOnly, createKraCategory);
router.put("/categories/:id", protect, adminOnly, updateKraCategory);
router.delete("/categories/:id", protect, adminOnly, deleteKraCategory);
router.get("/multipliers", protect, getMultiplierProfile);
router.put("/multipliers", protect, adminOnly, upsertMultiplierProfile);
router.get("/performance/summary", protect, getPerformanceSummary);
router.get("/performance/tasks", protect, getPerformanceTasks);
router.get("/weightage-status", protect, getWeightageStatus);

module.exports = router;
