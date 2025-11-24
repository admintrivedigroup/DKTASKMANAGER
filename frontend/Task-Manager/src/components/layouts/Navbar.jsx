import React, { useCallback, useContext } from "react";
import { LuLogOut, LuMoonStar, LuSun } from "react-icons/lu";
import NotificationBell from "../Notifications/NotificationBell";
import logo from "../../assets/images/logo.png";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext.jsx";
import { useLayoutContext } from "../../context/layoutContext.jsx";

const Navbar = () => {
  const navigate = useNavigate();
  const { clearUser } = useContext(UserContext);
  const { isDarkMode, toggleDarkMode, resetThemePreference } = useLayoutContext();

  const handleThemeToggle = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

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

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all duration-200">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
           <div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
             <img
                src={logo}
                srcSet={`${logo} 1x, ${logo} 2x`}
                sizes="44px"
                alt="Task Manager logo"
                loading="eager"
                decoding="async"
                className="h-6 w-6 object-contain"
              />
           </div>
            <div className="hidden md:flex flex-col justify-center">
             <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 leading-none mb-0.5">
                Task Manager
              </p>
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                RAVAL & TRIVEDI ASSOCIATES
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
              aria-label="Logout"
            >
              <LuLogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>          
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;