import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import HeroBalanceCard from '@/components/HeroBalanceCard';
import MonthPillBar from '@/components/MonthPillBar';
import SummarySection from '@/components/SummarySection';
import RecentTransactions, { DashboardTransaction } from '@/components/RecentTransactions';
import VaultInterestCards from '@/components/VaultInterestCards';
import { Skeleton } from '@/components/ui/skeleton';
import { IncomeData, ExpenseData } from '@/types/finance';
import { useIncomeData } from '@/hooks/useIncomeData';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useBankAccounts } from '@/hooks/useBankAccounts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Privacy toggle (persisted in localStorage)
  const [balanceHidden, setBalanceHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('balanceHidden') === '1';
    } catch {
      return false;
    }
  });

  const toggleBalanceHidden = () => {
    setBalanceHidden(prev => {
      const next = !prev;
      try {
        localStorage.setItem('balanceHidden', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Supabase hooks for real-time ledger data
  const { currentAccount, bankAccounts, loading: bankLoading } = useBankAccounts();
  const {
    incomeData: supabaseIncome,
    loading: incomeLoading,
    getTotalIncome
  } = useIncomeData(currentAccount?.id);
  const {
    expenseData: supabaseExpenses,
    loading: expenseLoading,
    getTotalExpenses
  } = useExpenseData(currentAccount?.id);

  // Convert Supabase rows to typed finance domain objects
  const incomeData: IncomeData[] = useMemo(() => {
    return supabaseIncome.map(item => ({
      id: item.id,
      source: item.source,
      amount: Number(item.amount),
      date: item.date,
      category: item.category,
      notes: item.notes || undefined,
      is_auto_interest: Boolean(item.is_auto_interest),
    }));
  }, [supabaseIncome]);

  const expenseData: ExpenseData[] = useMemo(() => {
    return supabaseExpenses.map(item => ({
      id: item.id,
      description: item.description,
      amount: Number(item.amount),
      date: item.date,
      category: item.category,
      notes: item.notes || undefined,
      deductions: (item.deductions as any) || [],
    }));
  }, [supabaseExpenses]);

  // All-time totals for the HeroBalanceCard
  const totalIncomeAllTime = getTotalIncome();
  const totalExpensesAllTime = getTotalExpenses();
  const netBalance = totalIncomeAllTime - totalExpensesAllTime;

  // Filter data by selected month and year for monthly performance
  const filteredIncomeData = useMemo(() => {
    return incomeData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
    });
  }, [incomeData, selectedMonth, selectedYear]);

  const filteredExpenseData = useMemo(() => {
    return expenseData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
    });
  }, [expenseData, selectedMonth, selectedYear]);

  // Compute which months have transactions in selected year for MonthPillBar activity dots
  const monthsWithData = useMemo(() => {
    const set = new Set<number>();
    incomeData.forEach(item => {
      const d = new Date(item.date);
      if (d.getFullYear() === selectedYear) set.add(d.getMonth());
    });
    expenseData.forEach(item => {
      const d = new Date(item.date);
      if (d.getFullYear() === selectedYear) set.add(d.getMonth());
    });
    return set;
  }, [incomeData, expenseData, selectedYear]);

  // Recent 5 transactions combined from income & expenses
  const recentTransactions: DashboardTransaction[] = useMemo(() => {
    const incomeItems: DashboardTransaction[] = incomeData.map(item => ({
      id: item.id,
      type: 'income',
      description: item.notes || item.source,
      amount: item.amount,
      date: item.date,
      category: item.category,
      isAutoInterest: item.is_auto_interest,
    }));

    const expenseItems: DashboardTransaction[] = expenseData.map(item => ({
      id: item.id,
      type: 'expense',
      description: item.description,
      amount: item.amount,
      date: item.date,
      category: item.category,
    }));

    return [...incomeItems, ...expenseItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [incomeData, expenseData]);

  const isLoading = incomeLoading || expenseLoading || bankLoading;
  const selectedMonthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors selection:bg-primary selection:text-primary-foreground">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-7">
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <Skeleton className="h-56 sm:h-64 w-full rounded-3xl" />
            <Skeleton className="h-10 w-full rounded-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {/* 1. HERO BALANCE CARD (Answers Q1: What do I have?) */}
            <section aria-label="Account Net Balance">
              <HeroBalanceCard
                netBalance={netBalance}
                currentAccount={currentAccount}
                totalAccountsCount={bankAccounts.length || 1}
                hidden={balanceHidden}
                onToggleHidden={toggleBalanceHidden}
                onNavigate={(path) => navigate(path)}
              />
            </section>

            {/* 2. MONTH PILL BAR (Zero-friction control right above monthly stats) */}
            <MonthPillBar
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              monthsWithData={monthsWithData}
              onChange={(m) => setSelectedMonth(m)}
              onYearChange={(y) => setSelectedYear(y)}
            />

            {/* 3. MONTHLY PERFORMANCE SUMMARY */}
            <section aria-label="Monthly Performance Summary">
              <SummarySection
                incomeData={filteredIncomeData}
                expenseData={filteredExpenseData}
                selectedMonthLabel={selectedMonthLabel}
              />
            </section>

            {/* 4. VAULT INTEREST & RECONCILIATION BANNERS */}
            <section aria-label="Vault Notifications">
              <VaultInterestCards incomeData={incomeData} />
            </section>

            {/* 5. RECENT TRANSACTIONS LEDGER */}
            <section aria-label="Recent Transactions">
              <RecentTransactions
                transactions={recentTransactions}
                isLoading={false}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
