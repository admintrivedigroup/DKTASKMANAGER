const ROLE_SYNONYMS = {
  superadmin: "super_admin",
  "super_administrator": "super_admin",
  superadministrator: "super_admin",
};

export const normalizeRole = (role) => {
  if (typeof role === "string") {
    const trimmedRole = role.trim().toLowerCase();
    const normalizedRole = trimmedRole.replace(/[\s-]+/g, "_");

    return ROLE_SYNONYMS[normalizedRole] || ROLE_SYNONYMS[trimmedRole] || normalizedRole;
  }

  return role ?? "";
};

export const matchesRole = (role, expectedRole) => {
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

export const getRoleLabel = (role) => {
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

export const hasPrivilegedAccess = (role) =>
  matchesRole(role, "admin") || matchesRole(role, "super_admin");

export const isSuperAdminRole = (role) => matchesRole(role, "super_admin");

export const isRoleAllowed = (role, allowedRoles = []) => {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.some((expectedRole) => matchesRole(role, expectedRole));
};

export const getPrivilegedBasePath = (role) =>
  matchesRole(role, "super_admin") ? "/super-admin" : "/admin";

export const resolvePrivilegedPath = (path, role) => {
  if (typeof path !== "string") {
    return path;
  }

  if (!path.startsWith("/admin")) {
    return path;
  }

  const basePath = getPrivilegedBasePath(role);
  return path.replace(/^\/admin/, basePath);
};

export const getDefaultRouteForRole = (role) => {
  if (matchesRole(role, "super_admin")) {
    return "/super-admin/dashboard";
  }

  if (matchesRole(role, "admin")) {
    return "/admin/dashboard";
  }

  if (matchesRole(role, "client")) {
    return "/client/home";
  }

  return "/user/dashboard";
};