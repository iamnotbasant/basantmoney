
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
      color: netBalance >= 0 ? 'green' : 'red',
      bgColor: netBalance >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200' : 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200',
      iconColor: netBalance >= 0 ? 'text-green-600' : 'text-red-600',
      textColor: netBalance >= 0 ? 'text-green-700' : 'text-red-700',
      iconBg: netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
    },
    {
      title: 'Total Income',
      value: totalIncome,
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-700',
      iconBg: 'bg-green-100'
    },
    {
      title: 'Total Expenses',
      value: totalExpenses,
      icon: TrendingDown,
      color: 'red',
      bgColor: 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-700',
      iconBg: 'bg-red-100'
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
            className={`${card.bgColor} rounded-2xl p-6 border-2 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground/80 mb-1">{card.title}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
            
            <div>
              <p className={`text-2xl sm:text-3xl font-bold ${card.textColor} leading-tight`}>
                {card.title === 'Net Balance' && card.value < 0 && '-'}
                ₹{Math.abs(card.value).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummarySection;
