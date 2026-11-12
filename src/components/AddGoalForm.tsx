import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Target, IndianRupee, FileText } from 'lucide-react';
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
  onCancel?: () => void;
}

const AddGoalForm = ({ onAddGoal, onCancel }: AddGoalFormProps) => {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState<Date>();
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !targetAmount || !targetDate) {
      return;
    }

    onAddGoal({
      title: title.trim(),
      targetAmount: parseFloat(targetAmount),
      targetDate: format(targetDate, 'yyyy-MM-dd'),
      wallet: 'saving',
      description: description.trim() || undefined
    });

    // Reset form
    setTitle('');
    setTargetAmount('');
    setTargetDate(undefined);
    setDescription('');
  };

  const quickTargets = [25000, 50000, 100000, 200000];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-2">
      {/* Goal Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" />
          <span>Goal Title</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="e.g. New Laptop, Emergency Fund, iPhone, Bike"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="h-11 rounded-xl text-base"
        />
      </div>

      {/* Target Amount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="amount" className="text-sm font-semibold flex items-center gap-1.5">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span>Target Amount</span>
          </Label>
          <span className="text-xs text-muted-foreground">in INR (₹)</span>
        </div>
        <Input
          id="amount"
          type="number"
          placeholder="e.g. 50000"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
          className="h-11 rounded-xl text-base font-semibold"
        />
        {/* Quick presets */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {quickTargets.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setTargetAmount(String(amt))}
              className="text-xs px-2.5 py-1 rounded-lg border border-border/70 hover:border-primary/50 bg-muted/30 hover:bg-muted/80 text-muted-foreground hover:text-foreground font-medium transition-all"
            >
              ₹{amt.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </div>

      {/* Target Date */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <span>Target Deadline</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              type="button"
              className={cn(
                "w-full h-11 justify-start text-left font-normal rounded-xl border-input",
                !targetDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {targetDate ? format(targetDate, "PPP") : <span>Select deadline date</span>}
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

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" />
          <span>Notes / Description (Optional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Why are you saving for this? Any target milestones..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-xl resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          className="flex-1 h-11 rounded-xl font-semibold gap-2 shadow-sm"
          disabled={!title || !targetAmount || !targetDate}
        >
          <Target className="h-4 w-4" />
          Create Goal
        </Button>
      </div>
    </form>
  );
};

export default AddGoalForm;
