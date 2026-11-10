import React from 'react';
import { Calendar } from 'lucide-react';

interface MonthPillBarProps {
  selectedMonth: number; // 0-11
  selectedYear: number;
  monthsWithData?: Set<number>;
  onChange: (month: number) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MonthPillBar: React.FC<MonthPillBarProps> = ({
  selectedMonth,
  selectedYear,
  monthsWithData,
  onChange,
}) => {
  const currentActualMonth = new Date().getMonth();
  const currentActualYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentActualYear;

  return (
    <section className="sticky top-[73px] z-20 py-2 -mx-4 px-4 sm:mx-0 sm:px-0 bg-background/80 backdrop-blur-md border-y border-border/40 transition-colors">
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0 pr-2 border-r border-border/60">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>{selectedYear}</span>
        </div>

        <div
          role="tablist"
          aria-label="Filter by month"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full scroll-smooth"
        >
          {MONTHS.map((name, index) => {
            const isSelected = index === selectedMonth;
            const isCurrent = isCurrentYear && index === currentActualMonth;
            const hasData = monthsWithData ? monthsWithData.has(index) : false;

            return (
              <button
                key={name}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => onChange(index)}
                className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border/60'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span>{name}</span>
                  {isCurrent && !isSelected && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                      title="Current month"
                      aria-label="Current month"
                    />
                  )}
                  {hasData && !isSelected && !isCurrent && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500/80"
                      title="Has transactions"
                      aria-label="Has activity"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MonthPillBar;
