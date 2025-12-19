import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Target, X } from 'lucide-react';
import { SubWallet } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

interface SubWalletGoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subWallet: SubWallet;
  onUpdate: (updatedSubWallet: SubWallet) => void;
}

const SubWalletGoalDialog: React.FC<SubWalletGoalDialogProps> = ({
  isOpen,
  onClose,
  subWallet,
  onUpdate
}) => {
  const { toast } = useToast();
  
  // Support both old and new format
  const initialGoalEnabled = subWallet.goalEnabled || subWallet.goal?.enabled || false;
  const initialTargetAmount = subWallet.goalTargetAmount || subWallet.goal?.targetAmount || 0;
  
  const [goalEnabled, setGoalEnabled] = useState(initialGoalEnabled);
  const [targetAmount, setTargetAmount] = useState(initialTargetAmount > 0 ? initialTargetAmount.toString() : '');

  // Update state when subWallet changes
  useEffect(() => {
    const enabled = subWallet.goalEnabled || subWallet.goal?.enabled || false;
    const amount = subWallet.goalTargetAmount || subWallet.goal?.targetAmount || 0;
    setGoalEnabled(enabled);
    setTargetAmount(amount > 0 ? amount.toString() : '');
  }, [subWallet]);

  const handleSave = () => {
    if (goalEnabled && (!targetAmount || parseFloat(targetAmount) <= 0)) {
      toast({
        title: "Error",
        description: "Please enter a valid target amount",
        variant: "destructive",
      });
      return;
    }

    // Use the new format for the updated sub-wallet
    const updatedSubWallet = {
      ...subWallet,
      goalEnabled: goalEnabled,
      goalTargetAmount: goalEnabled ? parseFloat(targetAmount) : 0,
      // Also keep the old format for backwards compatibility
      goal: goalEnabled ? {
        targetAmount: parseFloat(targetAmount),
        enabled: true
      } : undefined
    };

    onUpdate(updatedSubWallet);
    onClose();
    
    toast({
      title: "Success",
      description: goalEnabled ? "Goal set successfully" : "Goal removed successfully",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Set Goal for {subWallet.name}
          </DialogTitle>
          <DialogDescription>
            Set a savings goal for this sub-wallet to track your progress
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="goal-enabled" className="text-sm font-medium">
              Enable Goal Tracking
            </Label>
            <Switch
              id="goal-enabled"
              checked={goalEnabled}
              onCheckedChange={setGoalEnabled}
            />
          </div>
          
          {goalEnabled && (
            <div className="space-y-2">
              <Label htmlFor="target-amount">Target Amount (₹)</Label>
              <Input
                id="target-amount"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Enter target amount"
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Current balance: ₹{subWallet.balance.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Target className="h-4 w-4 mr-2" />
            {goalEnabled ? 'Set Goal' : 'Remove Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubWalletGoalDialog;
