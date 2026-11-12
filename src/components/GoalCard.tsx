import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Calendar, Target, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { FinancialGoal } from '@/types/finance';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GoalCardProps {
  goal: FinancialGoal;
  onUpdateGoal: (goal: FinancialGoal) => void;
  onDeleteGoal: (goalId: string) => void;
}

const GoalCard = ({ goal, onUpdateGoal, onDeleteGoal }: GoalCardProps) => {
  const [contributionAmount, setContributionAmount] = useState('');
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);

  const rawPercent = (goal.savedAmount / (goal.targetAmount || 1)) * 100;
  const progressPercentage = Math.min(Math.max(rawPercent, 0), 100);
  const remainingAmount = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const daysRemaining = differenceInDays(new Date(goal.targetDate), new Date());
  
  const getStatus = () => {
    if (goal.savedAmount >= goal.targetAmount) return 'completed';
    if (daysRemaining < 0) return 'overdue';
    return 'active';
  };

  const status = getStatus();

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 p-0.5 pl-1 pr-2.5 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-sm select-none">
            <span className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 bg-emerald-200 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
            </span>
            <span>Completed</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 p-0.5 pl-1 pr-2.5 rounded-full border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs font-bold shadow-sm select-none">
            <span className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 bg-rose-200 dark:bg-rose-800/60 text-rose-700 dark:text-rose-200">
              <AlertCircle className="h-3.5 w-3.5 stroke-[2.5]" />
            </span>
            <span>Overdue</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 p-0.5 pl-1 pr-2.5 rounded-full border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs font-bold shadow-sm select-none">
            <span className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 bg-blue-200 dark:bg-blue-800/60 text-blue-700 dark:text-blue-200">
              <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
            </span>
            <span>Active</span>
          </span>
        );
    }
  };

  const handleAddContribution = () => {
    const amount = parseFloat(contributionAmount);
    if (amount > 0) {
      const updatedGoal = {
        ...goal,
        savedAmount: goal.savedAmount + amount
      };
      onUpdateGoal(updatedGoal);
      setContributionAmount('');
      setIsContributionDialogOpen(false);
    }
  };

  const quickAdds = [500, 1000, 2000, 5000];

  return (
    <Card className="h-full border border-border/70 hover:border-border transition-all duration-300 shadow-sm hover:shadow-md bg-card/80 backdrop-blur rounded-2xl overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Top Header */}
        <div className="p-5 pb-4 border-b border-border/50">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                <Target className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground truncate tracking-tight group-hover:text-primary transition-colors">
                  {goal.title}
                </h3>
                {goal.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {goal.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Target Savings Goal</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {getStatusBadge()}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{goal.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove this financial goal and all its tracked progress. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDeleteGoal(goal.id)}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Content & Progress */}
        <CardContent className="p-5 space-y-4">
          {/* Numbers Display */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved</span>
              <div className="text-2xl font-bold text-foreground tracking-tight">
                ₹{goal.savedAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target</span>
              <div className="text-base font-semibold text-muted-foreground tracking-tight">
                ₹{goal.targetAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Custom Enhanced Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/40">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  status === 'completed'
                    ? "bg-gradient-to-r from-emerald-500 to-green-500"
                    : status === 'overdue'
                    ? "bg-gradient-to-r from-amber-500 to-rose-500"
                    : "bg-gradient-to-r from-primary to-blue-500"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-medium text-muted-foreground px-0.5">
              <span className="text-foreground font-semibold">
                {progressPercentage.toFixed(1)}% complete
              </span>
              <span>
                {remainingAmount === 0 
                  ? 'Goal reached! 🎉' 
                  : `₹${remainingAmount.toLocaleString('en-IN')} remaining`}
              </span>
            </div>
          </div>

          {/* Goal Metrics Pill Row */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Target Date</span>
                <span className="font-semibold text-foreground truncate block">
                  {format(new Date(goal.targetDate), 'dd MMM yyyy')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40">
              <Clock className={cn("h-4 w-4 shrink-0", daysRemaining < 0 ? "text-destructive" : "text-primary")} />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Time Left</span>
                <span className={cn(
                  "font-semibold truncate block",
                  daysRemaining < 0 ? "text-destructive" : "text-foreground"
                )}>
                  {daysRemaining < 0 
                    ? `${Math.abs(daysRemaining)}d overdue` 
                    : daysRemaining === 0 
                    ? 'Due today' 
                    : `${daysRemaining} days`}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card Action Footer */}
      <div className="p-5 pt-0">
        {status === 'completed' ? (
          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-center text-xs font-semibold flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Target Achieved Successfully</span>
          </div>
        ) : (
          <Dialog open={isContributionDialogOpen} onOpenChange={setIsContributionDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-10 rounded-xl font-semibold border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm gap-2"
              >
                <Plus className="h-4 w-4 text-primary" />
                Add Contribution
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Add Contribution</DialogTitle>
                <DialogDescription>
                  Adding funds to <span className="font-semibold text-foreground">"{goal.title}"</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Current snapshot */}
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Current Progress</span>
                  <span className="font-bold text-foreground">
                    ₹{goal.savedAmount.toLocaleString('en-IN')} / ₹{goal.targetAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contribution" className="text-sm font-semibold">
                    Amount to Add (₹)
                  </label>
                  <Input
                    id="contribution"
                    type="number"
                    placeholder="Enter amount (e.g. 1000)"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    className="h-11 text-base font-medium rounded-xl"
                    autoFocus
                  />
                </div>

                {/* Quick Add Pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Quick Select
                  </span>
                  <div className="flex gap-2">
                    {quickAdds.map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setContributionAmount(String(amt))}
                        className="flex-1 text-xs font-semibold rounded-lg h-8"
                      >
                        +₹{amt.toLocaleString('en-IN')}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsContributionDialogOpen(false)}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleAddContribution} 
                    disabled={!contributionAmount || parseFloat(contributionAmount) <= 0}
                    className="flex-1 rounded-xl font-semibold"
                  >
                    Confirm & Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Card>
  );
};

export default GoalCard;
