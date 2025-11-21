const DEFAULT_ROLE = "member";
const PRIVILEGED_ROLES = ["admin", "super_admin"];

const ROLE_SYNONYMS = {
  superadmin: "super_admin",
  "super_administrator": "super_admin",
  superadministrator: "super_admin",
};

const normalizeRole = (role) => {
  if (typeof role === "string") {
    const trimmedRole = role.trim().toLowerCase();
    const normalizedRole = trimmedRole.replace(/[\s-]+/g, "_");

    return ROLE_SYNONYMS[normalizedRole] || ROLE_SYNONYMS[trimmedRole] || normalizedRole;
  }

  return role ?? "";
};

const matchesRole = (role, expectedRole) => {
  const normalizedRole = normalizeRole(role);
  const normalizedExpected = normalizeRole(expectedRole);

  if (!normalizedRole || !normalizedExpected) {
    return false;
  }

  if (normalizedRole === normalizedExpected) {
    return true;
  }

  return (
    normalizedRole.startsWith(`${normalizedExpected}-`) ||
    normalizedRole.startsWith(`${normalizedExpected}_`) ||
    normalizedRole.startsWith(`${normalizedExpected} `)
  );
};

const getRoleLabel = (role) => {
  if (matchesRole(role, "super_admin")) {
    return "Super Admin";
  }

  if (matchesRole(role, "admin")) {
    return "Admin";
  }

  if (matchesRole(role, "member")) {
    return "Member";
  }

  if (matchesRole(role, "client")) {
    return "Client";
  }

  return "";
};

const hasPrivilegedAccess = (role) =>
  matchesRole(role, "admin") || matchesRole(role, "super_admin");

const isSuperAdminRole = (role) => matchesRole(role, "super_admin");

const formatUserRole = (user) => {
  if (!user || typeof user !== "object") {
    return user;
  }

  const userObject = typeof user.toObject === "function" ? user.toObject() : user;
  const normalizedRole = normalizeRole(userObject.role) || DEFAULT_ROLE;

  return {
    ...userObject,
    role: normalizedRole,
    roleLabel: getRoleLabel(normalizedRole),
  };
};

module.exports = {
  DEFAULT_ROLE,
  PRIVILEGED_ROLES,
  formatUserRole,
  getRoleLabel,
  hasPrivilegedAccess,
  isSuperAdminRole,
  matchesRole,
  normalizeRole,
};