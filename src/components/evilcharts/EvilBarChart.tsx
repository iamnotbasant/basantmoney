import React, { createContext } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface EvilBarChartProps {
  data: any[];
  children: React.ReactNode;
  className?: string;
  height?: number | string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
}

export function EvilBarChart({
  data,
  children,
  className = '',
  height = 260,
  margin = { top: 10, right: 10, left: -10, bottom: 0 },
}: EvilBarChartProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={margin}>
          {children}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

EvilBarChart.Grid = function EvilBarChartGrid({
  strokeDasharray = '3 3',
  className = 'stroke-border/40 dark:stroke-zinc-800/60',
  vertical = false,
}: {
  strokeDasharray?: string;
  className?: string;
  vertical?: boolean;
}) {
  return (
    <CartesianGrid
      strokeDasharray={strokeDasharray}
      stroke="currentColor"
      className={className}
      vertical={vertical}
    />
  );
};

EvilBarChart.XAxis = function EvilBarChartXAxis({
  dataKey = 'name',
  className = 'text-xs text-muted-foreground font-mono',
}: {
  dataKey?: string;
  className?: string;
}) {
  return (
    <XAxis
      dataKey={dataKey}
      tickLine={false}
      axisLine={false}
      tick={{ fontSize: 11 }}
      className={className}
    />
  );
};

EvilBarChart.YAxis = function EvilBarChartYAxis({
  className = 'text-xs text-muted-foreground font-mono',
  tickFormatter = (val) => `₹${val > 999 ? `${(val / 1000).toFixed(0)}k` : val}`,
}: {
  className?: string;
  tickFormatter?: (val: any) => string;
}) {
  return (
    <YAxis
      tickLine={false}
      axisLine={false}
      tick={{ fontSize: 11 }}
      className={className}
      tickFormatter={tickFormatter}
    />
  );
};

EvilBarChart.Tooltip = function EvilBarChartTooltip() {
  return (
    <Tooltip
      content={({ active, payload, label }) => {
        if (active && payload && payload.length) {
          return (
            <div className="p-3 bg-popover/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-border/80 dark:border-white/10 rounded-2xl shadow-2xl text-xs space-y-1">
              <p className="font-semibold text-foreground font-mono">{label}</p>
              {payload.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className="font-medium text-muted-foreground">{entry.name}:</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{Number(entry.value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          );
        }
        return null;
      }}
    />
  );
};

EvilBarChart.Bar = function EvilBarChartBar({
  dataKey,
  fill = '#10B981',
  radius = [6, 6, 0, 0],
  name,
  colors,
}: {
  dataKey: string;
  fill?: string;
  radius?: [number, number, number, number];
  name?: string;
  colors?: string[];
}) {
  return (
    <Bar dataKey={dataKey} fill={fill} radius={radius} name={name || dataKey}>
      {colors && colors.map((c, i) => <Cell key={i} fill={c} />)}
    </Bar>
  );
};

export default EvilBarChart;
