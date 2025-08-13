import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
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
import { Calendar, DollarSign, Scale, ArrowRightLeft, TrendingUp, TrendingDown, PieChart, BarChart3, Filter, SortAsc, SortDesc } from 'lucide-react';
import { IncomeData, ExpenseData } from '@/types/finance';
import { ChartContainer } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart,
  Scatter,
  ScatterChart,
  RadialBarChart,
  RadialBar
} from 'recharts';

const COLORS = ["#60a5fa", "#f472b6", "#22d3ee", "#f59e42", "#6ee7b7", "#facc15", "#f87171", "#818cf8", "#e0e7ff", "#64748b"];
const DONUT_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#84cc16"];

const Reports = () => {
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [filteredIncomeData, setFilteredIncomeData] = useState<IncomeData[]>([]);
  const [filteredExpenseData, setFilteredExpenseData] = useState<ExpenseData[]>([]);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [amountRange, setAmountRange] = useState<string>('all');

  useEffect(() => {
    // Load data from localStorage with correct storage keys used by WalletService
    const loadData = () => {
      try {
        const bankId = localStorage.getItem('currentBankAccountId') || '';
        const incomeKey = bankId ? `incomeData:${bankId}` : 'incomeData';
        const expenseKey = bankId ? `expenseData:${bankId}` : 'expenseData';
        
        // Try the correctly formatted keys first, then fallback to simple keys
        const storedIncome = localStorage.getItem(incomeKey) || localStorage.getItem('incomeData');
        const storedExpenses = localStorage.getItem(expenseKey) || localStorage.getItem('expenseData');
        
        const income = storedIncome ? JSON.parse(storedIncome) : [];
        const expenses = storedExpenses ? JSON.parse(storedExpenses) : [];
        
        setIncomeData(income);
        setFilteredIncomeData(income);
        setExpenseData(expenses);
        setFilteredExpenseData(expenses);
        
        console.log('Reports data loaded successfully:', { 
          incomeKey,
          expenseKey,
          income: income.length, 
          expenses: expenses.length,
          incomeTotal: income.reduce((s: number, i: any) => s + i.amount, 0),
          expenseTotal: expenses.reduce((s: number, e: any) => s + e.amount, 0)
        });
      } catch (error) {
        console.error('Error loading financial data for reports:', error);
        setIncomeData([]);
        setFilteredIncomeData([]);
        setExpenseData([]);
        setFilteredExpenseData([]);
      }
    };

    loadData();
    
    // Add event listeners for data changes to update reports in real-time
    const handleDataChange = (e: Event) => {
      console.log('Financial data changed, reloading reports...');
      loadData();
    };

    // Listen for custom events that indicate data changes
    window.addEventListener('walletDataChanged', handleDataChange);
    window.addEventListener('bankAccountChanged', handleDataChange);
    
    // Add storage event listener for changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('incomeData') || e.key?.includes('expenseData')) {
        console.log('Storage changed for financial data, reloading...');
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('walletDataChanged', handleDataChange);
      window.removeEventListener('bankAccountChanged', handleDataChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Apply filters
  useEffect(() => {
    let filteredIncome = [...incomeData];
    let filteredExpense = [...expenseData];

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateFilter) {
        case 'last7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'last30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'last3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'last6months':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case 'lastyear':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filteredIncome = filteredIncome.filter(item => new Date(item.date) >= startDate);
      filteredExpense = filteredExpense.filter(item => new Date(item.date) >= startDate);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filteredIncome = filteredIncome.filter(item => item.category === categoryFilter);
      filteredExpense = filteredExpense.filter(item => item.category === categoryFilter);
    }

    // Amount range filter
    if (amountRange !== 'all') {
      const applyAmountFilter = (items: any[]) => {
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
      filteredIncome = applyAmountFilter(filteredIncome);
      filteredExpense = applyAmountFilter(filteredExpense);
    }

    // Sorting
    const sortFunction = (a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'date':
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    };

    filteredIncome.sort(sortFunction);
    filteredExpense.sort(sortFunction);

    setFilteredIncomeData(filteredIncome);
    setFilteredExpenseData(filteredExpense);
  }, [incomeData, expenseData, dateFilter, categoryFilter, sortBy, sortOrder, amountRange]);

  // Get unique categories for filter dropdown
  const allCategories = Array.from(new Set([
    ...incomeData.map(i => i.category),
    ...expenseData.map(e => e.category)
  ]));

  const clearFilters = () => {
    setDateFilter('all');
    setCategoryFilter('all');
    setSortBy('date');
    setSortOrder('desc');
    setAmountRange('all');
  };

  // Prepare chart data using filtered data
  const allDates = Array.from(
    new Set([
      ...filteredIncomeData.map(i => i.date),
      ...filteredExpenseData.map(e => e.date)
    ])
  ).sort();

  const trendData = allDates.map(date => {
    const incomeTotal = filteredIncomeData.filter(i => i.date === date).reduce((sum, i) => sum + i.amount, 0);
    const expenseTotal = filteredExpenseData.filter(e => e.date === date).reduce((sum, e) => sum + e.amount, 0);
    return { date, Income: incomeTotal, Expense: expenseTotal };
  });

  const expenseCategoryMap: {[cat: string]: number} = {};
  filteredExpenseData.forEach(e => {
    expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] || 0) + e.amount;
  });
  const expenseCategories = Object.entries(expenseCategoryMap).map(([category, value]) => ({
    category, value
  }));

  const incomeSourceMap: {[source: string]: number} = {};
  filteredIncomeData.forEach(i => {
    incomeSourceMap[i.source] = (incomeSourceMap[i.source] || 0) + i.amount;
  });
  const incomeBySource = Object.entries(incomeSourceMap).map(([source, value]) => ({
    source, value
  }));

  const incomeCategoryMap: {[cat: string]: number} = {};
  filteredIncomeData.forEach(i => {
    incomeCategoryMap[i.category] = (incomeCategoryMap[i.category] || 0) + i.amount;
  });
  const incomeByCategory = Object.entries(incomeCategoryMap).map(([category, value]) => ({
    category, value
  }));

  const totalIncome = filteredIncomeData.reduce((s, i) => s + i.amount, 0);
  const totalExpense = filteredExpenseData.reduce((s, e) => s + e.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const totalTransactions = filteredIncomeData.length + filteredExpenseData.length;
  const pieData = [
    { name: "Total Income", value: totalIncome },
    { name: "Total Expense", value: totalExpense }
  ];

  const processedExpenses = filteredExpenseData.map(expense => ({
    ...expense,
    primaryDeduction: expense.deductions?.[0]?.type || 'unknown'
  }));

  const monthlyData = Array.from(
    new Set([...filteredIncomeData.map(i => i.date.substring(0, 7)), ...filteredExpenseData.map(e => e.date.substring(0, 7))])
  ).sort().map(month => {
    const monthIncome = filteredIncomeData.filter(i => i.date.startsWith(month)).reduce((sum, i) => sum + i.amount, 0);
    const monthExpense = filteredExpenseData.filter(e => e.date.startsWith(month)).reduce((sum, e) => sum + e.amount, 0);
    return { 
      month: month,
      Income: monthIncome, 
      Expense: monthExpense,
      Savings: monthIncome - monthExpense
    };
  });

  const dailySpending = filteredExpenseData.reduce((acc: {[key: string]: number}, expense) => {
    const day = new Date(expense.date).toLocaleDateString('en-US', { weekday: 'long' });
    acc[day] = (acc[day] || 0) + expense.amount;
    return acc;
  }, {});
  const dailySpendingData = Object.entries(dailySpending).map(([day, amount]) => ({ day, amount }));

  const scatterData = trendData.map((item, index) => ({
    x: item.Income,
    y: item.Expense,
    z: index + 1
  }));

  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;
  const radialData = [
    { name: 'Savings Rate', value: Math.max(0, savingsRate), fill: savingsRate > 0 ? '#10b981' : '#ef4444' }
  ];

  const topSpendingCategories = expenseCategories
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({ ...item, fill: DONUT_COLORS[index] }));

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold">📊 Financial Reports Dashboard</CardTitle>
          <CardDescription className="text-sm sm:text-base">Comprehensive analytics and visualizations of your financial data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter Controls */}
          <Card className="bg-gray-50 border-2 border-dashed border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Sort Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="last7days">Last 7 Days</SelectItem>
                      <SelectItem value="last30days">Last 30 Days</SelectItem>
                      <SelectItem value="last3months">Last 3 Months</SelectItem>
                      <SelectItem value="last6months">Last 6 Months</SelectItem>
                      <SelectItem value="lastyear">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {allCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Range</label>
                  <Select value={amountRange} onValueChange={setAmountRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select amount range" />
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Order</label>
                  <div className="flex gap-2">
                    <Button
                      variant={sortOrder === 'asc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortOrder('asc')}
                      className="flex-1"
                    >
                      <SortAsc className="h-4 w-4 mr-1" />
                      Asc
                    </Button>
                    <Button
                      variant={sortOrder === 'desc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortOrder('desc')}
                      className="flex-1"
                    >
                      <SortDesc className="h-4 w-4 mr-1" />
                      Desc
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-sm text-gray-600">
                  Showing {filteredIncomeData.length} income entries and {filteredExpenseData.length} expense entries
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards - Improved responsive layout with better animations */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredIncomeData.length} transactions
                </p>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-red-500">₹{totalExpense.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredExpenseData.length} transactions
                </p>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Net Savings</CardTitle>
                <Scale className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg sm:text-2xl font-bold ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{netSavings.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {netSavings >= 0 ? 'Surplus' : 'Deficit'}
                </p>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Savings Rate</CardTitle>
                <PieChart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg sm:text-2xl font-bold ${savingsRate >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {savingsRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {savingsRate >= 0 ? 'Healthy' : 'Needs improvement'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Trend Chart - Full width with better height */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-center flex items-center justify-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Income vs Expense Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{Income: {color: COLORS[0]}, Expense: {color: COLORS[1]}}}>
                <div className="h-[350px]">
                  <ResponsiveContainer>
                    <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '14px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="Income" 
                        stroke={COLORS[0]} 
                        strokeWidth={3} 
                        dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: COLORS[0], strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Expense" 
                        stroke={COLORS[1]} 
                        strokeWidth={3} 
                        dot={{ fill: COLORS[1], strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: COLORS[1], strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Two Column Layout for Medium Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Area Chart */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg font-semibold text-center">📈 Monthly Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 11 }}
                        className="text-xs"
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Income" 
                        stackId="1" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Expense" 
                        stackId="2" 
                        stroke="#ef4444" 
                        fill="#ef4444" 
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Savings Rate Radial Chart */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg font-semibold text-center">🎯 Savings Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="50%" outerRadius="85%" data={radialData}>
                      <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        fill={radialData[0]?.fill}
                        background={{ fill: '#f3f4f6' }}
                      />
                      <text 
                        x="50%" 
                        y="50%" 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        className="text-xl sm:text-2xl font-bold fill-current"
                      >
                        {savingsRate.toFixed(1)}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Three Column Layout for Smaller Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Top Spending Donut */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold text-center">🍩 Top Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPieChart>
                      <Pie
                        data={topSpendingCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {topSpendingCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Daily Spending Pattern */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold text-center">📅 Daily Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailySpendingData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="day" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {dailySpendingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Income vs Expense Scatter */}
            <Card className="shadow-lg md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold text-center">💰 Spend vs Earn</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart data={scatterData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="x" 
                        name="Income" 
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        dataKey="y" 
                        name="Expense" 
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Scatter dataKey="y" fill="#06b6d4" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout for Category Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Expense Categories */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg font-semibold text-center">📊 Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={expenseCategories} layout="horizontal" margin={{ top: 10, right: 10, left: 80, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis 
                        dataKey="category" 
                        type="category" 
                        width={75}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {expenseCategories.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[(idx + 2) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            
            {/* Income Sources */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg font-semibold text-center">💼 Income Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={incomeBySource} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="source" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {incomeBySource.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[(idx + 4) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Financial Overview Pie - Full Width */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-center">🥧 Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}}>
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => `${name}: ₹${value.toLocaleString()} (${(percent * 100).toFixed(1)}%)`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Data Tables */}
          <div className="space-y-6">
            {/* Income Report Table */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Filtered Income Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption>A summary of your filtered income data.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncomeData.map((income) => (
                        <TableRow key={income.id}>
                          <TableCell className="font-medium">{income.date}</TableCell>
                          <TableCell>{income.source}</TableCell>
                          <TableCell>{income.category}</TableCell>
                          <TableCell className="text-right">₹{income.amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Expense Report Table */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Filtered Expense Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption>A summary of your filtered expense data.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Primary Deduction</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.date}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>{expense.primaryDeduction}</TableCell>
                          <TableCell className="text-right">₹{expense.amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
