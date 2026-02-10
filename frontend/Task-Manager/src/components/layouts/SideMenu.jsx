import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { UserContext } from "../../context/userContext.jsx";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { connectSocket } from "../../utils/socket";
import {
  hasPrivilegedAccess,
  normalizeRole,
  resolvePrivilegedPath,  
} from "../../utils/roleUtils";

const SideMenu = ({ activeMenu, collapsed = false }) => {
  const { user } = useContext(UserContext);
  const [sideMenuData, setSideMenuData] = useState([]);
  const [newTaskCount, setNewTaskCount] = useState(0);

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
  
  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const isPrivilegedUser = hasPrivilegedAccess(normalizedRole);

  const fetchNewTaskCount = useCallback(async () => {
    if (!user) {
      setNewTaskCount(0);
      return;
    }

    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_CHANNEL_NOTIFICATIONS_UNREAD
      );
      const nextCount = response.data?.unreadCount;
      setNewTaskCount(
        typeof nextCount === "number" && Number.isFinite(nextCount)
          ? Math.max(0, Math.floor(nextCount))
          : 0
      );
    } catch (error) {
      console.error("Failed to fetch channel notification count", error);
    }
  }, [user]);

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

  useEffect(() => {
    fetchNewTaskCount();
  }, [fetchNewTaskCount, location.pathname, location.search]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const socket = connectSocket();

    const handleTaskAssigned = () => {
      fetchNewTaskCount();
    };

    socket.on("task-assigned", handleTaskAssigned);

    return () => {
      socket.off("task-assigned", handleTaskAssigned);
    };
  }, [fetchNewTaskCount, user]);

  return (
    <aside className="w-full h-full rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_18px_48px_rgba(17,25,40,0.08)] backdrop-blur-sm overflow-hidden flex flex-col dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/40">
      <nav className="flex-1 overflow-y-auto p-3 pt-4 space-y-1.5 custom-scrollbar">
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

          const isTaskMenuItem =
            typeof normalizedPath === "string" &&
            normalizedPath.includes("/tasks");
          const showTaskBadge = isTaskMenuItem && newTaskCount > 0;

          return (
            <button
              key={`menu_${index}`}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-100 dark:ring-indigo-400/30"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              } ${collapsed ? 'justify-center' : ''}`}
              onClick={() => handleClick(item?.path)}
              title={collapsed ? item.label : ''}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-r-lg"></div>
              )}
              
              {Icon && (
                <span className={`relative text-lg transition-colors duration-200 ${isActive ? "text-indigo-600 dark:text-indigo-200" : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-300"}`}>
                  <Icon />
                  {collapsed && showTaskBadge && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </span>
              )}
              {!collapsed && (
                <>
                  <span className="relative z-10">{item.label}</span>
                  {showTaskBadge && (
                    <span className="ml-auto h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white/60 dark:ring-slate-900" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-100/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/70">
        <p className="text-[10px] text-center text-slate-400 tracking-[0.14em] dark:text-slate-500">
          v1.0.0 | Vijay Trivedi Group
        </p>
      </div>
    </aside>
  );
};

export default SideMenu;
