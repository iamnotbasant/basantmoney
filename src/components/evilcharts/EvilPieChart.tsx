import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface EvilPieChartProps {
  data: any[];
  children: React.ReactNode;
  className?: string;
  height?: number | string;
}

export function EvilPieChart({
  data,
  children,
  className = '',
  height = 240,
}: EvilPieChartProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          {children}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

EvilPieChart.Pie = function EvilPieChartPie({
  data,
  dataKey = 'value',
  nameKey = 'name',
  innerRadius = 60,
  outerRadius = 90,
  paddingAngle = 6,
  cornerRadius = 8,
  colors = ['#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#64748B'],
}: {
  data: any[];
  dataKey?: string;
  nameKey?: string;
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  cornerRadius?: number;
  colors?: string[];
}) {
  return (
    <Pie
      data={data}
      dataKey={dataKey}
      nameKey={nameKey}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      paddingAngle={paddingAngle}
      cornerRadius={cornerRadius}
      cx="50%"
      cy="50%"
      stroke="none"
    >
      {data.map((_, idx) => (
        <Cell key={idx} fill={colors[idx % colors.length]} />
      ))}
    </Pie>
  );
};

EvilPieChart.Tooltip = function EvilPieChartTooltip() {
  return (
    <Tooltip
      content={({ active, payload }) => {
        if (active && payload && payload.length) {
          const item = payload[0];
          return (
            <div className="p-3 bg-popover/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-border/80 dark:border-white/10 rounded-2xl shadow-2xl text-xs space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload?.fill || item.color }} />
                {item.name}:
              </span>
              <p className="font-mono font-bold text-foreground pl-4">
                ₹{Number(item.value).toLocaleString()}
              </p>
            </div>
          );
        }
        return null;
      }}
    />
  );
};

export default EvilPieChart;
