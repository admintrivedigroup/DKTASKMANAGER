import React from "react";

const CustomTooltip = ({ active, payload, isDarkMode = false }) => {
  if (active && payload && payload.length) {
    const containerClasses = isDarkMode
      ? "rounded-lg border border-slate-700 bg-slate-900/90 p-3 shadow-lg shadow-slate-950/40"
      : "rounded-lg border border-slate-200 bg-white p-3 shadow-md";

    return (
      <div className={containerClasses}>
        <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-indigo-200">
          {payload[0].name || payload[0].payload?.priority}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-200">
          Count:{" "}
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {payload[0].value ?? payload[0].payload?.count}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
