const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { validateBody, validateQuery } = require("../middlewares/validationMiddleware");
const {
  getEmployeeKraColumns,
  createEmployeeKraColumn,
  updateEmployeeKraColumn,
  deleteEmployeeKraColumn,
} = require("../controllers/employeeKraColumnController");
const {
  validateEmployeeKraColumnQuery,
  validateCreateEmployeeKraColumnPayload,
  validateUpdateEmployeeKraColumnPayload,
} = require("../validators/employeeKraColumnValidators");

const router = express.Router();

router.get("/", protect, validateQuery(validateEmployeeKraColumnQuery), getEmployeeKraColumns);
router.post(
  "/",
  protect,
  adminOnly,
  validateBody(validateCreateEmployeeKraColumnPayload),
  createEmployeeKraColumn
);
router.put(
  "/:id",
  protect,
  adminOnly,
  validateBody(validateUpdateEmployeeKraColumnPayload),
  updateEmployeeKraColumn
);
router.delete("/:id", protect, adminOnly, deleteEmployeeKraColumn);

module.exports = router;
