import React, { createContext, useContext } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';

interface EvilChartContextType {
  data: any[];
  config?: Record<string, { label?: string; color?: string }>;
}

const EvilChartContext = createContext<EvilChartContextType>({ data: [] });

export interface EvilAreaChartProps {
  data: any[];
  config?: Record<string, { label?: string; color?: string }>;
  children: React.ReactNode;
  className?: string;
  height?: number | string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  onMouseMove?: (e: any) => void;
  onMouseLeave?: () => void;
}

export function EvilAreaChart({
  data,
  config,
  children,
  className = '',
  height = 320,
  margin = { top: 15, right: 15, left: -10, bottom: 0 },
  onMouseMove,
  onMouseLeave,
}: EvilAreaChartProps) {
  return (
    <EvilChartContext.Provider value={{ data, config }}>
      <div className={`w-full ${className}`} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={data}
            margin={margin}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
          >
            <defs>
              {/* EvilCharts Signature Gradients */}
              <linearGradient id="evil-emerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="evil-rose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="evil-cyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="evil-purple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            {children}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </EvilChartContext.Provider>
  );
}

// Subcomponents (Compound Pattern)
EvilAreaChart.Grid = function EvilAreaChartGrid({
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

EvilAreaChart.XAxis = function EvilAreaChartXAxis({
  dataKey = 'date',
  className = 'text-xs text-muted-foreground font-mono',
  tickFormatter,
}: {
  dataKey?: string;
  className?: string;
  tickFormatter?: (val: any) => string;
}) {
  return (
    <XAxis
      dataKey={dataKey}
      tickLine={false}
      axisLine={false}
      tick={{ fontSize: 11 }}
      className={className}
      tickFormatter={tickFormatter}
    />
  );
};

EvilAreaChart.YAxis = function EvilAreaChartYAxis({
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

EvilAreaChart.Tooltip = function EvilAreaChartTooltip({
  formatter,
}: {
  formatter?: (val: any) => string;
}) {
  return (
    <Tooltip
      content={({ active, payload, label }) => {
        if (active && payload && payload.length) {
          return (
            <div className="p-3 bg-popover/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-border/80 dark:border-white/10 rounded-2xl shadow-2xl space-y-1.5 text-xs animate-fade-in">
              <p className="font-semibold text-foreground font-mono text-[11px] pb-1 border-b border-border/40">
                {label}
              </p>
              {payload.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}:
                  </span>
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

EvilAreaChart.Area = function EvilAreaChartArea({
  dataKey,
  stroke = '#10B981',
  fill = 'url(#evil-emerald)',
  strokeWidth = 2.5,
  name,
}: {
  dataKey: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  name?: string;
}) {
  return (
    <Area
      type="monotone"
      dataKey={dataKey}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fillOpacity={1}
      fill={fill}
      name={name || dataKey}
    />
  );
};

EvilAreaChart.Brush = function EvilAreaChartBrush({
  dataKey = 'date',
  stroke = '#6366F1',
  height = 24,
}: {
  dataKey?: string;
  stroke?: string;
  height?: number;
}) {
  return (
    <Brush
      dataKey={dataKey}
      height={height}
      stroke={stroke}
      fill="transparent"
      className="opacity-70 dark:opacity-40"
    />
  );
};

export default EvilAreaChart;
