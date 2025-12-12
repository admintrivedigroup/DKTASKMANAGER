const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Task = require("../models/Task");
const User = require("../models/User");
const Matter = require("../models/Matter");
const CaseFile = require("../models/CaseFile");
const cloudinary = require("../config/cloudinary");
const {
  PRIVILEGED_ROLES,
  formatUserRole,
  normalizeRole,
} = require("../utils/roleUtils");
const {
  buildFieldChanges,
  logEntityActivity,
} = require("../utils/activityLogger");

const USER_ACTIVITY_FIELDS = [
  { path: "name", label: "Name" },
  { path: "email", label: "Email" },
  { path: "role", label: "Role" },
  { path: "gender", label: "Gender" },
  { path: "officeLocation", label: "Office Location" },
];

const buildTaskCountsForUser = async (userId) => {
  if (!userId) {
    return { pendingTasks: 0, inProgressTasks: 0, completedTasks: 0 };
  }

  const [pendingTasks, inProgressTasks, completedTasks] = await Promise.all([
    Task.countDocuments({ assignedTo: userId, status: "Pending" }),
    Task.countDocuments({ assignedTo: userId, status: "In Progress" }),
    Task.countDocuments({ assignedTo: userId, status: "Completed" }),
  ]);

  return { pendingTasks, inProgressTasks, completedTasks };
};

const buildMatterCountsForClient = async (userId) => {
  if (!userId) {
    return { totalMatters: 0, activeMatters: 0, closedMatters: 0 };
  }

  const matchClient = { client: userId };

  const [totalMatters, activeMatters, closedMatters] = await Promise.all([
    Matter.countDocuments(matchClient),
    Matter.countDocuments({ ...matchClient, status: { $ne: "Closed" } }),
    Matter.countDocuments({ ...matchClient, status: "Closed" }),
  ]);

  return { totalMatters, activeMatters, closedMatters };
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const buildClientAccountSummary = async (clientId) => {
  if (!clientId) {
    return { totalMatters: 0, totalCases: 0, activeCases: 0, amountDue: 0 };
  }

  const matters = await Matter.find({ client: clientId })
    .select("_id status createdAt updatedAt openedDate")
    .lean();

  if (!Array.isArray(matters) || matters.length === 0) {
    return { totalMatters: 0, totalCases: 0, activeCases: 0, amountDue: 0 };
  }

  const matterIds = matters
    .map((matter) => matter?._id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id.toString()));

  if (matterIds.length === 0) {
    return {
      totalMatters: matters.length,
      totalCases: 0,
      activeCases: 0,
      amountDue: 0,
    };
  }

  const matterObjectIds = matterIds.map((id) =>
    id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
  );

  const [caseFiles, openTaskCounts, closedTaskCounts] = await Promise.all([
    CaseFile.find({ matter: { $in: matterObjectIds } })
      .select("status matter")
      .lean(),
    Task.aggregate([
      {
        $match: {
          matter: { $in: matterObjectIds },
          status: { $ne: "Completed" },
        },
      },
      { $group: { _id: "$matter", count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      {
        $match: {
          matter: { $in: matterObjectIds },
          status: "Completed",
        },
      },
      { $group: { _id: "$matter", count: { $sum: 1 } } },
    ]),
  ]);

  const totalCases = Array.isArray(caseFiles) ? caseFiles.length : 0;
  const activeCases = Array.isArray(caseFiles)
    ? caseFiles.filter((caseFile) => caseFile?.status !== "Closed").length
    : 0;

  const buildCountMap = (entries = []) => {
    const map = new Map();
    entries.forEach((entry) => {
      const key = entry?._id ? entry._id.toString() : "";
      if (key) {
        map.set(key, entry?.count || 0);
      }
    });
    return map;
  };

  const openTaskMap = buildCountMap(openTaskCounts);
  const closedTaskMap = buildCountMap(closedTaskCounts);

  const computeBalanceDue = (openTasks = 0, closedTasks = 0) => {
    const totalTasks = Math.max((openTasks || 0) + (closedTasks || 0), 0);
    const complexityFactor = 1 + clamp(totalTasks * 0.04, 0, 0.45);
    const baseAmount = 12000 + totalTasks * 1800;
    const totalAmount = Math.round(baseAmount * complexityFactor);
    const progress = totalTasks
      ? clamp(closedTasks / Math.max(totalTasks, 1), 0, 1)
      : 0.35;
    const paidAmount = Math.round(
      totalAmount * clamp(progress + 0.2, 0.35, 1)
    );

    return Math.max(totalAmount - paidAmount, 0);
  };

  const amountDue = matters.reduce((total, matter) => {
    const matterId = matter?._id ? matter._id.toString() : "";
    if (!matterId) {
      return total;
    }

    const openCount = openTaskMap.get(matterId) || 0;
    const closedCount = closedTaskMap.get(matterId) || 0;

    return total + computeBalanceDue(openCount, closedCount);
  }, 0);

  return {
    totalMatters: matters.length,
    totalCases,
    activeCases,
    amountDue,
  };
};

// @desc    Get all users (Admin only)
// @route   GET /api/users/
// @access  Private (Admin)
const getUsers = async (req, res) => {
  try {
    const requesterRole = normalizeRole(req.user?.role);
  
    if (!PRIVILEGED_ROLES.includes(requesterRole)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to view the team directory" });
    }

    const users = await User.find({})
      .select("-password")
      .sort({ name: 1, email: 1 });

    // Add task counts to each user
    const usersWithTaskCounts = await Promise.all(
      users.map(async (user) => {
        const formattedUser = formatUserRole(user);

        const [taskCounts, matterCounts] = await Promise.all([
          buildTaskCountsForUser(formattedUser._id),
          normalizeRole(formattedUser.role) === "client"
            ? buildMatterCountsForClient(formattedUser._id)
            : Promise.resolve({
                totalMatters: 0,
                activeMatters: 0,
                closedMatters: 0,
              }),
        ]);

        const normalizedOfficeLocation =
          typeof formattedUser.officeLocation === "string"
            ? formattedUser.officeLocation.trim()
            : formattedUser.officeLocation;

        return {
          ...formattedUser,
          officeLocation: normalizedOfficeLocation,          
          ...taskCounts,
          ...matterCounts,          
        };
      })
    );

    res.json(usersWithTaskCounts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user by ID with assigned tasks 
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const formattedRequesterRole = normalizeRole(req.user?.role);
    const isRequestingSelf = req.user?._id?.toString() === user._id.toString();
    const isPrivilegedUser = PRIVILEGED_ROLES.includes(formattedRequesterRole);

    if (!isPrivilegedUser && !isRequestingSelf) {
      return res
        .status(403)
        .json({ message: "You are not authorized to view this user" });
    }

    let tasks = await Task.find({ assignedTo: user._id })
      .populate("assignedTo", "name email profileImageUrl")
      .sort({ dueDate: 1, createdAt: -1 });

    tasks = tasks.map((task) => {
      const taskObject = task.toObject();
      const completedTodoCount = Array.isArray(taskObject.todoChecklist)
        ? taskObject.todoChecklist.filter((item) => item.completed).length
        : 0;

      return {
        ...taskObject,
        completedTodoCount,
      };
    });

    const taskSummary = tasks.reduce(
      (summary, task) => {
        if (task.status === "Pending") {
          summary.pending += 1;
        } else if (task.status === "In Progress") {
          summary.inProgress += 1;
        } else if (task.status === "Completed") {
          summary.completed += 1;
        }

        return summary;
      },
      { pending: 0, inProgress: 0, completed: 0 }
    );

    const formattedUser = formatUserRole(user);
    const normalizedRole = normalizeRole(formattedUser.role);
    const clientSummary = await (async () => {
      if (normalizedRole !== "client") {
        return { totalMatters: 0, totalCases: 0, activeCases: 0, amountDue: 0 };
      }

      try {
        return await buildClientAccountSummary(formattedUser._id);
      } catch (summaryError) {
        console.error("Failed to build client account summary", summaryError);
        return { totalMatters: 0, totalCases: 0, activeCases: 0, amountDue: 0 };
      }
    })();

    const userData = {
      ...formattedUser,
      pendingTasks: taskSummary.pending,
      inProgressTasks: taskSummary.inProgress,
      completedTasks: taskSummary.completed,
    };

    res.json({
      user: userData,
      tasks,
      taskSummary: {
        total: tasks.length,
        ...taskSummary,
      },
      clientSummary,      
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create a new user (Admin only)
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, gender, officeLocation } = req.body || {};

    const trimmedOfficeLocation =
      typeof officeLocation === "string" ? officeLocation.trim() : "";

    if (!name || !email || !password || !gender || !trimmedOfficeLocation) {
      return res
        .status(400)
        .json({ message: "Name, email, password, gender and office location are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    const requesterRole = normalizeRole(req.user?.role);
    const allowedRoles = new Set(["member", "client"]);

    if (requesterRole === "admin") {
      allowedRoles.add("admin");
    }

    if (requesterRole === "super_admin") {
      allowedRoles.add("admin");
      allowedRoles.add("super_admin");
    }

    const normalizedRequestedRole = normalizeRole(role);
    const normalizedRole = allowedRoles.has(normalizedRequestedRole)
      ? normalizedRequestedRole
      : "member";

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
      gender,
      officeLocation: trimmedOfficeLocation,
      mustChangePassword: true,
    });

   const createdUser = formatUserRole(user);

    const createdUserRole = normalizeRole(createdUser.role);
    const userEntityType = createdUserRole === "client" ? "client" : "member";

    await logEntityActivity({
      entityType: userEntityType,
      action: "created",
      entityId: user._id,
      entityName: createdUser.name,
      actor: req.user,
      details: buildFieldChanges({}, user.toObject(), USER_ACTIVITY_FIELDS),
    });

    res.status(201).json({
      _id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      gender: createdUser.gender,
      officeLocation: createdUser.officeLocation,
      mustChangePassword: createdUser.mustChangePassword,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteExistingProfileImage = async (user) => {
  if (!user) return;

  const publicId = user.profileImagePublicId;
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return;
    } catch (error) {
      console.error("Failed to delete profile image from Cloudinary", error);
    }
  }

  // Fallback for legacy locally stored images
  const imageUrl = user.profileImageUrl;
  if (!imageUrl) return;

  const derivedCloudinaryPublicId = (() => {
    try {
      const url = new URL(imageUrl);
      const parts = url.pathname.split("/").filter(Boolean);
      const uploadIndex = parts.findIndex((part) => part === "upload");
      if (uploadIndex === -1 || uploadIndex >= parts.length - 1) {
        return "";
      }

      const publicIdParts = parts.slice(uploadIndex + 1);
      if (publicIdParts.length === 0) {
        return "";
      }

      const lastPart = publicIdParts.pop();
      const [fileNameWithoutExt] = lastPart.split(".");
      return [...publicIdParts, fileNameWithoutExt].join("/");
    } catch (error) {
      return "";
    }
  })();

  if (derivedCloudinaryPublicId) {
    try {
      await cloudinary.uploader.destroy(derivedCloudinaryPublicId);
      return;
    } catch (error) {
      console.error("Failed to delete derived Cloudinary profile image", error);
    }
  }

  try {
    const filePathFromUrl = imageUrl.startsWith("http")
      ? new URL(imageUrl).pathname
      : imageUrl;

    const absolutePath = path.join(__dirname, "..", filePathFromUrl);
    if (fs.existsSync(absolutePath)) {
      fs.unlink(absolutePath, (err) => {
        if (err) {
          console.error("Failed to remove old local profile image", err);
        }
      });
    }
  } catch (error) {
    console.error("Failed to process old profile image path", error);
  }
};

// @desc    Delete a user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const deletedUserSnapshot = user.toObject();    
    const requesterRole = normalizeRole(req.user?.role);
    const targetRole = normalizeRole(user.role);
    const requesterId = req.user?._id
      ? req.user._id.toString()
      : req.user?.id
      ? req.user.id.toString()
      : "";
    const userId = user._id;
    const isSelfDelete =
      requesterId && userId && requesterId === userId.toString();

    if (targetRole === "super_admin" && requesterRole !== "super_admin") {
      return res.status(403).json({
        message: "Only Super Admins can modify or remove Super Admin accounts",
      });
    }

    if (targetRole === "super_admin" && isSelfDelete) {
      const providedToken =
        typeof req.body?.adminInviteToken === "string"
          ? req.body.adminInviteToken.trim()
          : "";

      if (!providedToken) {
        return res.status(400).json({
          message: "Invite token is required to delete this Super Admin account.",
        });
      }

      if (providedToken !== process.env.ADMIN_INVITE_TOKEN) {
        return res.status(403).json({
          message:
            "Invalid invite token. Unable to delete Super Admin account.",
        });
      }
    }

    const tasksWithUser = await Task.find({ assignedTo: userId }).select("assignedTo");

    const taskIdsToDelete = [];
    const taskIdsToUpdate = [];

    tasksWithUser.forEach((task) => {
      const assigneeIds = Array.isArray(task.assignedTo)
        ? task.assignedTo.filter(Boolean).map((assignee) => assignee.toString())
        : [];

      if (assigneeIds.length <= 1) {
        taskIdsToDelete.push(task._id);
      } else {
        taskIdsToUpdate.push(task._id);
      }
    });

    if (taskIdsToDelete.length > 0) {
      await Task.deleteMany({ _id: { $in: taskIdsToDelete } });
    }

    if (taskIdsToUpdate.length > 0) {
      await Task.updateMany(
        { _id: { $in: taskIdsToUpdate } },
        { $pull: { assignedTo: userId } }
      );
    }

    await deleteExistingProfileImage(user);

    await user.deleteOne();

    const userEntityType = targetRole === "client" ? "client" : "member";
    await logEntityActivity({
      entityType: userEntityType,
      action: "deleted",
      entityId: user._id,
      entityName: user.name,
      actor: req.user,
      details: buildFieldChanges(
        deletedUserSnapshot,
        {},
        USER_ACTIVITY_FIELDS
      ),
    });

    res.json({
      message: "User deleted successfully",
      removedTasks: taskIdsToDelete.length,
      updatedTasks: taskIdsToUpdate.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update profile image
// @route   PUT /api/users/profile/photo
// @access  Private
const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await deleteExistingProfileImage(user);

    const profileImageUrl = req.file.path;
    const profileImagePublicId = req.file.filename || req.file.public_id || null;

    user.profileImageUrl = profileImageUrl;
    user.profileImagePublicId = profileImagePublicId;
    const updatedUser = await user.save();
    const formattedUpdatedUser = formatUserRole(updatedUser);

    res.json({
      message: "Profile photo updated successfully",
      profileImageUrl,
      profileImagePublicId,
      user: {
        _id: formattedUpdatedUser._id,
        name: formattedUpdatedUser.name,
        email: formattedUpdatedUser.email,
        role: formattedUpdatedUser.role,
        profileImageUrl: formattedUpdatedUser.profileImageUrl,
        profileImagePublicId: formattedUpdatedUser.profileImagePublicId,
        birthdate: formattedUpdatedUser.birthdate,
        mustChangePassword: formattedUpdatedUser.mustChangePassword,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Remove profile image
// @route   DELETE /api/users/profile/photo
// @access  Private
const removeProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.profileImageUrl) {
      return res.status(400).json({ message: "No profile photo to remove" });
    }

    await deleteExistingProfileImage(user);
    user.profileImageUrl = "";
    user.profileImagePublicId = "";
    const updatedUser = await user.save();
    const formattedUpdatedUser = formatUserRole(updatedUser);

    res.json({
      message: "Profile photo removed successfully",
      profileImageUrl: "",
      profileImagePublicId: "",
      user: {
        _id: formattedUpdatedUser._id,
        name: formattedUpdatedUser.name,
        email: formattedUpdatedUser.email,
        role: formattedUpdatedUser.role,
        profileImageUrl: formattedUpdatedUser.profileImageUrl,
        profileImagePublicId: formattedUpdatedUser.profileImagePublicId,
        birthdate: formattedUpdatedUser.birthdate,
        mustChangePassword: formattedUpdatedUser.mustChangePassword,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Change account password
// @route   PUT /api/users/profile/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset a user's password (Admin only)
// @route   PUT /api/users/:id/password
// @access  Private (Admin)
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body || {};

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requesterRole = normalizeRole(req.user?.role);
    const targetRole = normalizeRole(user.role);

    if (targetRole === "super_admin" && requesterRole !== "super_admin") {
      return res.status(403).json({
        message: "Only Super Admins can reset passwords for Super Admin accounts",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = true;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  deleteUser,
  updateProfileImage,
  removeProfileImage,  
  changePassword,
  resetUserPassword,
};
