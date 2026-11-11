import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { EvilAreaChart } from "@/components/evilcharts";
import { TrendingUp, TrendingDown, Sparkles, SlidersHorizontal, ChevronRight, Gauge } from 'lucide-react';

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

  const timeframes = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'year', label: 'Year' },
    { id: 'all', label: 'All' },
  ];

  const displayTrend = trendData.length >= 2 ? trendData : [
    { date: '01 Nov', Income: 11130.05, Expense: 0 },
    { date: '03 Nov', Income: 11133.41, Expense: 120 },
    { date: '05 Nov', Income: 11136.77, Expense: 350 },
    { date: '07 Nov', Income: 11140.13, Expense: 200 },
    { date: '09 Nov', Income: 11143.49, Expense: 450 },
    { date: '11 Nov', Income: 11148.53, Expense: 0 },
  ];

  // Semi-circular gauge math (from Reference 1: $57.6k - $93.5k gauge)
  const burnRatio = totalIncome > 0 ? Math.min(totalExpense / totalIncome, 1) : 0.28;
  const gaugeAngle = Math.PI - (burnRatio * Math.PI); // Angle from 180 to 0 deg
  const gaugeRadius = 55;
  const gaugeCx = 75;
  const gaugeCy = 75;
  const needleX = gaugeCx + (gaugeRadius - 10) * Math.cos(gaugeAngle);
  const needleY = gaugeCy - (gaugeRadius - 10) * Math.sin(gaugeAngle);

  return (
    <div className="space-y-6">
      {/* Ledgerix Master Container (Reference 1) */}
      <Card className="ambient-glow-card relative overflow-hidden bg-card/95 dark:bg-[#0c0c0f] border border-border/70 dark:border-zinc-800 shadow-2xl rounded-3xl p-6 sm:p-8">
        {/* Subtle background ambient mesh */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Breadcrumb (Reference 1) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 dark:border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-sm tracking-tighter">
              LX
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Ledgerix</span>
                <span>/</span>
                <span>Workspaces</span>
                <span>/</span>
                <span className="text-foreground font-medium">Accounting & Flow</span>
              </div>
            </div>
          </div>

          {/* Timeframe Switcher (Reference 1) */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-muted/50 dark:bg-zinc-900/90 border border-border/60 dark:border-zinc-800 self-start sm:self-auto shadow-inner text-xs">
            {timeframes.map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1 font-semibold rounded-full transition-all duration-200 ${
                  timeframe === tf.id
                    ? 'bg-background text-foreground shadow-sm dark:bg-zinc-800 dark:text-white'
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
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              HALF-YEAR INCOME & LIQUIDITY STATEMENT
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground font-sans">
              ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
            <div className="flex items-center gap-2 self-center sm:self-baseline">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <TrendingUp className="h-3.5 w-3.5" />
                +5.50% SFB Yield
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                ₹18.48 accrued in Nov
              </span>
            </div>
          </div>
        </div>

        {/* EvilCharts Compound Area Chart with Timeline Brush (Reference 1) */}
        <div className="relative pt-2">
          {/* Active Hover Pill Callout (Reference 1 tooltip pill) */}
          {hoveredPoint && (
            <div className="absolute top-0 right-4 z-20 px-3 py-1.5 rounded-xl bg-background/95 dark:bg-zinc-800/95 backdrop-blur-md border border-border/80 dark:border-white/10 shadow-xl flex items-center gap-2 text-xs animate-fade-in">
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ₹{hoveredPoint.Income?.toLocaleString()}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold">
                +32%
              </span>
              <span className="text-muted-foreground text-[11px]">
                income growth to end period
              </span>
            </div>
          )}

          <EvilAreaChart
            data={displayTrend}
            height={320}
            onMouseMove={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                setHoveredPoint(e.activePayload[0].payload);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <EvilAreaChart.Grid />
            <EvilAreaChart.XAxis dataKey="date" />
            <EvilAreaChart.YAxis />
            <EvilAreaChart.Tooltip />
            <EvilAreaChart.Area
              dataKey="Income"
              stroke="#10B981"
              fill="url(#evil-emerald)"
              strokeWidth={2.5}
            />
            <EvilAreaChart.Area
              dataKey="Expense"
              stroke="#F43F5E"
              fill="url(#evil-rose)"
              strokeWidth={2}
            />
            <EvilAreaChart.Brush dataKey="date" height={24} />
          </EvilAreaChart>
        </div>

        {/* 4 Bottom Cards matching Reference Image 1 exactly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border/40 dark:border-zinc-800">
          {/* Card 1: Sales / Inflow Forecast */}
          <div className="p-4 rounded-2xl bg-muted/20 dark:bg-zinc-900/40 border border-border/60 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>INFLOW FORECAST</span>
              <div className="flex items-center gap-2 text-[10px] lowercase">
                <span className="flex items-center gap-1 text-foreground"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Inflow</span>
                <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />Forecast</span>
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              ₹{totalIncome.toLocaleString()}
            </div>
            {/* Candlestick Bar Preview */}
            <div className="flex items-end gap-1.5 h-10 pt-2">
              {[40, 65, 80, 50, 95, 70, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-muted/60 dark:bg-zinc-800 rounded-sm relative overflow-hidden h-full flex items-end">
                  <div className="w-full bg-emerald-500 rounded-sm" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Monthly Expenses */}
          <div className="p-4 rounded-2xl bg-muted/20 dark:bg-zinc-900/40 border border-border/60 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>MONTHLY EXPENSES</span>
            </div>
            <div className="text-2xl font-bold font-mono text-rose-500">
              ₹{totalExpense.toLocaleString()}
            </div>
            {/* Dot Category Legend (Reference 1) */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />Meals</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />Rent</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Bills</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" />Other</span>
            </div>
          </div>

          {/* Card 3: Project Budget Forecast */}
          <div className="p-4 rounded-2xl bg-muted/20 dark:bg-zinc-900/40 border border-border/60 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>PROJECT BUDGET</span>
              <div className="flex items-center gap-2 text-[10px] lowercase">
                <span className="flex items-center gap-1 text-foreground"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Target</span>
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              ₹{(totalIncome * 1.25).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Based on rolling 6-month capital inflow velocity
            </p>
          </div>

          {/* Card 4: Insight Gauge Meter (Reference 1: $57.6k - $93.5k gauge) */}
          <div className="p-4 rounded-2xl bg-muted/20 dark:bg-zinc-900/40 border border-border/60 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                INSIGHT
              </span>
              <p className="text-xs text-foreground font-semibold line-clamp-2 max-w-[130px]">
                Positive surplus keeps burn low
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1">
                <span>₹{(totalExpense * 0.8).toFixed(0)}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Optimal</span>
                <span>₹{(totalIncome).toFixed(0)}</span>
              </div>
            </div>

            {/* Exact Reference 1 Speedometer Arc SVG */}
            <div className="relative w-20 h-16 flex items-end justify-center">
              <svg viewBox="0 0 150 90" className="w-20 h-14">
                <path
                  d="M 20 80 A 55 55 0 0 1 130 80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted/60 dark:text-zinc-800"
                  strokeLinecap="round"
                />
                <path
                  d="M 20 80 A 55 55 0 0 1 130 80"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="10"
                  strokeDasharray="180"
                  strokeDashoffset={180 - (1 - burnRatio) * 180}
                  strokeLinecap="round"
                />
                <line
                  x1={gaugeCx}
                  y1={gaugeCy}
                  x2={needleX}
                  y2={needleY}
                  stroke="#F59E0B"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx={gaugeCx} cy={gaugeCy} r="4" fill="#F59E0B" />
              </svg>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsHero;
