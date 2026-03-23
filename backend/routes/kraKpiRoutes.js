const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { validateBody, validateQuery } = require("../middlewares/validationMiddleware");
const {
  getKraKpiMatrix,
  getKraKpiManualPoints,
  upsertKraKpiManualPoint,
} = require("../controllers/kraKpiController");
const {
  validateKraKpiMatrixQuery,
  validateKraKpiManualPointsQuery,
  validateKraKpiManualPointsPayload,
} = require("../validators/kraKpiValidators");

const router = express.Router();

router.get("/matrix", protect, validateQuery(validateKraKpiMatrixQuery), getKraKpiMatrix);
router.get(
  "/manual-points",
  protect,
  validateQuery(validateKraKpiManualPointsQuery),
  getKraKpiManualPoints
);
router.put(
  "/manual-points",
  protect,
  adminOnly,
  validateBody(validateKraKpiManualPointsPayload),
  upsertKraKpiManualPoint
);

module.exports = router;
