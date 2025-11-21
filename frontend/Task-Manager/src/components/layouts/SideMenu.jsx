import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  SIDE_MENU_DATA,
  SIDE_MENU_USER_DATA,
  SIDE_MENU_CLIENT_DATA,
} from "../../utils/data";
import { UserContext } from "../../context/userContext.jsx";
import { FaUser } from "react-icons/fa6";
import { LuUserCog } from "react-icons/lu";
import {
  getRoleLabel,
  hasPrivilegedAccess,
  normalizeRole,
  resolvePrivilegedPath,  
} from "../../utils/roleUtils";

const SideMenu = ({ activeMenu }) => {
  const { user } = useContext(UserContext);
  const [sideMenuData, setSideMenuData] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const normalizedLocationPath =
    typeof location.pathname === "string"
      ? location.pathname.replace(/\/+$/, "") || "/"
      : "/";
  const normalizedActiveMenu =
    typeof activeMenu === "string" ? activeMenu.trim().toLowerCase() : "";

  const handleClick = (route) => {
    if (typeof route !== "string") {
      return;
    }

    const trimmedRoute = route.trim();

    if (!trimmedRoute) {
      return;
    }

    navigate(trimmedRoute);
  };
  
  const normalizedGender = useMemo(() => {
    if (typeof user?.gender !== "string") {
      return "";
    }

    return user.gender.trim().toLowerCase();
  }, [user?.gender]);

  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const isPrivilegedUser = hasPrivilegedAccess(normalizedRole);
  const roleBadgeLabel = getRoleLabel(normalizedRole);
  const profileSettingsPath = useMemo(() => {
    if (!user) {
      return "";
    }

    if (isPrivilegedUser) {
      return resolvePrivilegedPath("/admin/profile-settings", normalizedRole);
    }

    if (normalizedRole === "client") {
      return "/client/profile-settings";
    }

    return "/user/profile-settings";
  }, [isPrivilegedUser, normalizedRole, user]);  

  useEffect(() => {
    if (!user) {
      setSideMenuData([]);
    } else if (isPrivilegedUser) {
      setSideMenuData(
        SIDE_MENU_DATA.map((item) => {
          if (!item?.path || item.path === "logout") {
            return item;
          }

          return {
            ...item,
            path: resolvePrivilegedPath(item.path, normalizedRole),
          };
        })
      );
    } else if (normalizedRole === "client") {
      setSideMenuData(SIDE_MENU_CLIENT_DATA);      
    } else {
      setSideMenuData(SIDE_MENU_USER_DATA);
    }

    return () => {};
  }, [isPrivilegedUser, normalizedRole, user]);

  return (
    <aside className="relative w-full overflow-hidden rounded-[26px] border border-white/50 bg-white/75 p-6 shadow-[0_24px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/60 dark:bg-slate-900/60 dark:shadow-[0_26px_60px_rgba(2,6,23,0.55)] lg:sticky lg:top-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.08),_transparent_65%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.18),_transparent_60%)]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_60%)] dark:bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.2),_transparent_55%)]" />

      <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/50 bg-white/60 px-4 py-5 text-center shadow-inner transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200">
        {profileSettingsPath && (
          <button
            type="button"
            onClick={() => handleClick(profileSettingsPath)}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/80 text-slate-500 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/80"
            aria-label="Open profile settings"
          >
            <LuUserCog className="h-4 w-4" />
          </button>
        )}
        <div className="relative">
        <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-to-tr from-primary/30 to-cyan-200/30 blur-xl" />
        {user?.profileImageUrl 
        ? <img
            src={user?.profileImageUrl || ""}
            alt="Profile Image"
            className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg shadow-primary/20"
          /> : <FaUser
            className={`text-4xl ${
              normalizedGender === "female"
                ? "text-rose-300 drop-shadow-[0_12px_24px_rgba(244,114,182,0.25)]"
                : normalizedGender === "male"
                ? "text-primary drop-shadow-[0_12px_24px_rgba(79,70,229,0.25)]"
                : "text-indigo-200 drop-shadow-[0_10px_20px_rgba(79,70,229,0.18)]"
            }`}
          />}
        </div>

        {isPrivilegedUser && roleBadgeLabel && (
          <div className="mt-3 rounded-full bg-gradient-to-r from-primary via-indigo-500 to-sky-400 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white shadow-md">
            {roleBadgeLabel}
          </div>
        )}

        <h5 className="mt-4 text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{user?.name || ""}</h5>
        <p className="text-xs text-slate-500 transition-colors duration-300 dark:text-slate-400">{user?.email || ""}</p>
      </div>

      <nav className="mt-8 space-y-1.5">
        {(Array.isArray(sideMenuData)
          ? sideMenuData.filter((menu) => menu && typeof menu.label === "string")
          : []
        ).map((item, index) => {
          const Icon = item.icon;

          const normalizedLabel =
            typeof item.label === "string" ? item.label.trim().toLowerCase() : "";
          const normalizedPath =
            typeof item.path === "string"
              ? item.path.trim().replace(/\/+$/, "") || "/"
              : "";

          const isActiveLabel =
            normalizedActiveMenu && normalizedLabel && normalizedActiveMenu === normalizedLabel;
          const isActivePath =
            normalizedPath && normalizedPath !== "logout" && normalizedLocationPath === normalizedPath;

          const isActive = isActiveLabel || isActivePath;

          return (
            <button
              key={`menu_${index}`}
              className={`group flex w-full items-center gap-4 cursor-pointer rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-transparent bg-gradient-to-r from-primary/90 via-indigo-500 to-sky-400 text-white shadow-[0_18px_40px_rgba(59,130,246,0.35)]"
                  : "border-white/60 bg-white/60 text-slate-600 shadow-[0_12px_24px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:bg-blue-50/70 hover:text-primary dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:text-indigo-300"
              }`}
              onClick={() => handleClick(item?.path)}
            >
              {Icon && (
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-base transition ${
                    isActive
                      ? "border-white/40 bg-white/20 text-white"
                      : "border-slate-200 bg-white/80 text-primary/70 group-hover:border-primary/30 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-indigo-200"
                  }`}
                >
                  <Icon />
                </span>
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default SideMenu;
