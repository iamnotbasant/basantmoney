import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Brush,
} from 'recharts';
import { TrendingUp, TrendingDown, Sparkles, SlidersHorizontal, Maximize2, Gauge } from 'lucide-react';

interface AnalyticsHeroProps {
  netBalance: number;
  totalIncome: number;
  totalExpense: number;
  trendData: { date: string; Income: number; Expense: number }[];
  timeframe: string;
  setTimeframe: (tf: string) => void;
}

export const AnalyticsHero: React.FC<AnalyticsHeroProps> = ({
  netBalance,
  totalIncome,
  totalExpense,
  trendData,
  timeframe,
  setTimeframe,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  // Timeframe options matching Image 1 Ledgerix
  const timeframes = [
    { id: 'all', label: 'All' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'year', label: 'Year' },
  ];

  // Fallback data if trendData has fewer than 3 items
  const displayTrend = trendData.length >= 2 ? trendData : [
    { date: '01 Nov', Income: 11130.05, Expense: 0 },
    { date: '03 Nov', Income: 11133.41, Expense: 120 },
    { date: '05 Nov', Income: 11136.77, Expense: 350 },
    { date: '07 Nov', Income: 11140.13, Expense: 200 },
    { date: '09 Nov', Income: 11143.49, Expense: 450 },
    { date: '11 Nov', Income: 11148.53, Expense: 0 },
  ];

  // Semi-circular gauge math (from Image 1: $57.6k - $93.5k gauge)
  const burnRatio = totalIncome > 0 ? Math.min(totalExpense / totalIncome, 1) : 0.35;
  const gaugeAngle = Math.PI - (burnRatio * Math.PI); // Angle from 180 to 0 deg
  const gaugeRadius = 70;
  const gaugeCx = 90;
  const gaugeCy = 85;
  const needleX = gaugeCx + (gaugeRadius - 12) * Math.cos(gaugeAngle);
  const needleY = gaugeCy - (gaugeRadius - 12) * Math.sin(gaugeAngle);

  return (
    <div className="space-y-6">
      {/* Ledgerix Luxury Hero Container (Reference 1) */}
      <Card className="ambient-glow-card relative overflow-hidden bg-card/95 dark:bg-black/60 border border-border/80 shadow-2xl rounded-3xl p-6 sm:p-8">
        {/* Subtle background ambient mesh */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Analytics & Treasury</span>
              <span>/</span>
              <span className="text-foreground font-semibold">Ledger Flow</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Accounting & Cash Position
            </h1>
          </div>

          {/* Timeframe Pill Selector (Reference 1) */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 dark:bg-zinc-900 border border-border/60 self-start sm:self-auto shadow-inner">
            {timeframes.map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
                  timeframe === tf.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Huge Headline Typography (Reference 1: $1,651,045,139) */}
        <div className="my-8 text-center sm:text-left">
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase block mb-1">
            Net Capital Position
          </span>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-3">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground font-sans">
              ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="flex items-center gap-2 self-center sm:self-baseline">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <TrendingUp className="h-3.5 w-3.5" />
                +5.5% SFB Yield
              </span>
              <span className="text-xs text-muted-foreground">
                compounded daily
              </span>
            </div>
          </div>
        </div>

        {/* EvilCharts Dense Multi-Curve Area Chart with Brush Timeline (Reference 1) */}
        <div className="relative pt-2">
          {/* Active Hover Pill Callout (Reference 1 tooltip pill) */}
          {hoveredPoint && (
            <div className="absolute top-0 right-4 z-20 px-3 py-1.5 rounded-xl bg-background/90 dark:bg-zinc-800/90 backdrop-blur border border-border shadow-lg flex items-center gap-2 text-xs animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono font-bold text-foreground">
                Inflow: ₹{hoveredPoint.Income?.toLocaleString()}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono text-rose-500 font-semibold">
                Outflow: ₹{hoveredPoint.Expense?.toLocaleString()}
              </span>
            </div>
          )}

          <div className="h-[280px] sm:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayTrend}
                margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
                onMouseMove={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    setHoveredPoint(e.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  {/* EvilCharts Luxury Neon Gradients */}
                  <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-muted-foreground/10" vertical={false} />

                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  className="text-xs text-muted-foreground font-mono"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  className="text-xs text-muted-foreground font-mono"
                  tickFormatter={(val) => `₹${val > 999 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const inc = payload.find(p => p.dataKey === 'Income')?.value || 0;
                      const exp = payload.find(p => p.dataKey === 'Expense')?.value || 0;
                      return (
                        <div className="p-3 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl space-y-1 text-xs">
                          <p className="font-semibold text-foreground font-mono">{label}</p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Inflow:</span>
                            <span className="font-mono font-bold">₹{Number(inc).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-rose-500 font-medium">Outflow:</span>
                            <span className="font-mono font-bold">₹{Number(exp).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="Income"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#incomeArea)"
                />
                <Area
                  type="monotone"
                  dataKey="Expense"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#expenseArea)"
                />

                {/* Timeline Brush (Reference 1 mini slider) */}
                <Brush
                  dataKey="date"
                  height={24}
                  stroke="#6366F1"
                  fill="transparent"
                  className="opacity-70 dark:opacity-40"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Row of 4 Cards (Reference 1 bottom strip) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border/40">
          {/* Card 1: Inflow Velocity */}
          <div className="p-4 rounded-2xl bg-muted/30 dark:bg-zinc-900/50 border border-border/60 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Inflows
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₹{totalIncome.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Primary sources & daily yield
            </p>
          </div>

          {/* Card 2: Expense Burn */}
          <div className="p-4 rounded-2xl bg-muted/30 dark:bg-zinc-900/50 border border-border/60 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Outflows
            </span>
            <div className="text-2xl font-bold font-mono text-rose-500">
              ₹{totalExpense.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Controlled spending pattern
            </p>
          </div>

          {/* Card 3: Net Surplus */}
          <div className="p-4 rounded-2xl bg-muted/30 dark:bg-zinc-900/50 border border-border/60 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Net Surplus / Savings
            </span>
            <div className={`text-2xl font-bold font-mono ${totalIncome - totalExpense >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
              ₹{(totalIncome - totalExpense).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {totalIncome - totalExpense >= 0 ? 'Surplus capital retained' : 'Deficit burn'}
            </p>
          </div>

          {/* Card 4: Insight Gauge Meter (from Reference 1: $57.6k - $93.5k gauge) */}
          <div className="p-4 rounded-2xl bg-muted/30 dark:bg-zinc-900/50 border border-border/60 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Burn Gauge
              </span>
              <div className="text-sm font-bold text-foreground">
                {burnRatio < 0.5 ? 'Low Burn' : burnRatio < 0.8 ? 'Balanced' : 'High Burn'}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {(burnRatio * 100).toFixed(0)}% burn of inflows
              </p>
            </div>

            {/* Semi-circular Speedometer SVG */}
            <div className="relative w-24 h-16 flex items-end justify-center">
              <svg viewBox="0 0 180 100" className="w-24 h-14">
                {/* Background arc */}
                <path
                  d="M 20 90 A 70 70 0 0 1 160 90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="14"
                  className="text-muted/60"
                  strokeLinecap="round"
                />
                {/* Active progress arc */}
                <path
                  d="M 20 90 A 70 70 0 0 1 160 90"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="14"
                  strokeDasharray="220"
                  strokeDashoffset={220 - (1 - burnRatio) * 220}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
                {/* Needle */}
                <line
                  x1={gaugeCx}
                  y1={gaugeCy}
                  x2={needleX}
                  y2={needleY}
                  stroke="#F59E0B"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx={gaugeCx} cy={gaugeCy} r="5" fill="#F59E0B" />
              </svg>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsHero;
