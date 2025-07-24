import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IndianRupee } from 'lucide-react';
import { UdaarEntry } from '@/types/finance';

interface PartialPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: UdaarEntry | null;
  onPartialPayment: (transactionId: string, partialAmount: number, description: string) => void;
}

const PartialPaymentDialog: React.FC<PartialPaymentDialogProps> = ({
  isOpen,
  onOpenChange,
  transaction,
  onPartialPayment,
}) => {
  const [partialAmount, setPartialAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !partialAmount || parseFloat(partialAmount) <= 0) return;

    const amount = parseFloat(partialAmount);
    if (amount > transaction.amount) {
      alert('Partial payment cannot be more than the remaining amount');
      return;
    }

    onPartialPayment(transaction.id, amount, description);
    setPartialAmount('');
    setDescription('');
    onOpenChange(false);
  };

  const resetForm = () => {
    setPartialAmount('');
    setDescription('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Record Partial Payment
          </DialogTitle>
        </DialogHeader>
        {transaction && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Transaction Details</Label>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">{transaction.personName}</div>
                <div className="text-sm text-muted-foreground">{transaction.description}</div>
                <div className="text-sm font-bold">
                  Remaining: ₹{transaction.amount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partialAmount">Partial Payment Amount *</Label>
              <Input
                id="partialAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={transaction.amount}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder="Enter amount received/paid"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this partial payment..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Payment</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PartialPaymentDialog;