const express = require("express");
const { adminOnly, protect } = require("../middlewares/authMiddleware");
const {
  getEmployeeRoles,
  createEmployeeRole,
  deleteEmployeeRole,
} = require("../controllers/roleController");

const router = express.Router();

router.get("/", protect, adminOnly, getEmployeeRoles);
router.post("/", protect, adminOnly, createEmployeeRole);
router.delete("/:roleId", protect, adminOnly, deleteEmployeeRole);

module.exports = router;
