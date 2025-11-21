const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} = require("../controllers/invoiceController");

const router = express.Router();

router.get("/", protect, getInvoices);
router.get("/:id", protect, getInvoiceById);
router.post("/", protect, adminOnly, createInvoice);
router.put("/:id", protect, adminOnly, updateInvoice);
router.delete("/:id", protect, adminOnly, deleteInvoice);

module.exports = router;