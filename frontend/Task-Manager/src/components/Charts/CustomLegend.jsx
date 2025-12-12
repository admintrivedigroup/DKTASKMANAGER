import React from "react";

const CustomLegend = ({ payload = [], isDarkMode = false }) => (
  <div className="mt-3 flex flex-wrap justify-center gap-3">
    {payload.map((entry, index) => (
      <div key={`legend-${index}`} className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/70 dark:ring-slate-700/70">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span
          className={`text-xs font-medium ${
            isDarkMode ? "text-slate-200" : "text-slate-700"
          }`}
        >
          {entry.value}
        </span>
      </div>
    ))}
  </div>
);

export default CustomLegend;
