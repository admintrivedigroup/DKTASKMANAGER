import React, { useCallback, useContext } from "react";
import { LuLogOut } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Notifications/NotificationBell";
import logo from "../../assets/images/logo.png";
import { UserContext } from "../../context/userContext.jsx";
import { useLayoutContext } from "../../context/layoutContext.jsx";
import ThemeToggle from "../ThemeToggle.jsx";

const Navbar = () => {
  const navigate = useNavigate();
  const { clearUser } = useContext(UserContext);
  const { resetThemePreference } = useLayoutContext();

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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/92 backdrop-blur-xl shadow-[0_14px_44px_rgba(17,25,40,0.08)] transition-all duration-200 dark:border-slate-800/70 dark:bg-slate-900/80">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              srcSet={`${logo} 1x, ${logo} 2x`}
              sizes="72px"
              alt="Task Manager logo"
              loading="eager"
              decoding="async"
              className="h-[72px] w-[72px] object-contain drop-shadow-sm"
            />
            <div className="hidden flex-col justify-center leading-tight md:flex">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-600/80 dark:text-indigo-200/80">
                Task Manager
              </p>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">
                Vijay Trivedi Group
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            <NotificationBell />
            <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:border-indigo-500/60 sm:flex"
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
