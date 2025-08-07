import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowRightLeft, 
  Building2, 
  Wallet,
  DollarSign 
} from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { BankAccount } from '@/types/bank';
import { useToast } from '@/hooks/use-toast';

const BankAccountManager = () => {
  const { 
    bankAccounts, 
    createBankAccount, 
    deleteBankAccount, 
    transferFunds 
  } = useBankAccounts();
  const { toast } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Add account form state
  const [newAccountName, setNewAccountName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newAccountType, setNewAccountType] = useState('savings');

  // Transfer form state
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');

  const handleAddAccount = async () => {
    if (!newAccountName.trim() || !newBankName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createBankAccount({
        name: newAccountName.trim(),
        bank_name: newBankName.trim(),
        account_type: newAccountType,
      });
      
      setNewAccountName('');
      setNewBankName('');
      setNewAccountType('savings');
      setShowAddDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteBankAccount(accountId);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId || !transferAmount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (fromAccountId === toAccountId) {
      toast({
        title: "Invalid Transfer",
        description: "Source and destination accounts must be different",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      await transferFunds({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        description: transferDescription.trim() || undefined,
      });

      setFromAccountId('');
      setToAccountId('');
      setTransferAmount('');
      setTransferDescription('');
      setShowTransferDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const getAccountTypeDisplay = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Bank Account Manager</h2>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Bank Account</DialogTitle>
              <DialogDescription>
                Create a new bank account to manage your finances separately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="account-name">Account Name *</Label>
                <Input
                  id="account-name"
                  placeholder="e.g., Salary Account, Emergency Fund"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bank-name">Bank Name *</Label>
                <Input
                  id="bank-name"
                  placeholder="e.g., SBI, HDFC, ICICI"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="account-type">Account Type</Label>
                <Select value={newAccountType} onValueChange={setNewAccountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAccount}>
                  Create Account
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bank Accounts List */}
      <div className="grid gap-4">
        {bankAccounts.map((account) => (
          <Card key={account.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {account.bank_name} • {getAccountTypeDisplay(account.account_type)}
                      {account.is_primary && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-semibold">
                      <DollarSign className="h-4 w-4" />
                      {account.balance.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {!account.is_primary && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{account.name}"? This action cannot be undone and will remove all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteAccount(account.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Transfer Funds Section */}
      {bankAccounts.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Transfer Funds</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Move money between your bank accounts
                  </p>
                </div>
              </div>
              <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfer Funds</DialogTitle>
                    <DialogDescription>
                      Transfer money between your bank accounts.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>From Account</Label>
                      <Select value={fromAccountId} onValueChange={setFromAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} - ₹{account.balance.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>To Account</Label>
                      <Select value={toAccountId} onValueChange={setToAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts
                            .filter(account => account.id !== fromAccountId)
                            .map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} - ₹{account.balance.toLocaleString()}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="Transfer description"
                        value={transferDescription}
                        onChange={(e) => setTransferDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleTransfer}>
                        Transfer Funds
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>
      )}

      {bankAccounts.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted rounded-full">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Bank Accounts</h3>
                <p className="text-muted-foreground">
                  Add your first bank account to get started with managing your finances.
                </p>
              </div>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankAccountManager;