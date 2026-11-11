
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
        ? 'bg-green-500/10 border-green-500/20 dark:bg-green-500/10 dark:border-green-500/30' 
        : 'bg-red-500/10 border-red-500/20 dark:bg-red-500/10 dark:border-red-500/30',
      iconColor: netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      textColor: netBalance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300',
      iconBg: netBalance >= 0 ? 'bg-green-500/20 dark:bg-green-500/20' : 'bg-red-500/20 dark:bg-red-500/20'
    },
    {
      title: 'Total Income',
      value: totalIncome,
      icon: TrendingUp,
      bgColor: 'bg-green-500/10 border-green-500/20 dark:bg-green-500/10 dark:border-green-500/30',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-700 dark:text-green-300',
      iconBg: 'bg-green-500/20 dark:bg-green-500/20'
    },
    {
      title: 'Total Expenses',
      value: totalExpenses,
      icon: TrendingDown,
      bgColor: 'bg-red-500/10 border-red-500/20 dark:bg-red-500/10 dark:border-red-500/30',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-700 dark:text-red-300',
      iconBg: 'bg-red-500/20 dark:bg-red-500/20'
    }
  ];

  return (
    <div>
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Financial Summary</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} rounded-2xl p-6 border shadow-sm transition-all duration-300`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground/80 mb-1">{card.title}</p>
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
