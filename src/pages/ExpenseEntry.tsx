import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Wallet as WalletIcon, Receipt, FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Wallet, ExpenseData, SubWallet } from '@/types/finance';
import { toast } from '@/hooks/use-toast';
import { WalletService } from '@/utils/walletService';
import CollapsibleSection from '@/components/CollapsibleSection';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useWalletData } from '@/hooks/useWalletData';
import { useBankAccounts } from '@/hooks/useBankAccounts';

const ExpenseEntry = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState<Date>();
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<{ type: 'subwallet' | 'wallet', id: number }[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supabase hooks for data persistence
  const { currentAccount } = useBankAccounts();
  const { addExpense } = useExpenseData(currentAccount?.id);
  const { wallets, subWallets, processExpenseDeductions, refetch: refetchWallets } = useWalletData();

  useEffect(() => {
    loadData();
    setDate(new Date());

    // Listen for category updates
    const handleCategoryUpdate = () => {
      const storedCategories = localStorage.getItem('categories');
      if (storedCategories) {
        const allCategories = JSON.parse(storedCategories);
        const expenseCategories = allCategories.filter((cat: any) => cat.type === 'expense');
        setCategories(expenseCategories);
      }
    };

    window.addEventListener('categoriesChanged', handleCategoryUpdate);
    return () => window.removeEventListener('categoriesChanged', handleCategoryUpdate);
  }, []);

  const loadData = () => {
    // Load categories from the same key as CategoryManager
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      const allCategories = JSON.parse(storedCategories);
      const expenseCategories = allCategories.filter((cat: any) => cat.type === 'expense');
      setCategories(expenseCategories);
    }

    // Load payment methods
    const storedPaymentMethods = localStorage.getItem('paymentMethods');
    if (storedPaymentMethods) {
      setPaymentMethods(JSON.parse(storedPaymentMethods));
    } else {
      const defaultMethods = [
        { id: '1', name: 'UPI', color: '#3B82F6' },
        { id: '2', name: 'Cash', color: '#10B981' },
        { id: '3', name: 'Credit Card', color: '#EF4444' },
        { id: '4', name: 'Wallet', color: '#F59E0B' },
        { id: '5', name: 'Bank Transfer', color: '#8B5CF6' },
      ];
      setPaymentMethods(defaultMethods);
    }
  };

  // Selection logic to preserve order and type
  const handleWalletSelection = (walletId: number, checked: boolean) => {
    console.log(`Wallet ${walletId} selection changed to:`, checked);
    setSelectedQueue((prev) => {
      if (checked) {
        // Only add if not already present
        if (!prev.some(sel => sel.type === "wallet" && sel.id === walletId)) {
          const newQueue = [...prev, { type: 'wallet' as const, id: walletId }];
          console.log('New selection queue:', newQueue);
          return newQueue;
        }
        return prev;
      } else {
        // Remove this wallet from selected queue
        const newQueue = prev.filter(sel => !(sel.type === "wallet" && sel.id === walletId));
        console.log('Updated selection queue after removal:', newQueue);
        return newQueue;
      }
    });
  };

  const handleSubWalletSelection = (subWalletId: number, checked: boolean) => {
    console.log(`SubWallet ${subWalletId} selection changed to:`, checked);
    setSelectedQueue((prev) => {
      if (checked) {
        if (!prev.some(sel => sel.type === "subwallet" && sel.id === subWalletId)) {
          const newQueue = [...prev, { type: 'subwallet' as const, id: subWalletId }];
          console.log('New selection queue:', newQueue);
          return newQueue;
        }
        return prev;
      } else {
        const newQueue = prev.filter(sel => !(sel.type === "subwallet" && sel.id === subWalletId));
        console.log('Updated selection queue after removal:', newQueue);
        return newQueue;
      }
    });
  };

  // Helper to check selection
  const isWalletSelected = (walletId: number) =>
    selectedQueue.some(sel => sel.type === 'wallet' && sel.id === walletId);

  const isSubWalletSelected = (subWalletId: number) =>
    selectedQueue.some(sel => sel.type === 'subwallet' && sel.id === subWalletId);

  const calculateDeductionPreview = () => {
    const expenseAmount = parseFloat(amount) || 0;
    let remainingExpense = expenseAmount;
    const preview: { type: 'wallet' | 'subwallet'; id: number; name: string; deduction: number; balance: number }[] = [];

    console.log(`Calculating deduction for ₹${expenseAmount}, Selection queue:`, selectedQueue);

    // Go in the order user selected (queue)
    selectedQueue.forEach((sel, index) => {
      if (remainingExpense <= 0) return;
      
      console.log(`Processing selection ${index + 1}:`, sel, `Remaining: ₹${remainingExpense}`);
      
      if (sel.type === 'subwallet') {
        const subWallet = subWallets.find(sw => sw.id === sel.id);
        if (subWallet && (subWallet.balance || 0) > 0) {
          const balance = subWallet.balance || 0;
          const deduction = Math.min(balance, remainingExpense);
          console.log(`SubWallet ${subWallet.name}: balance=₹${balance}, deduction=₹${deduction}`);
          if (deduction > 0) {
            preview.push({
              type: 'subwallet',
              id: subWallet.id,
              name: subWallet.name,
              deduction,
              balance: balance
            });
            remainingExpense -= deduction;
          }
        }
      } else if (sel.type === 'wallet') {
        const wallet = wallets.find(w => w.id === sel.id);
        if (wallet) {
          const allocatedToSubWallets = subWallets
            .filter(sw => sw.parent_wallet_type === wallet.type)
            .reduce((sum, sw) => sum + (sw.balance || 0), 0);
          const walletBalance = wallet.balance || 0;
          const availableBalance = Math.max(0, walletBalance - allocatedToSubWallets);
          const deduction = Math.min(availableBalance, remainingExpense);
          console.log(`Wallet ${wallet.name}: total=₹${walletBalance}, allocated=₹${allocatedToSubWallets}, available=₹${availableBalance}, deduction=₹${deduction}`);
          if (deduction > 0) {
            preview.push({
              type: 'wallet',
              id: wallet.id,
              name: wallet.name,
              deduction,
              balance: availableBalance
            });
            remainingExpense -= deduction;
          }
        }
      }
    });

    console.log('Final deduction preview:', preview);
    console.log('Remaining expense after deduction:', remainingExpense);
    return { preview, remainingExpense };
  };

  const getTotalAvailableBalance = () => {
    let total = 0;
    selectedQueue.forEach(sel => {
      if (sel.type === 'subwallet') {
        const subWallet = subWallets.find(sw => sw.id === sel.id);
        total += subWallet?.balance || 0;
      } else if (sel.type === 'wallet') {
        const wallet = wallets.find(w => w.id === sel.id);
        if (wallet) {
          const allocatedToSubWallets = subWallets
            .filter(sw => sw.parent_wallet_type === wallet.type)
            .reduce((sum, sw) => sum + (sw.balance || 0), 0);
          const availableBalance = (wallet.balance || 0) - allocatedToSubWallets;
          total += Math.max(0, availableBalance);
        }
      }
    });
    return total;
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !title || !category || !paymentMethod || !date || !notes.trim() || selectedQueue.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields including description and select at least one wallet or sub-wallet.",
        variant: "destructive",
      });
      return;
    }

    const expenseAmount = parseFloat(amount);
    const totalAvailable = getTotalAvailableBalance();

    if (expenseAmount > totalAvailable) {
      toast({
        title: "Insufficient Funds",
        description: `You need ₹${expenseAmount.toLocaleString('en-IN')} but only have ₹${totalAvailable.toLocaleString('en-IN')} available.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(`Processing expense of ₹${expenseAmount}`);
      console.log('Selection queue:', selectedQueue);

      // Build deductions directly from Supabase data (not localStorage)
      let remainingExpense = expenseAmount;
      const deductions: { type: 'subwallet' | 'wallet', id: number, amount: number, name: string }[] = [];

      for (const selection of selectedQueue) {
        if (remainingExpense <= 0) break;

        if (selection.type === 'subwallet') {
          const subWallet = subWallets.find(sw => sw.id === selection.id);
          if (subWallet && (subWallet.balance || 0) > 0) {
            const deductionAmount = Math.min(subWallet.balance || 0, remainingExpense);
            if (deductionAmount > 0) {
              deductions.push({
                type: 'subwallet',
                id: subWallet.id,
                amount: deductionAmount,
                name: subWallet.name
              });
              remainingExpense -= deductionAmount;
            }
          }
        } else if (selection.type === 'wallet') {
          const wallet = wallets.find(w => w.id === selection.id);
          if (wallet) {
            const allocatedToSubWallets = subWallets
              .filter(sw => sw.parent_wallet_type === wallet.type)
              .reduce((sum, sw) => sum + (sw.balance || 0), 0);
            const availableBalance = Math.max(0, (wallet.balance || 0) - allocatedToSubWallets);
            const deductionAmount = Math.min(availableBalance, remainingExpense);
            
            if (deductionAmount > 0) {
              deductions.push({
                type: 'wallet',
                id: wallet.id,
                amount: deductionAmount,
                name: wallet.name
              });
              remainingExpense -= deductionAmount;
            }
          }
        }
      }

      if (remainingExpense > 0) {
        toast({
          title: "Transaction Failed",
          description: "Unable to complete the transaction with available funds.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Save expense to Supabase
      const result = await addExpense({
        description: title,
        amount: expenseAmount,
        date: format(date, 'yyyy-MM-dd'),
        category: category.toLowerCase(),
        deductions: deductions.map(({ name, ...rest }) => rest),
        bank_account_id: currentAccount?.id || null,
      });

      if (!result) {
        setIsSubmitting(false);
        return;
      }

      // Process deductions in Supabase
      await processExpenseDeductions(deductions);

      console.log('Final deductions applied:', deductions);

      // Trigger wallet data refresh across the app
      window.dispatchEvent(new CustomEvent('walletDataChanged'));

      // Reload data
      loadData();
      refetchWallets();

      const sourcesSummary = deductions.map(s => `₹${s.amount} from ${s.name}`).join(', ');
      toast({
        title: "Expense Saved to Backend!",
        description: `₹${expenseAmount.toLocaleString('en-IN')} deducted from: ${sourcesSummary}`,
      });

      // Reset form/selections
      setAmount('');
      setTitle('');
      setCategory('');
      setPaymentMethod('');
      setNotes('');
      setAttachment(null);
      setSelectedQueue([]);
      setDate(new Date());

      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: "Failed to save expense",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { preview, remainingExpense } = calculateDeductionPreview();

  const groupedSubWallets = {
    saving: subWallets.filter(sw => sw.parent_wallet_type === 'saving'),
    needs: subWallets.filter(sw => sw.parent_wallet_type === 'needs'),
    wants: subWallets.filter(sw => sw.parent_wallet_type === 'wants')
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Receipt className="h-5 w-5 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Add Expense</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expense Form */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-medium text-foreground mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Expense Details
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Main Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="title">Expense Title *</Label>
                    <Input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What did you spend on?"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="date">Date Spent *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                      <SelectTrigger className="mt-1">
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
                </div>

                <div>
                  <Label htmlFor="notes">Description *</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Thumbnail, Rent, Editing, etc."
                    className="mt-1"
                    rows={3}
                    required
                  />
                </div>

                {/* Collapsible More Options */}
                <CollapsibleSection title="More Options" defaultOpen={false}>
                  <div className="space-y-4">

                    <div>
                      <Label htmlFor="attachment">Attachment (Optional)</Label>
                      <div className="mt-1">
                        <label htmlFor="attachment" className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="text-center">
                            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {attachment ? attachment.name : "Click to upload receipt or document"}
                            </p>
                          </div>
                        </label>
                        <input
                          id="attachment"
                          type="file"
                          onChange={handleAttachmentChange}
                          className="hidden"
                          accept="image/*,application/pdf,.doc,.docx"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                <Button type="submit" className="w-full mt-6">
                  Add Expense
                </Button>
              </form>
            </div>
          </div>

          {/* Wallet Selection & Preview */}
          <div className="space-y-6">
            {/* Sub-Wallet Selection */}
            {Object.entries(groupedSubWallets).map(([walletType, subWalletList]) => {
              if (subWalletList.length === 0) return null;
              
              return (
                <div key={walletType} className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-md font-medium text-foreground mb-4 capitalize flex items-center gap-2">
                    <WalletIcon className="h-4 w-4" />
                    {walletType} Sub-Wallets
                  </h3>
                  
                  <div className="space-y-3">
                    {subWalletList.map((subWallet) => (
                      <div
                        key={subWallet.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`subwallet-${subWallet.id}`}
                            checked={isSubWalletSelected(subWallet.id)}
                            onCheckedChange={(checked) => 
                              handleSubWalletSelection(subWallet.id, checked as boolean)
                            }
                          />
                          <div className="flex items-center space-x-2">
                            <WalletIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{subWallet.name}</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          ₹{subWallet.balance.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Main Wallet Selection */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-medium text-foreground mb-6 flex items-center gap-2">
                <WalletIcon className="h-5 w-5" />
                Select Main Wallets
              </h2>
              
              <div className="space-y-4">
                {wallets.map((wallet) => {
                  const allocatedToSubWallets = subWallets
                    .filter(sw => sw.parent_wallet_type === wallet.type)
                    .reduce((sum, sw) => sum + (sw.balance || 0), 0);
                  const availableBalance = (wallet.balance || 0) - allocatedToSubWallets;
                  
                  return (
                    <div
                      key={wallet.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`wallet-${wallet.id}`}
                          checked={isWalletSelected(wallet.id)}
                          onCheckedChange={(checked) => 
                            handleWalletSelection(wallet.id, checked as boolean)
                          }
                        />
                        <div className="flex items-center space-x-2">
                          <WalletIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{wallet.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ₹{Math.max(0, availableBalance).toLocaleString('en-IN')} available
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: ₹{wallet.balance.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedQueue.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Selection Order: {selectedQueue.map((sel, index) => {
                      const item = sel.type === 'wallet' 
                        ? wallets.find(w => w.id === sel.id)?.name
                        : subWallets.find(sw => sw.id === sel.id)?.name;
                      return `${index + 1}. ${item}`;
                    }).join(', ')}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Available: ₹{getTotalAvailableBalance().toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>

            {/* Deduction Preview */}
            {preview.length > 0 && amount && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-medium text-foreground mb-4">Deduction Preview</h2>
                
                <div className="space-y-3">
                  {preview.map((item, index) => (
                    <div key={`${item.type}-${item.id}`} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                        {item.type === 'subwallet' ? '📱 ' : '💼 '}{item.name}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">
                          -₹{item.deduction.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Balance: ₹{(item.balance - item.deduction).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {remainingExpense > 0 && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Insufficient funds: ₹{remainingExpense.toLocaleString('en-IN')} short
                    </p>
                  </div>
                )}

                {remainingExpense === 0 && preview.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      ✅ Transaction will be completed successfully!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExpenseEntry;
