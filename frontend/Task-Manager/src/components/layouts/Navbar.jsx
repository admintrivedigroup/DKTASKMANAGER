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
    <header className="app-header sticky top-0 z-30 border-b border-white/30 bg-white/70 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-[0_20px_40px_rgba(2,6,23,0.6)]">
      <div className="flex w-full items-center gap-4 px-4 py-4 transition-colors duration-300 sm:gap-6 lg:px-8">
        <div className="flex flex-1 items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
           <img
              src={logo}
              srcSet={`${logo} 1x, ${logo} 2x`}
              sizes="44px"
              alt="Task Manager logo"
              loading="eager"
              decoding="async"
              className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-lg shadow-primary/30"
              style={{ imageRendering: "-webkit-optimize-contrast" }}
            />
            <div>
             <p className="app-header-subtitle text-xs font-semibold uppercase tracking-[0.32em] text-primary/70 dark:text-indigo-300/80">
                Task Manager
              </p>
              <h1 className="app-header-title text-lg font-semibold text-slate-900 transition-colors duration-300 sm:text-xl dark:text-slate-100">
                RAVAL & TRIVEDI ASSOCIATES
              </h1>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="theme-toggle inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/60 text-slate-600 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/90 hover:to-sky-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
            aria-label={isDarkMode ? "Activate light mode" : "Activate dark mode"}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <LuSun className="h-5 w-5" /> : <LuMoonStar className="h-5 w-5" />}
          </button>
          <NotificationBell />
          <button
            type="button"
            onClick={handleLogout}
            className="hidden h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-white/80 px-4 text-sm font-semibold uppercase tracking-[0.26em] text-rose-500 transition hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 dark:border-rose-500/40 dark:bg-slate-900/70 dark:text-rose-300 dark:hover:bg-rose-500/80 sm:inline-flex"
            aria-label="Logout"
          >
            <LuLogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>          
        </div>
      </div>
    </header>
  );
};

export default Navbar;