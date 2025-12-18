import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Category } from '@/types/finance';
import { WalletService } from '@/utils/walletService';
import CollapsibleSection from '@/components/CollapsibleSection';
import { useIncomeData } from '@/hooks/useIncomeData';
import { useWalletData } from '@/hooks/useWalletData';
import { useBankAccounts } from '@/hooks/useBankAccounts';

interface IncomeEntry {
  id: number;
  source: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: string;
  notes?: string;
  attachment?: string;
}

interface UserSettings {
  distribution: {
    saving: number;
    needs: number;
    wants: number;
  };
  defaultWallet: 'saving' | 'needs' | 'wants';
  currency: string;
  appTheme: 'light' | 'dark' | 'system';
}

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
}

const IncomeEntry = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Supabase hooks for data persistence
  const { currentAccount } = useBankAccounts();
  const { incomeData, addIncome } = useIncomeData(currentAccount?.id);
  const { processIncomeDistribution } = useWalletData(currentAccount?.id);
  
  // Distribution settings state
  const [settings, setSettings] = useState<UserSettings>({
    distribution: { saving: 50, needs: 30, wants: 20 },
    defaultWallet: 'saving',
    currency: '₹',
    appTheme: 'system'
  });

  useEffect(() => {
    // Load categories from localStorage
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      const allCategories = JSON.parse(storedCategories);
      const incomeCategories = allCategories.filter((cat: Category) => cat.type === 'income');
      setCategories(incomeCategories);
    } else {
      // Initialize default categories if none exist
      const defaultCategories = [
        { id: '1', name: 'Salary', type: 'income' as const, color: '#10B981' },
        { id: '2', name: 'Freelance', type: 'income' as const, color: '#3B82F6' },
        { id: '3', name: 'Investment', type: 'income' as const, color: '#8B5CF6' },
        { id: '4', name: 'Food', type: 'expense' as const, color: '#EF4444' },
        { id: '5', name: 'Transport', type: 'expense' as const, color: '#F59E0B' },
        { id: '6', name: 'Entertainment', type: 'expense' as const, color: '#EC4899' },
        { id: '7', name: 'Bills', type: 'expense' as const, color: '#06B6D4' },
      ];
      localStorage.setItem('categories', JSON.stringify(defaultCategories));
      const incomeCategories = defaultCategories.filter(cat => cat.type === 'income');
      setCategories(incomeCategories);
    }

    // Load payment methods from localStorage
    const storedMethods = localStorage.getItem('paymentMethods');
    if (storedMethods) {
      setPaymentMethods(JSON.parse(storedMethods));
    } else {
      // Initialize default payment methods if none exist
      const defaultMethods = [
        { id: '1', name: 'Cash', color: '#10B981' },
        { id: '2', name: 'UPI', color: '#3B82F6' },
        { id: '3', name: 'Bank Transfer', color: '#8B5CF6' },
        { id: '4', name: 'Credit Card', color: '#EF4444' },
        { id: '5', name: 'Wallet', color: '#F59E0B' },
        { id: '6', name: 'Cheque', color: '#EC4899' },
      ];
      localStorage.setItem('paymentMethods', JSON.stringify(defaultMethods));
      setPaymentMethods(defaultMethods);
    }

    // Income history is now fetched from Supabase via useIncomeData hook

    // Load user settings
    const storedSettings = localStorage.getItem('userSettings');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      setSettings(parsed);
    }
  }, []);

  const getTotalPercentage = () => {
    return settings.distribution.saving + settings.distribution.needs + settings.distribution.wants;
  };

  const isValidDistribution = () => {
    return getTotalPercentage() === 100;
  };

  const handleDistributionChange = (walletType: 'saving' | 'needs' | 'wants', value: string) => {
    const numValue = parseInt(value) || 0;
    const updatedSettings = {
      ...settings,
      distribution: {
        ...settings.distribution,
        [walletType]: numValue
      }
    };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  const resetToDefault = () => {
    const defaultSettings = {
      ...settings,
      distribution: { saving: 50, needs: 30, wants: 20 }
    };
    setSettings(defaultSettings);
    localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
    toast.success('Distribution reset to default (50/30/20)');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!source.trim() || !amount || !date || !selectedCategory || !selectedPaymentMethod || !notes.trim()) {
      toast.error('Please fill in all required fields including description');
      return;
    }

    if (!isValidDistribution()) {
      toast.error('Distribution percentages must add up to 100%');
      return;
    }

    const incomeAmount = parseFloat(amount);
    if (incomeAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save income to Supabase
      const result = await addIncome({
        source: source.trim(),
        amount: incomeAmount,
        date: date.toISOString().split('T')[0],
        category: selectedCategory,
        bank_account_id: currentAccount?.id || null,
      });

      if (!result) {
        setIsSubmitting(false);
        return;
      }

      // Process income distribution to subwallets in Supabase
      await processIncomeDistribution(incomeAmount, settings.distribution);

      // Also update localStorage for backward compatibility with WalletService
      const { walletUpdates, subWalletUpdates } = WalletService.processIncome(incomeAmount);
      WalletService.applyIncomeUpdates(subWalletUpdates);

      // Show detailed breakdown
      const breakdown = walletUpdates.map(update => {
        const percentage = update.type === 'saving' ? settings.distribution.saving : 
                          update.type === 'needs' ? settings.distribution.needs : 
                          settings.distribution.wants;
        return `${update.type.charAt(0).toUpperCase() + update.type.slice(1)}: ₹${update.amount.toFixed(2)} (${percentage}%)`;
      }).join(', ');

      toast.success(`₹${incomeAmount.toLocaleString('en-IN')} saved to backend and distributed! ${breakdown}`);

      console.log('Income saved to Supabase:', {
        total: incomeAmount,
        breakdown: walletUpdates,
        subWalletUpdates
      });

      // Reset form
      setSource('');
      setAmount('');
      setDate(new Date());
      setSelectedCategory('');
      setSelectedPaymentMethod('');
      setNotes('');
      setAttachment(null);

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error saving income:', error);
      toast.error('Failed to save income');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="mr-4 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Add Income</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Income Form */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center">
                 <Plus className="h-5 w-5 mr-2 text-primary" />
                Income Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Source *</Label>
                  <Input
                    id="source"
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g., Salary, Freelance, Investment"
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date Received *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => newDate && setDate(newDate)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={(value) => setSelectedCategory(value)}
                  >
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-background border border-border shadow-lg">
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="default" disabled>
                          No categories available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select 
                    value={selectedPaymentMethod} 
                    onValueChange={(value) => setSelectedPaymentMethod(value)}
                  >
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-background border border-border shadow-lg">
                      {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: method.color }}
                              />
                              {method.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="default" disabled>
                          No payment methods available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Description *</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Thumbnail, Rent, Editing, etc."
                    className="min-h-[80px]"
                    required
                  />
                </div>

                <CollapsibleSection title="▶ More Options">
                  <div className="space-y-4">

                    <div className="space-y-2">
                      <Label htmlFor="attachment">Attachment (Optional)</Label>
                      <Input
                        id="attachment"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx"
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                      />
                      {attachment && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {attachment.name}
                        </p>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                <Button 
                  type="submit" 
                  className="w-full transition-all duration-200 hover:scale-[1.02]"
                  disabled={!isValidDistribution()}
                >
                  Add Income
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Distribution Settings */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle>Distribution Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total: {getTotalPercentage()}%
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="saving" className="text-sm font-medium mb-2 block">
                      Saving Wallet (%)
                    </Label>
                    <Input
                      id="saving"
                      type="number"
                      value={settings.distribution.saving}
                      onChange={(e) => handleDistributionChange('saving', e.target.value)}
                      placeholder="50"
                      min="0"
                      max="100"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="needs" className="text-sm font-medium mb-2 block">
                      Needs Wallet (%)
                    </Label>
                    <Input
                      id="needs"
                      type="number"
                      value={settings.distribution.needs}
                      onChange={(e) => handleDistributionChange('needs', e.target.value)}
                      placeholder="30"
                      min="0"
                      max="100"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="wants" className="text-sm font-medium mb-2 block">
                      Wants Wallet (%)
                    </Label>
                    <Input
                      id="wants"
                      type="number"
                      value={settings.distribution.wants}
                      onChange={(e) => handleDistributionChange('wants', e.target.value)}
                      placeholder="20"
                      min="0"
                      max="100"
                      className="w-full"
                    />
                  </div>
                </div>

                <Button 
                  onClick={resetToDefault}
                  variant="outline" 
                  className="w-full"
                >
                  Reset to Default (50/30/20)
                </Button>

                {!isValidDistribution() && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">
                      Total must equal 100%. Current: {getTotalPercentage()}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Income History */}
        {incomeData.length > 0 && (
          <Card className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>Recent Income Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {incomeData.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors duration-200">
                    <div>
                      <div className="font-medium">{entry.source}</div>
                      <div className="text-sm text-muted-foreground">{entry.date}</div>
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      ₹{Number(entry.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default IncomeEntry;
