import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  Database, 
  RefreshCw, 
  FileSpreadsheet, 
  FileJson, 
  HardDrive, 
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Tag,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { IncomeData, ExpenseData } from '@/types/finance';

interface FileManagementProps {
  incomeData?: IncomeData[];
  expenseData?: ExpenseData[];
  onIncomeUpdate?: (income: IncomeData[]) => void;
  onExpenseUpdate?: (expenses: ExpenseData[]) => void;
}

interface ParsedImportPreview {
  type: 'income' | 'expense' | 'categories' | 'full_backup';
  fileName: string;
  fileSize: string;
  totalRecords: number;
  totalAmount?: number;
  sampleItems: any[];
  rawParsedData: any;
}

export const FileManagement: React.FC<FileManagementProps> = ({
  incomeData: propIncomeData = [],
  expenseData: propExpenseData = [],
  onIncomeUpdate,
  onExpenseUpdate,
}) => {
  const { user } = useAuth();
  const { bankAccounts, currentAccount } = useBankAccounts();

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'templates'>('export');

  // Database stats
  const [stats, setStats] = useState({
    incomeCount: 0,
    incomeTotal: 0,
    expenseCount: 0,
    expenseTotal: 0,
    bankAccountsCount: 0,
    categoriesCount: 0,
    paymentMethodsCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Hidden file inputs
  const incomeFileInputRef = useRef<HTMLInputElement>(null);
  const expenseFileInputRef = useRef<HTMLInputElement>(null);
  const categoriesFileInputRef = useRef<HTMLInputElement>(null);
  const fullBackupFileInputRef = useRef<HTMLInputElement>(null);

  // Import preview dialog state
  const [preview, setPreview] = useState<ParsedImportPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [targetBankAccountId, setTargetBankAccountId] = useState<string>('');

  // Set default target bank account when accounts load
  useEffect(() => {
    if (currentAccount?.id) {
      setTargetBankAccountId(currentAccount.id);
    } else if (bankAccounts.length > 0) {
      const primary = bankAccounts.find(a => a.is_primary) || bankAccounts[0];
      setTargetBankAccountId(primary.id);
    }
  }, [currentAccount, bankAccounts]);

  // Fetch real database counts and stats
  const fetchDatabaseStats = async () => {
    if (!user) return;
    setIsLoadingStats(true);
    try {
      // 1. Income count & total
      const { data: incomeRows } = await supabase
        .from('user_income')
        .select('amount')
        .eq('user_id', user.id);

      // 2. Expense count & total
      const { data: expenseRows } = await supabase
        .from('user_expenses')
        .select('amount')
        .eq('user_id', user.id);

      // 3. Bank accounts
      const { count: bankCount } = await supabase
        .from('user_bank_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 4. Categories & Payment Methods from localStorage
      const storedCategories = localStorage.getItem('categories');
      const storedMethods = localStorage.getItem('paymentMethods');
      const cats = storedCategories ? JSON.parse(storedCategories) : [];
      const methods = storedMethods ? JSON.parse(storedMethods) : [];

      const incTotal = (incomeRows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const expTotal = (expenseRows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);

      setStats({
        incomeCount: incomeRows?.length || 0,
        incomeTotal: incTotal,
        expenseCount: expenseRows?.length || 0,
        expenseTotal: expTotal,
        bankAccountsCount: bankCount || bankAccounts.length,
        categoriesCount: Array.isArray(cats) ? cats.length : 0,
        paymentMethodsCount: Array.isArray(methods) ? methods.length : 0,
      });
    } catch (err) {
      console.error('Error fetching database stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDatabaseStats();
  }, [user, bankAccounts.length]);

  // CSV parsing helper that handles quotes and commas
  const parseCSVText = (csv: string): Record<string, string>[] => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      const nextChar = csv[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentLine += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        if (currentLine.trim()) lines.push(currentLine);
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) lines.push(currentLine);

    if (lines.length === 0) return [];

    const parseLine = (line: string): string[] => {
      const fields: string[] = [];
      let field = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        const nc = line[i + 1];
        if (c === '"') {
          if (inQ && nc === '"') {
            field += '"';
            i++;
          } else {
            inQ = !inQ;
          }
        } else if (c === ',' && !inQ) {
          fields.push(field.trim());
          field = '';
        } else {
          field += c;
        }
      }
      fields.push(field.trim());
      return fields;
    };

    const rawHeaders = parseLine(lines[0]);
    const headers = rawHeaders.map(h => 
      h.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && !values[0])) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? '';
      });
      rows.push(row);
    }
    return rows;
  };

  // Helper to trigger browser file download
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    triggerDownload(jsonStr, filename, 'application/json;charset=utf-8');
  };

  const downloadCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows || rows.length === 0) {
      toast.error('No data available to export');
      return;
    }
    const headers = Object.keys(rows[0]);
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headerLine = headers.map(escapeCsv).join(',');
    const bodyLines = rows.map(row => headers.map(h => escapeCsv(row[h])).join(','));
    const csvContent = '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
    triggerDownload(csvContent, filename, 'text/csv;charset=utf-8');
  };

  // ----------------------------------------------------
  // EXPORT HANDLERS (Fetching fresh from Supabase)
  // ----------------------------------------------------

  const exportIncomeJSON = async () => {
    if (!user) return toast.error('Please login to export data');
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('user_income')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      const exportList = data || propIncomeData;
      const dateStr = new Date().toISOString().split('T')[0];
      downloadJSON(exportList, `rokdaa-income-${dateStr}.json`);
      toast.success(`Exported ${exportList.length} income entries (JSON)`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportIncomeCSV = async () => {
    if (!user) return toast.error('Please login to export data');
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('user_income')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      const exportList = (data && data.length > 0) ? data : propIncomeData;
      if (exportList.length === 0) {
        toast.info('No income records found to export');
        return;
      }

      const formatted = exportList.map(item => ({
        'ID': item.id,
        'Date': item.date,
        'Source': item.source,
        'Amount': Number(item.amount) || 0,
        'Category': item.category || 'General',
        'Payment Method': item.payment_method || 'Other',
        'Notes': item.notes || '',
        'Bank Account ID': item.bank_account_id || '',
        'Auto Interest': (item as any).is_auto_interest ? 'Yes' : 'No',
      }));

      const dateStr = new Date().toISOString().split('T')[0];
      downloadCSV(formatted, `rokdaa-income-${dateStr}.csv`);
      toast.success(`Exported ${formatted.length} income entries (CSV)`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportExpenseJSON = async () => {
    if (!user) return toast.error('Please login to export data');
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('user_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      const exportList = data || propExpenseData;
      const dateStr = new Date().toISOString().split('T')[0];
      downloadJSON(exportList, `rokdaa-expenses-${dateStr}.json`);
      toast.success(`Exported ${exportList.length} expense entries (JSON)`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportExpenseCSV = async () => {
    if (!user) return toast.error('Please login to export data');
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('user_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      const exportList = (data && data.length > 0) ? data : propExpenseData;
      if (exportList.length === 0) {
        toast.info('No expense records found to export');
        return;
      }

      const formatted = exportList.map(item => ({
        'ID': item.id,
        'Date': item.date,
        'Description': item.description,
        'Amount': Number(item.amount) || 0,
        'Category': item.category || 'General',
        'Payment Method': item.payment_method || 'Other',
        'Notes': item.notes || '',
        'Bank Account ID': item.bank_account_id || '',
      }));

      const dateStr = new Date().toISOString().split('T')[0];
      downloadCSV(formatted, `rokdaa-expenses-${dateStr}.csv`);
      toast.success(`Exported ${formatted.length} expense entries (CSV)`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportBankAccountsJSON = async () => {
    if (!user) return toast.error('Please login to export data');
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      const accounts = data || bankAccounts;
      const dateStr = new Date().toISOString().split('T')[0];
      downloadJSON(accounts, `rokdaa-bank-accounts-${dateStr}.json`);
      toast.success(`Exported ${accounts.length} bank accounts (JSON)`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportCategoriesAndMethodsJSON = () => {
    try {
      const storedCategories = localStorage.getItem('categories');
      const storedMethods = localStorage.getItem('paymentMethods');
      const categories = storedCategories ? JSON.parse(storedCategories) : [];
      const paymentMethods = storedMethods ? JSON.parse(storedMethods) : [];

      const payload = {
        exportDate: new Date().toISOString(),
        categories,
        paymentMethods,
      };

      const dateStr = new Date().toISOString().split('T')[0];
      downloadJSON(payload, `rokdaa-categories-methods-${dateStr}.json`);
      toast.success(`Exported ${categories.length} categories & ${paymentMethods.length} payment methods`);
    } catch (err: any) {
      toast.error('Failed to export settings');
    }
  };

  const exportFullBackupJSON = async () => {
    if (!user) return toast.error('Please login to create a full backup');
    setIsExporting(true);
    try {
      toast.info('Gathering all database records for full backup...');

      const { data: income } = await supabase
        .from('user_income')
        .select('*')
        .eq('user_id', user.id);

      const { data: expenses } = await supabase
        .from('user_expenses')
        .select('*')
        .eq('user_id', user.id);

      const { data: bankAccs } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('user_id', user.id);

      const { data: goals } = await supabase
        .from('user_financial_goals')
        .select('*')
        .eq('user_id', user.id);

      const { data: udaar } = await supabase
        .from('user_udaar_entries')
        .select('*')
        .eq('user_id', user.id);

      const categories = JSON.parse(localStorage.getItem('categories') || '[]');
      const paymentMethods = JSON.parse(localStorage.getItem('paymentMethods') || '[]');
      const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');

      const fullBackup = {
        version: '2.0',
        appName: 'Rokdaa',
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        settings: userSettings,
        categories,
        paymentMethods,
        bankAccounts: bankAccs || [],
        income: income || [],
        expenses: expenses || [],
        goals: goals || [],
        udaarEntries: udaar || [],
      };

      const dateStr = new Date().toISOString().split('T')[0];
      downloadJSON(fullBackup, `rokdaa-complete-backup-${dateStr}.json`);
      toast.success('Complete cloud backup downloaded successfully!');
    } catch (err: any) {
      toast.error(`Full backup failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // ----------------------------------------------------
  // IMPORT & FILE PARSING HANDLERS
  // ----------------------------------------------------

  const handleFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'income' | 'expense' | 'categories' | 'full_backup'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const fileSizeStr = (file.size / 1024).toFixed(1) + ' KB';

        if (type === 'income') {
          processIncomeFile(file.name, fileSizeStr, text);
        } else if (type === 'expense') {
          processExpenseFile(file.name, fileSizeStr, text);
        } else if (type === 'categories') {
          processCategoriesFile(file.name, fileSizeStr, text);
        } else if (type === 'full_backup') {
          processFullBackupFile(file.name, fileSizeStr, text);
        }
      } catch (err: any) {
        toast.error(`Failed to read file: ${err.message}`);
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const processIncomeFile = (fileName: string, fileSize: string, content: string) => {
    let items: any[] = [];
    if (fileName.endsWith('.json')) {
      const parsed = JSON.parse(content);
      items = Array.isArray(parsed) ? parsed : (parsed.income || parsed.data || []);
    } else if (fileName.endsWith('.csv')) {
      const csvRows = parseCSVText(content);
      items = csvRows.map((row, idx) => {
        const amountStr = row.amount || row.value || row.rupees || row.inr || '0';
        const cleanAmount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
        const source = row.source || row.title || row.name || row.description || `Income #${idx + 1}`;
        const date = row.date || row.transactiondate || row.createdat || new Date().toISOString().split('T')[0];
        const category = row.category || 'General';
        const payment_method = row.paymentmethod || row.payment_method || row.method || 'Other';
        const notes = row.notes || row.note || row.memo || '';
        const bank_account_id = row.bankaccountid || row.bank_account_id || null;

        return {
          source,
          amount: cleanAmount,
          date,
          category,
          payment_method,
          notes,
          bank_account_id,
        };
      });
    } else {
      throw new Error('Unsupported format. Please select a .csv or .json file');
    }

    if (items.length === 0) {
      toast.error('No valid income records found in this file');
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    setPreview({
      type: 'income',
      fileName,
      fileSize,
      totalRecords: items.length,
      totalAmount,
      sampleItems: items.slice(0, 3),
      rawParsedData: items,
    });
    setIsPreviewOpen(true);
  };

  const processExpenseFile = (fileName: string, fileSize: string, content: string) => {
    let items: any[] = [];
    if (fileName.endsWith('.json')) {
      const parsed = JSON.parse(content);
      items = Array.isArray(parsed) ? parsed : (parsed.expenses || parsed.data || []);
    } else if (fileName.endsWith('.csv')) {
      const csvRows = parseCSVText(content);
      items = csvRows.map((row, idx) => {
        const amountStr = row.amount || row.value || row.rupees || row.inr || '0';
        const cleanAmount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
        const description = row.description || row.title || row.source || row.name || row.item || `Expense #${idx + 1}`;
        const date = row.date || row.transactiondate || row.createdat || new Date().toISOString().split('T')[0];
        const category = row.category || 'General';
        const payment_method = row.paymentmethod || row.payment_method || row.method || 'Other';
        const notes = row.notes || row.note || row.memo || '';
        const bank_account_id = row.bankaccountid || row.bank_account_id || null;

        return {
          description,
          amount: cleanAmount,
          date,
          category,
          payment_method,
          notes,
          bank_account_id,
        };
      });
    } else {
      throw new Error('Unsupported format. Please select a .csv or .json file');
    }

    if (items.length === 0) {
      toast.error('No valid expense records found in this file');
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    setPreview({
      type: 'expense',
      fileName,
      fileSize,
      totalRecords: items.length,
      totalAmount,
      sampleItems: items.slice(0, 3),
      rawParsedData: items,
    });
    setIsPreviewOpen(true);
  };

  const processCategoriesFile = (fileName: string, fileSize: string, content: string) => {
    const parsed = JSON.parse(content);
    const categories = parsed.categories || (Array.isArray(parsed) ? parsed : []);
    const paymentMethods = parsed.paymentMethods || [];

    if (!Array.isArray(categories) && !Array.isArray(paymentMethods)) {
      throw new Error('Invalid categories format');
    }

    setPreview({
      type: 'categories',
      fileName,
      fileSize,
      totalRecords: categories.length + paymentMethods.length,
      sampleItems: categories.slice(0, 3),
      rawParsedData: { categories, paymentMethods },
    });
    setIsPreviewOpen(true);
  };

  const processFullBackupFile = (fileName: string, fileSize: string, content: string) => {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file');
    }

    const incomeCount = Array.isArray(parsed.income) ? parsed.income.length : 0;
    const expenseCount = Array.isArray(parsed.expenses) ? parsed.expenses.length : 0;
    const bankCount = Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts.length : 0;
    const totalRecords = incomeCount + expenseCount + bankCount;

    setPreview({
      type: 'full_backup',
      fileName,
      fileSize,
      totalRecords,
      sampleItems: [
        { label: 'Bank Accounts', count: bankCount },
        { label: 'Income Records', count: incomeCount },
        { label: 'Expense Records', count: expenseCount },
        { label: 'Categories', count: Array.isArray(parsed.categories) ? parsed.categories.length : 0 },
      ],
      rawParsedData: parsed,
    });
    setIsPreviewOpen(true);
  };

  // ----------------------------------------------------
  // EXECUTE IMPORT TO SUPABASE DATABASE
  // ----------------------------------------------------

  const executeImport = async () => {
    if (!preview || !user) {
      toast.error('Authentication required to import into database');
      return;
    }

    setIsImporting(true);
    try {
      const assignedBankId = targetBankAccountId || currentAccount?.id || (bankAccounts[0]?.id ?? null);

      if (preview.type === 'income') {
        const recordsToInsert = preview.rawParsedData.map((item: any) => ({
          user_id: user.id,
          source: item.source || 'Imported Income',
          amount: Number(item.amount) || 0,
          date: item.date || new Date().toISOString().split('T')[0],
          category: item.category || 'General',
          payment_method: item.payment_method || null,
          notes: item.notes || null,
          bank_account_id: item.bank_account_id || assignedBankId,
          is_auto_interest: Boolean(item.is_auto_interest),
          is_manually_edited: Boolean(item.is_manually_edited),
        }));

        if (importMode === 'replace') {
          await supabase.from('user_income').delete().eq('user_id', user.id);
        }

        const chunkSize = 50;
        for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
          const chunk = recordsToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('user_income').insert(chunk);
          if (error) throw error;
        }

        if (onIncomeUpdate) {
          onIncomeUpdate(recordsToInsert);
        }

        toast.success(`Successfully imported ${recordsToInsert.length} income records to database!`);
      } else if (preview.type === 'expense') {
        const recordsToInsert = preview.rawParsedData.map((item: any) => ({
          user_id: user.id,
          description: item.description || 'Imported Expense',
          amount: Number(item.amount) || 0,
          date: item.date || new Date().toISOString().split('T')[0],
          category: item.category || 'General',
          payment_method: item.payment_method || null,
          notes: item.notes || null,
          deductions: item.deductions || [],
          bank_account_id: item.bank_account_id || assignedBankId,
        }));

        if (importMode === 'replace') {
          await supabase.from('user_expenses').delete().eq('user_id', user.id);
        }

        const chunkSize = 50;
        for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
          const chunk = recordsToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('user_expenses').insert(chunk);
          if (error) throw error;
        }

        if (onExpenseUpdate) {
          onExpenseUpdate(recordsToInsert);
        }

        toast.success(`Successfully imported ${recordsToInsert.length} expense records to database!`);
      } else if (preview.type === 'categories') {
        const { categories, paymentMethods } = preview.rawParsedData;
        if (Array.isArray(categories) && categories.length > 0) {
          localStorage.setItem('categories', JSON.stringify(categories));
          window.dispatchEvent(new Event('categoriesChanged'));
        }
        if (Array.isArray(paymentMethods) && paymentMethods.length > 0) {
          localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods));
        }
        toast.success('Categories & payment methods restored successfully!');
      } else if (preview.type === 'full_backup') {
        const data = preview.rawParsedData;

        if (data.settings) {
          localStorage.setItem('userSettings', JSON.stringify(data.settings));
        }
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          localStorage.setItem('categories', JSON.stringify(data.categories));
          window.dispatchEvent(new Event('categoriesChanged'));
        }
        if (Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0) {
          localStorage.setItem('paymentMethods', JSON.stringify(data.paymentMethods));
        }

        if (Array.isArray(data.bankAccounts) && data.bankAccounts.length > 0) {
          for (const acc of data.bankAccounts) {
            const { id, user_id, created_at, updated_at, ...accData } = acc;
            await supabase.from('user_bank_accounts').upsert({
              id: acc.id,
              user_id: user.id,
              name: accData.name || 'Account',
              bank_name: accData.bank_name || 'Bank',
              account_type: accData.account_type || 'savings',
              balance: accData.balance || 0,
              is_primary: Boolean(accData.is_primary),
            });
          }
        }

        if (Array.isArray(data.income) && data.income.length > 0) {
          const incomePayload = data.income.map((inc: any) => ({
            user_id: user.id,
            source: inc.source || 'Income',
            amount: Number(inc.amount) || 0,
            date: inc.date || new Date().toISOString().split('T')[0],
            category: inc.category || 'General',
            payment_method: inc.payment_method || null,
            notes: inc.notes || null,
            bank_account_id: inc.bank_account_id || assignedBankId,
          }));

          const chunkSize = 50;
          for (let i = 0; i < incomePayload.length; i += chunkSize) {
            await supabase.from('user_income').insert(incomePayload.slice(i, i + chunkSize));
          }
        }

        if (Array.isArray(data.expenses) && data.expenses.length > 0) {
          const expensePayload = data.expenses.map((exp: any) => ({
            user_id: user.id,
            description: exp.description || 'Expense',
            amount: Number(exp.amount) || 0,
            date: exp.date || new Date().toISOString().split('T')[0],
            category: exp.category || 'General',
            payment_method: exp.payment_method || null,
            notes: exp.notes || null,
            bank_account_id: exp.bank_account_id || assignedBankId,
          }));

          const chunkSize = 50;
          for (let i = 0; i < expensePayload.length; i += chunkSize) {
            await supabase.from('user_expenses').insert(expensePayload.slice(i, i + chunkSize));
          }
        }

        toast.success('Complete backup restored into Supabase successfully!');
      }

      window.dispatchEvent(new Event('transactionUpdated'));
      window.dispatchEvent(new Event('walletDataChanged'));
      window.dispatchEvent(new Event('bankAccountChanged'));

      setIsPreviewOpen(false);
      setPreview(null);
      await fetchDatabaseStats();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(`Import failed: ${err.message || 'Database error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadIncomeSampleCSV = () => {
    const sampleRows = [
      {
        'Date': '2026-11-01',
        'Source': 'Monthly Salary',
        'Amount': '75000',
        'Category': 'Salary',
        'Payment Method': 'Bank Transfer',
        'Notes': 'Company direct deposit'
      },
      {
        'Date': '2026-11-05',
        'Source': 'Web Freelancing',
        'Amount': '15000',
        'Category': 'Freelance',
        'Payment Method': 'UPI',
        'Notes': 'Client website project'
      },
      {
        'Date': '2026-11-10',
        'Source': 'Quarterly Dividend',
        'Amount': '2400',
        'Category': 'Investment',
        'Payment Method': 'Bank Transfer',
        'Notes': 'Mutual funds'
      }
    ];
    downloadCSV(sampleRows, 'rokdaa-income-sample-template.csv');
    toast.success('Sample Income CSV template downloaded');
  };

  const downloadExpenseSampleCSV = () => {
    const sampleRows = [
      {
        'Date': '2026-11-02',
        'Description': 'Monthly Grocery & Supermarket',
        'Amount': '4200',
        'Category': 'Food',
        'Payment Method': 'UPI',
        'Notes': 'D-Mart shopping'
      },
      {
        'Date': '2026-11-04',
        'Description': 'Electricity Bill',
        'Amount': '1850',
        'Category': 'Bills',
        'Payment Method': 'Credit Card',
        'Notes': 'BSES electricity'
      },
      {
        'Date': '2026-11-08',
        'Description': 'Petrol Fuel',
        'Amount': '2000',
        'Category': 'Transport',
        'Payment Method': 'Cash',
        'Notes': 'Car tank full'
      }
    ];
    downloadCSV(sampleRows, 'rokdaa-expense-sample-template.csv');
    toast.success('Sample Expense CSV template downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Live Cloud Database Status & Summary Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/30 to-background border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg shadow-sm">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-foreground">Cloud Database Sync (Supabase)</h3>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                All imports & exports read directly from and write directly to your cloud financial database.
              </p>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDatabaseStats} 
            disabled={isLoadingStats}
            className="gap-2 h-9 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Refresh Counts
          </Button>
        </div>

        {/* 4 Stats Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="bg-background/80 backdrop-blur rounded-lg p-3 border border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Income Entries</span>
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">{stats.incomeCount}</span>
              <span className="text-xs text-muted-foreground truncate">
                (₹{stats.incomeTotal.toLocaleString('en-IN')})
              </span>
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur rounded-lg p-3 border border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Expense Entries</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">{stats.expenseCount}</span>
              <span className="text-xs text-muted-foreground truncate">
                (₹{stats.expenseTotal.toLocaleString('en-IN')})
              </span>
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur rounded-lg p-3 border border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Bank Accounts</span>
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-bold text-foreground">{stats.bankAccountsCount}</span>
              <span className="text-xs text-muted-foreground ml-1">linked</span>
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur rounded-lg p-3 border border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Categories & Methods</span>
              <Tag className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-bold text-foreground">{stats.categoriesCount + stats.paymentMethodsCount}</span>
              <span className="text-xs text-muted-foreground ml-1">configured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs: Export, Import, Templates */}
      <Tabs value={activeSubTab} onValueChange={(val: any) => setActiveSubTab(val)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6">
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export & Backup</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            <span>Import & Sync</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
        </TabsList>

        {/* ---------------- EXPORT TAB ---------------- */}
        <TabsContent value="export" className="space-y-6 animate-fade-in">
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-card to-card relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
              <Sparkles className="w-48 h-48 text-primary" />
            </div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 mb-2">
                    Recommended Complete Backup
                  </Badge>
                  <CardTitle className="text-lg">Full System & Cloud Database Backup</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Exports everything in one click: All Bank Accounts, Income records, Expense records, Categories, Payment methods, and User settings as a comprehensive JSON backup.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={exportFullBackupJSON} 
                disabled={isExporting}
                size="lg"
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-primary/85 shadow-md hover:shadow-lg transition-all"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
                Download Complete Cloud Backup (.json)
              </Button>
            </CardContent>
          </Card>

          {/* Granular Export Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Income Records</CardTitle>
                    <CardDescription className="text-xs">
                      Export all {stats.incomeCount} income records from database
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={exportIncomeCSV}
                    disabled={isExporting || stats.incomeCount === 0}
                    className="w-full gap-2 text-xs"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={exportIncomeJSON}
                    disabled={isExporting || stats.incomeCount === 0}
                    className="w-full gap-2 text-xs"
                  >
                    <FileJson className="h-3.5 w-3.5 text-blue-600" />
                    Export JSON
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Expense Records</CardTitle>
                    <CardDescription className="text-xs">
                      Export all {stats.expenseCount} expense records from database
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={exportExpenseCSV}
                    disabled={isExporting || stats.expenseCount === 0}
                    className="w-full gap-2 text-xs"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-rose-600" />
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={exportExpenseJSON}
                    disabled={isExporting || stats.expenseCount === 0}
                    className="w-full gap-2 text-xs"
                  >
                    <FileJson className="h-3.5 w-3.5 text-blue-600" />
                    Export JSON
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Bank Accounts</CardTitle>
                    <CardDescription className="text-xs">
                      Export all linked bank accounts & balances
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={exportBankAccountsJSON}
                  disabled={isExporting}
                  className="w-full gap-2 text-xs"
                >
                  <FileJson className="h-3.5 w-3.5 text-blue-600" />
                  Export Bank Accounts (JSON)
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Categories & Methods</CardTitle>
                    <CardDescription className="text-xs">
                      Export custom tags, colors & payment options
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={exportCategoriesAndMethodsJSON}
                  className="w-full gap-2 text-xs"
                >
                  <FileJson className="h-3.5 w-3.5 text-purple-600" />
                  Export Settings & Categories (JSON)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- IMPORT TAB ---------------- */}
        <TabsContent value="import" className="space-y-6 animate-fade-in">
          <div className="bg-card border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Default Target Bank Account for Imported Transactions</Label>
              <p className="text-sm font-medium mt-0.5">
                {bankAccounts.find(a => a.id === targetBankAccountId)?.name || 'Primary Bank Account'}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select value={targetBankAccountId} onValueChange={setTargetBankAccountId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bank_name}) {acc.is_primary ? '★ Primary' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              ref={incomeFileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={(e) => handleFileSelected(e, 'income')}
              className="hidden"
            />
            <input
              ref={expenseFileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={(e) => handleFileSelected(e, 'expense')}
              className="hidden"
            />
            <input
              ref={categoriesFileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => handleFileSelected(e, 'categories')}
              className="hidden"
            />
            <input
              ref={fullBackupFileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => handleFileSelected(e, 'full_backup')}
              className="hidden"
            />

            <Card className="border-dashed border-2 hover:border-emerald-500/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Import Income Data</CardTitle>
                    <CardDescription className="text-xs">
                      Upload .CSV or .JSON containing income records
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => incomeFileInputRef.current?.click()} 
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Upload className="h-4 w-4" />
                  Choose Income File (.csv / .json)
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 hover:border-rose-500/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Import Expense Data</CardTitle>
                    <CardDescription className="text-xs">
                      Upload .CSV or .JSON containing expense records
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => expenseFileInputRef.current?.click()} 
                  className="w-full gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Upload className="h-4 w-4" />
                  Choose Expense File (.csv / .json)
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 hover:border-purple-500/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Import Categories & Methods</CardTitle>
                    <CardDescription className="text-xs">
                      Restore tags, colors and payment options (.json)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  onClick={() => categoriesFileInputRef.current?.click()} 
                  className="w-full gap-2 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                >
                  <Upload className="h-4 w-4" />
                  Choose Categories File (.json)
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Restore Full Cloud Backup</CardTitle>
                    <CardDescription className="text-xs">
                      Restore everything from a previously exported backup file
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  onClick={() => fullBackupFileInputRef.current?.click()} 
                  className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/5"
                >
                  <Upload className="h-4 w-4" />
                  Choose Full Backup File (.json)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- TEMPLATES TAB ---------------- */}
        <TabsContent value="templates" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  Sample Income CSV Template
                </CardTitle>
                <CardDescription className="text-xs">
                  Includes formatted columns: Date, Source, Amount, Category, Payment Method, Notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto">
                  Date,Source,Amount,Category,Payment Method,Notes<br />
                  2026-11-01,Monthly Salary,75000,Salary,Bank Transfer,Direct deposit<br />
                  2026-11-05,Web Freelancing,15000,Freelance,UPI,Client work
                </div>
                <Button onClick={downloadIncomeSampleCSV} variant="outline" className="w-full gap-2 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download Income CSV Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-rose-600" />
                  Sample Expense CSV Template
                </CardTitle>
                <CardDescription className="text-xs">
                  Includes formatted columns: Date, Description, Amount, Category, Payment Method, Notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto">
                  Date,Description,Amount,Category,Payment Method,Notes<br />
                  2026-11-02,Monthly Grocery,4200,Food,UPI,Supermarket<br />
                  2026-11-04,Electricity Bill,1850,Bills,Credit Card,Utility
                </div>
                <Button onClick={downloadExpenseSampleCSV} variant="outline" className="w-full gap-2 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download Expense CSV Template
                </Button>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertTitle className="text-sm font-semibold">Data Safety & Formatting Guidelines</AlertTitle>
            <AlertDescription className="text-xs space-y-1.5 mt-1">
              <p>• <strong>CSV Headers:</strong> The first row must include column names. Headers are case-insensitive.</p>
              <p>• <strong>Dates:</strong> Supported formats are YYYY-MM-DD (recommended), DD/MM/YYYY, or MM/DD/YYYY.</p>
              <p>• <strong>Currency values:</strong> Currency symbols like ₹, $, and commas are automatically stripped and cleaned.</p>
              <p>• <strong>Cloud Storage:</strong> Data is saved directly to your Supabase Postgres database and cached in browser storage for instant offline viewing.</p>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* ---------------- IMPORT CONFIRMATION & PREVIEW DIALOG ---------------- */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-primary" />
              Confirm Import to Cloud Database
            </DialogTitle>
            <DialogDescription>
              Review the file details before writing records into Supabase.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 border rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">File Name:</span>
                  <p className="font-semibold text-foreground truncate">{preview.fileName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">File Size:</span>
                  <p className="font-semibold text-foreground">{preview.fileSize}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Detected Type:</span>
                  <p className="font-semibold text-primary capitalize">{preview.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Records:</span>
                  <p className="font-semibold text-foreground">{preview.totalRecords} entries</p>
                </div>
                {preview.totalAmount !== undefined && (
                  <div className="col-span-2 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">Total Combined Amount:</span>
                    <p className="font-bold text-base text-foreground">₹{preview.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>

              {(preview.type === 'income' || preview.type === 'expense') && (
                <div className="space-y-1.5">
                  <Label htmlFor="target-bank-modal" className="text-xs font-medium">
                    Assign to Bank Account
                  </Label>
                  <Select value={targetBankAccountId} onValueChange={setTargetBankAccountId}>
                    <SelectTrigger id="target-bank-modal">
                      <SelectValue placeholder="Select Bank Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.bank_name}) {acc.is_primary ? '★ Primary' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-medium">Import Strategy</Label>
                <RadioGroup 
                  value={importMode} 
                  onValueChange={(val: any) => setImportMode(val)}
                  className="grid grid-cols-1 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-2.5 hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="append" id="strategy-append" />
                    <Label htmlFor="strategy-append" className="text-xs cursor-pointer flex-1">
                      <span className="font-semibold block text-foreground">Append & Merge (Recommended)</span>
                      <span className="text-muted-foreground block text-[11px]">
                        Add imported records to your existing database without deleting current entries.
                      </span>
                    </Label>
                  </div>

                  {preview.type !== 'categories' && (
                    <div className="flex items-center space-x-2 border border-rose-200 dark:border-rose-900/50 rounded-lg p-2.5 hover:bg-rose-50/20 cursor-pointer">
                      <RadioGroupItem value="replace" id="strategy-replace" />
                      <Label htmlFor="strategy-replace" className="text-xs cursor-pointer flex-1">
                        <span className="font-semibold block text-rose-600 dark:text-rose-400">Replace Existing Data</span>
                        <span className="text-muted-foreground block text-[11px]">
                          Erase current records of this type and replace them with the imported file.
                        </span>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>

              {preview.sampleItems && preview.sampleItems.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sample Preview (First {preview.sampleItems.length} records):</Label>
                  <div className="bg-background border rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5 text-xs">
                    {preview.sampleItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b last:border-b-0 border-border/40 text-[11px]">
                        <span className="truncate max-w-[200px] font-medium">
                          {item.source || item.description || item.name || item.label || `Record #${idx + 1}`}
                        </span>
                        {item.amount !== undefined && (
                          <span className="font-bold text-foreground">
                            ₹{Number(item.amount).toLocaleString('en-IN')}
                          </span>
                        )}
                        {item.count !== undefined && (
                          <Badge variant="outline" className="text-[10px]">{item.count} items</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button 
              onClick={executeImport} 
              disabled={isImporting}
              className="gap-2 bg-primary text-primary-foreground"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing to Database...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Confirm & Import ({preview?.totalRecords} Records)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileManagement;
