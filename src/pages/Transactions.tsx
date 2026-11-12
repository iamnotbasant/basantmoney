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
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCategoryIcon } from '@/lib/categoryIcons';
import {
  pillStyleForColor,
  resolveCategoryIconKey,
  resolveCategoryColor,
  resolvePaymentIconKey,
  migrateCategories,
  migratePaymentMethods,
  type PillStyle,
} from '@/lib/categoryDefaults';
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
  icon?: string;
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
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  // The interest transaction behind the open detail modal (status, source,
  // manually-edited state). Rows no longer show the status pill or the
  // "Daily breakdown" button — the modal is the only place they appear.
  const [selectedInterestTx, setSelectedInterestTx] = useState<Transaction | null>(null);

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
  }, [transactions, searchQuery, filterType, filterCategory, filterPaymentMethod, filterMonth]);

  const loadCategories = () => {
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      const { list, changed } = migrateCategories(JSON.parse(storedCategories));
      setCategories(list);
      if (changed) localStorage.setItem('categories', JSON.stringify(list));
    }
  };

  const loadPaymentMethods = () => {
    const storedMethods = localStorage.getItem('paymentMethods');
    if (storedMethods) {
      const { list, changed } = migratePaymentMethods(JSON.parse(storedMethods));
      setPaymentMethods(list);
      if (changed) localStorage.setItem('paymentMethods', JSON.stringify(list));
    }
  };

  const openInterestDetail = (transaction: Transaction) => {
    setSelectedInterestTx(transaction);
    setSelectedBreakdownMonth(transaction.date.slice(0, 7));
    setSelectedBreakdownTotal(transaction.amount);
  };

  const closeInterestDetail = () => {
    setSelectedInterestTx(null);
    setSelectedBreakdownMonth(null);
    setSelectedBreakdownTotal(undefined);
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

  const handleResumeAutoUpdate = async (t: Transaction, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
      closeInterestDetail();
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => 
        (t.source && t.source.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
      );
    }

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

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterCategory('all');
    setFilterPaymentMethod('all');
    setFilterMonth('all');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    filterType !== 'all' ||
    filterCategory !== 'all' ||
    filterPaymentMethod !== 'all' ||
    filterMonth !== 'all'
  );

  const filteredIncomeTotal = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const filteredExpenseTotal = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const filteredNetTotal = filteredIncomeTotal - filteredExpenseTotal;

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

  // Tag styles are driven by the STORED record first (Settings manager):
  // the category/payment method's own icon + colour from localStorage, so
  // what the user picks in Settings is what the pill shows. The keyword
  // buckets below are only the fallback for names not in the store.
  // Colours follow the user's palette (12 Nov 12:23): Freelance green,
  // Interest blue, Food red, Transport amber, Bills purple, Shopping pink.
  const getCategoryTagStyle = (categoryName: string): PillStyle & { icon: React.ElementType } => {
    const stored = categories.find(
      (c) => c.name.toLowerCase() === (categoryName || '').toLowerCase()
    );
    if (stored) {
      return {
        ...pillStyleForColor(stored.color),
        icon: getCategoryIcon(stored.icon ?? resolveCategoryIconKey(categoryName)),
      };
    }
    return {
      ...pillStyleForColor(resolveCategoryColor(categoryName)),
      icon: getCategoryIcon(resolveCategoryIconKey(categoryName)),
    };
  };

  const getPaymentMethodTagStyle = (methodName: string): PillStyle & { icon: React.ElementType } => {
    const stored = paymentMethods.find(
      (m) => m.name.toLowerCase() === (methodName || '').toLowerCase()
    );
    if (stored) {
      return {
        ...pillStyleForColor(stored.color),
        icon: getCategoryIcon(stored.icon ?? resolvePaymentIconKey(methodName)),
      };
    }
    // Fallback for methods not in the store (kept from before).
    const m = (methodName || '').toLowerCase();
    if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe') || m.includes('paytm')) {
      return {
        icon: getCategoryIcon('upi'),
        bgClass: 'bg-cyan-50/90 dark:bg-cyan-950/40',
        textClass: 'text-cyan-800 dark:text-cyan-200',
        iconColorClass: 'text-cyan-700 dark:text-cyan-200'
      };
    }
    if (m.includes('card') || m.includes('credit') || m.includes('debit')) {
      return {
        icon: getCategoryIcon('card'),
        bgClass: 'bg-indigo-50/90 dark:bg-indigo-950/40',
        textClass: 'text-indigo-900 dark:text-indigo-200',
        iconColorClass: 'text-indigo-800 dark:text-indigo-200'
      };
    }
    if (m.includes('bank') || m.includes('net') || m.includes('transfer') || m.includes('slice')) {
      return {
        icon: getCategoryIcon('bank'),
        bgClass: 'bg-blue-50/90 dark:bg-blue-950/40',
        textClass: 'text-blue-800 dark:text-blue-200',
        iconColorClass: 'text-blue-700 dark:text-blue-200'
      };
    }
    if (m.includes('cash')) {
      return {
        icon: getCategoryIcon('cash'),
        bgClass: 'bg-emerald-50/90 dark:bg-emerald-950/40',
        textClass: 'text-emerald-800 dark:text-emerald-200',
        iconColorClass: 'text-emerald-700 dark:text-emerald-200'
      };
    }
    if (m.includes('cheque') || m.includes('check')) {
      return {
        icon: getCategoryIcon('cheque'),
        bgClass: 'bg-violet-50/90 dark:bg-violet-950/40',
        textClass: 'text-violet-800 dark:text-violet-200',
        iconColorClass: 'text-violet-700 dark:text-violet-200'
      };
    }
    if (m.includes('wallet')) {
      return {
        icon: getCategoryIcon('wallet'),
        bgClass: 'bg-violet-50/90 dark:bg-violet-950/40',
        textClass: 'text-violet-800 dark:text-violet-200',
        iconColorClass: 'text-violet-700 dark:text-violet-200'
      };
    }
    return {
      icon: getCategoryIcon('generic'),
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
  // UNIFORM PILL SYSTEM (round 3 — table-image analysis): EVERY pill on this
  // page is ONE size — category, payment, type — desktop AND mobile.
  // LONG-SLIM RESCALE (tags-sizing-slim — table image, ChatGPT measurements):
  // the image's pills are ~36–40% of row height, ours were 56% (32px of
  // 57px rows) — too chunky. Now: height 24px desktop / 22px mobile,
  // text 13px desktop / 12px mobile semibold, icon 12px / 11px (~50% of
  // pill height), px-3 kept (the user wants the pills LONGER, so side
  // padding stays generous instead of ChatGPT's 7px), 4px icon–text gap.
  // Only the WIDTH varies with the label.
  // Round 4: category/payment pills are borderless like the status pills —
  // icon sits directly on the pastel fill, exactly like the table image.
  // Styles come from PillStyle (categoryDefaults): curated Tailwind triples
  // for palette colours, or the .pill-dynamic color-mix fallback (via the
  // --pill-color CSS var) for any other stored hex.
  const renderChipPill = (
    style: PillStyle,
    label: string,
    PillIcon: React.ElementType,
    size: 'md' | 'sm'
  ) => {
    const md = size === 'md';
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full select-none whitespace-nowrap shrink-0",
          md ? "h-6 gap-1 px-3 text-[13px] font-semibold" : "h-[22px] gap-1 px-3 text-xs font-semibold",
          style.bgClass,
          style.textClass
        )}
        style={style.dynamicColor ? ({ '--pill-color': style.dynamicColor } as React.CSSProperties) : undefined}
      >
        <PillIcon className={cn(md ? "h-3 w-3 shrink-0" : "h-[11px] w-[11px] shrink-0", style.iconColorClass)} />
        <span className={md ? "truncate max-w-[104px]" : "truncate max-w-[150px]"}>{label}</span>
      </span>
    );
  };

  // Interest rows no longer show the "Auto • Estimated / Locked" status pill
  // or the "Daily breakdown" button inline (Part B). The Interest pill
  // itself opens the detail modal (see openInterestDetail); the status,
  // breakdown, month, amount and source live only in that modal.

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
        {/* Page Title & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Transactions
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/60">
                {transactions.length} total
              </span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Track and manage all your financial activities • Double click any row to edit
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <Button 
              onClick={() => navigate('/income')}
              className="h-10 gap-2 px-4 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/20 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Add Income
            </Button>
            <Button 
              onClick={() => navigate('/expense')}
              className="h-10 gap-2 px-4 font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-950/20 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Add Expense
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 px-3.5 font-medium border-border/80 bg-background/50 hover:bg-muted transition-colors">
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => exportData('csv')} className="cursor-pointer gap-2 py-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span>Export as CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData('json')} className="cursor-pointer gap-2 py-2">
                  <FileJson className="h-4 w-4 text-blue-500" />
                  <span>Export as JSON</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Actions and Filters */}
        <Card className="mb-6 border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden animate-fade-in">
          <CardContent className="p-4 sm:p-5">
            <TransactionsFilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterType={filterType}
              setFilterType={setFilterType}
              filterMonth={filterMonth}
              setFilterMonth={setFilterMonth}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterPaymentMethod={filterPaymentMethod}
              setFilterPaymentMethod={setFilterPaymentMethod}
              getUniqueMonths={getUniqueMonths}
              formatMonthForDisplay={formatMonthForDisplay}
              getUniqueCategories={getUniqueCategories}
              getUniquePaymentMethods={getUniquePaymentMethods}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
              filteredCount={filteredTransactions.length}
              totalCount={transactions.length}
              filteredIncomeTotal={filteredIncomeTotal}
              filteredExpenseTotal={filteredExpenseTotal}
              filteredNetTotal={filteredNetTotal}
            />
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl text-foreground flex flex-wrap items-center gap-3">
              Transaction History
              <span className="ml-2 text-sm font-normal text-muted-foreground bg-muted px-3 py-1 rounded-full whitespace-nowrap shrink-0">
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
                         <TableCell className="px-4 py-4 text-muted-foreground text-sm whitespace-nowrap">
                           {formatDate(transaction.date)}
                         </TableCell>
                         <TableCell className="px-4 py-4 font-medium text-foreground text-sm">
                           <span className="truncate block" title={transaction.source}>{transaction.source}</span>
                         </TableCell>
                         <TableCell className="px-4 py-4 text-muted-foreground text-sm">
                           <span className="truncate block" title={transaction.description || ''}>{transaction.description || '-'}</span>
                         </TableCell>
                        <TableCell className="px-4 py-4">
                          {(() => {
                            const cat = getCategoryTagStyle(transaction.category);
                            const pill = renderChipPill(cat, transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1), cat.icon, 'md');
                            return transaction.is_auto_interest ? (
                              <button
                                type="button"
                                onClick={() => openInterestDetail(transaction)}
                                className="cursor-pointer rounded-full text-left transition-opacity hover:opacity-80"
                                title="Click for interest details"
                              >
                                {pill}
                              </button>
                            ) : pill;
                          })()}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          {(() => {
                            const pm = getPaymentMethodTagStyle(transaction.paymentMethod || '');
                            return renderChipPill(pm, transaction.paymentMethod || 'Not specified', pm.icon, 'md');
                          })()}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right whitespace-nowrap">
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
                    </div>
                    {transaction.description && (
                      <p className="text-muted-foreground mb-2 text-sm">{transaction.description}</p>
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
                        const pill = renderChipPill(cat, transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1), cat.icon, 'sm');
                        return transaction.is_auto_interest ? (
                          <button
                            type="button"
                            onClick={() => openInterestDetail(transaction)}
                            className="cursor-pointer rounded-full text-left transition-opacity hover:opacity-80"
                            title="Click for interest details"
                          >
                            {pill}
                          </button>
                        ) : pill;
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

        {/* Daily Interest Breakdown Modal (Spec §2b) — the ONLY place the
            auto-interest status, daily breakdown, month, amount and source
            show now; rows stay clean. */}
        <InterestBreakdownModal
          isOpen={Boolean(selectedBreakdownMonth)}
          onClose={closeInterestDetail}
          yearMonth={selectedBreakdownMonth}
          userId={user?.id}
          entryTotal={selectedBreakdownTotal}
          source={selectedInterestTx?.source}
          status={selectedInterestTx?.auto_interest_status}
          isManuallyEdited={selectedInterestTx?.is_manually_edited}
          onResumeAutoUpdate={selectedInterestTx ? () => handleResumeAutoUpdate(selectedInterestTx) : undefined}
        />
      </main>
    </div>
  );
};

export default Transactions;
