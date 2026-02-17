import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LuKeyRound,
  LuLoader,
  LuMapPin,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuUsers,
} from "react-icons/lu";
import toast from "react-hot-toast";

import UserCard from "../../components/Cards/UserCard.jsx";
import LoadingOverlay from "../../components/LoadingOverlay.jsx";
import ViewToggle from "../../components/ViewToggle.jsx";
import DashboardLayout from "../../components/layouts/DashboardLayout.jsx";
import { UserContext } from "../../context/userContext.jsx";
import { API_PATHS } from "../../utils/apiPaths.js";
import axiosInstance from "../../utils/axiosInstance.js";
import { DEFAULT_OFFICE_LOCATIONS } from "../../utils/data.js";
import { normalizeRole, resolvePrivilegedPath } from "../../utils/roleUtils.js";

const normalizeOfficeLocationName = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const sanitizeOfficeLocationName = (value) =>
  typeof value === "string" ? value.trim() : "";

const ManageEmployees = () => {
  const { user: currentUser } = useContext(UserContext);
  const [allUsers, setAllUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    officeLocation: "",
    employeeRole: "",
    role: "member",
  });
  const [employeeRoles, setEmployeeRoles] = useState([]);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [showRoleCreator, setShowRoleCreator] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [isRoleSubmitting, setIsRoleSubmitting] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [showOfficeCreator, setShowOfficeCreator] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [isOfficeDropdownOpen, setIsOfficeDropdownOpen] = useState(false);
  const [customOfficeLocations, setCustomOfficeLocations] = useState([]);
  const [hiddenOfficeLocationKeys, setHiddenOfficeLocationKeys] = useState([]);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthdate: "",
    gender: "",
    officeLocation: "",
    role: "member",
  });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const employeeRoleDropdownRef = useRef(null);
  const officeLocationDropdownRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  
  const getAllUsers = async () => {
    try {
      setIsLoading(true);
      setAllUsers([]);
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      if (Array.isArray(response.data)) {
        const sortedUsers = [...response.data].sort((userA, userB) => {
          const rolePriority = {
            super_admin: 0,
            admin: 1,
            member: 2,
          };

          const normalizedRoleA = normalizeRole(userA?.role);
          const normalizedRoleB = normalizeRole(userB?.role);
          const roleDifference =
            (rolePriority[normalizedRoleA] ?? Number.MAX_SAFE_INTEGER) -
            (rolePriority[normalizedRoleB] ?? Number.MAX_SAFE_INTEGER);

          if (roleDifference !== 0) {
            return roleDifference;
          }

          return (userA?.name || "").localeCompare(userB?.name || "");
        });

        setAllUsers(sortedUsers);
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployeeRoles = async () => {
    try {
      setIsRoleLoading(true);
      const response = await axiosInstance.get(API_PATHS.ROLES.GET_ALL);
      if (Array.isArray(response.data)) {
        setEmployeeRoles(response.data);
      } else {
        setEmployeeRoles([]);
      }
    } catch (error) {
      console.error("Error fetching employee roles:", error);
      const message =
        error?.response?.data?.message ||
        "Unable to load employee roles. Please try again.";
      toast.error(message);
      setEmployeeRoles([]);
    } finally {
      setIsRoleLoading(false);
    }
  };

  const handleInputChange = ({ target: { name, value, type, checked } }) => {
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateEmployeeRole = async () => {
    const trimmedRoleName = newRoleName.trim();
    if (!trimmedRoleName || isRoleSubmitting) {
      return;
    }

    try {
      setIsRoleSubmitting(true);
      const response = await axiosInstance.post(API_PATHS.ROLES.CREATE, {
        name: trimmedRoleName,
      });
      const createdRole = response.data;
      if (createdRole?.name) {
        setEmployeeRoles((prev) => {
          const exists = prev.some(
            (role) =>
              role?.slug === createdRole.slug ||
              role?.name?.toLowerCase() === createdRole.name.toLowerCase()
          );
          const nextRoles = exists ? [...prev] : [...prev, createdRole];
          return nextRoles.sort((first, second) =>
            (first?.name || "").localeCompare(second?.name || "")
          );
        });
        setFormData((prev) => ({
          ...prev,
          employeeRole: createdRole.name,
        }));
      }
      toast.success("Role created successfully.");
      setNewRoleName("");
      setShowRoleCreator(false);
      setIsRoleDropdownOpen(false);
    } catch (error) {
      console.error("Error creating employee role:", error);
      const message =
        error?.response?.data?.message ||
        "Unable to create the role. Please try again.";
      toast.error(message);
    } finally {
      setIsRoleSubmitting(false);
    }
  };

  const handleSelectEmployeeRole = (roleName) => {
    setFormData((prev) => ({
      ...prev,
      employeeRole: roleName,
    }));
    setIsRoleDropdownOpen(false);
  };

  const handleDeleteEmployeeRole = async (role) => {
    const roleId = typeof role?._id === "string" ? role._id : "";
    const roleName = typeof role?.name === "string" ? role.name.trim() : "";

    if (!roleId || !roleName || isRoleSubmitting) {
      return;
    }

    const confirmDelete = window.confirm(
      `Delete "${roleName}" from employee roles?`
    );
    if (!confirmDelete) {
      return;
    }

    try {
      setIsRoleSubmitting(true);
      await axiosInstance.delete(API_PATHS.ROLES.DELETE(roleId));
      setEmployeeRoles((prev) =>
        prev.filter((entry) => String(entry?._id || "") !== roleId)
      );
      setFormData((prev) =>
        prev.employeeRole === roleName ? { ...prev, employeeRole: "" } : prev
      );
      toast.success("Role deleted successfully.");
    } catch (error) {
      console.error("Error deleting employee role:", error);
      const message =
        error?.response?.data?.message ||
        "Unable to delete the role. Please try again.";
      toast.error(message);
    } finally {
      setIsRoleSubmitting(false);
    }
  };

  const handleSelectOfficeLocation = (officeLocation) => {
    setFormData((prev) => ({
      ...prev,
      officeLocation,
    }));
    setIsOfficeDropdownOpen(false);
  };

  const handleCreateOfficeLocation = () => {
    const officeLocationName = sanitizeOfficeLocationName(newOfficeName);
    if (!officeLocationName) {
      return;
    }

    const normalizedOfficeLocation = normalizeOfficeLocationName(officeLocationName);
    const existingLocation = officeLocationOptions.find(
      (location) => normalizeOfficeLocationName(location) === normalizedOfficeLocation
    );

    if (existingLocation) {
      setFormData((prev) => ({
        ...prev,
        officeLocation: existingLocation,
      }));
      setNewOfficeName("");
      setShowOfficeCreator(false);
      setIsOfficeDropdownOpen(false);
      toast.error("That office location already exists.");
      return;
    }

    setCustomOfficeLocations((prev) => {
      const exists = prev.some(
        (location) => normalizeOfficeLocationName(location) === normalizedOfficeLocation
      );
      if (exists) {
        return [...prev];
      }

      return [...prev, officeLocationName].sort((first, second) =>
        first.localeCompare(second)
      );
    });
    setHiddenOfficeLocationKeys((prev) =>
      prev.filter((locationKey) => locationKey !== normalizedOfficeLocation)
    );
    setFormData((prev) => ({
      ...prev,
      officeLocation: officeLocationName,
    }));
    setNewOfficeName("");
    setShowOfficeCreator(false);
    setIsOfficeDropdownOpen(false);
    toast.success("Office location created successfully.");
  };

  const handleDeleteOfficeLocation = (officeLocation) => {
    const officeLocationName = sanitizeOfficeLocationName(officeLocation);
    const normalizedOfficeLocation = normalizeOfficeLocationName(officeLocationName);
    if (!officeLocationName || !normalizedOfficeLocation) {
      return;
    }

    const assignedUsersCount = allUsers.filter((user) => {
      const userOfficeLocation =
        typeof user?.officeLocation === "string" ? user.officeLocation : "";
      return normalizeOfficeLocationName(userOfficeLocation) === normalizedOfficeLocation;
    }).length;

    if (assignedUsersCount > 0) {
      toast.error(
        `Cannot delete "${officeLocationName}" because it is assigned to ${assignedUsersCount} employee${assignedUsersCount === 1 ? "" : "s"}.`
      );
      return;
    }

    const confirmDelete = window.confirm(
      `Delete "${officeLocationName}" from office locations?`
    );
    if (!confirmDelete) {
      return;
    }

    setCustomOfficeLocations((prev) =>
      prev.filter(
        (location) =>
          normalizeOfficeLocationName(location) !== normalizedOfficeLocation
      )
    );
    setHiddenOfficeLocationKeys((prev) =>
      prev.includes(normalizedOfficeLocation)
        ? prev
        : [...prev, normalizedOfficeLocation]
    );
    setFormData((prev) =>
      normalizeOfficeLocationName(prev.officeLocation) === normalizedOfficeLocation
        ? { ...prev, officeLocation: "" }
        : prev
    );
    setSelectedOffice((prev) =>
      normalizeOfficeLocationName(prev) === normalizedOfficeLocation ? "All" : prev
    );
    toast.success("Office location deleted successfully.");
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const requestedRole = normalizeRole(formData.role) || "member";

    const trimmedOfficeLocation =
      typeof formData.officeLocation === "string"
        ? formData.officeLocation.trim()
        : "";
    const trimmedEmployeeRole =
      typeof formData.employeeRole === "string"
        ? formData.employeeRole.trim()
        : "";

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: requestedRole,
      gender: formData.gender,
      officeLocation: trimmedOfficeLocation,
      employeeRole: trimmedEmployeeRole,
    };

    if (!payload.name || !payload.email || !payload.password || !payload.gender || !payload.officeLocation) {
      toast.error("Please complete all required fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Temporary password and confirmation do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await axiosInstance.post(API_PATHS.USERS.CREATE_USER, payload);
      toast.success("Employee added successfully.");
      setShowCreateForm(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        gender: "",
        officeLocation: "",
        employeeRole: "",
        role: "member",
      });
      setIsOfficeDropdownOpen(false);
      setIsRoleDropdownOpen(false);
      await getAllUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      const message = error?.response?.data?.message || "Unable to add the account. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedCurrentUserRole = useMemo(
    () => normalizeRole(currentUser?.role),
    [currentUser?.role]
  );
  const currentUserIdString = useMemo(
    () => (currentUser?._id ? String(currentUser._id) : ""),
    [currentUser?._id]
  );  

  const handleDeleteUser = async (user) => {
    const userId = typeof user === "object" ? user?._id : user;
    const userName = typeof user === "object" ? user?.name : "";
    const userRole = normalizeRole(
      typeof user === "object" ? user?.role : undefined
    );

    if (userRole === "super_admin" && normalizedCurrentUserRole !== "super_admin") {
      toast.error("Only Super Admins can remove Super Admin accounts.");
      return;
    }

    if (!userId) {
      toast.error("Unable to delete user. Please try again.");
      return;
    }

    if (
      normalizedCurrentUserRole === "super_admin" &&
      currentUserIdString &&
      String(userId) === currentUserIdString
    ) {
      toast.error(
        "Super Admins must delete their own account from Profile Settings."
      );
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${userName || "this user"}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    const confirmTaskCleanup = window.confirm(
      "Deleting this account will also remove any tasks assigned exclusively to them. Tasks shared with other collaborators will remain available to the rest of the assignees. Do you want to proceed?"
    );

    if (!confirmTaskCleanup) return;

    try {
      await axiosInstance.delete(API_PATHS.USERS.DELETE_USER(userId));
      toast.success("User removed successfully.");
      await getAllUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      const message = error?.response?.data?.message || "Failed to delete user. Please try again.";
      toast.error(message);
    }
  };

  const openResetPasswordModal = (user) => {
    const normalizedRole = normalizeRole(user?.role);
    const userIdString = user?._id ? String(user._id) : "";
    const currentUserIdString = currentUser?._id
      ? String(currentUser._id)
      : "";
    const isCurrentUser =
      userIdString &&
      currentUserIdString &&
      userIdString === currentUserIdString;

    if (normalizedRole === "super_admin" && normalizedCurrentUserRole !== "super_admin") {
      toast.error("Only Super Admins can reset passwords for Super Admin accounts.");
      return;
    }

    if (normalizedCurrentUserRole === "super_admin" && isCurrentUser) {
      toast.error(
        "Super Admins can update their own password from Profile Settings."
      );
      return;
    }

    setSelectedUser(user);
    setResetPasswordData({ newPassword: "", confirmPassword: "" });
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordChange = ({ target: { name, value } }) => {
    setResetPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetPasswordSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUser || isResettingPassword) return;

    const selectedUserRole = normalizeRole(selectedUser?.role);
    if (selectedUserRole === "super_admin" && normalizedCurrentUserRole !== "super_admin") {
      toast.error("Only Super Admins can reset passwords for Super Admin accounts.");
      return;
    }
  
    if (!resetPasswordData.newPassword || !resetPasswordData.confirmPassword) {
      toast.error("Please enter and confirm the new password.");
      return;
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    try {
      setIsResettingPassword(true);
      await axiosInstance.put(API_PATHS.USERS.RESET_USER_PASSWORD(selectedUser._id), {
        newPassword: resetPasswordData.newPassword,
      });
      toast.success("Password reset successfully. The user will be asked to change it on next login.");
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setResetPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error resetting password:", error);
      const message =
        error?.response?.data?.message || "Failed to reset password. Please try again.";
      toast.error(message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  useEffect(() => {
    getAllUsers();
    loadEmployeeRoles();

    return () => {};
  }, []);

  useEffect(() => {
    if (!location.state?.openCreateUser) {
      return;
    }

    const { openCreateUser: _openCreateUser, ...restState } = location.state || {};
    setShowCreateForm(true);

    navigate(location.pathname, {
      replace: true,
      state: restState,
    });
  }, [location.pathname, location.state, location.state?.openCreateUser, navigate]);

  useEffect(() => {
    if (!showCreateForm) {
      return;
    }

    const allowedRoles =
      normalizedCurrentUserRole === "super_admin"
        ? ["member", "admin", "super_admin"]
        : ["member", "admin"];

    if (!allowedRoles.includes(formData.role)) {
      setFormData((prev) => ({
        ...prev,
        role: allowedRoles[0],
      }));
    }
  }, [formData.role, normalizedCurrentUserRole, showCreateForm]);

  useEffect(() => {
    if (!showCreateForm) {
      setShowOfficeCreator(false);
      setNewOfficeName("");
      setIsOfficeDropdownOpen(false);
      setShowRoleCreator(false);
      setNewRoleName("");
      setIsRoleDropdownOpen(false);
    }
  }, [showCreateForm]);

  useEffect(() => {
    if (!isOfficeDropdownOpen) {
      return;
    }

    const handleOutsideClick = (event) => {
      if (
        officeLocationDropdownRef.current &&
        !officeLocationDropdownRef.current.contains(event.target)
      ) {
        setIsOfficeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOfficeDropdownOpen]);

  useEffect(() => {
    if (!isRoleDropdownOpen) {
      return;
    }

    const handleOutsideClick = (event) => {
      if (
        employeeRoleDropdownRef.current &&
        !employeeRoleDropdownRef.current.contains(event.target)
      ) {
        setIsRoleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isRoleDropdownOpen]);

  const availableRoleOptions = useMemo(() => {
    if (normalizedCurrentUserRole === "super_admin") {
      return [
        { value: "member", label: "Member" },       
        { value: "admin", label: "Admin" },
        { value: "super_admin", label: "Super Admin" },
      ];
    }

    return [
      { value: "member", label: "Member" },     
      { value: "admin", label: "Admin" },
    ];
  }, [normalizedCurrentUserRole]);

  const officeLocationOptions = useMemo(() => {
    const locationMap = new Map();
    const hiddenLocationSet = new Set(hiddenOfficeLocationKeys);

    DEFAULT_OFFICE_LOCATIONS.forEach((location) => {
      const trimmedLocation = sanitizeOfficeLocationName(location);
      const normalizedLocation = normalizeOfficeLocationName(trimmedLocation);

      if (!trimmedLocation || hiddenLocationSet.has(normalizedLocation)) {
        return;
      }

      locationMap.set(normalizedLocation, trimmedLocation);
    });

    allUsers.forEach((user) => {
      const rawLocation = sanitizeOfficeLocationName(user?.officeLocation);
      const normalizedLocation = normalizeOfficeLocationName(rawLocation);

      if (!rawLocation || hiddenLocationSet.has(normalizedLocation)) {
        return;
      }

      if (!locationMap.has(normalizedLocation)) {
        locationMap.set(normalizedLocation, rawLocation);
      }
    });

    customOfficeLocations.forEach((location) => {
      const officeLocationName = sanitizeOfficeLocationName(location);
      const normalizedLocation = normalizeOfficeLocationName(officeLocationName);

      if (!officeLocationName || hiddenLocationSet.has(normalizedLocation)) {
        return;
      }

      if (!locationMap.has(normalizedLocation)) {
        locationMap.set(normalizedLocation, officeLocationName);
      }
    });

    return Array.from(locationMap.values()).sort((first, second) =>
      first.localeCompare(second)
    );
  }, [allUsers, customOfficeLocations, hiddenOfficeLocationKeys]);

  useEffect(() => {
    if (
      typeof selectedOffice === "string" &&
      selectedOffice &&
      selectedOffice !== "All"
    ) {
      const normalizedSelection = selectedOffice.trim().toLowerCase();
      const hasMatchingLocation = officeLocationOptions.some(
        (location) =>
          location &&
          location.toString().trim().toLowerCase() === normalizedSelection
      );

      if (!hasMatchingLocation) {
        setSelectedOffice("All");
      }
    }
  }, [officeLocationOptions, selectedOffice]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const normalizedSelectedOffice =
    typeof selectedOffice === "string"
      ? selectedOffice.trim().toLowerCase()
      : "";
  const canViewSuperAdminAccounts = normalizedCurrentUserRole === "super_admin";
  const allowedRolesForDisplay = canViewSuperAdminAccounts
    ? ["super_admin", "admin", "member"]
    : ["admin", "member"];

  const filteredUsers = allUsers.filter((user) => {
    const normalizedRole = normalizeRole(user?.role);

    if (!allowedRolesForDisplay.includes(normalizedRole)) {
      return false;
    }

    const matchesName = (user?.name || "")
      .toLowerCase()
      .includes(normalizedSearchTerm);
    const matchesOffice =
      normalizedSelectedOffice === "all" || !normalizedSelectedOffice
        ? true
        : (user?.officeLocation || "")
            .toString()
            .trim()
            .toLowerCase() === normalizedSelectedOffice;

    return matchesName && matchesOffice;
  });

  const canManageSuperAdmin = normalizedCurrentUserRole === "super_admin";
  const userManagementData = filteredUsers.map((user) => {
    const normalizedRole = normalizeRole(user?.role);
    const userIdString = user?._id ? String(user._id) : "";
    const isCurrentUser =
      userIdString && currentUserIdString && userIdString === currentUserIdString;
    const preventSelfManagement = canManageSuperAdmin && isCurrentUser;
    const allowManagement =
      !preventSelfManagement &&
      (canManageSuperAdmin || normalizedRole !== "super_admin");

    return { user, allowManagement };
  });

  const openEditModal = (user) => {
    setEditUser(user);
    setEditFormData({
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      confirmPassword: "",
      birthdate: typeof user?.birthdate === "string" ? user.birthdate.slice(0, 10) : "",
      gender: user?.gender || "",
      officeLocation: user?.officeLocation || "",
      role: normalizeRole(user?.role) || "member",
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = ({ target: { name, value } }) => {
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editUser || isUpdatingUser) return;

    const requestedRole = normalizeRole(editFormData.role) || "member";
    const allowedRoles =
      normalizedCurrentUserRole === "super_admin" ? ["member", "admin", "super_admin"] : ["member", "admin"];
    if (!allowedRoles.includes(requestedRole)) {
      toast.error("You cannot assign this role.");
      return;
    }

    if (!editFormData.name.trim() || !editFormData.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }

    if (editFormData.password && editFormData.password !== editFormData.confirmPassword) {
      toast.error("Password and confirmation do not match.");
      return;
    }

    const payload = {
      name: editFormData.name.trim(),
      email: editFormData.email.trim(),
      birthdate: editFormData.birthdate || null,
      gender: editFormData.gender,
      officeLocation: typeof editFormData.officeLocation === "string" ? editFormData.officeLocation.trim() : "",
      role: requestedRole,
    };

    if (editFormData.password) {
      payload.password = editFormData.password;
    }

    try {
      setIsUpdatingUser(true);
      await axiosInstance.put(API_PATHS.USERS.UPDATE_USER(editUser._id), payload);
      toast.success("Employee updated successfully.");
      setShowEditModal(false);
      setEditUser(null);
      await getAllUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      const message = error?.response?.data?.message || "Failed to update user. Please try again.";
      toast.error(message);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Employees">
      <div className="page-shell space-y-5 sm:space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-white px-5 py-5 shadow-sm dark:border-slate-800/70 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 dark:shadow-slate-950/40 sm:px-6 sm:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(99,102,241,0.12),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_40%)] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(99,102,241,0.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_42%)]" />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h1 className="text-[28px] font-bold leading-tight text-slate-900 dark:text-slate-100 sm:text-[30px]">
                    Employees
                  </h1>
                </div>
                <p className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <LuUsers className="text-base text-indigo-500 dark:text-indigo-300" />
                  {isLoading
                    ? "Loading teammates..."
                    : `${filteredUsers.length} teammates powering the mission`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-indigo-500/90 dark:hover:bg-indigo-500 dark:focus:ring-indigo-500/30"
                  onClick={() => setShowCreateForm((prev) => !prev)}
                >
                  {showCreateForm ? (
                    <>
                      <LuPlus className="rotate-45 text-base" /> Close
                    </>
                  ) : (
                    <>
                      <LuPlus className="text-base" /> Add Employee
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {showCreateForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/70 dark:shadow-slate-950/60 dark:ring-1 dark:ring-white/5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add a new employee</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Provide the employee's details, role, and access level.</p>

          <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleCreateUser}>
            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Jane Cooper"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                type="text"
                autoComplete="name"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="member@company.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                type="email"
                autoComplete="email"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300" htmlFor="password">
              Password
              </label>
              <input
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a secure password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                type="password"
                autoComplete="new-password"
              />
            </div>

            <div className="md:col-span-1">
              <label
                className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300"
                htmlFor="gender"
              >
                Gender
              </label>
              <div className="custom-select mt-2">
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="custom-select__field dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="flex items-center justify-between gap-3">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300"
                  htmlFor="officeLocation"
                >
                  Office Location
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-indigo-200 dark:hover:text-indigo-100"
                  onClick={() => setShowOfficeCreator((prev) => !prev)}
                >
                  + New Office
                </button>
              </div>
              <div className="relative mt-2" ref={officeLocationDropdownRef}>
                <button
                  id="officeLocation"
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                  onClick={() => setIsOfficeDropdownOpen((prev) => !prev)}
                  aria-expanded={isOfficeDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <span
                    className={
                      formData.officeLocation
                        ? ""
                        : "text-slate-400 dark:text-slate-500"
                    }
                  >
                    {formData.officeLocation || "Select office location"}
                  </span>
                  <span
                    className={`ml-3 text-xs text-slate-500 transition dark:text-slate-300 ${
                      isOfficeDropdownOpen ? "rotate-180" : ""
                    }`}
                  >
                    v
                  </span>
                </button>

                {isOfficeDropdownOpen && (
                  <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700/80 dark:bg-slate-900">
                    {officeLocationOptions.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                        No office locations available
                      </p>
                    ) : (
                      officeLocationOptions.map((location) => {
                        const isSelected = formData.officeLocation === location;
                        return (
                          <div
                            key={location}
                            className="flex items-center gap-2 rounded-xl px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                          >
                            <button
                              type="button"
                              className={`flex-1 rounded-lg px-2 py-2 text-left text-sm transition ${
                                isSelected
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100"
                                  : "text-slate-700 dark:text-slate-100"
                              }`}
                              onClick={() => handleSelectOfficeLocation(location)}
                            >
                              {location}
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                              onClick={() => handleDeleteOfficeLocation(location)}
                              aria-label={`Delete ${location}`}
                              title={`Delete ${location}`}
                            >
                              <LuTrash2 className="text-sm" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              {showOfficeCreator && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newOfficeName}
                    onChange={(event) => setNewOfficeName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateOfficeLocation();
                      }
                    }}
                    placeholder="Office location"
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                  />
                  <button
                    type="button"
                    className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:disabled:bg-indigo-500/30"
                    onClick={handleCreateOfficeLocation}
                    disabled={!newOfficeName.trim()}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => {
                      setShowOfficeCreator(false);
                      setNewOfficeName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <div className="flex items-center justify-between gap-3">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300"
                  htmlFor="employeeRole"
                >
                  Employee Role
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-indigo-200 dark:hover:text-indigo-100"
                  onClick={() => setShowRoleCreator((prev) => !prev)}
                  disabled={isRoleSubmitting}
                >
                  + New Role
                </button>
              </div>
              <div className="relative mt-2" ref={employeeRoleDropdownRef}>
                <button
                  id="employeeRole"
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                  onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                  disabled={isRoleLoading}
                  aria-expanded={isRoleDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <span
                    className={
                      formData.employeeRole
                        ? ""
                        : "text-slate-400 dark:text-slate-500"
                    }
                  >
                    {isRoleLoading
                      ? "Loading roles..."
                      : formData.employeeRole || "Select role"}
                  </span>
                  <span
                    className={`ml-3 text-xs text-slate-500 transition dark:text-slate-300 ${
                      isRoleDropdownOpen ? "rotate-180" : ""
                    }`}
                  >
                    v
                  </span>
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700/80 dark:bg-slate-900">
                    {employeeRoles.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                        No roles available
                      </p>
                    ) : (
                      employeeRoles.map((role) => {
                        const roleName =
                          typeof role?.name === "string" ? role.name : "";
                        const roleKey = role?._id || role?.slug || roleName;
                        const isSelected = formData.employeeRole === roleName;

                        return (
                          <div
                            key={roleKey}
                            className="flex items-center gap-2 rounded-xl px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                          >
                            <button
                              type="button"
                              className={`flex-1 rounded-lg px-2 py-2 text-left text-sm transition ${
                                isSelected
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100"
                                  : "text-slate-700 dark:text-slate-100"
                              }`}
                              onClick={() => handleSelectEmployeeRole(roleName)}
                            >
                              {roleName}
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                              onClick={() => handleDeleteEmployeeRole(role)}
                              disabled={isRoleSubmitting}
                              aria-label={`Delete ${roleName}`}
                              title={`Delete ${roleName}`}
                            >
                              <LuTrash2 className="text-sm" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              {showRoleCreator && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(event) => setNewRoleName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateEmployeeRole();
                      }
                    }}
                    placeholder="Role name"
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                  />
                  <button
                    type="button"
                    className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:disabled:bg-indigo-500/30"
                    onClick={handleCreateEmployeeRole}
                    disabled={!newRoleName.trim() || isRoleSubmitting}
                  >
                    {isRoleSubmitting ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => {
                      setShowRoleCreator(false);
                      setNewRoleName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter the password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                type="password"
                autoComplete="new-password"
              />
            </div>

            <div className="md:col-span-1">
              <label
                className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300"
                htmlFor="role"
              >
                Access Level
              </label>
              <div className="custom-select mt-2">
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="custom-select__field dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                >
                  {availableRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {normalizedCurrentUserRole !== "super_admin" && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                  Only a Super Admin can grant Super Admin-level access.
                </p>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:shadow-[0_10px_25px_rgba(79,70,229,0.45)] dark:disabled:bg-indigo-500/25 dark:disabled:text-indigo-100/80"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Employee..." : "Create Employee"}
              </button>
            </div>
          </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="memberSearch"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search teammates by name"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-10 text-sm text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-white focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                disabled={isLoading}
              />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex w-full flex-1 flex-wrap items-center gap-3 sm:w-auto">
                <div className="relative min-w-[190px] flex-1 sm:flex-none sm:min-w-[200px]">
                  <LuMapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    id="officeFilter"
                    name="officeFilter"
                    value={selectedOffice}
                    onChange={(event) => setSelectedOffice(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-10 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-white focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    disabled={isLoading}
                  >
                    <option value="All">All locations</option>
                    {officeLocationOptions.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                <ViewToggle value={viewMode} onChange={setViewMode} className="shadow-sm" />
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <LoadingOverlay message="Loading employees..." className="py-24" />
        ) : (
          <section>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {userManagementData.map(({ user, allowManagement }) => (
                <UserCard
                  key={user._id}
                  userInfo={user}
                  onDelete={
                    allowManagement ? () => handleDeleteUser(user) : undefined
                  }
                  onResetPassword={
                    allowManagement
                      ? () => openResetPasswordModal(user)
                      : undefined
                  }
                  onEdit={
                    allowManagement ? () => openEditModal(user) : undefined
                  }
                />
              ))}
              {filteredUsers.length === 0 && (
                <div className="sm:col-span-2 xl:col-span-3">
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    No accounts match your current search and filter settings.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No accounts match your current search and filter settings.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                        <th scope="col" className="px-4 py-3 text-left">
                          S.No.
                        </th>                        
                        <th scope="col" className="px-4 py-3 text-left">
                          Employee
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          Office
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          Pending Tasks
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          In Progress
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          Completed
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
                      {userManagementData.map(({ user, allowManagement }, index) => {
                        const pendingTasks = user?.pendingTasks ?? 0;
                        const inProgressTasks = user?.inProgressTasks ?? 0;
                        const completedTasks = user?.completedTasks ?? 0;
                        const userInitial = (user?.name || "?")
                          .charAt(0)
                          .toUpperCase();
                        const userDetailsPath = resolvePrivilegedPath(
                          `/admin/users/${user?._id}`,
                          currentUser?.role
                        );

                        return (
                          <tr
                            key={user._id}
                            className="cursor-pointer hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:hover:bg-slate-800/70"
                            onClick={() => navigate(userDetailsPath)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                navigate(userDetailsPath);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {index + 1}
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex items-center gap-3">
                                {user?.profileImageUrl ? (
                                  <img
                                    src={user.profileImageUrl}
                                    alt=""
                                    className="h-10 w-10 rounded-2xl object-cover"
                                  />
                                ) : (
                                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-semibold text-indigo-600">
                                    {userInitial}
                                  </span>
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {user?.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {user?.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-slate-600">
                              {user?.officeLocation || "N/A"}
                            </td>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {pendingTasks}
                            </td>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {inProgressTasks}
                            </td>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                              {completedTasks}
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                {allowManagement && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openEditModal(user);
                                      }}
                                      title="Edit User"
                                      aria-label="Edit User"
                                      className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                    >
                                      <LuPencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openResetPasswordModal(user);
                                      }}
                                      title="Change Password"
                                      aria-label="Change Password"
                                      className="rounded-full border border-indigo-200 bg-indigo-50/70 p-2 text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700"
                                    >
                                      <LuKeyRound className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleDeleteUser(user);
                                      }}
                                      title="Delete User"
                                      aria-label="Delete User"
                                      className="rounded-full p-2 transition btn-danger-soft"
                                    >
                                      <LuTrash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          </section>
        )}
      </div>
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Reset password for {selectedUser.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a temporary password. The user will be prompted to set their own password at next login.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleResetPasswordSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="newPassword">
                Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={handleResetPasswordChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={resetPasswordData.confirmPassword}
                  onChange={handleResetPasswordChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? "Updating..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-slate-900">Edit employee</h3>
                <p className="text-sm text-slate-600">Update the employee's details and save your changes.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isUpdatingUser) return;
                  setShowEditModal(false);
                  setEditUser(null);
                }}
                className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:mt-0"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleEditSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editName" className="text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    id="editName"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Full name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editEmail" className="text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    id="editEmail"
                    name="email"
                    type="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="name@company.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editPassword" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="editPassword"
                    name="password"
                    type="password"
                    value={editFormData.password}
                    onChange={handleEditInputChange}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Create a secure password"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editConfirmPassword" className="text-sm font-medium text-slate-700">
                    Confirm Password
                  </label>
                  <input
                    id="editConfirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={editFormData.confirmPassword}
                    onChange={handleEditInputChange}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Re-enter the password"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editBirthdate" className="text-sm font-medium text-slate-700">
                    Date of Birth
                  </label>
                  <input
                    id="editBirthdate"
                    name="birthdate"
                    type="date"
                    value={editFormData.birthdate}
                    onChange={handleEditInputChange}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editGender" className="text-sm font-medium text-slate-700">
                    Gender
                  </label>
                  <select
                    id="editGender"
                    name="gender"
                    value={editFormData.gender}
                    onChange={handleEditInputChange}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editOfficeLocation" className="text-sm font-medium text-slate-700">
                    Office Location
                  </label>
                  <select
                    id="editOfficeLocation"
                    name="officeLocation"
                    value={editFormData.officeLocation}
                    onChange={handleEditInputChange}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select office location</option>
                    {officeLocationOptions.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editRole" className="text-sm font-medium text-slate-700">
                    Access Level
                  </label>
                  <select
                    id="editRole"
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {availableRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isUpdatingUser) return;
                    setShowEditModal(false);
                    setEditUser(null);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-slate-900 via-indigo-700 to-primary px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(30,64,175,0.28)] transition hover:shadow-[0_12px_26px_rgba(30,64,175,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isUpdatingUser ? (
                    <>
                      <LuLoader className="mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageEmployees;
