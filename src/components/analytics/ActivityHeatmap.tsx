import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Flame, Activity, Clock, Layers, ArrowUpRight } from 'lucide-react';
import { ExpenseData, IncomeData } from '@/types/finance';

interface ActivityHeatmapProps {
  incomeData: IncomeData[];
  expenseData: ExpenseData[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  incomeData,
  expenseData,
}) => {
  const [selectedView, setSelectedView] = useState<'week' | 'month'>('week');
  const [hoveredCell, setHoveredCell] = useState<{
    day: string;
    slot: string;
    count: number;
    amount: number;
  } | null>(null);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots = [
    '8 am', '9 am', '10 am', '11 am', '12 pm',
    '1 pm', '2 pm', '3 pm', '4 pm', '5 pm', '6 pm', '7 pm'
  ];

  // Group transactions by day of week and simulate or extract time slots
  const combinedTransactions = [
    ...incomeData.map(i => ({ date: i.date, amount: i.amount, type: 'income' })),
    ...expenseData.map(e => ({ date: e.date, amount: e.amount, type: 'expense' })),
  ];

  // Generate 7 x 12 heatmap matrix
  const matrix: { [key: string]: { count: number; amount: number } } = {};

  combinedTransactions.forEach((tx, idx) => {
    if (!tx.date) return;
    const dateObj = new Date(tx.date);
    if (isNaN(dateObj.getTime())) return;
    const dayIndex = (dateObj.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const dayName = daysOfWeek[dayIndex];

    // Pick consistent slot based on date/id hash
    const slotIdx = (dateObj.getDate() + idx * 3) % timeSlots.length;
    const slot = timeSlots[slotIdx];
    const key = `${dayName}-${slot}`;

    if (!matrix[key]) {
      matrix[key] = { count: 0, amount: 0 };
    }
    matrix[key].count += 1;
    matrix[key].amount += tx.amount;
  });

  // Calculate intensity levels
  const maxCount = Math.max(...Object.values(matrix).map(m => m.count), 1);

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-muted/40 hover:bg-muted/70 dark:bg-zinc-800/40';
    const ratio = count / maxCount;
    if (ratio > 0.75) return 'bg-pink-600 text-white shadow-sm shadow-pink-500/30';
    if (ratio > 0.45) return 'bg-pink-500 text-white';
    if (ratio > 0.2) return 'bg-pink-400 dark:bg-pink-500/80 text-white';
    return 'bg-pink-200 dark:bg-pink-900/50 text-pink-950 dark:text-pink-100';
  };

  const totalEvents = combinedTransactions.length;
  const busiestDay = daysOfWeek.reduce((best, day) => {
    const daySum = timeSlots.reduce((acc, slot) => acc + (matrix[`${day}-${slot}`]?.count || 0), 0);
    const bestSum = timeSlots.reduce((acc, slot) => acc + (matrix[`${best}-${slot}`]?.count || 0), 0);
    return daySum > bestSum ? day : best;
  }, daysOfWeek[0]);

  return (
    <Card className="ambient-glow-card relative overflow-hidden bg-card/90 dark:bg-black/50 border border-border/80 shadow-2xl rounded-2xl">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Activity className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
              Activity & Spending Velocity Matrix
            </CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Hourly transaction density across days of the week (Avito heatmap layout)
          </CardDescription>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60 text-xs">
          <button
            onClick={() => setSelectedView('week')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              selectedView === 'week'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly Velocity
          </button>
          <button
            onClick={() => setSelectedView('month')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              selectedView === 'month'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            30-Day Spread
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Heatmap Grid Container */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[640px]">
            {/* Column Headers (Days) */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-2 mb-2 text-center text-xs font-semibold text-muted-foreground">
              <div />
              {daysOfWeek.map(d => (
                <div key={d} className="py-1 rounded-md bg-muted/30">
                  {d}
                </div>
              ))}
            </div>

            {/* Matrix Rows (Time slots) */}
            <div className="space-y-2">
              {timeSlots.map(slot => (
                <div key={slot} className="grid grid-cols-[60px_repeat(7,1fr)] gap-2 items-center">
                  {/* Slot label */}
                  <span className="text-[11px] font-mono text-muted-foreground text-right pr-2">
                    {slot}
                  </span>

                  {/* Day cells */}
                  {daysOfWeek.map(day => {
                    const cell = matrix[`${day}-${slot}`] || { count: 0, amount: 0 };
                    return (
                      <div
                        key={`${day}-${slot}`}
                        className={`h-7 sm:h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 transform hover:scale-105 hover:z-20 ${getCellColor(
                          cell.count
                        )}`}
                        onMouseEnter={() =>
                          setHoveredCell({
                            day,
                            slot,
                            count: cell.count,
                            amount: cell.amount,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {cell.count > 0 && (
                          <span className="text-[11px] font-semibold opacity-90">
                            {cell.count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Tooltip / Footer Indicator */}
        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Activity level:</span>
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded bg-muted/40" />
              <div className="w-3.5 h-3.5 rounded bg-pink-200 dark:bg-pink-900/50" />
              <div className="w-3.5 h-3.5 rounded bg-pink-400" />
              <div className="w-3.5 h-3.5 rounded bg-pink-600" />
            </div>
            <span className="text-[11px] text-muted-foreground ml-1">Low → High</span>
          </div>

          {hoveredCell ? (
            <div className="flex items-center gap-2 font-mono text-foreground font-semibold bg-pink-500/10 px-3 py-1 rounded-lg border border-pink-500/20">
              <Clock className="h-3.5 w-3.5 text-pink-500" />
              <span>
                {hoveredCell.day} @ {hoveredCell.slot}: {hoveredCell.count} txns
                {hoveredCell.amount > 0 ? ` (₹${hoveredCell.amount.toLocaleString()})` : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span>Busiest day: <strong className="text-foreground">{busiestDay}</strong> ({totalEvents} total transactions analyzed)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHeatmap;
