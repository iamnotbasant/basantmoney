import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Filter,
  SortAsc,
  SortDesc,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
} from 'lucide-react';
import { IncomeData, ExpenseData } from '@/types/finance';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useIncomeData } from '@/hooks/useIncomeData';
import { useExpenseData } from '@/hooks/useExpenseData';

// Import our custom visual components matching User References 1 through 9
import AnalyticsHero from '@/components/analytics/AnalyticsHero';
import NeoGlassVitals from '@/components/analytics/NeoGlassVitals';
import SankeyCashFlow from '@/components/analytics/SankeyCashFlow';
import ActivityHeatmap from '@/components/analytics/ActivityHeatmap';
import RoseCategoryChart from '@/components/analytics/RoseCategoryChart';
import PebbleMosaicChart from '@/components/analytics/PebbleMosaicChart';
import AskPillBar from '@/components/analytics/AskPillBar';
import { toast } from 'sonner';

const Reports = () => {
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  
  // Filter states
  const [timeframe, setTimeframe] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [amountRange, setAmountRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Supabase hooks for live data (matching Vault & Transactions)
  const { currentAccount } = useBankAccounts();
  const { incomeData: supabaseIncome } = useIncomeData(currentAccount?.id);
  const { expenseData: supabaseExpenses } = useExpenseData(currentAccount?.id);

  useEffect(() => {
    if (supabaseIncome.length > 0 || supabaseExpenses.length > 0) {
      const formattedIncome: IncomeData[] = supabaseIncome.map(item => ({
        id: item.id,
        source: item.source,
        amount: Number(item.amount),
        date: item.date,
        category: item.category,
        notes: item.notes || undefined,
        payment_method: item.payment_method || undefined,
        is_auto_interest: Boolean(item.is_auto_interest),
      }));

      const formattedExpenses: ExpenseData[] = supabaseExpenses.map(item => ({
        id: item.id,
        description: item.description,
        amount: Number(item.amount),
        date: item.date,
        category: item.category,
        notes: item.notes || undefined,
        payment_method: item.payment_method || undefined,
        deductions: (item.deductions as any) || [],
      }));

      setIncomeData(formattedIncome);
      setExpenseData(formattedExpenses);
    } else {
      // LocalStorage fallback
      try {
        const bankId = localStorage.getItem('currentBankAccountId') || '';
        const incomeKey = bankId ? `incomeData:${bankId}` : 'incomeData';
        const expenseKey = bankId ? `expenseData:${bankId}` : 'expenseData';
        const storedIncome = localStorage.getItem(incomeKey) || localStorage.getItem('incomeData');
        const storedExpenses = localStorage.getItem(expenseKey) || localStorage.getItem('expenseData');
        const income = storedIncome ? JSON.parse(storedIncome) : [];
        const expenses = storedExpenses ? JSON.parse(storedExpenses) : [];

        setIncomeData(income);
        setExpenseData(expenses);
      } catch (error) {
        console.error('Error loading fallback financial data for reports:', error);
        setIncomeData([]);
        setExpenseData([]);
      }
    }
  }, [supabaseIncome, supabaseExpenses]);

  // Filtered transactions based on timeframe and filter controls
  const filteredData = useMemo(() => {
    let inc = [...incomeData];
    let exp = [...expenseData];

    // Timeframe filter (Reference 1 tabs)
    if (timeframe !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (timeframe) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      inc = inc.filter(i => new Date(i.date) >= startDate);
      exp = exp.filter(e => new Date(e.date) >= startDate);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      inc = inc.filter(i => i.category === categoryFilter);
      exp = exp.filter(e => e.category === categoryFilter);
    }

    // Amount Range filter
    const applyAmount = (items: any[]) => {
      switch (amountRange) {
        case 'under1000':
          return items.filter(item => item.amount < 1000);
        case '1000to5000':
          return items.filter(item => item.amount >= 1000 && item.amount <= 5000);
        case '5000to10000':
          return items.filter(item => item.amount >= 5000 && item.amount <= 10000);
        case 'over10000':
          return items.filter(item => item.amount > 10000);
        default:
          return items;
      }
    };
    inc = applyAmount(inc);
    exp = applyAmount(exp);

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      inc = inc.filter(i => (i.source || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q));
      exp = exp.filter(e => (e.description || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q));
    }

    // Sorting
    const sortFn = (a: any, b: any) => {
      let aVal = a.date;
      let bVal = b.date;
      if (sortBy === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else if (sortBy === 'category') {
        aVal = a.category;
        bVal = b.category;
      }

      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    };

    inc.sort(sortFn);
    exp.sort(sortFn);

    return { filteredIncome: inc, filteredExpense: exp };
  }, [incomeData, expenseData, timeframe, categoryFilter, amountRange, searchQuery, sortBy, sortOrder]);

  const { filteredIncome, filteredExpense } = filteredData;

  // Aggregate Metrics
  const totalIncome = filteredIncome.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = filteredExpense.reduce((sum, e) => sum + e.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Trend Data for dense Area Chart (Reference 1)
  const allDates = Array.from(
    new Set([...filteredIncome.map(i => i.date), ...filteredExpense.map(e => e.date)])
  ).sort();

  const trendData = allDates.map(date => {
    const incSum = filteredIncome.filter(i => i.date === date).reduce((s, i) => s + i.amount, 0);
    const expSum = filteredExpense.filter(e => e.date === date).reduce((s, e) => s + e.amount, 0);
    return {
      date: date.slice(5), // MM-DD
      Income: incSum,
      Expense: expSum,
    };
  });

  // Category distributions
  const expenseCatMap: { [c: string]: number } = {};
  filteredExpense.forEach(e => {
    expenseCatMap[e.category || 'General'] = (expenseCatMap[e.category || 'General'] || 0) + e.amount;
  });
  const expenseByCategory = Object.entries(expenseCatMap).map(([category, value]) => ({
    category,
    value,
  }));

  const incomeSrcMap: { [s: string]: number } = {};
  filteredIncome.forEach(i => {
    incomeSrcMap[i.source || 'Other'] = (incomeSrcMap[i.source || 'Other'] || 0) + i.amount;
  });
  const incomeBySource = Object.entries(incomeSrcMap).map(([source, value]) => ({
    source,
    value,
  }));

  const allCategories = Array.from(
    new Set([...incomeData.map(i => i.category), ...expenseData.map(e => e.category)])
  );

  const exportCSV = () => {
    const headers = ['Type', 'Date', 'Name/Description', 'Category', 'Amount'];
    const rows = [
      ...filteredIncome.map(i => ['Income', i.date, i.source, i.category, i.amount]),
      ...filteredExpense.map(e => ['Expense', e.date, e.description, e.category, e.amount]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `basant_money_analytics_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics CSV report exported successfully');
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
        {/* 1. Hero Analytics Section (Reference 1: Ledgerix luxury header, dense chart, gauge) */}
        <AnalyticsHero
          netBalance={netSavings}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          trendData={trendData}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
        />

        {/* 2. Apple / VisionOS Neo-Glass Vitals with Dot-Matrix numbers (Reference 7 & 8) */}
        <NeoGlassVitals
          savingsRate={savingsRate}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          netSavings={netSavings}
        />

        {/* 3. Interactive Multi-Stage Sankey Cash Flow Diagram (Reference 5 & 6) */}
        <SankeyCashFlow
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          netSavings={netSavings}
          incomeBySource={incomeBySource}
          expenseByCategory={expenseByCategory}
        />

        {/* 4. Two-Column Layout: Heatmap (Ref 2) & Nightingale Rose Spectrum (Ref 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityHeatmap
            incomeData={filteredIncome}
            expenseData={filteredExpense}
          />

          <RoseCategoryChart
            categories={expenseByCategory}
            totalAmount={totalExpense}
          />
        </div>

        {/* 5. Organic Voronoi Pebble Mosaic Treemap (Reference 4) */}
        <PebbleMosaicChart
          categories={expenseByCategory}
          totalAmount={totalExpense}
        />

        {/* 6. Filter Controls & Search Drawer */}
        <Card className="ambient-glow-card relative overflow-hidden bg-card/90 dark:bg-black/50 border border-border/80 shadow-xl rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Ledger Drilldown & Filters
              </CardTitle>
              <CardDescription className="text-xs">
                Refine calculations by category, amount slice, or date span
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="gap-1.5 text-xs h-8"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1.5 text-xs h-8"
              >
                <Filter className="h-3.5 w-3.5" />
                {showFilters ? 'Hide' : 'Filter'}
                {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </CardHeader>

          {showFilters && (
            <CardContent className="pt-2 pb-5 border-t border-border/40 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Search query */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Search Narrative</label>
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. Salary, Groceries, Slice"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Category select */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount slice */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Amount Bracket</label>
                  <Select value={amountRange} onValueChange={setAmountRange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Amounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Amounts</SelectItem>
                      <SelectItem value="under1000">Under ₹1,000</SelectItem>
                      <SelectItem value="1000to5000">₹1,000 - ₹5,000</SelectItem>
                      <SelectItem value="5000to10000">₹5,000 - ₹10,000</SelectItem>
                      <SelectItem value="over10000">Over ₹10,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort order */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Sort Order</label>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="h-8 px-2.5"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 7. Audited Ledger Breakdown Table */}
        <Card className="ambient-glow-card relative overflow-hidden bg-card/90 dark:bg-black/50 border border-border/80 shadow-xl rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Ledger Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredIncome.length} income and {filteredExpense.length} expense entries
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[110px] text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Description / Source</TableHead>
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncome.slice(0, 15).map(inc => (
                    <TableRow key={`inc-${inc.id}`} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs">{inc.date}</TableCell>
                      <TableCell className="font-medium text-xs text-foreground flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {inc.source}
                        {inc.is_auto_interest && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-mono">
                            auto-yield
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inc.category || 'Income'}</TableCell>
                      <TableCell className="text-xs text-emerald-600 font-semibold">Inflow</TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-emerald-600">
                        +₹{inc.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredExpense.slice(0, 15).map(exp => (
                    <TableRow key={`exp-${exp.id}`} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs">{exp.date}</TableCell>
                      <TableCell className="font-medium text-xs text-foreground flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        {exp.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{exp.category || 'General'}</TableCell>
                      <TableCell className="text-xs text-rose-500 font-semibold">Outflow</TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-rose-500">
                        -₹{exp.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredIncome.length === 0 && filteredExpense.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                        No transactions found matching the selected timeframe and filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 8. Floating Query Bar with Polka-Dot Action Button (Reference 1 & 9) */}
      <AskPillBar
        netBalance={netSavings}
        savingsRate={savingsRate}
        totalIncome={totalIncome}
      />
    </div>
  );
};

export default Reports;
