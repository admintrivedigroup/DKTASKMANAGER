import React, { useMemo } from "react";
import { LuMoonStar, LuSun } from "react-icons/lu";
import { useLayoutContext } from "../context/layoutContext.jsx";

const buttonBaseClasses =
  "group relative flex items-center justify-center rounded-full border text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:text-primary dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:text-indigo-200";

const ThemeToggle = ({ placement = "inline", labelHidden = true }) => {
  const { isDarkMode, toggleDarkMode } = useLayoutContext();
  const ThemeIcon = isDarkMode ? LuSun : LuMoonStar;

  const ariaLabel = useMemo(
    () => (isDarkMode ? "Switch to light mode" : "Switch to dark mode"),
    [isDarkMode]
  );

  const classes =
    placement === "floating"
      ? `${buttonBaseClasses} fixed bottom-5 right-5 z-50 h-12 w-12 border-slate-200/80 bg-white/80 backdrop-blur-md dark:bg-slate-900/80`
      : `${buttonBaseClasses} h-11 w-11 border-slate-200/80 bg-white/80`;

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      aria-label={ariaLabel}
      aria-pressed={isDarkMode}
      className={classes}
    >
      <ThemeIcon className="text-xl transition-transform duration-200 group-active:scale-95" />
      {labelHidden ? <span className="sr-only">{ariaLabel}</span> : null}
    </button>
  );
};

export default ThemeToggle;
