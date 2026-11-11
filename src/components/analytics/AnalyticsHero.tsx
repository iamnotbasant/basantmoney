import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { EvilAreaChart } from "@/components/evilcharts";
import { 
  TrendingUp, 
  Sparkles, 
  SlidersHorizontal, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Bell, 
  Settings, 
  Share2, 
  Zap, 
  Folder, 
  Home, 
  Briefcase, 
  Tag, 
  Building2, 
  MessageSquare,
  HelpCircle,
  Grid
} from 'lucide-react';

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
  const [useSampleData, setUseSampleData] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');

  // Exact sample figures from Reference 1: $1,651,045,139 vs live ledger
  const displayAmount = useSampleData ? 1651045139 : netBalance;
  const currencySymbol = useSampleData ? '$' : '₹';

  // Density waveform trend points matching Reference 1 (Mar-Apr active window)
  const referenceTrend = [
    { date: 'Jan', Income: 82000, Expense: 42000 },
    { date: 'Feb', Income: 95000, Expense: 51000 },
    { date: 'Mar', Income: 145000, Expense: 68000 },
    { date: 'Apr', Income: 115000, Expense: 62000 },
    { date: 'May', Income: 98000, Expense: 49000 },
    { date: 'Jun', Income: 104000, Expense: 55000 },
    { date: 'Jul', Income: 89000, Expense: 48000 },
    { date: 'Aug', Income: 92000, Expense: 46000 },
    { date: 'Sep', Income: 118000, Expense: 58000 },
  ];

  const chartData = useSampleData || trendData.length < 2 ? referenceTrend : trendData;

  // Semi-circular speedometer gauge math (Reference 1: $57.6k - $93.5k)
  const gaugeCx = 80;
  const gaugeCy = 75;
  const gaugeRadius = 55;
  const burnRatio = 0.65; // ~65% needle position
  const gaugeAngle = Math.PI - (burnRatio * Math.PI); // Angle from 180 to 0 rad
  const needleX = gaugeCx + (gaugeRadius - 10) * Math.cos(gaugeAngle);
  const needleY = gaugeCy - (gaugeRadius - 10) * Math.sin(gaugeAngle);

  return (
    <div className="space-y-4">
      {/* 1. macOS Safari Browser Chrome Window (Reference 1) */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-[#F4F5F7] dark:bg-[#0B0C0E] shadow-2xl overflow-hidden">
        {/* Safari Top Bar */}
        <div className="px-4 py-3 bg-[#E8E9EC] dark:bg-[#16171A] border-b border-zinc-300/80 dark:border-zinc-800 flex items-center justify-between text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>
            <div className="flex items-center gap-2 ml-4 text-xs font-medium">
              <ChevronLeft className="h-4 w-4 opacity-40 cursor-not-allowed" />
              <ChevronRight className="h-4 w-4 opacity-40 cursor-not-allowed" />
            </div>
          </div>

          {/* Browser Address Bar */}
          <div className="flex-1 max-w-md mx-4">
            <div className="flex items-center justify-center gap-2 py-1 px-4 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-sm">
              <span className="text-zinc-400">🔒</span>
              <span>https://ledgerix.com/accounting</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button 
              onClick={() => setUseSampleData(!useSampleData)}
              className="px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              {useSampleData ? 'Switch to Live Slice SFB' : 'Switch to Ref 1 Mockup'}
            </button>
            <Share2 className="h-3.5 w-3.5 cursor-pointer hover:text-foreground" />
            <span className="text-sm cursor-pointer">+</span>
          </div>
        </div>

        {/* 2. Ledgerix Web Application Body */}
        <div className="p-6 sm:p-8 bg-white dark:bg-[#0E0F12] text-zinc-900 dark:text-zinc-100 min-h-[700px] flex flex-col justify-between">
          <div>
            {/* Top Navigation Row (Reference 1) */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-black dark:fill-white">
                    <polygon points="12,2 22,20 2,20" />
                  </svg>
                </div>
                <span className="font-bold text-lg tracking-tight font-sans text-black dark:text-white">
                  Ledgerix
                </span>
              </div>

              {/* Center Icon Pills (Reference 1) */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 self-start lg:self-auto">
                <button className="p-2 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                  <Home className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-sm">
                  <Folder className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                  <Zap className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                  <Briefcase className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                  <Tag className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                  <Building2 className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>

              {/* Right Profile & Search */}
              <div className="flex items-center gap-3">
                <div className="relative hidden sm:block">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Type Client Name or ID..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs border border-zinc-200 dark:border-zinc-800 placeholder-zinc-400 focus:outline-none w-52"
                    readOnly
                  />
                </div>
                <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                  <Settings className="h-4 w-4" />
                </div>
                {/* User Avatar */}
                <div className="flex items-center gap-2 pl-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center font-bold text-xs text-white">
                    SM
                  </div>
                  <div className="hidden sm:block text-left text-xs leading-tight">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Stewart Menzies</p>
                    <p className="text-[10px] text-zinc-400">Manager</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Breadcrumb & Action Pills Row (Reference 1) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Accounting
                </h1>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <Folder className="h-3 w-3" />
                  <span>Workspaces</span>
                  <span>/</span>
                  <Tag className="h-3 w-3" />
                  <span>Sales</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-foreground">
                  <Zap className="h-3.5 w-3.5" />
                </button>
                <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-foreground">
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs shadow-sm">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <div className="inline-block h-4 w-4 rounded-full ring-1 ring-black bg-zinc-400" />
                    <div className="inline-block h-4 w-4 rounded-full ring-1 ring-black bg-zinc-500" />
                    <div className="inline-block h-4 w-4 rounded-full ring-1 ring-black bg-zinc-600" />
                  </div>
                  <span>Share</span>
                </div>
              </div>
            </div>

            {/* Statement Header & Giant Headline (Reference 1) */}
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                    HALF-YEAR INCOME STATEMENT
                  </span>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                      <span className="w-2 h-2 rounded-full bg-black dark:bg-white" /> Income
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border border-zinc-400" /> New Profit
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border border-zinc-400" /> COGS
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border border-zinc-400" /> Expenses
                    </span>
                  </div>
                </div>

                {/* Timeframe Selector (Reference 1: Week Month Quarter Year) */}
                <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500 self-start sm:self-auto">
                  {(['week', 'month', 'quarter', 'year'] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => {
                        setActiveTab(tf);
                        setTimeframe(tf);
                      }}
                      className={`px-3 py-1 capitalize transition-colors ${
                        activeTab === tf
                          ? 'text-black dark:text-white font-bold underline underline-offset-8'
                          : 'hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-2 text-zinc-400">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <Maximize2 className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              {/* GIANT HEADLINE (Reference 1: $1,651,045,139) */}
              <div className="my-6 text-center">
                <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-zinc-950 dark:text-white font-sans">
                  {currencySymbol}{displayAmount.toLocaleString('en-US', { minimumFractionDigits: useSampleData ? 0 : 2, maximumFractionDigits: useSampleData ? 0 : 2 })}
                </h2>
                <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mt-1 block">
                  Income
                </span>
              </div>
            </div>

            {/* Main Interactive Chart with Selection Window & Floating Pill (Reference 1) */}
            <div className="relative pt-4">
              {/* Pinned Floating Card from Reference 1 */}
              <div className="absolute top-2 left-1/3 z-20 px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-3 text-xs animate-fade-in">
                <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-sm">
                  $115k
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 font-bold text-[10px]">
                  +32%
                </span>
                <span className="text-zinc-500 text-[11px]">
                  income growth to end the half-year
                </span>
                <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs ml-1">
                  ×
                </button>
              </div>

              {/* Area Chart using EvilCharts Compound Architecture */}
              <EvilAreaChart
                data={chartData}
                height={260}
              >
                <EvilAreaChart.Grid strokeDasharray="2 2" stroke="currentColor" className="stroke-zinc-200/60 dark:stroke-zinc-800/60" />
                <EvilAreaChart.XAxis dataKey="date" stroke="#888" fontSize={11} />
                <EvilAreaChart.YAxis stroke="#888" fontSize={11} />
                <EvilAreaChart.Tooltip />
                <EvilAreaChart.Area
                  dataKey="Income"
                  stroke="#111827"
                  fill="url(#evil-indigo)"
                  strokeWidth={2}
                />
                <EvilAreaChart.Area
                  dataKey="Expense"
                  stroke="#9CA3AF"
                  fill="none"
                  strokeWidth={1.5}
                />
              </EvilAreaChart>

              {/* Timeline Scrubber Bar with Dual Handles (Reference 1) */}
              <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="relative h-6 bg-zinc-100 dark:bg-zinc-900 rounded-md flex items-center px-4">
                  {/* Scrubber active range */}
                  <div className="absolute left-1/4 right-1/2 h-full bg-zinc-300/60 dark:bg-zinc-700/60 rounded border-l-2 border-r-2 border-zinc-600 dark:border-zinc-300" />
                  <div className="w-full flex justify-between text-[10px] font-mono text-zinc-400 select-none">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Bottom Metric Cards matching Reference 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              {/* Card 1: Sales Forecast with Candlesticks */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>SALES FORECAST</span>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <SlidersHorizontal className="h-3 w-3" />
                    <Maximize2 className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold font-sans text-zinc-900 dark:text-zinc-100">
                      $141,7k
                    </span>
                    <span className="text-[11px] text-zinc-400 block">Sales</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />Sales</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />Forecast</span>
                  </div>
                </div>
                {/* Vertical Candlestick Sticks (Reference 1) */}
                <div className="flex items-end gap-2 h-12 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  {[35, 60, 85, 45, 95, 75, 90].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-1.5 bg-black dark:bg-white rounded-full" style={{ height: `${h}%` }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Monthly Expenses with Legend */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>MONTHLY EXPENSES</span>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <SlidersHorizontal className="h-3 w-3" />
                    <Maximize2 className="h-3 w-3" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-bold font-sans text-zinc-900 dark:text-zinc-100">
                    $17,2k
                  </span>
                  <span className="text-[11px] text-zinc-400 block">Expenses</span>
                </div>
                {/* Dot Category Legend (Reference 1) */}
                <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-500 pt-1">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-black dark:bg-white" />Meals</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-400" />Rent & Mortgage</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />Automotive</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />Others</span>
                </div>
              </div>

              {/* Card 3: Project Budget Forecast */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>PROJECT BUDGET FORECAST</span>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <SlidersHorizontal className="h-3 w-3" />
                    <Maximize2 className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold font-sans text-zinc-900 dark:text-zinc-100">
                      $92,1k
                    </span>
                    <span className="text-[11px] text-zinc-400 block">Budget forecast</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />Sales</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />Forecast</span>
                  </div>
                </div>
                <div className="h-12 flex items-center text-xs text-zinc-400 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  Target pipeline on track
                </div>
              </div>

              {/* Card 4: Insight Speedometer Gauge ($57.6k - $93.5k Reference 1) */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>INSIGHT</span>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>

                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 my-1">
                  The new feedback form boosted requests and sales
                </p>

                {/* Speedometer Arc SVG */}
                <div className="relative flex flex-col items-center">
                  <svg viewBox="0 0 160 90" className="w-36 h-20">
                    {/* Background track */}
                    <path
                      d="M 25 80 A 55 55 0 0 1 135 80"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-zinc-200 dark:text-zinc-800"
                      strokeLinecap="round"
                    />
                    {/* Active dark progress */}
                    <path
                      d="M 25 80 A 55 55 0 0 1 135 80"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray="180"
                      strokeDashoffset="60"
                      className="text-black dark:text-white"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="w-full flex justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 px-1 -mt-2">
                    <span>$57.6k</span>
                    <span>$93.5k</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Floating Bottom Capsule Search Dock (Reference 1 & 9) */}
          <div className="mt-10 flex flex-col items-center justify-center space-y-2">
            {/* Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium flex items-center gap-1 shadow-sm">
                What is our gross margin? <span className="text-zinc-400 font-bold">+</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium flex items-center gap-1 shadow-sm">
                Why did gross margin change during the period? <span className="text-zinc-400 font-bold">+</span>
              </span>
            </div>

            {/* Dark Dock Capsule */}
            <div className="w-full max-w-lg px-4 py-2 rounded-2xl bg-[#1E2024] text-white shadow-2xl flex items-center justify-between border border-zinc-700/60">
              <div className="flex items-center gap-3">
                {/* Polka-dot patterned green button (Reference 9) */}
                <button className="w-8 h-8 rounded-xl bg-emerald-500 polka-dot-btn flex items-center justify-center shadow-lg shadow-emerald-500/30 text-black">
                  <Sparkles className="h-4 w-4" />
                </button>
                <span className="text-xs text-zinc-300 font-medium">
                  Ask anything or search
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <HelpCircle className="h-4 w-4 hover:text-white cursor-pointer" />
                <Grid className="h-4 w-4 hover:text-white cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsHero;
