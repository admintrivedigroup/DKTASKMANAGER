const express = require("express");
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  resetPasswordWithAdminToken,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../config/cloudinaryStorage");

const router = express.Router();

// Auth Routes
router.post("/register", registerUser); // Register User
router.post("/login", loginUser);       // Login User
router.post("/reset-password/admin-token", resetPasswordWithAdminToken);
router.get("/profile", protect, getUserProfile); // Get User Profile
router.put("/profile", protect, updateUserProfile); // Update Profile

router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.status(200).json({
    imageUrl: req.file.path,
    publicId: req.file.filename || req.file.public_id,
  });
});
  

module.exports = router;
