const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const documentUpload = require("../middlewares/documentUploadMiddleware");
const {
  getCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  uploadCaseDocument,  
} = require("../controllers/caseController");

const router = express.Router();

router.get("/", protect, getCases);
router.get("/:id", protect, getCaseById);
router.post("/", protect, adminOnly, createCase);
router.put("/:id", protect, adminOnly, updateCase);
router.delete("/:id", protect, adminOnly, deleteCase);
router.post(
  "/:id/documents",
  protect,
  documentUpload.single("file"),
  uploadCaseDocument
);

module.exports = router;