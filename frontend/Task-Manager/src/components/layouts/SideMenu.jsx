import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { UserContext } from "../../context/userContext.jsx";
import { FaUser } from "react-icons/fa6";
import { LuUserCog } from "react-icons/lu";
import {
  getRoleLabel,
  hasPrivilegedAccess,
  normalizeRole,
  resolvePrivilegedPath,  
} from "../../utils/roleUtils";

const SideMenu = ({ activeMenu, collapsed = false }) => {
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
    } else {
      setSideMenuData(SIDE_MENU_USER_DATA);
    }

    return () => {};
  }, [isPrivilegedUser, normalizedRole, user]);

  return (
    <aside className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Sidebar header - hide text when collapsed */}
      <div className={`border-b border-slate-100 bg-slate-50/50 transition-all duration-300 ${collapsed ? 'p-3' : 'p-6'}`}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 group">
            {user?.profileImageUrl ? (
              <img
                src={user?.profileImageUrl || ""}
                alt="Profile"
                className="h-12 w-12 rounded-full border-2 border-white shadow-sm object-cover ring-2 ring-slate-100"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 ring-2 ring-indigo-50">
                <FaUser className="text-xl" />
              </div>
            )}
            {profileSettingsPath && (
              <button
                onClick={() => handleClick(profileSettingsPath)}
                className="absolute -bottom-1 -right-1 h-7 w-7 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                title="Profile Settings"
              >
                <LuUserCog className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h5 className="text-sm font-bold text-slate-900 truncate">{user?.name || "User"}</h5>
              <p className="text-xs text-slate-500 truncate mb-1">{user?.email || ""}</p>
              {isPrivilegedUser && roleBadgeLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {roleBadgeLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
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
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
              } ${collapsed ? 'justify-center' : ''}`}
              onClick={() => handleClick(item?.path)}
              title={collapsed ? item.label : ''}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-l-lg"></div>
              )}
              
              {Icon && (
                <span className={`text-lg transition-colors duration-200 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"}`}>
                  <Icon />
                </span>
              )}
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <p className="text-[10px] text-center text-slate-400">
          v1.0.0 • Vijay Trivedi Group
        </p>
      </div>
    </aside>
  );
};

export default SideMenu;
