const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { formatUserRole, normalizeRole } = require("../utils/roleUtils");
const { getJwtSecret } = require("../utils/jwtSecret");

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: "7d" });
};

const buildUserPayload = (user, { includeToken = false } = {}) => {
  const formattedUser = formatUserRole(user);

  if (!formattedUser) {
    return formattedUser;
  }

  const payload = {
    _id: formattedUser._id,
    name: formattedUser.name,
    email: formattedUser.email,
    role: formattedUser.role,
    profileImageUrl: formattedUser.profileImageUrl,
    profileImagePublicId: formattedUser.profileImagePublicId,
    birthdate: formattedUser.birthdate,
    gender: formattedUser.gender,
    officeLocation:
      typeof formattedUser.officeLocation === "string"
        ? formattedUser.officeLocation.trim()
        : formattedUser.officeLocation,
    employeeRole: formattedUser.employeeRole,
    profileStatusMode: formattedUser.profileStatusMode || "automatic",
    profileStatusText: formattedUser.profileStatusText || "",
    profileStatusUpdatedAt: formattedUser.profileStatusUpdatedAt || null,
    mustChangePassword: formattedUser.mustChangePassword,
  };

  if (includeToken) {
    payload.token = generateToken(formattedUser._id);
  }

  return payload;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      profileImageUrl,
      profileImagePublicId,
      adminInviteToken,
      privilegedRole,
      birthdate,
      gender,
      officeLocation,
    } = req.body;

    const trimmedOfficeLocation =
      typeof officeLocation === "string" ? officeLocation.trim() : "";

    // Check if User already exist
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (!gender || !trimmedOfficeLocation) {
      return res
        .status(400)
        .json({ message: "Gender and office location are required" });
    }

    const trimmedAdminInviteToken =
      typeof adminInviteToken === "string" ? adminInviteToken.trim() : "";
    const normalizedPrivilegedRole = normalizeRole(privilegedRole) || "";

    // Determine user role based on provided token/selection
    const allowedPrivilegedRoles = ["admin", "super_admin"];
    const selfAssignableRoles = ["member", "client"];    
    let role = "member";

    if (trimmedAdminInviteToken) {
      if (trimmedAdminInviteToken !== process.env.ADMIN_INVITE_TOKEN) {
        return res.status(403).json({ message: "Invalid admin invite token" });
      }

      role = allowedPrivilegedRoles.includes(normalizedPrivilegedRole)
        ? normalizedPrivilegedRole
        : "admin";
    } else if (normalizedPrivilegedRole) {
      if (allowedPrivilegedRoles.includes(normalizedPrivilegedRole)) {
        return res.status(400).json({
          message:
            "Admin invite token is required to register as an admin or Super Admin",
        });
      }

      if (selfAssignableRoles.includes(normalizedPrivilegedRole)) {
        role = normalizedPrivilegedRole;
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const parsedBirthdate = birthdate ? new Date(birthdate) : null;

    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      profileImageUrl,
      profileImagePublicId,
      role,
      birthdate: parsedBirthdate && !isNaN(parsedBirthdate) ? parsedBirthdate : null,
      gender,
      officeLocation: trimmedOfficeLocation,
      mustChangePassword: false,
    });

    // Return user data with JWT
    res.status(201).json(buildUserPayload(user, { includeToken: true }));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const rawPassword = req.body?.password;

    const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
    const password = typeof rawPassword === "string" ? rawPassword : "";

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (typeof user.password !== "string" || user.password.length === 0) {
      return res
        .status(400)
        .json({ message: "Password not set. Please reset your password or contact an administrator." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Return user data with JWT
    res.json(buildUserPayload(user, { includeToken: true }));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private (Requires JWT)
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(buildUserPayload(user));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private (Requires JWT)
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (Object.prototype.hasOwnProperty.call(req.body, "gender")) {
      user.gender = req.body.gender;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "officeLocation")) {
      const incomingOfficeLocation = req.body.officeLocation;

      if (typeof incomingOfficeLocation === "string") {
        const trimmedLocation = incomingOfficeLocation.trim();

        if (trimmedLocation) {
          user.officeLocation = trimmedLocation;
        }
      } else if (incomingOfficeLocation) {
        user.officeLocation = incomingOfficeLocation;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "birthdate")) {
      const providedBirthdate = req.body.birthdate;

      if (!providedBirthdate) {
        user.birthdate = null;
      } else {
        const parsedBirthdate = new Date(providedBirthdate);
        if (!isNaN(parsedBirthdate)) {
          user.birthdate = parsedBirthdate;
        }
      }
    }

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();

    res.json({
      message: "Profile updated successfully",
      ...buildUserPayload(updatedUser, { includeToken: true }),
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Reset password using the admin invite token
// @route   POST /api/auth/reset-password/admin-token
// @access  Public (requires admin invite token)
const resetPasswordWithAdminToken = async (req, res) => {
  try {
    const { email, newPassword, adminInviteToken } = req.body || {};

    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedToken =
      typeof adminInviteToken === "string" ? adminInviteToken.trim() : "";
    const normalizedPassword =
      typeof newPassword === "string" ? newPassword : "";

    if (!trimmedEmail || !normalizedPassword || !trimmedToken) {
      return res.status(400).json({
        message:
          "Email, new password, and admin invite token are required to reset the password",
      });
    }

    if (trimmedToken !== process.env.ADMIN_INVITE_TOKEN) {
      return res.status(403).json({ message: "Invalid admin invite token" });
    }

    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found with the provided email address" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(normalizedPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  resetPasswordWithAdminToken,
};
