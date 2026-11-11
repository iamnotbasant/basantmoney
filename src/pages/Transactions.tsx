import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Filter, 
  Trash2, 
  Loader2, 
  Download,
  Briefcase,
  Percent,
  Coins,
  Utensils,
  ShoppingBag,
  Car,
  Home,
  HeartPulse,
  Film,
  BookOpen,
  Tag,
  CreditCard,
  Wallet,
  Building2,
  Shield,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import {
  IconDigital,
  IconFinance,
  IconSimple,
  IconFast,
  IconSecure,
  IconFluid,
  IconPercent,
  IconFood,
  IconShopping,
  IconTransport,
  IconHome,
  IconCoins,
  IconWallet
} from '@/components/SolidPillIcons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { IncomeData, ExpenseData, Category } from '@/types/finance';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import TransactionsFilterBar from '@/components/TransactionsFilterBar';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useIncomeData } from '@/hooks/useIncomeData';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useAuth } from '@/components/AuthProvider';
import InterestBreakdownModal from '@/components/InterestBreakdownModal';
import { InterestService } from '@/services/interestService';
import { isMonthLocked } from '@/utils/interestEngine';
import { RotateCcw, ListFilter } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  source: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod?: string;
  is_auto_interest?: boolean;
  is_manually_edited?: boolean;
  auto_interest_status?: string;
}

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editData, setEditData] = useState({
    source: '',
    description: '',
    amount: '',
    date: '',
    category: '',
    paymentMethod: ''
  });
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedBreakdownMonth, setSelectedBreakdownMonth] = useState<string | null>(null);
  const [selectedBreakdownTotal, setSelectedBreakdownTotal] = useState<number | undefined>(undefined);

  // Supabase hooks for real-time data
  const { currentAccount } = useBankAccounts();
  const { incomeData: supabaseIncome, loading: incomeLoading, updateIncome, deleteIncome, refetch: refetchIncome } = useIncomeData(currentAccount?.id);
  const { expenseData: supabaseExpenses, loading: expenseLoading, updateExpense, deleteExpense, refetch: refetchExpenses } = useExpenseData(currentAccount?.id);

  // Convert Supabase data to Transaction format
  const transactions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 7);
    const incomeTransactions: Transaction[] = supabaseIncome.map(item => {
      const isAuto = Boolean((item as any).is_auto_interest);
      const isManualEdit = Boolean((item as any).is_manually_edited);
      const m = item.date.slice(0, 7);
      const fallbackStatus = m < todayStr ? 'locked' : 'estimated';

      return {
        id: item.id,
        type: 'income' as const,
        source: item.source,
        description: (item as any).notes || '',
        amount: Number(item.amount),
        date: item.date,
        category: item.category,
        paymentMethod: (item as any).payment_method || 'Not specified',
        is_auto_interest: isAuto,
        is_manually_edited: isManualEdit,
        auto_interest_status: (item as any).auto_interest_status || (isAuto ? fallbackStatus : undefined),
      };
    });

    const expenseTransactions: Transaction[] = supabaseExpenses.map(item => ({
      id: item.id,
      type: 'expense' as const,
      source: item.description,
      description: (item as any).notes || '',
      amount: Number(item.amount),
      date: item.date,
      category: item.category,
      paymentMethod: (item as any).payment_method || 'Not specified'
    }));

    return [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [supabaseIncome, supabaseExpenses]);

  useEffect(() => {
    loadPaymentMethods();
    loadCategories();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterType, filterCategory, filterPaymentMethod, filterMonth]);

  const loadCategories = () => {
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    }
  };

  const loadPaymentMethods = () => {
    const storedMethods = localStorage.getItem('paymentMethods');
    if (storedMethods) {
      setPaymentMethods(JSON.parse(storedMethods));
    }
  };

  const handleDoubleClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditData({
      source: transaction.source,
      description: transaction.description,
      amount: transaction.amount.toString(),
      date: transaction.date,
      category: transaction.category,
      paymentMethod: transaction.paymentMethod || ''
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editData.source.trim() || !editData.amount || !editData.date || !editData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newAmount = parseFloat(editData.amount);
    if (newAmount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!editingTransaction) return;

    try {
      if (editingTransaction.type === 'income') {
        const isAuto = editingTransaction.is_auto_interest;
        await updateIncome(editingTransaction.id, {
          source: editData.source,
          amount: newAmount,
          date: editData.date,
          category: editData.category,
          payment_method: editData.paymentMethod || null,
          notes: editData.description || null,
          ...(isAuto ? {
            is_manually_edited: true,
            auto_interest_status: 'manually_edited',
          } : {})
        } as any);
      } else {
        await updateExpense(editingTransaction.id, {
          description: editData.source,
          amount: newAmount,
          date: editData.date,
          category: editData.category,
          payment_method: editData.paymentMethod || null,
          notes: editData.description || null,
        } as any);
      }

      toast({
        title: "Success",
        description: "Transaction updated in backend",
      });
      
      setIsEditOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
    }
  };

  const handleResumeAutoUpdate = async (t: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isLocked = isMonthLocked(t.date.slice(0, 7));
      await updateIncome(t.id, {
        is_manually_edited: false,
        auto_interest_status: isLocked ? 'locked' : 'estimated',
      } as any);
      toast({
        title: "Auto-update Resumed",
        description: `Auto-updating restored for ${t.description || t.source}`,
      });
      refetchIncome();
      InterestService.recalculateInterest('manual', user?.id);
    } catch (err) {
      console.error('Error resuming auto update:', err);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;

    try {
      if (editingTransaction.type === 'income') {
        const success = await deleteIncome(editingTransaction.id);
        if (!success) {
          toast({
            title: "Error",
            description: "Failed to delete income transaction",
            variant: "destructive",
          });
          return;
        }

        if (editingTransaction.is_auto_interest) {
          toast({
            title: "Auto interest entry deleted",
            description: "Notice: The next interest job run will re-estimate or recreate this entry for unlocked months.",
          });
        }
      } else {
        const success = await deleteExpense(editingTransaction.id);
        if (!success) {
          toast({
            title: "Error",
            description: "Failed to delete expense transaction",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      
      setIsEditOpen(false);
      setIsDeleteAlertOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterMonth !== 'all') {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        const transactionMonthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
        return transactionMonthYear === filterMonth;
      });
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter(t => t.paymentMethod === filterPaymentMethod);
    }

    setFilteredTransactions(filtered);
  };

  const getUniqueCategories = () => {
    const categories = transactions.map(t => t.category);
    return [...new Set(categories)];
  };

  const getUniquePaymentMethods = () => {
    const methods = transactions.map(t => t.paymentMethod).filter(Boolean);
    return [...new Set(methods)];
  };

  const getUniqueMonths = () => {
    const monthSet = new Set<string>();
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      monthSet.add(monthYear);
    });
    // Sort months chronologically, newest first
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  };

  const formatMonthForDisplay = (monthYear: string) => {
    if (!monthYear || monthYear === 'all') return 'All Months';
    const [year, month] = monthYear.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getPaymentMethodColor = (methodName: string) => {
    const method = paymentMethods.find(m => m.name === methodName);
    return method?.color || '#6B7280';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCategoryTagStyle = (categoryName: string) => {
    const c = (categoryName || '').toLowerCase();
    if (c.includes('interest')) {
      return {
        icon: IconPercent,
        borderClass: 'border-emerald-500 dark:border-emerald-500',
        bgClass: 'bg-emerald-50/90 dark:bg-emerald-950/40',
        textClass: 'text-emerald-800 dark:text-emerald-200',
        squircleBgClass: 'bg-emerald-200 dark:bg-emerald-800/70',
        iconColorClass: 'text-emerald-700 dark:text-emerald-200'
      };
    }
    if (c.includes('salary') || c.includes('freelance') || c.includes('job') || c.includes('work') || c.includes('business')) {
      return {
        icon: IconFinance,
        borderClass: 'border-teal-500 dark:border-teal-500',
        bgClass: 'bg-teal-50/90 dark:bg-teal-950/40',
        textClass: 'text-teal-800 dark:text-teal-200',
        squircleBgClass: 'bg-teal-200 dark:bg-teal-800/70',
        iconColorClass: 'text-teal-700 dark:text-teal-200'
      };
    }
    if (c.includes('food') || c.includes('grocer') || c.includes('rest') || c.includes('dining')) {
      return {
        icon: IconFood,
        borderClass: 'border-orange-500 dark:border-orange-500',
        bgClass: 'bg-orange-50/90 dark:bg-orange-950/40',
        textClass: 'text-orange-900 dark:text-orange-200',
        squircleBgClass: 'bg-orange-200 dark:bg-orange-800/70',
        iconColorClass: 'text-orange-700 dark:text-orange-200'
      };
    }
    if (c.includes('shop') || c.includes('cloth') || c.includes('mall') || c.includes('store')) {
      return {
        icon: IconShopping,
        borderClass: 'border-violet-500 dark:border-violet-500',
        bgClass: 'bg-violet-50/90 dark:bg-violet-950/40',
        textClass: 'text-violet-800 dark:text-violet-200',
        squircleBgClass: 'bg-violet-200 dark:bg-violet-800/70',
        iconColorClass: 'text-violet-700 dark:text-violet-200'
      };
    }
    if (c.includes('travel') || c.includes('fuel') || c.includes('cab') || c.includes('uber') || c.includes('car') || c.includes('transport')) {
      return {
        icon: IconTransport,
        borderClass: 'border-amber-500 dark:border-amber-500',
        bgClass: 'bg-amber-50/90 dark:bg-amber-950/40',
        textClass: 'text-amber-900 dark:text-amber-200',
        squircleBgClass: 'bg-amber-200 dark:bg-amber-800/70',
        iconColorClass: 'text-amber-700 dark:text-amber-200'
      };
    }
    if (c.includes('rent') || c.includes('bill') || c.includes('home') || c.includes('util') || c.includes('house')) {
      return {
        icon: IconHome,
        borderClass: 'border-sky-500 dark:border-sky-500',
        bgClass: 'bg-sky-50/90 dark:bg-sky-950/40',
        textClass: 'text-sky-800 dark:text-sky-200',
        squircleBgClass: 'bg-sky-200 dark:bg-sky-800/70',
        iconColorClass: 'text-sky-700 dark:text-sky-200'
      };
    }
    if (c.includes('health') || c.includes('med') || c.includes('doctor') || c.includes('gym')) {
      return {
        icon: HeartPulse,
        borderClass: 'border-rose-500 dark:border-rose-500',
        bgClass: 'bg-rose-50/90 dark:bg-rose-950/40',
        textClass: 'text-rose-800 dark:text-rose-200',
        squircleBgClass: 'bg-rose-200 dark:bg-rose-800/70',
        iconColorClass: 'text-rose-700 dark:text-rose-200'
      };
    }
    if (c.includes('entertain') || c.includes('movie') || c.includes('subscript') || c.includes('game')) {
      return {
        icon: Film,
        borderClass: 'border-pink-500 dark:border-pink-500',
        bgClass: 'bg-pink-50/90 dark:bg-pink-950/40',
        textClass: 'text-pink-800 dark:text-pink-200',
        squircleBgClass: 'bg-pink-200 dark:bg-pink-800/70',
        iconColorClass: 'text-pink-700 dark:text-pink-200'
      };
    }
    if (c.includes('education') || c.includes('book') || c.includes('course') || c.includes('study')) {
      return {
        icon: BookOpen,
        borderClass: 'border-indigo-600 dark:border-indigo-500',
        bgClass: 'bg-indigo-50/90 dark:bg-indigo-950/40',
        textClass: 'text-indigo-900 dark:text-indigo-200',
        squircleBgClass: 'bg-indigo-200 dark:bg-indigo-800/70',
        iconColorClass: 'text-indigo-800 dark:text-indigo-200'
      };
    }
    return {
      icon: IconSimple,
      borderClass: 'border-blue-500 dark:border-blue-500',
      bgClass: 'bg-blue-50/90 dark:bg-blue-950/40',
      textClass: 'text-blue-800 dark:text-blue-200',
      squircleBgClass: 'bg-blue-200 dark:bg-blue-800/70',
      iconColorClass: 'text-blue-700 dark:text-blue-200'
    };
  };

  const getPaymentMethodTagStyle = (methodName: string) => {
    const m = (methodName || '').toLowerCase();
    if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe') || m.includes('paytm')) {
      return {
        icon: IconFluid,
        borderClass: 'border-cyan-500 dark:border-cyan-500',
        bgClass: 'bg-cyan-50/90 dark:bg-cyan-950/40',
        textClass: 'text-cyan-800 dark:text-cyan-200',
        squircleBgClass: 'bg-cyan-200 dark:bg-cyan-800/70',
        iconColorClass: 'text-cyan-700 dark:text-cyan-200'
      };
    }
    if (m.includes('card') || m.includes('credit') || m.includes('debit')) {
      return {
        icon: IconSecure,
        borderClass: 'border-indigo-700 dark:border-indigo-500',
        bgClass: 'bg-indigo-50/90 dark:bg-indigo-950/40',
        textClass: 'text-indigo-900 dark:text-indigo-200',
        squircleBgClass: 'bg-indigo-200 dark:bg-indigo-800/70',
        iconColorClass: 'text-indigo-800 dark:text-indigo-200'
      };
    }
    if (m.includes('bank') || m.includes('net') || m.includes('transfer') || m.includes('slice')) {
      return {
        icon: IconDigital,
        borderClass: 'border-blue-500 dark:border-blue-500',
        bgClass: 'bg-blue-50/90 dark:bg-blue-950/40',
        textClass: 'text-blue-800 dark:text-blue-200',
        squircleBgClass: 'bg-blue-200 dark:bg-blue-800/70',
        iconColorClass: 'text-blue-700 dark:text-blue-200'
      };
    }
    if (m.includes('cash')) {
      return {
        icon: IconCoins,
        borderClass: 'border-emerald-600 dark:border-emerald-500',
        bgClass: 'bg-emerald-50/90 dark:bg-emerald-950/40',
        textClass: 'text-emerald-800 dark:text-emerald-200',
        squircleBgClass: 'bg-emerald-200 dark:bg-emerald-800/70',
        iconColorClass: 'text-emerald-700 dark:text-emerald-200'
      };
    }
    return {
      icon: IconWallet,
      borderClass: 'border-violet-500 dark:border-violet-500',
      bgClass: 'bg-violet-50/90 dark:bg-violet-950/40',
      textClass: 'text-violet-800 dark:text-violet-200',
      squircleBgClass: 'bg-violet-200 dark:bg-violet-800/70',
      iconColorClass: 'text-violet-700 dark:text-violet-200'
    };
  };

  const getFilteredCategories = () => {
    if (!editingTransaction) return [];
    return categories.filter((cat: Category) => cat.type === editingTransaction.type);
  };

  const isLoading = incomeLoading || expenseLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading transactions from backend...</p>
          </div>
        </div>
      </div>
    );
  }

  const exportData = (format: 'csv' | 'json') => {
    const list = [...filteredTransactions].sort((a, b) => a.date.localeCompare(b.date));
    if (list.length === 0) {
      toast({ title: 'Nothing to export', description: 'No transactions match the current filters.' });
      return;
    }
    const firstDate = list[0].date;
    const startingBalance = transactions
      .filter(t => t.date < firstDate)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    let running = startingBalance;
    const rows = list.map(t => {
      running += t.type === 'income' ? t.amount : -t.amount;
      return {
        date: t.date,
        type: t.type,
        source: t.source,
        description: t.description,
        category: t.category,
        payment_method: t.paymentMethod || '',
        credit: t.type === 'income' ? t.amount : 0,
        debit: t.type === 'expense' ? t.amount : 0,
        balance: Number(running.toFixed(2)),
      };
    });
    const totalIncome = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalBalance = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const summary = {
      exported_on: new Date().toLocaleString('en-IN'),
      filters: { type: filterType, month: filterMonth, category: filterCategory, payment_method: filterPaymentMethod },
      from_date: firstDate,
      to_date: list[list.length - 1].date,
      starting_balance: Number(startingBalance.toFixed(2)),
      total_income: Number(totalIncome.toFixed(2)),
      total_expense: Number(totalExpense.toFixed(2)),
      closing_balance: Number(running.toFixed(2)),
      total_balance_all_time: Number(totalBalance.toFixed(2)),
      transaction_count: list.length,
    };

    let content: string;
    let mime: string;
    if (format === 'json') {
      content = JSON.stringify({ summary, transactions: rows }, null, 2);
      mime = 'application/json';
    } else {
      const esc = (v: unknown) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [
        ['Statement Summary'],
        ['Exported On', summary.exported_on],
        ['From Date', summary.from_date],
        ['To Date', summary.to_date],
        ['Starting Balance', summary.starting_balance],
        ['Total Income', summary.total_income],
        ['Total Expense', summary.total_expense],
        ['Closing Balance', summary.closing_balance],
        ['Total Balance (All Time)', summary.total_balance_all_time],
        ['Transactions', summary.transaction_count],
        [],
        ['Date', 'Type', 'Source', 'Description', 'Category', 'Payment Method', 'Credit', 'Debit', 'Balance'],
        ...rows.map(r => [r.date, r.type, r.source, r.description, r.category, r.payment_method, r.credit, r.debit, r.balance]),
      ];
      content = lines.map(l => l.map(esc).join(',')).join('\n');
      mime = 'text/csv';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${list.length} transactions downloaded as ${format.toUpperCase()}` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Transactions
          </h1>
          <p className="text-muted-foreground text-lg">Track and manage all your financial activities - Double click to edit</p>
        </div>

        {/* Actions and Filters */}
        <Card className="mb-8 animate-fade-in">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button 
                  onClick={() => navigate('/income')}
                  className="h-10 gap-2 px-4 font-semibold transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Income
                </Button>
                <Button 
                  onClick={() => navigate('/expense')}
                  variant="outline"
                  className="h-10 gap-2 px-4 font-semibold transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Button>
                <Button variant="outline" onClick={() => exportData('csv')} className="h-10 gap-2 px-4 font-semibold transition-colors">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => exportData('json')} className="h-10 gap-2 px-4 font-semibold transition-colors">
                  <Download className="h-4 w-4" />
                  Export JSON
                </Button>
              </div>

              <div className="border-t pt-4">
                <TransactionsFilterBar
                  filterType={filterType}
                  setFilterType={setFilterType}
                  filterMonth={filterMonth}
                  setFilterMonth={setFilterMonth}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  getUniqueMonths={getUniqueMonths}
                  formatMonthForDisplay={formatMonthForDisplay}
                  getUniqueCategories={getUniqueCategories}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl text-foreground flex items-center gap-3">
              Transaction History
              <span className="ml-2 text-sm font-normal text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {filteredTransactions.length} transactions
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                 <TableHeader>
                   <TableRow className="border-b-2">
                     <TableHead className="font-semibold text-base w-[120px]">Date</TableHead>
                     <TableHead className="font-semibold text-base w-[200px]">Source</TableHead>
                     <TableHead className="font-semibold text-base w-[200px]">Description</TableHead>
                     <TableHead className="font-semibold text-base w-[140px]">Category</TableHead>
                     <TableHead className="font-semibold text-base w-[180px]">Payment Method</TableHead>
                     <TableHead className="text-right font-semibold text-base w-[140px]">Amount</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction, index) => (
                      <TableRow 
                        key={`${transaction.type}-${transaction.id}`} 
                        className="hover:bg-muted/30 transition-all duration-200 animate-fade-in cursor-pointer border-b"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onDoubleClick={() => handleDoubleClick(transaction)}
                        title="Double click to edit"
                      >
                         <TableCell className="text-muted-foreground py-4 text-sm">
                           {formatDate(transaction.date)}
                         </TableCell>
                         <TableCell className="font-medium text-foreground py-4 text-sm">
                           <div className="flex items-center gap-2">
                             <span>{transaction.source}</span>
                             {transaction.is_auto_interest && (
                               <span
                                 className={cn(
                                   "inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full border-2 text-[11px] font-semibold cursor-pointer shadow-sm transition-all select-none",
                                   transaction.is_manually_edited
                                     ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                                     : transaction.auto_interest_status === 'locked'
                                     ? "border-slate-500 bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                                     : "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                                 )}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                                   setSelectedBreakdownTotal(transaction.amount);
                                 }}
                                 title="Click to view daily interest breakdown"
                               >
                                 <span className={cn(
                                   "w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0",
                                   transaction.is_manually_edited
                                     ? "bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200"
                                     : transaction.auto_interest_status === 'locked'
                                     ? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                     : "bg-emerald-200 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-200"
                                 )}>
                                   {transaction.is_manually_edited ? (
                                     <RotateCcw className="h-2.5 w-2.5" />
                                   ) : transaction.auto_interest_status === 'locked' ? (
                                     <Shield className="h-2.5 w-2.5" />
                                   ) : (
                                     <Percent className="h-2.5 w-2.5" />
                                   )}
                                 </span>
                                 <span>
                                   {transaction.is_manually_edited
                                     ? 'Manually edited'
                                     : transaction.auto_interest_status === 'locked'
                                     ? 'Auto • Locked'
                                     : 'Auto • Estimated'}
                                 </span>
                               </span>
                             )}
                           </div>
                         </TableCell>
                         <TableCell className="text-muted-foreground py-4 text-sm">
                           <div className="flex items-center justify-between gap-2">
                             <span>{transaction.description || '-'}</span>
                             {transaction.is_auto_interest && (
                               <div className="flex items-center gap-1.5">
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-6 px-1.5 text-xs text-primary hover:underline"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                                     setSelectedBreakdownTotal(transaction.amount);
                                   }}
                                 >
                                   Daily breakdown
                                 </Button>
                                 {transaction.is_manually_edited && (
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     className="h-6 px-2 text-[11px] text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-500/40 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-500/40 dark:hover:bg-amber-500/10"
                                     onClick={(e) => handleResumeAutoUpdate(transaction, e)}
                                   >
                                     Resume auto-update
                                   </Button>
                                 )}
                                </div>
                             )}
                           </div>
                         </TableCell>
                        <TableCell className="py-4">
                          {(() => {
                            const cat = getCategoryTagStyle(transaction.category);
                            const CatIcon = cat.icon;
                            return (
                              <span className={cn(
                                "inline-flex items-center gap-2 p-0.5 pl-1 pr-3 rounded-full border-2 shadow-sm text-xs font-bold tracking-tight select-none transition-all",
                                cat.borderClass,
                                cat.bgClass,
                                cat.textClass
                              )}>
                                <span className={cn(
                                  "w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
                                  cat.squircleBgClass,
                                  cat.iconColorClass
                                )}>
                                  <CatIcon className="h-4 w-4" />
                                </span>
                                <span className="truncate max-w-[130px]">{transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}</span>
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="py-4">
                          {(() => {
                            const pm = getPaymentMethodTagStyle(transaction.paymentMethod || '');
                            const PmIcon = pm.icon;
                            return (
                              <span className={cn(
                                "inline-flex items-center gap-2 p-0.5 pl-1 pr-3 rounded-full border-2 shadow-sm text-xs font-bold tracking-tight select-none transition-all",
                                pm.borderClass,
                                pm.bgClass,
                                pm.textClass
                              )}>
                                <span className={cn(
                                  "w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
                                  pm.squircleBgClass,
                                  pm.iconColorClass
                                )}>
                                  <PmIcon className="h-4 w-4" />
                                </span>
                                <span className="truncate max-w-[140px]">{transaction.paymentMethod || 'Not specified'}</span>
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <span className={`font-bold text-lg transition-all duration-200 ${
                            transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-4 animate-fade-in">
                          <div className="text-center">
                            <p className="text-xl font-semibold mb-2">No transactions found</p>
                            <p className="text-sm">Start by adding your first income or expense</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction, index) => (
                  <div 
                    key={`${transaction.type}-${transaction.id}`} 
                    className="p-4 hover:bg-muted/50 transition-all duration-200 animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onDoubleClick={() => handleDoubleClick(transaction)}
                  >
                    {/* Card: First Date, then Description, then rest */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{formatDate(transaction.date)}</span>
                      <span className={`font-bold text-lg ${
                        transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground text-lg">{transaction.source}</h3>
                      {transaction.is_auto_interest && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full border-2 text-[10px] font-semibold cursor-pointer shadow-sm transition-all select-none",
                            transaction.is_manually_edited
                              ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                              : transaction.auto_interest_status === 'locked'
                              ? "border-slate-500 bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                              : "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                            setSelectedBreakdownTotal(transaction.amount);
                          }}
                        >
                          <span className={cn(
                            "w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0",
                            transaction.is_manually_edited
                              ? "bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200"
                              : transaction.auto_interest_status === 'locked'
                              ? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                              : "bg-emerald-200 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-200"
                          )}>
                            {transaction.is_manually_edited ? (
                              <RotateCcw className="h-2.5 w-2.5" />
                            ) : transaction.auto_interest_status === 'locked' ? (
                              <IconSecure className="h-2.5 w-2.5" />
                            ) : (
                              <IconPercent className="h-2.5 w-2.5" />
                            )}
                          </span>
                          <span>
                            {transaction.is_manually_edited
                              ? 'Manually edited'
                              : transaction.auto_interest_status === 'locked'
                              ? 'Auto • Locked'
                              : 'Auto • Estimated'}
                          </span>
                        </span>
                      )}
                    </div>
                    {transaction.description && (
                      <p className="text-muted-foreground mb-2 text-sm">{transaction.description}</p>
                    )}
                    {transaction.is_auto_interest && (
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                            setSelectedBreakdownTotal(transaction.amount);
                          }}
                        >
                          Daily breakdown
                        </Button>
                        {transaction.is_manually_edited && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-500/40"
                            onClick={(e) => handleResumeAutoUpdate(transaction, e)}
                          >
                            Resume auto-update
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span 
                        className={cn(
                          "inline-flex items-center gap-1.5 p-0.5 pl-1 pr-2.5 rounded-full border-2 text-xs font-bold shadow-sm transition-all select-none",
                          transaction.type === 'income' 
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" 
                            : "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                        )}
                      >
                        <span className={cn(
                          "w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0",
                          transaction.type === 'income' ? "bg-emerald-200 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-200" : "bg-rose-200 dark:bg-rose-800/60 text-rose-700 dark:text-rose-200"
                        )}>
                          {transaction.type === 'income' ? (
                            <ArrowDownLeft className="h-3.5 w-3.5 stroke-[2.5]" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                          )}
                        </span>
                        <span>{transaction.type === 'income' ? 'Income' : 'Expense'}</span>
                      </span>

                      {(() => {
                        const cat = getCategoryTagStyle(transaction.category);
                        const CatIcon = cat.icon;
                        return (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 p-0.5 pl-1 pr-2.5 rounded-full border-2 text-xs font-bold shadow-sm transition-all select-none",
                            cat.borderClass,
                            cat.bgClass,
                            cat.textClass
                          )}>
                            <span className={cn(
                              "w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0",
                              cat.squircleBgClass,
                              cat.iconColorClass
                            )}>
                              <CatIcon className="h-3.5 w-3.5" />
                            </span>
                            <span>{transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}</span>
                          </span>
                        );
                      })()}

                      {(() => {
                        const pm = getPaymentMethodTagStyle(transaction.paymentMethod || '');
                        const PmIcon = pm.icon;
                        return (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 p-0.5 pl-1 pr-2.5 rounded-full border-2 text-xs font-bold shadow-sm transition-all select-none",
                            pm.borderClass,
                            pm.bgClass,
                            pm.textClass
                          )}>
                            <span className={cn(
                              "w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0",
                              pm.squircleBgClass,
                              pm.iconColorClass
                            )}>
                              <PmIcon className="h-3.5 w-3.5" />
                            </span>
                            <span>{transaction.paymentMethod || 'Not specified'}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Double tap to edit</p>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-muted-foreground animate-fade-in">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-center mb-6">
                      <p className="text-xl font-semibold mb-2">No transactions found</p>
                      <p className="text-sm">Start by adding your first income or expense</p>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        size="sm" 
                        onClick={() => navigate('/income')} 
                      >
                        Add Income
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => navigate('/expense')}
                        variant="outline"
                      >
                        Add Expense
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Make changes to your transaction here.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="source">
                  {editingTransaction?.type === 'income' ? 'Source' : 'Source/Shop'}
                </Label>
                <Input
                  id="source"
                  value={editData.source}
                  onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                  placeholder={editingTransaction?.type === 'income' ? 'Client/Company name' : 'Shop/Store name'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description/Notes</Label>
                <Input
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Description or reason (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={editData.category} onValueChange={(value) => setEditData({ ...editData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredCategories().map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={editData.paymentMethod} onValueChange={(value) => setEditData({ ...editData, paymentMethod: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: method.color }}
                          />
                          {method.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="flex justify-between items-center">
              <Button 
                variant="destructive" 
                onClick={() => setIsDeleteAlertOpen(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEdit}>Save Changes</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this transaction
                from your account ledger.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Delete Transaction
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Daily Interest Breakdown Modal (Spec §2b) */}
        <InterestBreakdownModal
          isOpen={Boolean(selectedBreakdownMonth)}
          onClose={() => setSelectedBreakdownMonth(null)}
          yearMonth={selectedBreakdownMonth}
          userId={user?.id}
          entryTotal={selectedBreakdownTotal}
        />
      </main>
    </div>
  );
};

export default Transactions;
