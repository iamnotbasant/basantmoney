
import React, { useState } from 'react';
import { Wallet as WalletIcon, Edit2, Trash2, Target, TrendingUp, DollarSign } from 'lucide-react';
import { SubWallet } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { WalletService } from '@/utils/walletService';

interface SubWalletCardProps {
  subWallet: SubWallet;
  onEdit: (subWallet: SubWallet) => void;
  onDelete: (id: number) => void;
  onSetGoal?: (subWallet: SubWallet) => void;
  onBalanceUpdate?: () => void;
}

const SubWalletCard: React.FC<SubWalletCardProps> = ({ 
  subWallet, 
  onEdit, 
  onDelete, 
  onSetGoal,
  onBalanceUpdate
}) => {
  const { toast } = useToast();
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [newBalance, setNewBalance] = useState(subWallet.balance.toString());

  const handleBalanceUpdate = () => {
    const amount = parseFloat(newBalance);
    
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const storageKey = WalletService.storageKey('subWallets');
      const currentSubWallets = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedSubWallets = currentSubWallets.map((sw: SubWallet) => 
        sw.id === subWallet.id ? { ...sw, balance: amount, manualBalance: true } : sw
      );
      
      localStorage.setItem(storageKey, JSON.stringify(updatedSubWallets));
      window.dispatchEvent(new Event('walletDataChanged'));
      
      toast({
        title: "Success",
        description: `Balance updated to ₹${amount.toFixed(2)}`,
      });
      
      setIsBalanceDialogOpen(false);
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update balance",
        variant: "destructive",
      });
    }
  };
  const getColorClasses = () => {
    switch (subWallet.color) {
      case 'green':
        return 'border-green-200 bg-green-50/50';
      case 'blue':
        return 'border-blue-200 bg-blue-50/50';
      case 'purple':
        return 'border-purple-200 bg-purple-50/50';
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50/50';
      case 'red':
        return 'border-red-200 bg-red-50/50';
      case 'indigo':
        return 'border-indigo-200 bg-indigo-50/50';
      case 'pink':
        return 'border-pink-200 bg-pink-50/50';
      case 'cyan':
        return 'border-cyan-200 bg-cyan-50/50';
      case 'orange':
        return 'border-orange-200 bg-orange-50/50';
      case 'emerald':
        return 'border-emerald-200 bg-emerald-50/50';
      case 'teal':
        return 'border-teal-200 bg-teal-50/50';
      case 'lime':
        return 'border-lime-200 bg-lime-50/50';
      case 'amber':
        return 'border-amber-200 bg-amber-50/50';
      case 'rose':
        return 'border-rose-200 bg-rose-50/50';
      case 'violet':
        return 'border-violet-200 bg-violet-50/50';
      case 'sky':
        return 'border-sky-200 bg-sky-50/50';
      default:
        return 'border-border bg-card';
    }
  };

  const getIconColor = () => {
    switch (subWallet.color) {
      case 'green':
        return 'text-green-600';
      case 'blue':
        return 'text-blue-600';
      case 'purple':
        return 'text-purple-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'red':
        return 'text-red-600';
      case 'indigo':
        return 'text-indigo-600';
      case 'pink':
        return 'text-pink-600';
      case 'cyan':
        return 'text-cyan-600';
      case 'orange':
        return 'text-orange-600';
      case 'emerald':
        return 'text-emerald-600';
      case 'teal':
        return 'text-teal-600';
      case 'lime':
        return 'text-lime-600';
      case 'amber':
        return 'text-amber-600';
      case 'rose':
        return 'text-rose-600';
      case 'violet':
        return 'text-violet-600';
      case 'sky':
        return 'text-sky-600';
      default:
        return 'text-foreground';
    }
  };

  const goalProgress = subWallet.goal?.enabled 
    ? Math.min((subWallet.balance / subWallet.goal.targetAmount) * 100, 100)
    : 0;

  return (
    <>
      <div className={`rounded-lg border ${getColorClasses()} p-4 hover:shadow-md transition-all duration-200`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={getIconColor()}>
              <WalletIcon className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm text-foreground">{subWallet.name}</span>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewBalance(subWallet.balance.toString());
                setIsBalanceDialogOpen(true);
              }}
              className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-800"
              title="Edit Balance"
            >
              <DollarSign className="h-3 w-3" />
            </Button>
            {onSetGoal && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetGoal(subWallet)}
                className="h-6 w-6 p-0 text-primary hover:text-primary/80"
                title="Set Goal"
              >
                <Target className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(subWallet)}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(subWallet.id)}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Balance</span>
          <span>Allocation: {subWallet.allocationPercentage}%</span>
        </div>
        <p className="text-lg font-semibold text-foreground">
          ₹{Math.trunc(subWallet.balance).toLocaleString('en-IN')}
        </p>
        
        {subWallet.goal?.enabled && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Goal Progress
              </span>
              <span>{goalProgress.toFixed(1)}%</span>
            </div>
            <Progress value={goalProgress} className="h-2" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Target: ₹{Math.trunc(subWallet.goal.targetAmount).toLocaleString('en-IN')}
              </span>
              {goalProgress >= 100 && (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Goal Achieved!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Balance - {subWallet.name}</DialogTitle>
          <DialogDescription>
            Manually set the balance for this sub-wallet
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="balance">New Balance (₹)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              placeholder="Enter new balance"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current balance: ₹{subWallet.balance.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsBalanceDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBalanceUpdate}>
            Update Balance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default SubWalletCard;
