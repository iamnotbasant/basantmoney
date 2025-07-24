
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calendar, Wallet } from 'lucide-react';
import { FinancialGoal } from '@/types/finance';
import { format, differenceInDays } from 'date-fns';
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

  const progressPercentage = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  const remainingAmount = goal.targetAmount - goal.savedAmount;
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
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">Active</Badge>;
    }
  };

  const getWalletColor = () => {
    switch (goal.wallet) {
      case 'saving':
        return 'text-green-600';
      case 'needs':
        return 'text-blue-600';
      case 'wants':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{goal.title}</CardTitle>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{goal.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteGoal(goal.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {goal.description && (
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">
              ₹{goal.savedAmount.toLocaleString()} / ₹{goal.targetAmount.toLocaleString()}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercentage.toFixed(1)}% complete</span>
            <span>₹{remainingAmount.toLocaleString()} remaining</span>
          </div>
        </div>

        {/* Goal Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Target Date:</span>
            </div>
            <span className="font-medium">
              {format(new Date(goal.targetDate), 'MMM dd, yyyy')}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>Wallet:</span>
            </div>
            <span className={`font-medium capitalize ${getWalletColor()}`}>
              {goal.wallet}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Days Remaining:</span>
            <span className={`font-medium ${daysRemaining < 0 ? 'text-destructive' : 'text-foreground'}`}>
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
            </span>
          </div>
        </div>

        {/* Add Contribution Button */}
        {status !== 'completed' && (
          <Dialog open={isContributionDialogOpen} onOpenChange={setIsContributionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Contribution
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contribution to {goal.title}</DialogTitle>
                <DialogDescription>
                  Add money to your savings goal. Current progress: ₹{goal.savedAmount.toLocaleString()} / ₹{goal.targetAmount.toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="contribution" className="text-sm font-medium">
                    Contribution Amount (₹)
                  </label>
                  <Input
                    id="contribution"
                    type="number"
                    placeholder="Enter amount"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsContributionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddContribution} disabled={!contributionAmount || parseFloat(contributionAmount) <= 0}>
                    Add Contribution
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalCard;
