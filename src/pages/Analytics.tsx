import React from 'react';
import Header from '@/components/Header';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useIncomeData } from '@/hooks/useIncomeData';
import { useExpenseData } from '@/hooks/useExpenseData';
import AnalyticsHero from '@/components/analytics/AnalyticsHero';

const Analytics: React.FC = () => {
  const { bankAccounts, currentAccount, loading: bankLoading } = useBankAccounts();
  const { incomeData, loading: incomeLoading } = useIncomeData(currentAccount?.id);
  const { expenseData, loading: expenseLoading } = useExpenseData(currentAccount?.id);

  const loading = bankLoading || incomeLoading || expenseLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header (Ledgerix style: clean, minimal, uncluttered) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Analytics
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
              <span>/</span>
              <span>Overview</span>
              <span>/</span>
              <span>Income Statement</span>
            </div>
          </div>
        </div>

        {/* Ledgerix-Style Analytics Hero Card */}
        <section className="animate-fade-in">
          <AnalyticsHero
            incomeData={incomeData}
            expenseData={expenseData}
            loading={loading}
            currentAccount={currentAccount}
          />
        </section>
      </main>
    </div>
  );
};

export default Analytics;
