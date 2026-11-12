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
  IconWallet,
  IconLocked,
  IconEstimated,
  IconManuallyEdited
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
        bgClass: 'bg-emerald-50/90 dark:bg-emerald-950/40',
        textClass: 'text-emerald-800 dark:text-emerald-200',
        iconColorClass: 'text-emerald-700 dark:text-emerald-200'
      };
    }
    if (c.includes('salary') || c.includes('freelance') || c.includes('job') || c.includes('work') || c.includes('business')) {
      return {
        icon: IconFinance,
        bgClass: 'bg-teal-50/90 dark:bg-teal-950/40',
        textClass: 'text-teal-800 dark:text-teal-200',
        iconColorClass: 'text-teal-700 dark:text-teal-200'
      };
    }
    if (c.includes('food') || c.includes('grocer') || c.includes('rest') || c.includes('dining')) {
      return {
        icon: IconFood,
        bgClass: 'bg-orange-50/90 dark:bg-orange-950/40',
        textClass: 'text-orange-900 dark:text-orange-200',
        iconColorClass: 'text-orange-700 dark:text-orange-200'
      };
    }
    if (c.includes('shop') || c.includes('cloth') || c.includes('mall') || c.includes('store')) {
      return {
        icon: IconShopping,
        bgClass: 'bg-violet-50/90 dark:bg-violet-950/40',
        textClass: 'text-violet-800 dark:text-violet-200',
        iconColorClass: 'text-violet-700 dark:text-violet-200'
      };
    }
    if (c.includes('travel') || c.includes('fuel') || c.includes('cab') || c.includes('uber') || c.includes('car') || c.includes('transport')) {
      return {
        icon: IconTransport,
        bgClass: 'bg-amber-50/90 dark:bg-amber-950/40',
        textClass: 'text-amber-900 dark:text-amber-200',
        iconColorClass: 'text-amber-700 dark:text-amber-200'
      };
    }
    if (c.includes('rent') || c.includes('bill') || c.includes('home') || c.includes('util') || c.includes('house')) {
      return {
        icon: IconHome,
        bgClass: 'bg-sky-50/90 dark:bg-sky-950/40',
        textClass: 'text-sky-800 dark:text-sky-200',
        iconColorClass: 'text-sky-700 dark:text-sky-200'
      };
    }
    if (c.includes('health') || c.includes('med') || c.includes('doctor') || c.includes('gym')) {
      return {
        icon: HeartPulse,
        bgClass: 'bg-rose-50/90 dark:bg-rose-950/40',
        textClass: 'text-rose-800 dark:text-rose-200',
        iconColorClass: 'text-rose-700 dark:text-rose-200'
      };
    }
    if (c.includes('entertain') || c.includes('movie') || c.includes('subscript') || c.includes('game')) {
      return {
        icon: Film,
        bgClass: 'bg-pink-50/90 dark:bg-pink-950/40',
        textClass: 'text-pink-800 dark:text-pink-200',
        iconColorClass: 'text-pink-700 dark:text-pink-200'
      };
    }
    if (c.includes('education') || c.includes('book') || c.includes('course') || c.includes('study')) {
      return {
        icon: BookOpen,
        bgClass: 'bg-indigo-50/90 dark:bg-indigo-950/40',
        textClass: 'text-indigo-900 dark:text-indigo-200',
        iconColorClass: 'text-indigo-800 dark:text-indigo-200'
      };
    }
    return {
      icon: IconSimple,
      bgClass: 'bg-blue-50/90 dark:bg-blue-950/40',
      textClass: 'text-blue-800 dark:text-blue-200',
      iconColorClass: 'text-blue-700 dark:text-blue-200'
    };
  };

  const getPaymentMethodTagStyle = (methodName: string) => {
    const m = (methodName || '').toLowerCase();
    if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe') || m.includes('paytm')) {
      return {
        icon: IconFluid,
        bgClass: 'bg-cyan-50/90 dark:bg-cyan-950/40',
        textClass: 'text-cyan-800 dark:text-cyan-200',
        iconColorClass: 'text-cyan-700 dark:text-cyan-200'
      };
    }
    if (m.includes('card') || m.includes('credit') || m.includes('debit')) {
      return {
        icon: IconSecure,
        bgClass: 'bg-indigo-50/90 dark:bg-indigo-950/40',
        textClass: 'text-indigo-900 dark:text-indigo-200',
        iconColorClass: 'text-indigo-800 dark:text-indigo-200'
      };
    }
    if (m.includes('bank') || m.includes('net') || m.includes('transfer') || m.includes('slice')) {
      return {
        icon: IconDigital,
        bgClass: 'bg-blue-50/90 dark:bg-blue-950/40',
        textClass: 'text-blue-800 dark:text-blue-200',
        iconColorClass: 'text-blue-700 dark:text-blue-200'
      };
    }
    if (m.includes('cash')) {
      return {
        icon: IconCoins,
        bgClass: 'bg-emerald-50/90 dark:bg-emerald-950/40',
        textClass: 'text-emerald-800 dark:text-emerald-200',
        iconColorClass: 'text-emerald-700 dark:text-emerald-200'
      };
    }
    return {
      icon: IconWallet,
      bgClass: 'bg-violet-50/90 dark:bg-violet-950/40',
      textClass: 'text-violet-800 dark:text-violet-200',
      iconColorClass: 'text-violet-700 dark:text-violet-200'
    };
  };

  // Shared pill renderers (desktop table + mobile cards use the same ones,
  // so the two views cannot drift apart again).
  // Category / payment pills: table-image style — soft pastel fill +
  // matching text, NO border, icon directly on the pill background next to
  // the text (no separate chip/box behind the icon). Round 4 (user: "no
  // border arround and icons bi aaye"): border 2px -> 0, icon chip removed.
  interface ChipPillStyle {
    bgClass: string;
    textClass: string;
    iconColorClass: string;
  }

  // UNIFORM PILL SYSTEM (round 3 — table-image analysis): EVERY pill on this
  // page is ONE size — category, payment, status, type — desktop AND mobile.
  // Height 32px desktop / 30px mobile, text 14px semibold, icon 16px,
  // px-3, 6px icon–text gap. Only the WIDTH varies with the label.
  // Round 4: category/payment pills are borderless like the status pills —
  // icon sits directly on the pastel fill, exactly like the table image.
  const renderChipPill = (
    style: ChipPillStyle,
    label: string,
    PillIcon: React.ElementType,
    size: 'md' | 'sm'
  ) => {
    const md = size === 'md';
    return (
      <span className={cn(
        "inline-flex items-center rounded-full select-none whitespace-nowrap shrink-0",
        md ? "h-8 gap-1.5 px-3 text-sm font-semibold" : "h-[30px] gap-1.5 px-3 text-sm font-semibold",
        style.bgClass,
        style.textClass
      )}>
        <PillIcon className={cn("h-4 w-4 shrink-0", style.iconColorClass)} />
        <span className={md ? "truncate max-w-[104px]" : "truncate max-w-[150px]"}>{label}</span>
      </span>
    );
  };

  // Auto-interest status pills: image-1/table style — soft pastel fill +
  // matching text + outline stroke icon directly left of the text. No border,
  // no icon chip, no gloss. Round 3: SAME uniform size as every other pill —
  // 32px desktop / 30px mobile, 14px semibold, 16px icon (was 32px / 14px /
  // 18px with a different height from the 40px chip pills). Clickable: opens
  // the daily interest breakdown.
  const renderStatusPill = (t: Transaction, size: 'md' | 'sm' = 'md') => {
    if (!t.is_auto_interest) return null;
    const edited = t.is_manually_edited;
    const locked = t.auto_interest_status === 'locked';
    const StatusIcon = edited ? IconManuallyEdited : locked ? IconLocked : IconEstimated;
    const label = edited ? 'Manually edited' : locked ? 'Auto • Locked' : 'Auto • Estimated';
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 rounded-full text-sm font-semibold cursor-pointer select-none whitespace-nowrap shrink-0",
          size === 'md' ? "h-8" : "h-[30px]",
          edited
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            : locked
            ? "bg-slate-200/70 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
            : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
        )}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedBreakdownMonth(t.date.slice(0, 7));
          setSelectedBreakdownTotal(t.amount);
        }}
        title="Click to view daily interest breakdown"
      >
        <StatusIcon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </span>
    );
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
            <div className="hidden md:block overflow-x-auto tabular-nums">
              <Table className="table-fixed">
                 <TableHeader>
                   <TableRow className="border-b-2">
                     <TableHead className="px-4 py-3 text-[13px] font-semibold w-[112px]">Date</TableHead>
                     <TableHead className="px-4 py-3 text-[13px] font-semibold w-[240px]">Source</TableHead>
                     <TableHead className="px-4 py-3 text-[13px] font-semibold">Description</TableHead>
                     <TableHead className="px-4 py-3 text-[13px] font-semibold w-[196px]">Category</TableHead>
                     <TableHead className="px-4 py-3 text-[13px] font-semibold w-[196px]">Payment Method</TableHead>
                     <TableHead className="px-4 py-3 text-right text-[13px] font-semibold w-[132px]">Amount</TableHead>
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
                         <TableCell className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">
                           {formatDate(transaction.date)}
                         </TableCell>
                         <TableCell className="px-4 py-3 font-medium text-foreground text-sm">
                           <div className="flex items-center gap-2 min-w-0">
                             <span className="truncate" title={transaction.source}>{transaction.source}</span>
                             {renderStatusPill(transaction, 'md')}
                           </div>
                         </TableCell>
                         <TableCell className="px-4 py-3 text-muted-foreground text-sm">
                           <div className="flex items-center justify-between gap-2 min-w-0">
                             <span className="truncate" title={transaction.description || ''}>{transaction.description || '-'}</span>
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
                        <TableCell className="px-4 py-3">
                          {(() => {
                            const cat = getCategoryTagStyle(transaction.category);
                            return renderChipPill(cat, transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1), cat.icon, 'md');
                          })()}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {(() => {
                            const pm = getPaymentMethodTagStyle(transaction.paymentMethod || '');
                            return renderChipPill(pm, transaction.paymentMethod || 'Not specified', pm.icon, 'md');
                          })()}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={`font-bold text-[15px] transition-all duration-200 ${
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
                      <span className="text-sm text-muted-foreground tabular-nums">{formatDate(transaction.date)}</span>
                      <span className={`font-bold text-[15px] tabular-nums whitespace-nowrap ${
                        transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground text-lg">{transaction.source}</h3>
                      {renderStatusPill(transaction, 'sm')}
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
                      {renderChipPill(
                        transaction.type === 'income'
                          ? { bgClass: 'bg-emerald-50 dark:bg-emerald-950/40', textClass: 'text-emerald-800 dark:text-emerald-200', iconColorClass: 'text-emerald-700 dark:text-emerald-200' }
                          : { bgClass: 'bg-rose-50 dark:bg-rose-950/40', textClass: 'text-rose-800 dark:text-rose-200', iconColorClass: 'text-rose-700 dark:text-rose-200' },
                        transaction.type === 'income' ? 'Income' : 'Expense',
                        transaction.type === 'income' ? ArrowDownLeft : ArrowUpRight,
                        'sm'
                      )}

                      {(() => {
                        const cat = getCategoryTagStyle(transaction.category);
                        return renderChipPill(cat, transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1), cat.icon, 'sm');
                      })()}

                      {(() => {
                        const pm = getPaymentMethodTagStyle(transaction.paymentMethod || '');
                        return renderChipPill(pm, transaction.paymentMethod || 'Not specified', pm.icon, 'sm');
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
