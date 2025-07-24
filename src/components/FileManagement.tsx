
import React, { useRef } from 'react';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Wallet, IncomeData, ExpenseData, FileData } from '@/types/finance';

interface FileManagementProps {
  wallets: Wallet[];
  incomeData: IncomeData[];
  expenseData: ExpenseData[];
  onWalletsUpdate: (wallets: Wallet[]) => void;
  onIncomeUpdate: (income: IncomeData[]) => void;
  onExpenseUpdate: (expenses: ExpenseData[]) => void;
}

const FileManagement: React.FC<FileManagementProps> = ({
  wallets,
  incomeData,
  expenseData,
  onWalletsUpdate,
  onIncomeUpdate,
  onExpenseUpdate
}) => {
  const incomeFileRef = useRef<HTMLInputElement>(null);
  const expenseFileRef = useRef<HTMLInputElement>(null);
  const walletFileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'income' | 'expense' | 'wallet') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let data;

        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(content, type);
        } else {
          throw new Error('Unsupported file format. Please use .json or .csv files.');
        }

        switch (type) {
          case 'income':
            onIncomeUpdate(data);
            toast({
              title: "Success",
              description: "Income data imported successfully!"
            });
            break;
          case 'expense':
            onExpenseUpdate(data);
            toast({
              title: "Success",
              description: "Expense data imported successfully!"
            });
            break;
          case 'wallet':
            onWalletsUpdate(data);
            toast({
              title: "Success",
              description: "Wallet settings imported successfully!"
            });
            break;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const parseCSV = (content: string, type: string) => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const obj: any = {};
      
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });

      // Convert numeric fields
      if (obj.amount) obj.amount = parseFloat(obj.amount);
      if (obj.balance) obj.balance = parseFloat(obj.balance);
      if (obj.id) obj.id = parseInt(obj.id);

      data.push(obj);
    }

    return data;
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllData = () => {
    const allData: FileData = {
      wallets,
      income: incomeData,
      expenses: expenseData
    };
    downloadJSON(allData, 'finance-tracker-data.json');
    toast({
      title: "Success",
      description: "All data exported successfully!"
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Income Data (.csv or .json)
              </label>
              <input
                ref={incomeFileRef}
                type="file"
                accept=".csv,.json"
                onChange={(e) => handleFileUpload(e, 'income')}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => incomeFileRef.current?.click()}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose Income File
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Expense Data (.csv or .json)
              </label>
              <input
                ref={expenseFileRef}
                type="file"
                accept=".csv,.json"
                onChange={(e) => handleFileUpload(e, 'expense')}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => expenseFileRef.current?.click()}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose Expense File
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Wallet Settings (.json)
              </label>
              <input
                ref={walletFileRef}
                type="file"
                accept=".json"
                onChange={(e) => handleFileUpload(e, 'wallet')}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => walletFileRef.current?.click()}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose Wallet File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => downloadJSON(incomeData, 'income-data.json')}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Income (JSON)
            </Button>

            <Button
              variant="outline"
              onClick={() => downloadCSV(incomeData, 'income-data.csv')}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Income (CSV)
            </Button>

            <Button
              onClick={() => downloadJSON(expenseData, 'expense-data.json')}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Expenses (JSON)
            </Button>

            <Button
              variant="outline"
              onClick={() => downloadCSV(expenseData, 'expense-data.csv')}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Expenses (CSV)
            </Button>

            <Button
              onClick={exportAllData}
              className="w-full bg-gradient-to-r from-primary to-primary/80"
            >
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-1">File Format Guidelines:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>CSV files should have headers in the first row</li>
            <li>JSON files should contain an array of objects</li>
            <li>All data is stored locally in your browser</li>
            <li>Supported file types: .csv, .json</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default FileManagement;
