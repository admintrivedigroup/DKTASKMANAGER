import React, { useCallback, useContext, useMemo } from "react";
import { LuLogOut, LuBell } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Notifications/NotificationBell";
import logo from "../../assets/images/logo.png";
import { UserContext } from "../../context/userContext.jsx";
import { useLayoutContext } from "../../context/layoutContext.jsx";
import ThemeToggle from "../ThemeToggle.jsx";
import { hasPrivilegedAccess, normalizeRole, resolvePrivilegedPath } from "../../utils/roleUtils.js";

const Navbar = () => {
  const navigate = useNavigate();
  const { clearUser, user } = useContext(UserContext);
  const { resetThemePreference } = useLayoutContext();
  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const isPrivileged = hasPrivilegedAccess(normalizedRole);

  const profileSettingsPath = useMemo(() => {
    if (!user) {
      return "";
    }

    if (isPrivileged) {
      return resolvePrivilegedPath("/admin/profile-settings", normalizedRole);
    }

    return "/user/profile-settings";
  }, [isPrivileged, normalizedRole, user]);

  const handleLogout = useCallback(() => {
    const confirmed = window.confirm("Are you sure you want to logout?");

    if (!confirmed) {
      return;
    }

    try {
      localStorage.clear();
    } catch {
      // ignore storage errors
    }

    resetThemePreference?.();
    clearUser?.();
    navigate("/login");
  }, [clearUser, navigate, resetThemePreference]);

  const handleProfileClick = useCallback(() => {
    if (!profileSettingsPath) {
      return;
    }
    navigate(profileSettingsPath);
  }, [navigate, profileSettingsPath]);

  const initials =
    typeof user?.name === "string" && user.name.trim()
      ? user.name
          .trim()
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "TM";

  const profileImageUrl =
    typeof user?.profileImageUrl === "string" && user.profileImageUrl.trim()
      ? user.profileImageUrl
      : "";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-[0_10px_36px_rgba(17,25,40,0.06)] transition-all duration-200 dark:border-slate-800/70 dark:bg-slate-900/80">
      <div className="mx-auto w-full px-6 md:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              srcSet={`${logo} 1x, ${logo} 2x`}
              sizes="56px"
              alt="Task Manager logo"
              loading="eager"
              decoding="async"
              className="h-12 w-12 rounded-lg bg-white object-contain shadow-sm ring-1 ring-slate-200/80"
            />
            <div className="hidden flex-col justify-center leading-tight md:flex">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Task Manager
              </p>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">
                Vijay Trivedi Group
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />

            <div className="hidden sm:flex">
              <NotificationBell iconOverride={<LuBell className="h-4 w-4" />} />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleProfileClick}
                className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-2 py-1 shadow-sm backdrop-blur-sm transition hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-800/70"
              >
                <div className="flex items-center gap-2 px-2">
                  {profileImageUrl ? (
                    <span className="avatar-shell h-8 w-8 shrink-0">
                      <img
                        src={profileImageUrl}
                        alt="Profile"
                        className="avatar-image ring-1 ring-indigo-100 dark:ring-indigo-400/30"
                      />
                    </span>
                  ) : (
                    <div className="avatar-shell flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold uppercase text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/30">
                      {initials}
                    </div>
                  )}
                  <div className="hidden text-left leading-tight sm:block">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {user?.name || "User"}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-rose-400/60 dark:hover:bg-rose-900/40 dark:hover:text-rose-200"
                aria-label="Logout"
              >
                <LuLogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
