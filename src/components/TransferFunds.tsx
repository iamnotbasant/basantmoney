import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowRightLeft } from 'lucide-react';
import { Wallet, SubWallet } from '@/types/finance';
import { WalletService } from '@/utils/walletService';
import { useToast } from '@/hooks/use-toast';

interface TransferFundsProps {
  wallets: Wallet[];
  onUpdate: () => void;
}

interface TransferOption {
  id: number;
  name: string;
  type: 'wallet' | 'subwallet';
  balance: number;
  walletType?: 'saving' | 'needs' | 'wants';
}

const TransferFunds: React.FC<TransferFundsProps> = ({ wallets, onUpdate }) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);
  const [transferOptions, setTransferOptions] = useState<TransferOption[]>([]);
  const [formData, setFormData] = useState({
    fromId: '',
    toId: '',
    amount: ''
  });

  // Load sub-wallets from localStorage
  const loadSubWallets = () => {
    try {
      const stored = localStorage.getItem('subWallets');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSubWallets(parsed);
      }
    } catch (error) {
      console.error('Error loading sub-wallets:', error);
      setSubWallets([]);
    }
  };

  // Build transfer options from wallets and sub-wallets
  const buildTransferOptions = () => {
    if (wallets.length === 0) return;
    
    const options: TransferOption[] = [];

    // Add main wallets (available balance only)
    wallets.forEach(wallet => {
      const allocatedToSubWallets = subWallets
        .filter(sw => sw.parentWalletType === wallet.type)
        .reduce((sum, sw) => sum + sw.balance, 0);
      
      const availableBalance = Math.max(0, wallet.balance - allocatedToSubWallets);
      
      options.push({
        id: wallet.id,
        name: `${wallet.name} (Available)`,
        type: 'wallet',
        balance: availableBalance,
        walletType: wallet.type
      });
    });

    // Add sub-wallets
    subWallets.forEach(subWallet => {
      options.push({
        id: subWallet.id,
        name: subWallet.name,
        type: 'subwallet',
        balance: subWallet.balance,
        walletType: subWallet.parentWalletType
      });
    });

    setTransferOptions(options);
  };

  // Load data on component mount
  useEffect(() => {
    loadSubWallets();
  }, []);

  // Rebuild options when wallets or sub-wallets change
  useEffect(() => {
    buildTransferOptions();
  }, [wallets, subWallets]);

  const getOptionById = (id: string) => {
    return transferOptions.find(option => option.id.toString() === id);
  };

  const handleTransfer = () => {
    if (!formData.fromId || !formData.toId || !formData.amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.fromId === formData.toId) {
      toast({
        title: "Error",
        description: "Cannot transfer to the same wallet",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    const fromOption = getOptionById(formData.fromId);
    const toOption = getOptionById(formData.toId);

    if (!fromOption || !toOption) {
      toast({
        title: "Error",
        description: "Invalid transfer selection",
        variant: "destructive",
      });
      return;
    }

    if (amount > fromOption.balance) {
      toast({
        title: "Error",
        description: `Insufficient balance. Available: ₹${fromOption.balance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    performTransfer(fromOption, toOption, amount);
  };

  const performTransfer = (from: TransferOption, to: TransferOption, amount: number) => {
    const success = WalletService.transferFunds(
      from.id,
      from.type,
      to.id,
      to.type,
      amount
    );

    if (success) {
      // Create transaction record for tracking
      const transferRecord = {
        id: Date.now(),
        description: `Transfer from ${from.name} to ${to.name}`,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        category: 'Transfer',
        deductions: [
          {
            type: from.type,
            id: from.id,
            amount: amount
          }
        ]
      };

      // Update expense data for record keeping
      const existingExpenses = JSON.parse(localStorage.getItem('expenseData') || '[]');
      existingExpenses.push(transferRecord);
      localStorage.setItem('expenseData', JSON.stringify(existingExpenses));

      toast({
        title: "Success",
        description: `Transferred ₹${amount.toFixed(2)} from ${from.name} to ${to.name}`,
      });

      onUpdate();
      resetForm();
    } else {
      toast({
        title: "Error",
        description: "Transfer failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      fromId: '',
      toId: '',
      amount: ''
    });
    setIsDialogOpen(false);
  };

  const getAvailableToOptions = () => {
    return transferOptions.filter(option => option.id.toString() !== formData.fromId);
  };

  const selectedFromOption = getOptionById(formData.fromId);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Transfer Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Funds</DialogTitle>
          <DialogDescription>
            Transfer money between your wallets and sub-wallets
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="from">From</Label>
            <Select value={formData.fromId} onValueChange={(value) => setFormData({ ...formData, fromId: value, toId: '' })}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {transferOptions.filter(option => option.balance > 0).map((option) => (
                  <SelectItem key={`${option.type}-${option.id}`} value={option.id.toString()}>
                    {option.name} - ₹{option.balance.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="to">To</Label>
            <Select value={formData.toId} onValueChange={(value) => setFormData({ ...formData, toId: value })} disabled={!formData.fromId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableToOptions().map((option) => (
                  <SelectItem key={`${option.type}-${option.id}`} value={option.id.toString()}>
                    {option.name} - ₹{option.balance.toFixed(2)}
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
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
              max={selectedFromOption?.balance || 0}
            />
            {selectedFromOption && (
              <p className="text-xs text-muted-foreground mt-1">
                Available: ₹{selectedFromOption.balance.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
          <Button onClick={handleTransfer}>
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferFunds;
