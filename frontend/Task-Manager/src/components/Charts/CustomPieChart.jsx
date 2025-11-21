import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import CustomTooltip from "./CustomTooltip";
import CustomLegend from "./CustomLegend";

const CustomPieChart = React.memo(({ data = [], colors = [] }) => {
  const sanitizedData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        count: Number(item?.count) || 0
      })),
    [data]
  );

  const pieCells = useMemo(
    () =>
      sanitizedData.map((entry, index) => (
        <Cell
          key={`cell-${entry.status ?? index}`}
          fill={colors[index % colors.length]}
        />
      )),
    [colors, sanitizedData]
  );

  return (
    <ResponsiveContainer width="100%" height={325}>
      <PieChart>
        <Pie
          data={sanitizedData}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={130}
          innerRadius={100}
          labelLine={false}
          isAnimationActive={sanitizedData.length > 0}
          animationDuration={600}
          animationBegin={0}
        >
          {pieCells}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
});

export default CustomPieChart;