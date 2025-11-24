import React, { useCallback, useContext } from "react";
import { LuLogOut, LuMoonStar, LuSun } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Notifications/NotificationBell";
import logo from "../../assets/images/logo.png";
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

  const ThemeIcon = isDarkMode ? LuSun : LuMoonStar;
  const themeLabel = isDarkMode ? "Switch to light mode" : "Switch to dark mode";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-md shadow-sm transition-all duration-200 dark:border-slate-800/70 dark:bg-slate-900/85">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10">
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
            <div className="hidden flex-col justify-center md:flex">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 leading-none dark:text-indigo-300">
                Task Manager
              </p>
              <h1 className="text-sm font-bold leading-none text-slate-900 dark:text-white">
                RAVAL & TRIVEDI ASSOCIATES
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleThemeToggle}
              aria-label={themeLabel}
              aria-pressed={isDarkMode}
              className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:text-primary dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:text-indigo-200"
            >
              <ThemeIcon className="text-xl transition-transform duration-200 group-active:scale-95" />
              <span className="sr-only">{themeLabel}</span>
            </button>

            <NotificationBell />
            <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 sm:flex"
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
