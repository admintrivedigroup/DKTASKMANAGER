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
    <aside className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {user?.profileImageUrl ? (
              <img
                src={user?.profileImageUrl || ""}
                alt="Profile"
                className="h-12 w-12 rounded-full border-2 border-white shadow-sm object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <FaUser className="text-xl" />
              </div>
            )}
            {profileSettingsPath && (
              <button
                onClick={() => handleClick(profileSettingsPath)}
                className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
              >
                <LuUserCog className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-sm font-semibold text-slate-900 truncate">{user?.name || "User"}</h5>
            <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
            {isPrivilegedUser && roleBadgeLabel && (
              <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                {roleBadgeLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
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
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={() => handleClick(item?.path)}
            >
              {Icon && (
                <span className={`text-lg ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"}`}>
                  <Icon />
                </span>
              )}
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default SideMenu;
