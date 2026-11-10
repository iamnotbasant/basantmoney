
import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { IncomeData, ExpenseData } from '@/types/finance';

interface SummarySectionProps {
  incomeData: IncomeData[];
  expenseData: ExpenseData[];
}

const SummarySection: React.FC<SummarySectionProps> = ({ incomeData, expenseData }) => {
  const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const summaryCards = [
    {
      title: 'Net Balance',
      value: netBalance,
      icon: DollarSign,
      bgColor: netBalance >= 0 
        ? 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/30' 
        : 'bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/10 dark:border-rose-500/30',
      iconColor: netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      textColor: netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300',
      iconBg: netBalance >= 0 ? 'bg-emerald-500/20 dark:bg-emerald-500/20' : 'bg-rose-500/20 dark:bg-rose-500/20'
    },
    {
      title: 'Total Income',
      value: totalIncome,
      icon: TrendingUp,
      bgColor: 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      iconBg: 'bg-emerald-500/20 dark:bg-emerald-500/20'
    },
    {
      title: 'Total Expenses',
      value: totalExpenses,
      icon: TrendingDown,
      bgColor: 'bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/10 dark:border-rose-500/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      textColor: 'text-rose-700 dark:text-rose-300',
      iconBg: 'bg-rose-500/20 dark:bg-rose-500/20'
    }
  ];

  return (
    <div>
      <div className="flex items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Financial Summary</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} rounded-2xl p-6 border shadow-sm transition-all duration-300`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground/75 dark:text-foreground/80">{card.title}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            
            <div>
              <p className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${card.textColor} leading-tight`}>
                {card.title === 'Net Balance' && card.value < 0 && '-'}
                ₹{Math.trunc(Math.abs(card.value)).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummarySection;
