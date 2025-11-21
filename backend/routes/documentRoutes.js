const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
} = require("../controllers/documentController");

const router = express.Router();

router.get("/", protect, getDocuments);
router.get("/:id", protect, getDocumentById);
router.post("/", protect, adminOnly, createDocument);
router.put("/:id", protect, adminOnly, updateDocument);
router.delete("/:id", protect, adminOnly, deleteDocument);

module.exports = router;