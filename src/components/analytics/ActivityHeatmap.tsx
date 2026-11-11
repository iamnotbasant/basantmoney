import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Activity, Clock, FileSpreadsheet, ChevronDown, Info, Smartphone, Laptop, Monitor, Camera } from 'lucide-react';
import { ExpenseData, IncomeData } from '@/types/finance';
import { EvilPieChart } from '@/components/evilcharts';

interface ActivityHeatmapProps {
  incomeData: IncomeData[];
  expenseData: ExpenseData[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  incomeData,
  expenseData,
}) => {
  const [selectedTab, setSelectedTab] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Week');
  const [hoveredCell, setHoveredCell] = useState<{ day: string; slot: string; count: number } | null>({
    day: 'We 11',
    slot: '3 pm',
    count: 417,
  });

  // Days list (14 columns matching Reference 2 Avito: Mo 2 ... Su 15)
  const days = [
    'Mo 2', 'Tu 3', 'We 4', 'Th 5', 'Fr 6', 'Sa 7', 'Su 8',
    'Mo 9', 'Tu 10', 'We 11', 'Th 12', 'Fr 13', 'Sa 14', 'Su 15'
  ];

  // Hours (Rows: 8 am to 7 pm matching Reference 2)
  const hours = [
    '7 pm', '6 pm', '5 pm', '4 pm', '3 pm', '2 pm',
    '1 pm', '12 pm', '11 am', '10 am', '9 am', '8 am'
  ];

  // Inactive vs Active breakdown (Reference 2)
  const categoryDonut = [
    { name: 'Main Saving Vault', value: 56, icon: Smartphone },
    { name: 'Living & Needs', value: 24, icon: Laptop },
    { name: 'Discretionary Wants', value: 13, icon: Monitor },
    { name: 'Slice SFB Yield', value: 6, icon: Camera },
  ];

  return (
    <div className="space-y-6">
      {/* Avito Master Card (Reference 2) */}
      <Card className="ambient-glow-card relative overflow-hidden bg-card/95 dark:bg-[#0c0c0f] border border-border/70 dark:border-zinc-800 shadow-2xl rounded-3xl p-6 sm:p-8">
        {/* Header Bar matching Reference 2 */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-border/40 dark:border-zinc-800/80 pb-5">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Activity & Liquidity Heatmap
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              10,140 ledger units active • Last sync on Nov 11 at 15:30
            </p>
          </div>

          {/* Timeframe & Spreadsheet Tabs (Reference 2) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 dark:bg-zinc-900 border border-border/60 dark:border-zinc-800 text-xs font-semibold">
            {(['Day', 'Week', 'Month', 'Year'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedTab === tab
                    ? 'bg-background text-foreground shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'Week' ? 'Week • 02 - 15 Nov ▾' : tab}
              </button>
            ))}
            <button className="flex items-center gap-1 px-3 py-1 text-muted-foreground hover:text-foreground border-l border-border/60 pl-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Spreadsheet
            </button>
          </div>
        </div>

        {/* Two-Column Grid: Left Heatmap Matrix, Right Autoload / Status Card */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-6">
          {/* Left Heatmap (Span 2) */}
          <div className="xl:col-span-2 overflow-x-auto pb-2">
            <div className="min-w-[560px]">
              {/* Rows from 7 pm down to 8 am */}
              <div className="space-y-1.5">
                {hours.map((hour, hIdx) => (
                  <div key={hour} className="grid grid-cols-[50px_repeat(14,1fr)] gap-1.5 items-center">
                    <span className="text-[10px] font-mono text-muted-foreground text-right pr-2">
                      {hour}
                    </span>

                    {days.map((day, dIdx) => {
                      // Pink active on left, grey inactive on right (Reference 2)
                      const isPink = dIdx < 10;
                      const isTarget = day === 'We 11' && hour === '3 pm';

                      let bgClass = isPink
                        ? (dIdx + hIdx) % 3 === 0
                          ? 'bg-pink-500 text-white'
                          : (dIdx + hIdx) % 2 === 0
                          ? 'bg-pink-400 text-white'
                          : 'bg-pink-200 dark:bg-pink-900/60 text-pink-950 dark:text-pink-100'
                        : 'bg-zinc-300 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300';

                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`h-6 sm:h-7 rounded-md flex items-center justify-center cursor-pointer transition-all relative ${bgClass} ${
                            isTarget ? 'ring-2 ring-foreground scale-105 z-20 shadow-md' : 'hover:scale-105'
                          }`}
                          onMouseEnter={() => setHoveredCell({ day, slot: hour, count: 417 })}
                        >
                          {isTarget && (
                            <div className="absolute -top-7 px-2 py-0.5 rounded bg-black dark:bg-white text-white dark:text-black font-bold text-[10px] shadow-lg flex items-center gap-1 z-30">
                              <span>417</span>
                              <div className="w-1.5 h-1.5 bg-black dark:bg-white rotate-45 absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Day Labels below columns */}
              <div className="grid grid-cols-[50px_repeat(14,1fr)] gap-1.5 mt-2.5 text-center text-[10px] font-mono font-medium text-muted-foreground">
                <div />
                {days.map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Autoload / Status Card (Reference 2) */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 border border-blue-500/20 dark:border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">
                  Autoload in Progress
                </span>
                <div className="w-9 h-5 rounded-full bg-foreground flex items-center p-0.5 justify-end">
                  <div className="w-4 h-4 rounded-full bg-background" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Slice SFB interest and UPI entries sync automatically at 00:30 IST
              </p>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-muted dark:bg-zinc-800 overflow-hidden">
                <div className="w-[82%] h-full bg-primary rounded-full" />
              </div>

              <div className="flex items-center justify-between text-xs font-mono font-semibold pt-1 text-muted-foreground">
                <span>✓ 417</span>
                <span>◷ 26</span>
                <span>⚡ 391</span>
              </div>
            </div>

            {/* Warning Info Box (Reference 2) */}
            <div className="p-4 rounded-2xl bg-muted/30 dark:bg-zinc-900/40 border border-border/60 text-xs space-y-1 text-muted-foreground">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Info className="h-4 w-4 text-primary" />
                Daily SFB Compounding Verified
              </div>
              <p className="text-[11px] leading-relaxed">
                ₹1.68/day is credited seamlessly on current closing balance.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Avito Donut + Breakdown (Reference 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pt-6 border-t border-border/40 dark:border-zinc-800">
          {/* Left: Donut Chart with 4 rounded slices */}
          <div className="lg:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-muted/20 dark:bg-zinc-900/30 border border-border/50">
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-extrabold font-mono text-foreground">
                  10,140
                </div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Active Allocation Units
                </span>
              </div>

              {/* Legend with Icons (Reference 2) */}
              <div className="space-y-1.5 text-xs">
                {categoryDonut.map((c, idx) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800 dark:bg-zinc-200" />
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-muted-foreground font-mono">· {c.value}%</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs font-mono pt-2 border-t border-border/40 text-muted-foreground">
                <span>Clear: <strong className="text-foreground">7,300</strong></span>
                <span>With errors: <strong className="text-foreground">2,840</strong></span>
              </div>
            </div>

            {/* EvilPieChart Donut Component */}
            <div className="w-48 h-48 relative">
              <EvilPieChart data={categoryDonut} height={190}>
                <EvilPieChart.Pie
                  data={categoryDonut}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  cornerRadius={6}
                  colors={['#18181B', '#71717A', '#A1A1AA', '#E4E4E7']}
                />
                <EvilPieChart.Tooltip />
              </EvilPieChart>
            </div>
          </div>

          {/* Right: Stat Cards (Reference 2: 8912 Inactive & 634 Templates) */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-muted/20 dark:bg-zinc-900/30 border border-border/50 space-y-2">
              <div className="text-2xl font-bold font-mono text-foreground">
                8,912
              </div>
              <span className="text-xs text-muted-foreground font-semibold">
                Archived & Reconciled Records
              </span>
              <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-muted-foreground pt-1">
                <div><span className="block text-foreground font-bold">2,518</span>Processed</div>
                <div><span className="block text-foreground font-bold">320</span>Audited</div>
                <div><span className="block text-foreground font-bold">5,062</span>Archived</div>
                <div><span className="block text-foreground font-bold">1,012</span>Synced</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/20 dark:bg-zinc-900/30 border border-border/50 space-y-1">
              <div className="text-2xl font-bold font-mono text-foreground">
                634
              </div>
              <span className="text-xs text-muted-foreground font-semibold">
                Smart Financial Templates
              </span>
              <p className="text-[11px] text-muted-foreground pt-1">
                Automated recurring expense and income categorization presets
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ActivityHeatmap;
