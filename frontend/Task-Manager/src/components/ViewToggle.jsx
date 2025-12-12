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
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition justify-center";

    if (isActive) {
      return (
        baseClasses +
        " bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100 dark:bg-slate-800 dark:text-indigo-100 dark:ring-indigo-800/70"
      );
    }

    return (
      baseClasses +
      " text-slate-600 hover:bg-slate-50 hover:text-indigo-700 focus-visible:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-200 dark:focus-visible:text-indigo-200"
    );
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 ${className}`}
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
