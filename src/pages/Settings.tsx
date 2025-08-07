import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import { ArrowLeft, Save, Trash2, Palette, Wallet as WalletIcon, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CategoryManager from '@/components/CategoryManager';
import PaymentMethodManager from '@/components/PaymentMethodManager';
import FileManagement from '@/components/FileManagement';
import BankAccountManager from '@/components/BankAccountManager';
import { Wallet, IncomeData, ExpenseData } from '@/types/finance';

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

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>({
    distribution: { saving: 50, needs: 30, wants: 20 },
    defaultWallet: 'saving',
    currency: '₹',
    appTheme: 'system'
  });

  const [savingPercentage, setSavingPercentage] = useState([50]);
  const [needsPercentage, setNeedsPercentage] = useState([30]);
  const [wantsPercentage, setWantsPercentage] = useState([20]);

  // State for file management
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);

  useEffect(() => {
    const storedSettings = localStorage.getItem('userSettings');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      setSettings(parsed);
      setSavingPercentage([parsed.distribution.saving]);
      setNeedsPercentage([parsed.distribution.needs]);
      setWantsPercentage([parsed.distribution.wants]);
    }
    
    // Load data for file management
    const storedWallets = localStorage.getItem('wallets');
    const storedIncome = localStorage.getItem('incomeData');
    const storedExpenses = localStorage.getItem('expenseData');

    if (storedWallets) setWallets(JSON.parse(storedWallets));
    if (storedIncome) setIncomeData(JSON.parse(storedIncome));
    if (storedExpenses) setExpenseData(JSON.parse(storedExpenses));
  }, []);

  const getTotalPercentage = () => {
    return savingPercentage[0] + needsPercentage[0] + wantsPercentage[0];
  };

  const isValidDistribution = () => {
    return getTotalPercentage() === 100;
  };

  const handleSavingChange = (value: number[]) => {
    setSavingPercentage(value);
    const remaining = 100 - value[0];
    const currentNeedsWants = needsPercentage[0] + wantsPercentage[0];
    
    if (currentNeedsWants > remaining) {
      const needsRatio = needsPercentage[0] / currentNeedsWants;
      const wantsRatio = wantsPercentage[0] / currentNeedsWants;
      setNeedsPercentage([Math.round(remaining * needsRatio)]);
      setWantsPercentage([remaining - Math.round(remaining * needsRatio)]);
    }
  };

  const handleNeedsChange = (value: number[]) => {
    setNeedsPercentage(value);
    const remaining = 100 - savingPercentage[0] - value[0];
    if (remaining >= 0) {
      setWantsPercentage([remaining]);
    }
  };

  const handleWantsChange = (value: number[]) => {
    setWantsPercentage(value);
    const remaining = 100 - savingPercentage[0] - value[0];
    if (remaining >= 0) {
      setNeedsPercentage([remaining]);
    }
  };

  const handleSaveSettings = () => {
    if (!isValidDistribution()) {
      toast({
        title: "Invalid Distribution",
        description: "Wallet percentages must add up to 100%",
        variant: "destructive",
      });
      return;
    }

    const updatedSettings = {
      ...settings,
      distribution: {
        saving: savingPercentage[0],
        needs: needsPercentage[0],
        wants: wantsPercentage[0]
      }
    };

    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
    setSettings(updatedSettings);
    
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully",
    });
  };

  const handleResetData = () => {
    localStorage.clear();
    toast({
      title: "Data Reset",
      description: "All app data has been cleared",
    });
    navigate('/');
  };

  const handleCurrencyChange = (value: string) => {
    const updatedSettings = { ...settings, currency: value };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  const handleDefaultWalletChange = (value: 'saving' | 'needs' | 'wants') => {
    const updatedSettings = { ...settings, defaultWallet: value };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  const handleThemeChange = (checked: boolean) => {
    const theme: 'light' | 'dark' = checked ? 'dark' : 'light';
    const updatedSettings = { ...settings, appTheme: theme };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  // Handlers for file management
  const updateWallets = (newWallets: Wallet[]) => {
    setWallets(newWallets);
    localStorage.setItem('wallets', JSON.stringify(newWallets));
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
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Income Distribution Settings */}
        <section className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <WalletIcon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Income Distribution Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Saving Wallet */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm font-medium">Saving Wallet</Label>
                <span className="text-sm font-medium text-green-600">{savingPercentage[0]}%</span>
              </div>
              <Slider
                value={savingPercentage}
                onValueChange={handleSavingChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Needs Wallet */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm font-medium">Needs Wallet</Label>
                <span className="text-sm font-medium text-blue-600">{needsPercentage[0]}%</span>
              </div>
              <Slider
                value={needsPercentage}
                onValueChange={handleNeedsChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Wants Wallet */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm font-medium">Wants Wallet</Label>
                <span className="text-sm font-medium text-purple-600">{wantsPercentage[0]}%</span>
              </div>
              <Slider
                value={wantsPercentage}
                onValueChange={handleWantsChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Total Percentage */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Distribution:</span>
                <span className={`text-lg font-bold ${isValidDistribution() ? 'text-green-600' : 'text-red-600'}`}>
                  {getTotalPercentage()}%
                </span>
              </div>
              {!isValidDistribution() && (
                <p className="text-sm text-red-600 mt-1">Must equal 100%</p>
              )}
            </div>

            <Button 
              onClick={handleSaveSettings} 
              disabled={!isValidDistribution()}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Distribution
            </Button>
          </div>
        </section>

        {/* Bank Account Management Section */}
        <section className="bg-card rounded-lg border p-6">
          <BankAccountManager />
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
            wallets={wallets}
            incomeData={incomeData}
            expenseData={expenseData}
            onWalletsUpdate={updateWallets}
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

            {/* Default Wallet */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Default Wallet
              </Label>
              <Select value={settings.defaultWallet} onValueChange={handleDefaultWalletChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select default wallet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saving">Saving Wallet</SelectItem>
                  <SelectItem value="needs">Needs Wallet</SelectItem>
                  <SelectItem value="wants">Wants Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between md:col-span-2">
              <div>
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Switch
                checked={settings.appTheme === 'dark'}
                onCheckedChange={handleThemeChange}
              />
            </div>

            {/* Future Feature Placeholder */}
            <div className="md:col-span-2 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Enable Reminders</Label>
                  <p className="text-xs text-muted-foreground">Get notified about budget limits (Coming Soon)</p>
                </div>
                <Switch disabled />
              </div>
            </div>
          </div>
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
              This will permanently delete all your financial data, including wallets, transactions, and settings. This action cannot be undone.
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
                    <li>All wallet balances</li>
                    <li>Income and expense records</li>
                    <li>Budget settings</li>
                    <li>User preferences</li>
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
