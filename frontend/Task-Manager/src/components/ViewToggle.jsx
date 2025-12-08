import React from "react";
import { LuLayoutGrid, LuList } from "react-icons/lu";

const ViewToggle = ({ value = "grid", onChange, className = "" }) => {
  const handleSelect = (mode) => {
    if (value === mode) {
      return;
    }

    if (typeof onChange === "function") {
      onChange(mode);
    }
  };

  const getButtonClasses = (mode) => {
    const isActive = value === mode;
    const baseClasses =
      "flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition";

    if (isActive) {
      return (
        baseClasses +
        " bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)] dark:bg-indigo-500 dark:shadow-indigo-900/50"
      );
    }

    return (
      baseClasses +
      " text-slate-500 hover:text-slate-700 focus-visible:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 dark:focus-visible:text-white"
    );
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:shadow-slate-950/40 ${className}`}
      role="group"
      aria-label="Toggle view"
    >
      <button
        type="button"
        className={getButtonClasses("grid")}
        onClick={() => handleSelect("grid")}
        aria-pressed={value === "grid"}
      >
        <LuLayoutGrid className="text-base" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        type="button"
        className={getButtonClasses("list")}
        onClick={() => handleSelect("list")}
        aria-pressed={value === "list"}
      >
        <LuList className="text-base" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
};

export default ViewToggle;
