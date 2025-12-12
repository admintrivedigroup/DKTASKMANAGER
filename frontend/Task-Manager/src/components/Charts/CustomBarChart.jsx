import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useLayoutContext } from "../../context/layoutContext.jsx";
import CustomTooltip from "./CustomTooltip";

const CustomBarChart = ({ data }) => {
  const { isDarkMode } = useLayoutContext();
  const safeData = Array.isArray(data) ? data : [];

  const getBarColor = (entry) => {
    switch (entry?.priority) {
      case "Low":
        return "#00BC7D";

      case "Medium":
        return "#FE9900";

      case "High":
        return "#FF1F57";

      default:
        return "#00BC7D";
    }
  };

  const axisColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(148,163,184,0.25)" : "#e2e8f0";

  const TooltipRenderer = (props) => (
    <CustomTooltip {...props} isDarkMode={isDarkMode} />
  );

  return (
    <div className="mt-4 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={safeData} barCategoryGap={28} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="priority"
            tick={{ fontSize: 12, fill: axisColor, fontWeight: 500 }}
            stroke="none"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: axisColor, fontWeight: 500 }}
            stroke="none"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />

          <Tooltip content={TooltipRenderer} cursor={{ fill: "transparent" }} />

          <Bar
            dataKey="count"
            nameKey="priority"
            radius={[12, 12, 12, 12]}
            maxBarSize={48}
            animationDuration={500}
          >
            {safeData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomBarChart;
