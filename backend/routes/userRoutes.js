const express = require("express");
const { adminOnly, protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadmiddleware");
const {
  getUsers,
  getUserById,
  createUser,
  deleteUser,
  updateProfileImage,
  removeProfileImage,
  changePassword,
  resetUserPassword,
} = require("../controllers/userController");

const router = express.Router();

// User Management Routes
router.get("/", protect, adminOnly, getUsers); // Get all users (Admin only)
router.post("/", protect, adminOnly, createUser); // Create a new user (Admin only)

// Profile Settings
router.put(
  "/profile/photo",
  protect,
  upload.single("profileImage"),
  updateProfileImage
);
router.delete("/profile/photo", protect, removeProfileImage);
router.put("/profile/password", protect, changePassword);

router.get("/:id", protect, getUserById); // Get a specific user
router.delete("/:id", protect, adminOnly, deleteUser); // Delete a user (Admin only)
router.put("/:id/password", protect, adminOnly, resetUserPassword); // Reset a user's password

module.exports = router;