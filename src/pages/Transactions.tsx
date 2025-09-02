import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Filter, Trash2 } from 'lucide-react';
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
import { IncomeData, ExpenseData, Category, SubWallet } from '@/types/finance';
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
import { WalletService } from '@/utils/walletService';

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
}

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    category: ''
  });
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
    loadCategories();
    loadTransactions();
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

  const loadTransactions = () => {
    console.log('Loading transactions from localStorage...');
    
    const incomeData: IncomeData[] = JSON.parse(localStorage.getItem(WalletService.storageKey('incomeData')) || '[]');
    const expenseData: ExpenseData[] = JSON.parse(localStorage.getItem(WalletService.storageKey('expenseData')) || '[]');

    console.log('Raw income data:', incomeData);
    console.log('Raw expense data:', expenseData);

    const incomeTransactions: Transaction[] = incomeData.map(item => {
      const notes = (item as any).notes || '';
      
      return {
        id: item.id,
        type: 'income' as const,
        source: item.source,
        description: notes,
        amount: item.amount,
        date: item.date,
        category: item.category,
        paymentMethod: (item as any).paymentMethod || 'Not specified'
      };
    });

    const expenseTransactions: Transaction[] = expenseData.map(item => {
      const notes = (item as any).notes || '';
      
      return {
        id: item.id,
        type: 'expense' as const,
        source: item.description,
        description: notes,
        amount: item.amount,
        date: item.date,
        category: item.category,
        paymentMethod: (item as any).paymentMethod || 'Not specified'
      };
    });

    const allTransactions = [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('All transactions loaded:', allTransactions);
    setTransactions(allTransactions);
  };

  const handleDoubleClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditData({
      source: transaction.source,
      description: transaction.description,
      amount: transaction.amount.toString(),
      date: transaction.date,
      category: transaction.category
    });
    setIsEditOpen(true);
  };

  const handleEdit = () => {
    if (!editData.source.trim() || !editData.amount || !editData.date || !editData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(editData.amount);
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!editingTransaction) return;

    // Update the transaction data
    const storageKey = editingTransaction.type === 'income' ? WalletService.storageKey('incomeData') : WalletService.storageKey('expenseData');
    const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const updatedData = currentData.map((item: any) => {
      if (item.id === editingTransaction.id) {
        return {
          ...item,
          [editingTransaction.type === 'income' ? 'source' : 'description']: editData.source,
          notes: editData.description,
          amount: amount,
          date: editData.date,
          category: editData.category
        };
      }
      return item;
    });

    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    
    toast({
      title: "Success",
      description: "Transaction updated successfully",
    });
    
    setIsEditOpen(false);
    setEditingTransaction(null);
    loadTransactions();
  };

  const handleDelete = () => {
    if (!editingTransaction) return;

    // --- Revert Balances ---
    if (editingTransaction.type === 'expense') {
        const expenses: ExpenseData[] = JSON.parse(localStorage.getItem(WalletService.storageKey('expenseData')) || '[]');
        const expenseToDelete = expenses.find((e) => e.id === editingTransaction.id);

        if (expenseToDelete && expenseToDelete.deductions) {
            let subWallets: SubWallet[] = JSON.parse(localStorage.getItem('subWallets') || '[]');
            
            expenseToDelete.deductions.forEach((deduction) => {
                if (deduction.type === 'subwallet') {
                    const subWalletIndex = subWallets.findIndex((sw) => sw.id === deduction.id);
                    if (subWalletIndex !== -1) {
                        subWallets[subWalletIndex].balance += deduction.amount;
                    }
                }
            });

            localStorage.setItem('subWallets', JSON.stringify(subWallets));
        }
    } else if (editingTransaction.type === 'income') {
        const incomes: IncomeData[] = JSON.parse(localStorage.getItem(WalletService.storageKey('incomeData')) || '[]');
        const incomeToDelete = incomes.find((i) => i.id === editingTransaction.id);

        if (incomeToDelete) {
            const distribution = JSON.parse(localStorage.getItem('distribution') || '{"saving": 50, "needs": 30, "wants": 20}');
            let subWallets: SubWallet[] = JSON.parse(localStorage.getItem('subWallets') || '[]');
            const incomeAmount = incomeToDelete.amount;

            const savingAmount = (incomeAmount * distribution.saving) / 100;
            const needsAmount = (incomeAmount * distribution.needs) / 100;
            const wantsAmount = (incomeAmount * distribution.wants) / 100;
            
            const walletIncomeMap = {
                saving: savingAmount,
                needs: needsAmount,
                wants: wantsAmount,
            };

            const updatedSubWallets = subWallets.map((sw) => {
                const allocation = sw.allocationPercentage || 0;
                const parentType = sw.parentWalletType;
                const deductionAmount = (allocation / 100) * (walletIncomeMap[parentType as keyof typeof walletIncomeMap] || 0);
                return {
                    ...sw,
                    balance: Math.max(0, (sw.balance || 0) - deductionAmount)
                };
            });
            localStorage.setItem('subWallets', JSON.stringify(updatedSubWallets));
        }
    }

    // --- Delete Transaction Record ---
    const storageKey = editingTransaction.type === 'income' ? WalletService.storageKey('incomeData') : WalletService.storageKey('expenseData');
    const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const updatedData = currentData.filter((item: any) => item.id !== editingTransaction.id);
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    
    toast({
      title: "Success",
      description: "Transaction deleted and balances reverted.",
    });
    
    setIsEditOpen(false);
    setIsDeleteAlertOpen(false);
    setEditingTransaction(null);
    loadTransactions();
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
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <Button 
                  onClick={() => navigate('/income')}
                  className="flex items-center justify-center gap-2 h-11 px-6 transition-all duration-300 transform hover:-translate-y-0.5 font-semibold bg-[#131a29]"
                >
                  <Plus className="h-5 w-5" />
                  Add Income
                </Button>
                <Button 
                  onClick={() => navigate('/expense')}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-11 px-6 transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
                >
                  <Plus className="h-5 w-5" />
                  Add Expense
                </Button>
              </div>

              {/* REFACTOR: Use new filter bar */}
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
                           {transaction.source}
                         </TableCell>
                         <TableCell className="text-muted-foreground py-4 text-sm">
                           {transaction.description || '-'}
                         </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="secondary" className="transition-all duration-200 text-xs">
                            {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            variant="outline" 
                            className="transition-all duration-200 text-xs"
                            style={{ 
                              borderColor: getPaymentMethodColor(transaction.paymentMethod || ''),
                              color: getPaymentMethodColor(transaction.paymentMethod || '')
                            }}
                          >
                            <div 
                              className="w-2 h-2 rounded-full mr-2" 
                              style={{ backgroundColor: getPaymentMethodColor(transaction.paymentMethod || '') }}
                            />
                            {transaction.paymentMethod || 'Not specified'}
                          </Badge>
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
                    <h3 className="font-semibold text-foreground mb-1 text-lg">{transaction.source}</h3>
                    {transaction.description && (
                      <p className="text-muted-foreground mb-2 text-sm">{transaction.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs font-medium",
                          transaction.type === 'income' 
                            ? "text-green-700 border-green-200 dark:text-green-300 dark:border-green-800" 
                            : "text-red-700 border-red-200 dark:text-red-300 dark:border-red-800"
                        )}
                      >
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: getPaymentMethodColor(transaction.paymentMethod || ''),
                          color: getPaymentMethodColor(transaction.paymentMethod || '')
                        }}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-1" 
                          style={{ backgroundColor: getPaymentMethodColor(transaction.paymentMethod || '') }}
                        />
                        {transaction.paymentMethod || 'Not specified'}
                      </Badge>
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
                and revert any wallet balance changes it caused.
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
      </main>
    </div>
  );
};

export default Transactions;
