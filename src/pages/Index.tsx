
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import WalletCard from '@/components/WalletCard';
import SummarySection from '@/components/SummarySection';
import RecentTransactions from '@/components/RecentTransactions';
import NetBalanceDisplay from '@/components/NetBalanceDisplay';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, TrendingUp, TrendingDown, Calendar, ChevronDown, ChevronUp, Eye, EyeOff, Wallet as WalletIcon } from 'lucide-react';
import { Wallet, IncomeData, ExpenseData } from '@/types/finance';
import { WalletService } from '@/utils/walletService';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Index = () => {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());
  const [showMonthFilter, setShowMonthFilter] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Initialize wallet system and load data
  useEffect(() => {
    console.log('Initializing wallet system...');
    
    const storedWallets = localStorage.getItem('wallets');
    const storedSubWallets = localStorage.getItem('subWallets');
    const storedIncome = localStorage.getItem('incomeData');
    const storedExpenses = localStorage.getItem('expenseData');

    // Initialize wallet system if not present
    if (!storedWallets || !storedSubWallets) {
      console.log('Setting up default wallet structure...');
      const { wallets: defaultWallets, subWallets: defaultSubWallets } = WalletService.initializeWalletSystem();
      localStorage.setItem('wallets', JSON.stringify(defaultWallets));
      localStorage.setItem('subWallets', JSON.stringify(defaultSubWallets));
      setWallets(defaultWallets);
    } else {
      // Load wallets with calculated balances
      const walletData = JSON.parse(storedWallets);
      const dynamicWallets = walletData.map((wallet: Wallet) => ({
        ...wallet,
        balance: WalletService.calculateWalletBalance(wallet.type)
      }));
      setWallets(dynamicWallets);
    }

    // Load existing data
    if (storedIncome) {
      const loadedIncome = JSON.parse(storedIncome);
      setIncomeData(loadedIncome);
    } else {
      setIncomeData([]);
      localStorage.setItem('incomeData', JSON.stringify([]));
    }

    if (storedExpenses) {
      const loadedExpenses = JSON.parse(storedExpenses);
      setExpenseData(loadedExpenses);
    } else {
      setExpenseData([]);
      localStorage.setItem('expenseData', JSON.stringify([]));
    }

    // Add event listener for wallet data changes
    const handleWalletDataChange = () => {
      console.log('Wallet data changed, refreshing balances...');
      const storedWallets = localStorage.getItem('wallets');
      if (storedWallets) {
        const walletData = JSON.parse(storedWallets);
        const dynamicWallets = walletData.map((wallet: Wallet) => ({
          ...wallet,
          balance: WalletService.calculateWalletBalance(wallet.type)
        }));
        setWallets(dynamicWallets);
      }
    };

    window.addEventListener('walletDataChanged', handleWalletDataChange);

    return () => {
      window.removeEventListener('walletDataChanged', handleWalletDataChange);
    };
  }, []);

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

  // Calculate totals using new wallet service
  const totalIncomeAllTime = incomeData.reduce((sum, item) => sum + item.amount, 0);
  const totalExpensesAllTime = expenseData.reduce((sum, item) => sum + item.amount, 0);
  const netBalance = totalIncomeAllTime - totalExpensesAllTime;

  // Create dynamic wallets with calculated balances
  const dynamicWallets = wallets.map(wallet => ({
    ...wallet,
    balance: WalletService.calculateWalletBalance(wallet.type)
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Filter Section - Now Collapsible */}
        <section className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMonthFilter(!showMonthFilter)}
              className="flex items-center gap-2"
            >
              {showMonthFilter ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showMonthFilter ? 'Hide' : 'Show'} Month Filter
              {showMonthFilter ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          
          {showMonthFilter && (
            <Card className="animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">View Month</h3>
                      <p className="text-sm text-muted-foreground">Select month to view monthly income/expense summary</p>
                    </div>
                  </div>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => {
                    setSelectedMonth(parseInt(value));
                  }}>
                    <SelectTrigger className="w-48">
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

        {/* Net Balance Display Section */}
        <section className="mb-8">
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

        {/* Wallet Overview Section */}
        <section className="mb-8">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <WalletIcon className="h-6 w-6 text-primary" />
              Smart Wallet System
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dynamicWallets.map((wallet, index) => (
              <div 
                key={wallet.id} 
                className="animate-fade-in hover-scale"
                style={{ animationDelay: `${(index * 0.1) + 0.2}s` }}
              >
                <WalletCard wallet={wallet} />
              </div>
            ))}
          </div>
        </section>

        {/* Recent Transactions Section */}
        <section className="mb-8">
          <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <RecentTransactions />
          </div>
        </section>
      </main>

      {/* Floating Action Button - Improved Design */}
      <div className="fixed bottom-6 right-6 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              size="lg"
              className="h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 group bg-gradient-to-r from-primary to-primary/80"
            >
              <Plus className="h-7 w-7 transition-transform duration-300 group-hover:rotate-180" />
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
