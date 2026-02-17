const EmployeeRole = require("../models/EmployeeRole");
const User = require("../models/User");
const mongoose = require("mongoose");
const { normalizeRole } = require("../utils/roleUtils");

const RESERVED_ROLE_SLUGS = new Set(["super_admin", "admin", "member", "client"]);

const buildRoleResponse = (role) => ({
  _id: role._id,
  name: role.name,
  slug: role.slug,
});

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get all employee roles (Admin only)
// @route   GET /api/roles
// @access  Private (Admin)
const getEmployeeRoles = async (_req, res) => {
  try {
    const roles = await EmployeeRole.find({}).sort({ name: 1 });
    res.json(roles.map(buildRoleResponse));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create a new employee role (Admin only)
// @route   POST /api/roles
// @access  Private (Admin)
const createEmployeeRole = async (req, res) => {
  try {
    const rawName = typeof req.body?.name === "string" ? req.body.name : "";
    const name = rawName.trim();

    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const slug = normalizeRole(name);
    if (!slug) {
      return res.status(400).json({ message: "Role name is invalid" });
    }

    if (RESERVED_ROLE_SLUGS.has(slug)) {
      return res.status(400).json({ message: "That role is reserved" });
    }

    const existingRole = await EmployeeRole.findOne({ slug });
    if (existingRole) {
      return res.status(409).json({ message: "That role already exists" });
    }

    const role = await EmployeeRole.create({
      name,
      slug,
      createdBy: req.user?._id || null,
    });

    res.status(201).json(buildRoleResponse(role));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete an employee role (Admin only)
// @route   DELETE /api/roles/:roleId
// @access  Private (Admin)
const deleteEmployeeRole = async (req, res) => {
  try {
    const roleId = typeof req.params?.roleId === "string" ? req.params.roleId.trim() : "";
    if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({ message: "A valid role id is required" });
    }

    const role = await EmployeeRole.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (RESERVED_ROLE_SLUGS.has(role.slug)) {
      return res.status(400).json({ message: "That role cannot be deleted" });
    }

    const roleName = typeof role.name === "string" ? role.name.trim() : "";
    const assignedUsersCount = await User.countDocuments({
      employeeRole: {
        $regex: new RegExp(`^${escapeRegex(roleName)}$`, "i"),
      },
    });

    if (assignedUsersCount > 0) {
      return res.status(409).json({
        message: `Cannot delete "${roleName}" because it is assigned to ${assignedUsersCount} employee${assignedUsersCount === 1 ? "" : "s"}.`,
      });
    }

    await role.deleteOne();

    res.json({
      message: "Role deleted successfully",
      role: buildRoleResponse(role),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getEmployeeRoles,
  createEmployeeRole,
  deleteEmployeeRole,
};
