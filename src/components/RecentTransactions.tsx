import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useIncomeData } from '@/hooks/useIncomeData';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useBankAccounts } from '@/hooks/useBankAccounts';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string;
}

const RecentTransactions = () => {
  const navigate = useNavigate();
  const { currentAccount } = useBankAccounts();
  const { incomeData, loading: incomeLoading } = useIncomeData(currentAccount?.id);
  const { expenseData, loading: expenseLoading } = useExpenseData(currentAccount?.id);

  // Convert Supabase data to Transaction format and get recent 5
  const recentTransactions = React.useMemo(() => {
    const incomeTransactions: Transaction[] = incomeData.map(item => ({
      id: item.id,
      type: 'income' as const,
      description: item.notes || item.source,
      amount: Number(item.amount),
      date: item.date,
      category: item.category
    }));

    const expenseTransactions: Transaction[] = expenseData.map(item => ({
      id: item.id,
      type: 'expense' as const,
      description: item.description,
      amount: Number(item.amount),
      date: item.date,
      category: item.category
    }));

    return [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [incomeData, expenseData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  };

  const isLoading = incomeLoading || expenseLoading;

  return (
    <Card className="transition-all dark:bg-white/[0.03] dark:backdrop-blur-2xl dark:border-white/[0.1] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_40px_rgba(0,0,0,0.7)] dark:rounded-[28px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-xl font-semibold tracking-tight dark:text-zinc-100">Recent Transactions</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/transactions')}
          className="text-primary hover:text-primary/80 dark:text-zinc-300 hover:dark:text-white hover:dark:bg-white/[0.08] dark:rounded-full"
        >
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground dark:text-zinc-400">
            <p>Loading transactions...</p>
          </div>
        ) : recentTransactions.length > 0 ? (
          <div className="space-y-2.5">
            {recentTransactions.map((transaction) => (
              <div
                key={`${transaction.type}-${transaction.id}`}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 hover:bg-accent/40 dark:bg-white/[0.03] dark:border-white/[0.08] hover:dark:bg-white/[0.07] hover:dark:border-white/[0.16] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:rounded-2xl transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    transaction.type === 'income' 
                      ? 'bg-green-500/10 text-green-600 dark:text-emerald-400 border border-green-500/20 dark:border-emerald-500/30 dark:bg-emerald-500/10' 
                      : 'bg-red-500/10 text-red-600 dark:text-rose-400 border border-red-500/20 dark:border-rose-500/30 dark:bg-rose-500/10'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate text-foreground dark:text-zinc-200">{transaction.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs dark:bg-white/[0.06] dark:border-white/[0.12] dark:text-zinc-300">
                        {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground dark:text-zinc-400">
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <p className={`font-bold tracking-tight ${
                    transaction.type === 'income' 
                      ? 'text-green-600 dark:silver-text-gradient' 
                      : 'text-foreground dark:silver-text-gradient'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent transactions</p>
            <div className="flex justify-center space-x-2 mt-4">
              <Button size="sm" onClick={() => navigate('/income')}>
                Add Income
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/expense')}>
                Add Expense
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTransactions;