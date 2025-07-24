
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface EditDefaultDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  personName: string;
  amount: string;
  description: string;
  type: 'gave' | 'took';
  setPersonName: (value: string) => void;
  setAmount: (value: string) => void;
  setDescription: (value: string) => void;
  setType: (value: 'gave' | 'took') => void;
  onSubmit: (e: React.FormEvent) => void;
}

const EditDefaultDialog: React.FC<EditDefaultDialogProps> = ({
  isOpen,
  onOpenChange,
  personName,
  amount,
  description,
  type,
  setPersonName,
  setAmount,
  setDescription,
  setType,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Default Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="editPersonName">Person's Name</Label>
            <Input id="editPersonName" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Friend's Name" />
          </div>
          <div>
            <Label htmlFor="editAmount">Amount</Label>
            <Input id="editAmount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 500" />
          </div>
          <div>
            <Label htmlFor="editDescription">Description</Label>
            <Input id="editDescription" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., For Lunch" />
          </div>
          <div>
            <Label htmlFor="editType">Transaction Type</Label>
            <Select onValueChange={(value: 'gave' | 'took') => setType(value)} value={type}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gave">I Gave (Receivable)</SelectItem>
                <SelectItem value="took">I Took (Payable)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Update Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDefaultDialog;
