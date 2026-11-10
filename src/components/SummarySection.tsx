import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { IncomeData, ExpenseData } from '@/types/finance';
import { formatINRParts } from '@/utils/format';

interface SummarySectionProps {
  incomeData: IncomeData[];
  expenseData: ExpenseData[];
  selectedMonthLabel: string;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  incomeData,
  expenseData,
  selectedMonthLabel,
}) => {
  const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);
  const monthNet = totalIncome - totalExpenses;

  const incomeParts = formatINRParts(totalIncome);
  const expenseParts = formatINRParts(totalExpenses);
  const netParts = formatINRParts(monthNet);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {selectedMonthLabel}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Monthly Performance
          </h2>
        </div>
      </div>

      {/* Two balanced monthly cards: Income & Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Income Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-[var(--elev-1)] hover:shadow-[var(--elev-2)] hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Income
              </p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                {incomeData.length} credit {incomeData.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              +₹{incomeParts.whole}
              {incomeParts.paise ? (
                <span className="text-[0.6em] font-semibold opacity-75">.{incomeParts.paise}</span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Monthly Expenses Card */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-[var(--elev-1)] hover:shadow-[var(--elev-2)] hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Expenses
              </p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                {expenseData.length} debit {expenseData.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <p className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
              totalExpenses > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-muted-foreground'
            }`}>
              {totalExpenses > 0 ? `-₹${expenseParts.whole}` : '₹0'}
              {totalExpenses > 0 && expenseParts.paise ? (
                <span className="text-[0.6em] font-semibold opacity-75">.{expenseParts.paise}</span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {/* Delta strip: Monthly Net Cashflow */}
      <div className={`rounded-xl border p-3.5 flex items-center justify-between text-xs sm:text-sm font-medium transition-colors ${
        monthNet > 0
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          : monthNet < 0
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
          : 'bg-muted/50 border-border text-muted-foreground'
      }`}>
        <div className="flex items-center gap-2">
          {monthNet > 0 ? (
            <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : monthNet < 0 ? (
            <ArrowDownRight className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          ) : (
            <Minus className="h-4 w-4 shrink-0" />
          )}
          <span>
            {monthNet > 0 ? 'Surplus this month' : monthNet < 0 ? 'Deficit this month' : 'Break-even month'}
          </span>
        </div>
        <div className="font-semibold tabular-nums text-sm">
          {monthNet < 0 ? '-' : monthNet > 0 ? '+' : ''}₹{netParts.whole}
          {netParts.paise ? <span className="opacity-75">.{netParts.paise}</span> : null}
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
