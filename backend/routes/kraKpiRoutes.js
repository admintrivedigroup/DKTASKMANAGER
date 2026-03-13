const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { validateQuery } = require("../middlewares/validationMiddleware");
const { getKraKpiMatrix } = require("../controllers/kraKpiController");
const { validateKraKpiMatrixQuery } = require("../validators/kraKpiValidators");

const router = express.Router();

router.get("/matrix", protect, validateQuery(validateKraKpiMatrixQuery), getKraKpiMatrix);

module.exports = router;
