
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface AddCustomPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paymentTitle: string;
  paymentAmount: string;
  paymentDescription: string;
  paymentCategory: string;
  setPaymentTitle: (value: string) => void;
  setPaymentAmount: (value: string) => void;
  setPaymentDescription: (value: string) => void;
  setPaymentCategory: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AddCustomPaymentDialog: React.FC<AddCustomPaymentDialogProps> = ({
  isOpen,
  onOpenChange,
  paymentTitle,
  paymentAmount,
  paymentDescription,
  paymentCategory,
  setPaymentTitle,
  setPaymentAmount,
  setPaymentDescription,
  setPaymentCategory,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="paymentTitle">Payment Title</Label>
            <Input id="paymentTitle" value={paymentTitle} onChange={e => setPaymentTitle(e.target.value)} placeholder="e.g., Electricity Bill" />
          </div>
          <div>
            <Label htmlFor="paymentAmount">Amount</Label>
            <Input id="paymentAmount" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="e.g., 2000" />
          </div>
          <div>
            <Label htmlFor="paymentDescription">Description</Label>
            <Input id="paymentDescription" value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div>
            <Label htmlFor="paymentCategory">Category</Label>
            <Input id="paymentCategory" value={paymentCategory} onChange={e => setPaymentCategory(e.target.value)} placeholder="e.g., Bills, Shopping" />
          </div>
          <DialogFooter>
            <Button type="submit">Save Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomPaymentDialog;
