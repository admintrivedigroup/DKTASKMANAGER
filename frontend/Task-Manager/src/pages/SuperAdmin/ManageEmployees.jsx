import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuKeyRound, LuTrash2, LuUsers } from "react-icons/lu";
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
    role: "member",
  });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  const navigate = useNavigate();
  
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

  const handleInputChange = ({ target: { name, value, type, checked } }) => {
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const requestedRole = normalizeRole(formData.role) || "member";

    const trimmedOfficeLocation =
      typeof formData.officeLocation === "string"
        ? formData.officeLocation.trim()
        : "";

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: requestedRole,
      gender: formData.gender,
      officeLocation: trimmedOfficeLocation,
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
        role: "member",
      });
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

    return () => {};
  }, []);

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

    DEFAULT_OFFICE_LOCATIONS.forEach((location) => {
      const trimmedLocation =
        typeof location === "string" ? location.trim() : "";

      if (!trimmedLocation) {
        return;
      }

      locationMap.set(trimmedLocation.toLowerCase(), trimmedLocation);
    });

    allUsers.forEach((user) => {
      const rawLocation =
        typeof user?.officeLocation === "string"
          ? user.officeLocation.trim()
          : "";

      if (!rawLocation) {
        return;
      }

      const normalizedLocation = rawLocation.toLowerCase();

      if (!locationMap.has(normalizedLocation)) {
        locationMap.set(normalizedLocation, rawLocation);
      }
    });

    return Array.from(locationMap.values()).sort((first, second) =>
      first.localeCompare(second)
    );
  }, [allUsers]);

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

  return (
    <DashboardLayout activeMenu="Employees">
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-primary via-indigo-500 to-purple-500 px-4 py-7 text-white shadow-[0_20px_45px_rgba(126,58,242,0.28)] sm:px-6 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.16),_transparent_60%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-white/70">People & Partners</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Employees</h2>
            <p className="mt-3 text-sm text-white/70">
              Manage your internal team and keep every employee connected in one transparent view.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              className="download-btn"
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm ? "Close" : "Add Employee"}
            </button>
          </div>
        </div>
      </section>

      {showCreateForm && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Add a new employee</h3>
          <p className="mt-1 text-sm text-slate-500">Provide the employee's details and choose their access level.</p>

          <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleCreateUser}>
            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Jane Cooper"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                type="text"
                autoComplete="name"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="member@company.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                type="email"
                autoComplete="email"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="password">
              Password
              </label>
              <input
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a secure password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                type="password"
                autoComplete="new-password"
              />
            </div>

            <div className="md:col-span-1">
              <label
                className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
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
                  className="custom-select__field"
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
              <label
                className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                htmlFor="officeLocation"
              >
                Office Location
              </label>
              <div className="custom-select mt-2">
                <select
                  id="officeLocation"
                  name="officeLocation"
                  value={formData.officeLocation}
                  onChange={handleInputChange}
                  className="custom-select__field"
                >
                  <option value="" disabled>
                    Select office location
                  </option>
                  {officeLocationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter the password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                type="password"
                autoComplete="new-password"
              />
            </div>

            <div className="md:col-span-1">
              <label
                className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
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
                  className="custom-select__field"
                >
                  {availableRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {normalizedCurrentUserRole !== "super_admin" && (
                <p className="mt-2 text-xs text-slate-500">
                  Only a Super Admin can grant Super Admin-level access.
                </p>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Employee..." : "Create Employee"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="flex items-center gap-3 text-sm font-medium text-slate-600">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-sky-500 text-white shadow-[0_12px_28px_rgba(126,58,242,0.35)]">
          <LuUsers className="text-base" />
        </span>
        {isLoading
          ? "Loading employees..."
          : `${filteredUsers.length} teammates powering the mission.`}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="memberSearch">
              Search Employees
            </label>
            <input
              id="memberSearch"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              disabled={isLoading}
            />
          </div>

          <div className="w-full md:max-w-xs">
            <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="officeFilter">
              Filter by Office
            </label>
              <div className="custom-select mt-2">
                <select
                  id="officeFilter"
                  name="officeFilter"
                  value={selectedOffice}
                  onChange={(event) => setSelectedOffice(event.target.value)}
                  className="custom-select__field"
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
            </div>

          <div className="flex items-center justify-end">
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>            
        </div>
      </section>

      {isLoading ? (
        <LoadingOverlay message="Loading employees..." className="py-24" />
      ) : (
        <section>
          {viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                />
              ))}
              {filteredUsers.length === 0 && (
                <div className="md:col-span-2 xl:col-span-3">
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    No accounts match your current search and filter settings.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                            className="cursor-pointer hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
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
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
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
                              {user?.officeLocation || "—"}
                            </td>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                              {pendingTasks}
                            </td>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
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
                                      className="rounded-full border border-rose-200 bg-rose-50/70 p-2 text-rose-500 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-600"
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
    </DashboardLayout>
  );
};

export default ManageEmployees;