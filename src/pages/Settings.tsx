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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CategoryManager from '@/components/CategoryManager';
import PaymentMethodManager from '@/components/PaymentMethodManager';
import FileManagement from '@/components/FileManagement';
import BankAccountManager from '@/components/BankAccountManager';
import InterestSettingsSection from '@/components/InterestSettingsSection';
import { IncomeData, ExpenseData } from '@/types/finance';
import { 
  ArrowLeft, 
  Trash2, 
  Palette, 
  Building2, 
  Percent, 
  Tag, 
  CreditCard, 
  ShieldAlert, 
  Database, 
  Sun, 
  Moon, 
  Monitor, 
  Layers, 
  User
} from 'lucide-react';

interface UserSettings {
  currency: string;
  appTheme: 'light' | 'dark' | 'system';
}

type SettingsSection = 
  | 'all'
  | 'accounts'
  | 'interest'
  | 'categories'
  | 'payments'
  | 'data'
  | 'preferences'
  | 'danger';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  
  const [activeSection, setActiveSection] = useState<SettingsSection>('all');
  const [viewMode, setViewMode] = useState<'focused' | 'all'>('focused');

  const [settings, setSettings] = useState<UserSettings>({
    currency: '₹',
    appTheme: 'dark'
  });

  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);

  useEffect(() => {
    const storedSettings = localStorage.getItem('userSettings');
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setSettings(prev => ({
          ...prev,
          currency: parsed.currency || '₹',
          appTheme: parsed.appTheme || 'dark'
        }));
      } catch (e) {
        console.error('Error parsing userSettings:', e);
      }
    }
    
    // Load local caches
    const storedIncome = localStorage.getItem('incomeData');
    const storedExpenses = localStorage.getItem('expenseData');

    if (storedIncome) {
      try { setIncomeData(JSON.parse(storedIncome)); } catch (e) {}
    }
    if (storedExpenses) {
      try { setExpenseData(JSON.parse(storedExpenses)); } catch (e) {}
    }
  }, []);

  const handleResetData = async () => {
    try {
      if (user?.id) {
        await supabase.from('user_income').delete().eq('user_id', user.id);
        await supabase.from('user_expenses').delete().eq('user_id', user.id);
        await supabase.from('user_financial_goals').delete().eq('user_id', user.id);
      }
    } catch (err) {
      console.error('Error clearing user data from Supabase:', err);
    }

    const authKeys: { [key: string]: string | null } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
        authKeys[key] = localStorage.getItem(key);
      }
    }

    localStorage.clear();

    Object.entries(authKeys).forEach(([key, val]) => {
      if (val !== null) localStorage.setItem(key, val);
    });

    window.dispatchEvent(new Event('transactionUpdated'));
    window.dispatchEvent(new Event('bankAccountChanged'));
    window.dispatchEvent(new Event('walletDataChanged'));

    toast({
      title: "Data Reset Complete",
      description: "All transactions, goals, and local cache data have been reset to zero.",
    });
    navigate('/');
  };

  const handleClearTransactions = async () => {
    try {
      if (user?.id) {
        await supabase.from('user_income').delete().eq('user_id', user.id);
        await supabase.from('user_expenses').delete().eq('user_id', user.id);
      }
    } catch (err) {
      console.error('Error clearing transactions from Supabase:', err);
    }

    const currentBankAccountId = localStorage.getItem('currentBankAccountId');
    const prefixes = ['', currentBankAccountId ? `${currentBankAccountId}_` : '', currentBankAccountId ? `${currentBankAccountId}:` : ''];
    
    prefixes.forEach(prefix => {
      localStorage.removeItem(`${prefix}incomeData`);
      localStorage.removeItem(`${prefix}expenseData`);
      localStorage.removeItem(`${prefix}totalBalance`);
    });
    
    window.dispatchEvent(new Event('transactionUpdated'));
    window.dispatchEvent(new Event('walletDataChanged'));
    
    toast({
      title: "Transactions Cleared",
      description: "All income and expense transactions have been wiped from backend & local cache.",
    });
  };

  const handleCurrencyChange = (value: string) => {
    const updatedSettings = { ...settings, currency: value };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
    window.dispatchEvent(new Event('userSettingsChanged'));
    toast({
      title: "Currency Updated",
      description: `Default currency set to ${value}`,
    });
  };

  const handleThemeSelect = (newTheme: 'light' | 'dark' | 'system') => {
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

  const scrollToSection = (sectionId: SettingsSection) => {
    setActiveSection(sectionId);
    if (viewMode === 'all') {
      const element = document.getElementById(`section-${sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const navMenuItems = [
    {
      id: 'accounts' as SettingsSection,
      label: 'Bank Accounts',
      icon: Building2,
      description: 'Manage accounts & balances',
      badge: null,
    },
    {
      id: 'interest' as SettingsSection,
      label: 'Savings Interest',
      icon: Percent,
      description: 'Slice automated interest engine',
      badge: '5.5%',
    },
    {
      id: 'categories' as SettingsSection,
      label: 'Categories',
      icon: Tag,
      description: 'Income & expense tags',
      badge: null,
    },
    {
      id: 'payments' as SettingsSection,
      label: 'Payment Methods',
      icon: CreditCard,
      description: 'Cash, UPI, Cards, etc.',
      badge: null,
    },
    {
      id: 'data' as SettingsSection,
      label: 'Data & Backup',
      icon: Database,
      description: 'Import, export & database sync',
      badge: 'Cloud Sync',
    },
    {
      id: 'preferences' as SettingsSection,
      label: 'Preferences',
      icon: Palette,
      description: 'Currency, theme & display',
      badge: null,
    },
    {
      id: 'danger' as SettingsSection,
      label: 'Danger Zone',
      icon: ShieldAlert,
      description: 'Reset ledger or wipe all data',
      badge: null,
    },
  ];

  const currencyPresets = [
    { symbol: '₹', label: 'INR (₹)' },
    { symbol: '$', label: 'USD ($)' },
    { symbol: '€', label: 'EUR (€)' },
    { symbol: '£', label: 'GBP (£)' },
    { symbol: 'AED', label: 'AED' },
    { symbol: '¥', label: 'JPY (¥)' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="bg-background/95 backdrop-blur border-b border-border sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="hover:bg-accent -ml-2 h-9 w-9 p-0 rounded-lg"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Settings & Preferences
                  </h1>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[11px] bg-primary/10 text-primary border-primary/20">
                    Pro
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Manage accounts, interest rules, database backup/restore, and personal preferences
                </p>
              </div>
            </div>

            {/* Cloud Sync Status Indicator */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">Supabase Cloud Active</span>
              </div>

              {user?.email && (
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="max-w-[140px] truncate">{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mobile / Tablet Horizontal Tab Navigation */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
            <button
              onClick={() => {
                setActiveSection('all');
                setViewMode('all');
              }}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSection === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Settings</span>
            </button>
            {navMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setViewMode('focused');
                  }}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop 2-Column Responsive Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* Left Desktop Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-24 space-y-4">
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Navigation
                  </span>
                  {/* View mode toggle */}
                  <div className="flex items-center bg-muted rounded-lg p-0.5 text-xs">
                    <button
                      onClick={() => setViewMode('focused')}
                      className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                        viewMode === 'focused' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                      }`}
                      title="Show single section at a time"
                    >
                      Tab View
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('all');
                        setActiveSection('all');
                      }}
                      className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                        viewMode === 'all' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                      }`}
                      title="Show all sections in one scrollable page"
                    >
                      View All
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-2 space-y-1">
                {/* View All Option in Sidebar */}
                {viewMode === 'all' && (
                  <button
                    onClick={() => setActiveSection('all')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeSection === 'all'
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4" />
                      <span>Overview (All Sections)</span>
                    </div>
                  </button>
                )}

                {navMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  const isDanger = item.id === 'danger';

                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left group ${
                        isActive
                          ? isDanger 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border-l-2 border-rose-500'
                            : 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                          : isDanger
                            ? 'text-rose-500/80 hover:bg-rose-500/10 hover:text-rose-600'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? (isDanger ? 'text-rose-600' : 'text-primary') : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <div className="truncate">
                          <p className="truncate leading-none">{item.label}</p>
                          <span className="text-[10px] text-muted-foreground font-normal leading-tight hidden xl:block">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-2 flex-shrink-0 bg-background">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* System Info Widget */}
            <Card className="bg-muted/40 border-border/60 shadow-none">
              <CardContent className="p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Engine:</span>
                  <span className="font-mono text-foreground font-medium">Rokdaa Core v2.4</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Storage:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Supabase + Cache</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Security:</span>
                  <span className="font-medium text-foreground">RLS Protected</span>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Right Main Content Area */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-8">
            {/* 1. BANK ACCOUNT MANAGER */}
            {(viewMode === 'all' || activeSection === 'accounts' || activeSection === 'all') && (
              <section id="section-accounts" className="bg-card rounded-xl border border-border shadow-sm p-5 sm:p-6 transition-all hover:border-border/90">
                <BankAccountManager />
              </section>
            )}

            {/* 2. SAVINGS INTEREST SYSTEM */}
            {(viewMode === 'all' || activeSection === 'interest' || activeSection === 'all') && (
              <section id="section-interest" className="bg-card rounded-xl border border-border shadow-sm p-5 sm:p-6 transition-all hover:border-border/90">
                <InterestSettingsSection />
              </section>
            )}

            {/* 3. CATEGORY MANAGER */}
            {(viewMode === 'all' || activeSection === 'categories' || activeSection === 'all') && (
              <section id="section-categories" className="bg-card rounded-xl border border-border shadow-sm p-5 sm:p-6 transition-all hover:border-border/90">
                <CategoryManager />
              </section>
            )}

            {/* 4. PAYMENT METHOD MANAGER */}
            {(viewMode === 'all' || activeSection === 'payments' || activeSection === 'all') && (
              <section id="section-payments" className="bg-card rounded-xl border border-border shadow-sm p-5 sm:p-6 transition-all hover:border-border/90">
                <PaymentMethodManager />
              </section>
            )}

            {/* 5. DATA MANAGEMENT & CLOUD BACKUP (Full Supabase Sync) */}
            {(viewMode === 'all' || activeSection === 'data' || activeSection === 'all') && (
              <section id="section-data" className="bg-card rounded-xl border border-border shadow-sm p-5 sm:p-6 transition-all hover:border-border/90">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Data Management & Cloud Sync</h2>
                      <p className="text-xs text-muted-foreground">
                        Export database records to CSV/JSON, import Excel sheets, and perform full disaster backups.
                      </p>
                    </div>
                  </div>
                </div>

                <FileManagement
                  incomeData={incomeData}
                  expenseData={expenseData}
                  onIncomeUpdate={updateIncomeData}
                  onExpenseUpdate={updateExpenseData}
                />
              </section>
            )}

            {/* 6. GLOBAL PREFERENCES & THEME */}
            {(viewMode === 'all' || activeSection === 'preferences' || activeSection === 'all') && (
              <section id="section-preferences" className="bg-card rounded-xl border border-border shadow-sm p-5 sm:p-6 transition-all hover:border-border/90">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border/60">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Appearance & Preferences</h2>
                    <p className="text-xs text-muted-foreground">
                      Customize currency format, theme styling, and visual indicators.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Currency Symbol Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="currency-input" className="text-sm font-semibold">
                      Currency Symbol
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="currency-input"
                        value={settings.currency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        placeholder="₹"
                        className="w-24 text-center font-bold text-base"
                      />
                      <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                        {currencyPresets.map((preset) => (
                          <button
                            key={preset.symbol}
                            type="button"
                            onClick={() => handleCurrencyChange(preset.symbol)}
                            className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                              settings.currency === preset.symbol
                                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      This symbol will be formatted across all balance cards, transaction ledgers, and reports.
                    </p>
                  </div>

                  {/* Theme Switcher 3-Way */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">App Theme</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleThemeSelect('light')}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                          theme === 'light'
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                            : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span>Light</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleThemeSelect('dark')}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                          theme === 'dark'
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                            : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <Moon className="h-4 w-4 text-indigo-400" />
                        <span>Dark</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleThemeSelect('system')}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                          theme === 'system'
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                            : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span>System</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Automatic switching adapts seamlessly to your device's operating system mode.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 7. DANGER ZONE */}
            {(viewMode === 'all' || activeSection === 'danger' || activeSection === 'all') && (
              <section id="section-danger" className="bg-card rounded-xl border border-destructive/30 shadow-sm p-5 sm:p-6 space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-destructive/20">
                  <div className="p-2.5 bg-destructive/10 rounded-xl text-destructive">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>
                    <p className="text-xs text-muted-foreground">
                      Irreversible actions that clear transactions or completely reset all accounts.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Clear Transactions Card */}
                  <div className="border border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/10 rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <h3 className="font-semibold text-sm text-foreground">Clear All Transactions</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Deletes all income and expense ledger entries from Supabase & local cache. Bank accounts, interest settings, and categories are preserved.
                      </p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full border-orange-500/50 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white text-xs h-9"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Clear Transactions Only
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear All Transactions?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will permanently delete all income and expense entries for your account. Total balance will reset to ₹0.
                            <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                              <li>All income records in Supabase</li>
                              <li>All expense records in Supabase</li>
                              <li>Balance caches and recalculations</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleClearTransactions} 
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            Yes, Clear Transactions
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* App Data Reset Card */}
                  <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <h3 className="font-semibold text-sm text-destructive">Factory Data Reset</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Completely deletes all financial records, bank accounts, goals, custom categories, and local browser state. Login credentials are kept intact.
                      </p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="w-full text-xs h-9 shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Reset Everything (Factory)
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-destructive">Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action is permanent and cannot be undone. All your financial history, bank accounts, financial goals, and customized settings will be wiped.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleResetData} 
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Yes, Delete All Data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
