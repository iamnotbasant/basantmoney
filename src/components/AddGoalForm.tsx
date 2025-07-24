
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddGoalFormProps {
  onAddGoal: (goal: {
    title: string;
    targetAmount: number;
    targetDate: string;
    wallet: 'saving' | 'needs' | 'wants';
    description?: string;
  }) => void;
}

const AddGoalForm = ({ onAddGoal }: AddGoalFormProps) => {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState<Date>();
  const [wallet, setWallet] = useState<'saving' | 'needs' | 'wants'>('saving');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !targetAmount || !targetDate) {
      return;
    }

    onAddGoal({
      title,
      targetAmount: parseFloat(targetAmount),
      targetDate: format(targetDate, 'yyyy-MM-dd'),
      wallet,
      description: description || undefined
    });

    // Reset form
    setTitle('');
    setTargetAmount('');
    setTargetDate(undefined);
    setWallet('saving');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6 pb-6">
      <div className="space-y-2">
        <Label htmlFor="title">Goal Title</Label>
        <Input
          id="title"
          type="text"
          placeholder="e.g., New Phone, Emergency Fund"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Target Amount (₹)</Label>
        <Input
          id="amount"
          type="number"
          placeholder="10000"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Target Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !targetDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {targetDate ? format(targetDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={targetDate}
              onSelect={setTargetDate}
              disabled={(date) => date < new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Wallet Source</Label>
        <Select value={wallet} onValueChange={(value: 'saving' | 'needs' | 'wants') => setWallet(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select wallet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="saving">Saving Wallet</SelectItem>
            <SelectItem value="needs">Needs Wallet</SelectItem>
            <SelectItem value="wants">Wants Wallet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Brief description of your goal..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">
        Add Goal
      </Button>
    </form>
  );
};

export default AddGoalForm;
