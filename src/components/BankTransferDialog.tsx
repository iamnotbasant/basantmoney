import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BankAccount } from '@/types/bank';
import { ArrowUpDown } from 'lucide-react';

interface BankTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  onTransfer: (data: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    description?: string;
  }) => Promise<void>;
}

const BankTransferDialog = ({ open, onOpenChange, bankAccounts, onTransfer }: BankTransferDialogProps) => {
  const [formData, setFormData] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.from_account_id || !formData.to_account_id || !formData.amount) return;
    
    const amount = parseFloat(formData.amount);
    if (amount <= 0) return;

    const fromAccount = bankAccounts.find(acc => acc.id === formData.from_account_id);
    if (!fromAccount || fromAccount.balance < amount) {
      return;
    }

    setLoading(true);
    try {
      await onTransfer({
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        amount,
        description: formData.description || undefined,
      });
      setFormData({ from_account_id: '', to_account_id: '', amount: '', description: '' });
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = bankAccounts.find(acc => acc.id === formData.from_account_id);
  const availableToAccounts = bankAccounts.filter(acc => acc.id !== formData.from_account_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Transfer Funds
          </DialogTitle>
          <DialogDescription>
            Transfer money between your bank accounts instantly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from_account">From Account</Label>
            <Select
              value={formData.from_account_id}
              onValueChange={(value) => setFormData({ ...formData, from_account_id: value, to_account_id: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex flex-col">
                      <span>{account.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Balance: ₹{account.balance.toLocaleString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to_account">To Account</Label>
            <Select
              value={formData.to_account_id}
              onValueChange={(value) => setFormData({ ...formData, to_account_id: value })}
              disabled={!formData.from_account_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {availableToAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex flex-col">
                      <span>{account.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {account.bank_name}
                      </span>
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
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              min="0.01"
              step="0.01"
              max={fromAccount?.balance || undefined}
              required
            />
            {fromAccount && (
              <p className="text-sm text-muted-foreground">
                Available: ₹{fromAccount.balance.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a note for this transfer..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                loading || 
                !formData.from_account_id || 
                !formData.to_account_id || 
                !formData.amount ||
                parseFloat(formData.amount || '0') <= 0 ||
                (fromAccount && parseFloat(formData.amount || '0') > fromAccount.balance)
              }
            >
              {loading ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BankTransferDialog;