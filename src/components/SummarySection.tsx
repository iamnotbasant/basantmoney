
import React from 'react';
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
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
      icon: IndianRupee,
      bgColor: netBalance >= 0 
        ? 'bg-green-500/10 border-green-500/20 dark:bg-white/[0.04] dark:border-white/[0.1] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_12px_28px_rgba(0,0,0,0.6)] dark:backdrop-blur-xl' 
        : 'bg-red-500/10 border-red-500/20 dark:bg-white/[0.04] dark:border-white/[0.1] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_12px_28px_rgba(0,0,0,0.6)] dark:backdrop-blur-xl',
      iconColor: netBalance >= 0 ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400',
      textColor: netBalance >= 0 ? 'text-green-700 dark:silver-text-gradient' : 'text-red-700 dark:silver-text-gradient',
      iconBg: netBalance >= 0 ? 'bg-green-500/20 dark:bg-emerald-500/15 dark:border dark:border-emerald-500/30' : 'bg-red-500/20 dark:bg-rose-500/15 dark:border dark:border-rose-500/30'
    },
    {
      title: 'Total Income',
      value: totalIncome,
      icon: TrendingUp,
      bgColor: 'bg-green-500/10 border-green-500/20 dark:bg-white/[0.04] dark:border-white/[0.1] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_12px_28px_rgba(0,0,0,0.6)] dark:backdrop-blur-xl',
      iconColor: 'text-green-600 dark:text-emerald-400',
      textColor: 'text-green-700 dark:silver-text-gradient',
      iconBg: 'bg-green-500/20 dark:bg-emerald-500/15 dark:border dark:border-emerald-500/30'
    },
    {
      title: 'Total Expenses',
      value: totalExpenses,
      icon: TrendingDown,
      bgColor: 'bg-red-500/10 border-red-500/20 dark:bg-white/[0.04] dark:border-white/[0.1] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_12px_28px_rgba(0,0,0,0.6)] dark:backdrop-blur-xl',
      iconColor: 'text-red-600 dark:text-rose-400',
      textColor: 'text-red-700 dark:silver-text-gradient',
      iconBg: 'bg-red-500/20 dark:bg-rose-500/15 dark:border dark:border-rose-500/30'
    }
  ];

  return (
    <div>
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-semibold text-foreground dark:text-zinc-200 tracking-tight">Financial Summary</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} rounded-2xl p-6 border shadow-sm transition-all duration-300 hover:scale-[1.01]`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground/80 dark:text-zinc-400 mb-1">{card.title}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            
            <div>
              <p className={`text-2xl sm:text-3xl font-bold ${card.textColor} leading-tight`}>
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
