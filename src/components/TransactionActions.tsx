
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Category, ExpenseData, IncomeData, SubWallet } from '@/types/finance';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string;
  walletType?: string;
  deductions?: { type: 'subwallet' | 'wallet', id: number, amount: number }[];
}

interface TransactionActionsProps {
  transaction: Transaction;
  onUpdate: () => void;
}

const TransactionActions: React.FC<TransactionActionsProps> = ({ transaction, onUpdate }) => {
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    description: transaction.description,
    amount: transaction.amount.toString(),
    date: transaction.date,
    category: transaction.category
  });
  const [categories, setCategories] = useState<Category[]>([]);

  React.useEffect(() => {
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      const allCategories = JSON.parse(storedCategories);
      setCategories(allCategories.filter((cat: Category) => cat.type === transaction.type));
    }
  }, [transaction.type]);

  const handleEdit = () => {
    if (!editData.description.trim() || !editData.amount || !editData.date || !editData.category) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
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

    // Update the transaction data
    const storageKey = transaction.type === 'income' ? 'incomeData' : 'expenseData';
    const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const updatedData = currentData.map((item: any) => {
      if (item.id === transaction.id) {
        return {
          ...item,
          [transaction.type === 'income' ? 'source' : 'description']: editData.description,
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
    onUpdate();
  };

  const handleDelete = () => {
    const getCurrentBankId = () => localStorage.getItem('currentBankAccountId');
    const storageKey = (base: string) => {
      const bankId = getCurrentBankId();
      return bankId ? `${base}:${bankId}` : base;
    };

    // --- Revert Balances ---
    if (transaction.type === 'expense') {
        const expenses: ExpenseData[] = JSON.parse(localStorage.getItem(storageKey('expenseData')) || '[]');
        const expenseToDelete = expenses.find((e) => e.id === transaction.id);

        if (expenseToDelete && expenseToDelete.deductions) {
            let subWallets: SubWallet[] = JSON.parse(localStorage.getItem(storageKey('subWallets')) || '[]');
            
            // Revert all deductions - add amounts back to the sources
            expenseToDelete.deductions.forEach((deduction) => {
                if (deduction.type === 'subwallet') {
                    const subWalletIndex = subWallets.findIndex((sw) => sw.id === deduction.id);
                    if (subWalletIndex !== -1) {
                        subWallets[subWalletIndex].balance += deduction.amount;
                        console.log(`Reverted ₹${deduction.amount} to sub-wallet: ${subWallets[subWalletIndex].name}`);
                    }
                }
                // Main wallet deductions are handled automatically through dynamic calculation
                // When the expense record is deleted, the balance will be recalculated properly
            });

            localStorage.setItem(storageKey('subWallets'), JSON.stringify(subWallets));
        }
    } else if (transaction.type === 'income') {
        const incomes: IncomeData[] = JSON.parse(localStorage.getItem(storageKey('incomeData')) || '[]');
        const incomeToDelete = incomes.find((i) => i.id === transaction.id);

        if (incomeToDelete) {
            // Get current distribution settings
            const userSettings = localStorage.getItem('userSettings');
            let distribution = { saving: 50, needs: 30, wants: 20 };
            if (userSettings) {
                const parsed = JSON.parse(userSettings);
                distribution = parsed.distribution || distribution;
            }

            let subWallets: SubWallet[] = JSON.parse(localStorage.getItem(storageKey('subWallets')) || '[]');
            const incomeAmount = incomeToDelete.amount;

            // Calculate how much was originally allocated to each wallet type
            const savingAmount = (incomeAmount * distribution.saving) / 100;
            const needsAmount = (incomeAmount * distribution.needs) / 100;
            const wantsAmount = (incomeAmount * distribution.wants) / 100;
            
            const walletIncomeMap = {
                saving: savingAmount,
                needs: needsAmount,
                wants: wantsAmount,
            };

            // Subtract the allocated amounts from sub-wallets
            const updatedSubWallets = subWallets.map((sw) => {
                const allocation = sw.allocationPercentage || 0;
                const parentType = sw.parentWalletType;
                const revertAmount = (allocation / 100) * (walletIncomeMap[parentType as keyof typeof walletIncomeMap] || 0);
                const newBalance = Math.max(0, (sw.balance || 0) - revertAmount);
                
                console.log(`Reverted ₹${revertAmount} from sub-wallet: ${sw.name}, new balance: ₹${newBalance}`);
                
                return {
                    ...sw,
                    balance: newBalance
                };
            });
            localStorage.setItem(storageKey('subWallets'), JSON.stringify(updatedSubWallets));
        }
    }

    // --- Delete Transaction Record ---
    const transactionStorageKey = transaction.type === 'income' ? storageKey('incomeData') : storageKey('expenseData');
    const currentData = JSON.parse(localStorage.getItem(transactionStorageKey) || '[]');
    
    const updatedData = currentData.filter((item: any) => item.id !== transaction.id);
    localStorage.setItem(transactionStorageKey, JSON.stringify(updatedData));
    
    // Dispatch events to notify other components about the changes
    window.dispatchEvent(new CustomEvent('walletDataChanged'));
    window.dispatchEvent(new CustomEvent('transactionDeleted', { 
      detail: { 
        transactionId: transaction.id, 
        type: transaction.type,
        amount: transaction.amount 
      } 
    }));
    
    toast({
      title: "Success",
      description: `Transaction deleted successfully. All balances have been updated.`,
    });
    
    onUpdate();
  };

  return (
    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Make changes to your transaction here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">
                {transaction.type === 'income' ? 'Source' : 'Description'}
              </Label>
              <Input
                id="description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={editData.category} onValueChange={(value) => setEditData({ ...editData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TransactionActions;
