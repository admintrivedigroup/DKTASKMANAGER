import React, { useContext, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LuLogOut } from "react-icons/lu";
import { UserContext } from "../../context/userContext.jsx";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import {
  hasPrivilegedAccess,
  normalizeRole,
  resolvePrivilegedPath,
} from "../../utils/roleUtils";
import { useLayoutContext } from "../../context/layoutContext.jsx";

const normalizePath = (path) => {
  if (typeof path !== "string") return "";
  return path.trim().replace(/\/+$/, "") || "/";
};

const MobileNavigation = () => {
  const { user, clearUser } = useContext(UserContext);
  const { closeMobileNav } = useLayoutContext();  
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedRole = normalizeRole(user?.role);

  const menuItems = useMemo(() => {
    if (!user) return [];

    const isPrivileged = hasPrivilegedAccess(normalizedRole);
    const source = isPrivileged ? SIDE_MENU_DATA : SIDE_MENU_USER_DATA;

    // Only include items with a valid path and exclude the "logout" pseudo-item
    return (source || [])
      .filter((item) => item?.path && item.path !== "logout")
      .map((item) => {
        if (!isPrivileged) {
          return item;
        }

        return {
          ...item,
          path: resolvePrivilegedPath(item.path, normalizedRole),
        };
      });
  }, [normalizedRole, user]);

  const currentPath = normalizePath(location.pathname);
  const shouldEnableScroll = menuItems.length > 4;

  const handleNavigation = useCallback(
    (path) => {
      if (path === "logout") {
        const confirmed = window.confirm("Are you sure you want to logout?");

        if (confirmed) {
          try {
            localStorage.clear();
          } catch {
            // ignore storage errors
          }
          clearUser?.();
          navigate("/login");
          closeMobileNav?.();          
        }
        return;
      }

      const normalizedDestination = normalizePath(path);
      if (normalizedDestination) {
        navigate(normalizedDestination);
        closeMobileNav?.();        
      }
    },
    [clearUser, closeMobileNav, navigate]
  );

  const isItemActive = useCallback(
    (path) => {
      const normalizedDestination = normalizePath(path);

      if (!normalizedDestination || normalizedDestination === "logout") {
        return false;
      }

      if (normalizedDestination === "/") {
        return currentPath === normalizedDestination;
      }

      return (
        currentPath === normalizedDestination ||
        currentPath.startsWith(`${normalizedDestination}/`)
      );
    },
    [currentPath]
  );

  const hasMenuItems = Boolean(user) && menuItems.length > 0;

  if (!hasMenuItems) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:hidden">
      <nav
        aria-label="Primary navigation"
        className="pointer-events-auto w-full rounded-t-[26px] border border-white/60 bg-white/95 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur transition-colors duration-300 dark:border-slate-800/60 dark:bg-slate-900/80 dark:shadow-[0_24px_50px_rgba(2,6,23,0.55)]"
        style={{
          paddingBottom: `max(0.75rem, env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <ul
          className={`mobile-nav-scroll flex items-stretch gap-2 ${
            shouldEnableScroll
              ? "overflow-x-auto pb-1"
              : "w-full justify-between"
          }`}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);
            const itemWrapperClass = shouldEnableScroll
              ? "flex-shrink-0"
              : "flex-1 flex";            

            return (
              <li key={item.path} className={itemWrapperClass}>
                <button
                  type="button"
                  onClick={() => handleNavigation(item.path)}
                  className={`flex h-full w-full min-w-[48px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] transition ${
                    active
                      ? "bg-gradient-to-r from-primary/90 via-indigo-500 to-sky-500 text-white shadow-[0_12px_24px_rgba(59,130,246,0.35)]"
                      : "text-slate-500 hover:text-primary dark:text-slate-300 dark:hover:text-indigo-300"
                  }`}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                         className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-lg transition ${
                      active
                        ? "border-white/40 bg-white/20 text-white"
                        : "border-slate-200 bg-white/80 text-primary/70 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-indigo-200"
                    }`}
                  >
                    {Icon ? <Icon /> : item.label?.slice(0, 1) || "•"}
                  </span>
                  <span className="sr-only">{item.label}</span>
                </button>
              </li>
            );
          })}

          {/* Logout */}
          <li className={shouldEnableScroll ? "flex-shrink-0" : "flex-1 flex"}>
            <button
              type="button"
              onClick={() => handleNavigation("logout")}
              className="flex h-full w-full min-w-[56px] flex-col items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-500 transition hover:text-rose-600 dark:text-rose-300 dark:hover:text-rose-200"
              aria-label="Logout"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-white/90 text-xl text-rose-500 transition-colors duration-300 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                <LuLogOut />
              </span>
              <span className="sr-only">Logout</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default MobileNavigation;
