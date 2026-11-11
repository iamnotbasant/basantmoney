import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Filter, 
  Trash2, 
  Loader2, 
  Download,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  ShieldCheck,
  Hourglass,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    toast({ title: 'Copied', description: `${text} copied to clipboard` });
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

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

        {/* Actions and Filters Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-card border border-border/80 px-3.5 py-1.5 rounded-full text-xs font-semibold text-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span>Transactions</span>
              <span className="text-muted-foreground font-normal">({filteredTransactions.length})</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('csv')}
              className="h-8 rounded-full px-3 text-xs font-medium border-border/80 hover:bg-accent/40 gap-1.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('json')}
              className="h-8 rounded-full px-3 text-xs font-medium border-border/80 hover:bg-accent/40 gap-1.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              JSON
            </Button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={() => navigate('/income')}
              className="h-9 rounded-full px-4 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-transform active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Income
            </Button>
            <Button
              onClick={() => navigate('/expense')}
              variant="outline"
              className="h-9 rounded-full px-4 text-xs font-semibold gap-1.5 border-border/80 hover:bg-accent/40 shadow-sm transition-transform active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 bg-card/60 backdrop-blur-sm border border-border/80 p-3 sm:p-4 rounded-2xl shadow-sm animate-fade-in">
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

        {/* Transactions Table Container */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden animate-fade-in mb-8">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-xs font-medium">
                  <th className="py-3.5 px-5 font-medium">Transaction</th>
                  <th className="py-3.5 px-4 font-medium">Reference ID</th>
                  <th className="py-3.5 px-4 font-medium">Category</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium">Payment Method</th>
                  <th className="py-3.5 px-5 font-medium">Date</th>
                  <th className="py-3.5 px-5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-normal">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction, index) => {
                    const isIncome = transaction.type === 'income';
                    const txCode = `TXN-${String(transaction.id).padStart(5, '0')}`;
                    const isCopied = copiedId === `${transaction.type}-${transaction.id}`;

                    return (
                      <tr
                        key={`${transaction.type}-${transaction.id}`}
                        onDoubleClick={() => handleDoubleClick(transaction)}
                        title="Double click to edit"
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        {/* Transaction Name & Type */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              isIncome 
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                              {isIncome ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0 max-w-[200px]">
                              <p className="font-medium text-foreground text-sm truncate leading-tight">
                                {transaction.source}
                              </p>
                              {transaction.description && (
                                <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                                  {transaction.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Reference / TXN ID with copy icon */}
                        <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                          <div className="inline-flex items-center gap-1.5 group/id">
                            <span>{txCode}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(txCode, `${transaction.type}-${transaction.id}`, e)}
                              title="Copy Transaction ID"
                              className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Category with Icon Badge */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 text-foreground border border-border/50">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}</span>
                          </span>
                        </td>

                        {/* Status - Clean pill with icon like reference image */}
                        <td className="py-3.5 px-4">
                          {transaction.is_auto_interest ? (
                            transaction.is_manually_edited ? (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                                  setSelectedBreakdownTotal(transaction.amount);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-colors cursor-pointer"
                                title="Manually edited - Click for breakdown"
                              >
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span>Manual Edit</span>
                              </span>
                            ) : transaction.auto_interest_status === 'locked' ? (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                                  setSelectedBreakdownTotal(transaction.amount);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-700 dark:text-slate-300 hover:bg-slate-500/25 transition-colors cursor-pointer"
                                title="Locked interest - Click for breakdown"
                              >
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                <span>Locked</span>
                              </span>
                            ) : (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                                  setSelectedBreakdownTotal(transaction.amount);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 transition-colors cursor-pointer"
                                title="Estimated interest - Click for breakdown"
                              >
                                <Hourglass className="h-3 w-3 shrink-0" />
                                <span>Pending</span>
                              </span>
                            )
                          ) : isIncome ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              <span>Settled</span>
                            </span>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-4">
                          <span 
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground px-2.5 py-0.5 rounded-full border"
                            style={{ 
                              borderColor: `${getPaymentMethodColor(transaction.paymentMethod || '')}40`,
                              backgroundColor: `${getPaymentMethodColor(transaction.paymentMethod || '')}10`
                            }}
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full shrink-0" 
                              style={{ backgroundColor: getPaymentMethodColor(transaction.paymentMethod || '') }}
                            />
                            <span className="truncate max-w-[120px]">{transaction.paymentMethod || 'Not specified'}</span>
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-5 text-xs text-muted-foreground font-mono">
                          {transaction.date}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-5 text-right font-medium text-sm whitespace-nowrap">
                          <span className={isIncome ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-foreground font-semibold'}>
                            {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-base font-medium text-foreground">No transactions found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters or add a new transaction</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border/60">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction, index) => {
                const isIncome = transaction.type === 'income';
                const txCode = `TXN-${String(transaction.id).padStart(5, '0')}`;
                const isCopied = copiedId === `${transaction.type}-${transaction.id}`;

                return (
                  <div 
                    key={`${transaction.type}-${transaction.id}`} 
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer space-y-2.5"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onDoubleClick={() => handleDoubleClick(transaction)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          isIncome 
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                          {isIncome ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{transaction.source}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                            <span>{txCode}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(txCode, `${transaction.type}-${transaction.id}`, e)}
                              className="p-0.5 text-muted-foreground/60 hover:text-foreground"
                            >
                              {isCopied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-base font-semibold ${
                          isIncome ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                        }`}>
                          {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                        </span>
                        <p className="text-[11px] text-muted-foreground font-mono">{transaction.date}</p>
                      </div>
                    </div>

                    {transaction.description && (
                      <p className="text-xs text-muted-foreground pl-10.5">{transaction.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted/70 text-foreground border border-border/50">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}</span>
                      </span>

                      {transaction.is_auto_interest ? (
                        transaction.is_manually_edited ? (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                              setSelectedBreakdownTotal(transaction.amount);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 cursor-pointer"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>Manual Edit</span>
                          </span>
                        ) : transaction.auto_interest_status === 'locked' ? (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                              setSelectedBreakdownTotal(transaction.amount);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/15 text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBreakdownMonth(transaction.date.slice(0, 7));
                              setSelectedBreakdownTotal(transaction.amount);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-700 dark:text-purple-300 cursor-pointer"
                          >
                            <Hourglass className="h-3 w-3" />
                            <span>Pending</span>
                          </span>
                        )
                      ) : isIncome ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-green-500/15 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Settled</span>
                        </span>
                      )}

                      <span 
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground px-2 py-0.5 rounded-full border"
                        style={{ 
                          borderColor: `${getPaymentMethodColor(transaction.paymentMethod || '')}40`,
                          backgroundColor: `${getPaymentMethodColor(transaction.paymentMethod || '')}10`
                        }}
                      >
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: getPaymentMethodColor(transaction.paymentMethod || '') }}
                        />
                        <span>{transaction.paymentMethod || 'Not specified'}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center text-muted-foreground">
                <p className="text-sm font-medium">No transactions found</p>
              </div>
            )}
          </div>
        </div>
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
