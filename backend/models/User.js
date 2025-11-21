const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImageUrl: { type: String, default: null },
    birthdate: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["Female", "Male", "Non-binary", "Prefer not to say"],
      required: true,
    },
    officeLocation: {
      type: String,
      enum: ["Ahmedabad", "Gift City"],
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "member", "client"],
      default: "member",
      lowercase: true,
      trim: true,
    }, // Role-based access
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
