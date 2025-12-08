import React from "react";

const CustomLegend = ({ payload = [], isDarkMode = false }) => (
  <div className="mt-4 flex flex-wrap justify-center gap-2 space-x-6">
    {payload.map((entry, index) => (
      <div key={`legend-${index}`} className="flex items-center space-x-2">
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
