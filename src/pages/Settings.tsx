import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
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
import CategoryManager from '@/components/CategoryManager';
import PaymentMethodManager from '@/components/PaymentMethodManager';
import FileManagement from '@/components/FileManagement';
import BankAccountManager from '@/components/BankAccountManager';
import InterestSettingsSection from '@/components/InterestSettingsSection';
import { IncomeData, ExpenseData } from '@/types/finance';
import { ArrowLeft, Trash2, Palette, FileText } from 'lucide-react';

interface UserSettings {
  currency: string;
  appTheme: 'light' | 'dark' | 'system';
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<UserSettings>({
    currency: '₹',
    appTheme: 'system'
  });

  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);

  useEffect(() => {
    const storedSettings = localStorage.getItem('userSettings');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      setSettings(prev => ({
        ...prev,
        currency: parsed.currency || '₹',
        appTheme: parsed.appTheme || 'system'
      }));
    }
    
    // Load data for file management
    const storedIncome = localStorage.getItem('incomeData');
    const storedExpenses = localStorage.getItem('expenseData');

    if (storedIncome) setIncomeData(JSON.parse(storedIncome));
    if (storedExpenses) setExpenseData(JSON.parse(storedExpenses));
  }, []);

  const handleResetData = async () => {
    try {
      if (user?.id) {
        // Delete user's income, expenses, and bank records in Supabase
        await supabase.from('user_income').delete().eq('user_id', user.id);
        await supabase.from('user_expenses').delete().eq('user_id', user.id);
        await supabase.from('user_financial_goals').delete().eq('user_id', user.id);
      }
    } catch (err) {
      console.error('Error clearing user data from Supabase:', err);
    }

    // Preserve Supabase auth tokens in localStorage so user session isn't broken
    const authKeys: { [key: string]: string | null } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
        authKeys[key] = localStorage.getItem(key);
      }
    }

    localStorage.clear();

    // Restore auth tokens
    Object.entries(authKeys).forEach(([key, val]) => {
      if (val !== null) localStorage.setItem(key, val);
    });

    // Notify listeners
    window.dispatchEvent(new Event('transactionUpdated'));
    window.dispatchEvent(new Event('bankAccountChanged'));

    toast({
      title: "Data Reset",
      description: "All transaction, goal, and local cache data has been reset",
    });
    navigate('/');
  };

  const handleClearTransactions = async () => {
    try {
      if (user?.id) {
        // Delete actual income and expenses from Supabase
        await supabase.from('user_income').delete().eq('user_id', user.id);
        await supabase.from('user_expenses').delete().eq('user_id', user.id);
      }
    } catch (err) {
      console.error('Error clearing transactions from Supabase:', err);
    }

    const currentBankAccountId = localStorage.getItem('currentBankAccountId');
    const prefixes = ['', currentBankAccountId ? `${currentBankAccountId}_` : '', currentBankAccountId ? `${currentBankAccountId}:` : ''];
    
    // Clear all transaction cache keys
    prefixes.forEach(prefix => {
      localStorage.removeItem(`${prefix}incomeData`);
      localStorage.removeItem(`${prefix}expenseData`);
      localStorage.removeItem(`${prefix}totalBalance`);
    });
    
    // Dispatch event to update UI
    window.dispatchEvent(new Event('transactionUpdated'));
    window.dispatchEvent(new Event('walletDataChanged'));
    
    toast({
      title: "Transactions Cleared",
      description: "All transactions and ledger balances have been reset to ₹0 in backend & local cache",
    });
  };

  const handleCurrencyChange = (value: string) => {
    const updatedSettings = { ...settings, currency: value };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    setTheme(newTheme);
    const updatedSettings = { ...settings, appTheme: newTheme };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  const updateIncomeData = (newIncome: IncomeData[]) => {
    setIncomeData(newIncome);
    localStorage.setItem('incomeData', JSON.stringify(newIncome));
  };

  const updateExpenseData = (newExpenses: ExpenseData[]) => {
    setExpenseData(newExpenses);
    localStorage.setItem('expenseData', JSON.stringify(newExpenses));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
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
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Bank Account Management Section */}
        <section className="bg-card rounded-lg border p-6">
          <BankAccountManager />
        </section>

        {/* Savings Interest System Section (Spec §2a, §2c, §4) */}
        <section className="bg-card rounded-lg border p-6">
          <InterestSettingsSection />
        </section>

        {/* Category Management Section */}
        <section className="bg-card rounded-lg border p-6">
          <CategoryManager />
        </section>

        {/* Payment Method Management Section */}
        <section className="bg-card rounded-lg border p-6">
          <PaymentMethodManager />
        </section>

        {/* Data Management Section */}
        <section className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Data Management</h2>
          </div>
          <FileManagement
            incomeData={incomeData}
            expenseData={expenseData}
            onIncomeUpdate={updateIncomeData}
            onExpenseUpdate={updateExpenseData}
          />
        </section>

        {/* Global Settings */}
        <section className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Global Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Currency Symbol */}
            <div>
              <Label htmlFor="currency" className="text-sm font-medium mb-2 block">
                Currency Symbol
              </Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                placeholder="₹"
                className="w-full"
              />
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between md:col-span-2">
              <div>
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Switch
                checked={(resolvedTheme || theme) === 'dark'}
                onCheckedChange={handleThemeChange}
              />
            </div>
          </div>
        </section>

        {/* Clear Transactions Section */}
        <section className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Trash2 className="h-5 w-5 text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Clear All Transactions</h2>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground">
              This will clear all transactions and reset your total ledger balance to ₹0.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Transactions
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Transactions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete all transactions and reset balances to ₹0, including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All income records</li>
                    <li>All expense records</li>
                    <li>Total account balance (reset to ₹0)</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearTransactions} className="bg-orange-500 hover:bg-orange-600">
                  Yes, Clear All Transactions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        {/* Reset Data Section */}
        <section className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">App Data Reset</h2>
          </div>

          <div className="bg-destructive/5 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete all your financial data, including bank accounts, transactions, and settings. This action cannot be undone.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                Reset All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your financial data, including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Bank account configurations</li>
                    <li>Income and expense records</li>
                    <li>User preferences and settings</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">
                  Yes, Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </div>
  );
};

export default Settings;
