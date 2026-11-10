
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import SummarySection from '@/components/SummarySection';
import RecentTransactions from '@/components/RecentTransactions';
import NetBalanceDisplay from '@/components/NetBalanceDisplay';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, TrendingUp, TrendingDown, Calendar, ChevronDown, ChevronUp, Eye, EyeOff, Loader2 } from 'lucide-react';
import { IncomeData, ExpenseData } from '@/types/finance';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIncomeData } from '@/hooks/useIncomeData';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import VaultInterestCards from '@/components/VaultInterestCards';

const Index = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());
  const [showMonthFilter, setShowMonthFilter] = useState(false);

  // Supabase hooks for real-time data
  const { currentAccount, loading: bankLoading } = useBankAccounts();
  const { incomeData: supabaseIncome, loading: incomeLoading, getTotalIncome } = useIncomeData(currentAccount?.id);
  const { expenseData: supabaseExpenses, loading: expenseLoading, getTotalExpenses } = useExpenseData(currentAccount?.id);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Convert Supabase data to local format
  const incomeData: IncomeData[] = supabaseIncome.map(item => ({
    id: item.id,
    source: item.source,
    amount: Number(item.amount),
    date: item.date,
    category: item.category,
  }));

  const expenseData: ExpenseData[] = supabaseExpenses.map(item => ({
    id: item.id,
    description: item.description,
    amount: Number(item.amount),
    date: item.date,
    category: item.category,
    deductions: (item.deductions as any) || [],
  }));

  // Calculate totals from all transactions
  const totalIncomeAllTime = getTotalIncome();
  const totalExpensesAllTime = getTotalExpenses();
  const netBalance = totalIncomeAllTime - totalExpensesAllTime;

  // Filter data by selected month and year (ONLY for summary cards)
  const filteredIncomeData = incomeData.filter(item => {
    const itemDate = new Date(item.date);
    const itemMonth = itemDate.getMonth();
    const itemYear = itemDate.getFullYear();
    return itemMonth === selectedMonth && itemYear === selectedYear;
  });

  const filteredExpenseData = expenseData.filter(item => {
    const itemDate = new Date(item.date);
    const itemMonth = itemDate.getMonth();
    const itemYear = itemDate.getFullYear();
    return itemMonth === selectedMonth && itemYear === selectedYear;
  });

  const isLoading = incomeLoading || expenseLoading || bankLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading your financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Interest Alerts & Verification Cards (Spec §4, §5, §6, §9) */}
        <VaultInterestCards incomeData={incomeData} />

        {/* Net Balance Display Section */}
        <section className="mb-8 animate-fade-in">
          <NetBalanceDisplay netBalance={netBalance} />
        </section>

        {/* Financial Summary Section */}
        <section className="mb-8">
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <SummarySection 
              incomeData={filteredIncomeData} 
              expenseData={filteredExpenseData}
            />
          </div>
        </section>

        {/* Recent Transactions Section */}
        <section className="mb-8">
          <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <RecentTransactions />
          </div>
        </section>

        {/* Month Filter Section - Moved to Bottom */}
        <section className="mb-8">
          <div className="flex items-center gap-4 mb-4 animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMonthFilter(!showMonthFilter)}
              className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              {showMonthFilter ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showMonthFilter ? 'Hide' : 'Show'} Month Filter
              {showMonthFilter ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          
          {showMonthFilter && (
            <Card className="animate-fade-in border-2 border-dashed border-muted">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-primary transition-colors duration-300 hover:text-primary/80" />
                    <div>
                      <h3 className="font-semibold text-foreground">View Month</h3>
                      <p className="text-sm text-muted-foreground">Select month to view monthly income/expense summary</p>
                    </div>
                  </div>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => {
                    setSelectedMonth(parseInt(value));
                  }}>
                    <SelectTrigger className="w-48 transition-all duration-300 hover:shadow-md">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month} {selectedYear}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {/* Floating Action Button - Enhanced Design */}
      <div className="fixed bottom-6 right-6 z-50 animate-fade-in" style={{ animationDelay: '0.8s' }}>
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              size="lg"
              className="h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-110 group bg-gradient-to-br from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:to-primary"
            >
              <Plus className="h-7 w-7 transition-all duration-300 group-hover:rotate-180 group-hover:scale-110" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Quick Actions
              </SheetTitle>
              <SheetDescription>
                Add income or expense with smart distribution
              </SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4 mt-6 pb-6">
              <Button 
                onClick={() => navigate('/income')}
                className="flex items-center justify-center gap-2 h-16 text-lg hover-scale"
                variant="default"
              >
                <TrendingUp className="h-6 w-6" />
                Add Income
              </Button>
              <Button 
                onClick={() => navigate('/expense')}
                className="flex items-center justify-center gap-2 h-16 text-lg hover-scale"
                variant="outline"
              >
                <TrendingDown className="h-6 w-6" />
                Add Expense
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default Index;
