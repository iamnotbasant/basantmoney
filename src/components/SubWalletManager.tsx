import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wallet as WalletIcon, Sparkles, Loader2 } from 'lucide-react';
import { Wallet } from '@/types/finance';
import SubWalletCard from './SubWalletCard';
import SubWalletGoalDialog from './SubWalletGoalDialog';
import { useToast } from '@/hooks/use-toast';
import { getAvailableColor, getAllUsedColors } from '@/utils/colorGenerator';
import { useWalletData, SubWalletEntry } from '@/hooks/useWalletData';
import { useBankAccounts } from '@/hooks/useBankAccounts';

interface SubWalletManagerProps {
  wallets: Wallet[];
  onUpdate: () => void;
}

const SubWalletManager: React.FC<SubWalletManagerProps> = ({ wallets, onUpdate }) => {
  const { toast } = useToast();
  const { bankAccounts } = useBankAccounts();
  const primaryAccount = bankAccounts.find(acc => acc.is_primary);
  
  const { 
    subWallets, 
    loading, 
    createSubWallet, 
    updateSubWallet, 
    deleteSubWallet,
    refetch 
  } = useWalletData(primaryAccount?.id);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [selectedSubWallet, setSelectedSubWallet] = useState<SubWalletEntry | null>(null);
  const [editingSubWallet, setEditingSubWallet] = useState<SubWalletEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    parentWalletType: 'saving' as 'saving' | 'needs' | 'wants',
    allocationPercentage: '',
    color: 'blue'
  });

  const getWalletByType = (type: 'saving' | 'needs' | 'wants') => {
    return wallets.find(w => w.type === type);
  };

  const getTotalAllocationForWallet = (walletType: 'saving' | 'needs' | 'wants', excludeId?: number) => {
    return subWallets
      .filter(sw => sw.parent_wallet_type === walletType && sw.id !== excludeId)
      .reduce((sum, sw) => sum + sw.allocation_percentage, 0);
  };

  const getAvailableAllocation = (walletType: 'saving' | 'needs' | 'wants', excludeId?: number) => {
    return 100 - getTotalAllocationForWallet(walletType, excludeId);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.allocationPercentage) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const allocation = parseFloat(formData.allocationPercentage);
    if (allocation <= 0 || allocation > 100) {
      toast({
        title: "Error",
        description: "Allocation percentage must be between 1 and 100",
        variant: "destructive",
      });
      return;
    }

    const availableAllocation = getAvailableAllocation(formData.parentWalletType, editingSubWallet?.id);
    if (allocation > availableAllocation) {
      toast({
        title: "Error",
        description: `Only ${availableAllocation}% allocation available for ${formData.parentWalletType} wallet`,
        variant: "destructive",
      });
      return;
    }

    // Parent wallet type is stored directly, no need to validate wallet existence

    setIsSubmitting(true);

    try {
      if (editingSubWallet) {
        // Update existing sub-wallet in Supabase
        const success = await updateSubWallet(editingSubWallet.id, {
          name: formData.name,
          parent_wallet_type: formData.parentWalletType,
          allocation_percentage: allocation,
          color: formData.color,
        });

        if (success) {
          toast({
            title: "Success",
            description: "Sub-wallet updated successfully",
          });
          onUpdate();
        }
      } else {
        // Auto-assign color for new sub-wallet
        const usedColors = subWallets.map(sw => sw.color);
        const autoColor = getAvailableColor(usedColors);
        
        // Create new sub-wallet in Supabase
        const result = await createSubWallet({
          name: formData.name,
          parent_wallet_type: formData.parentWalletType,
          allocation_percentage: allocation,
          color: autoColor,
          bank_account_id: primaryAccount?.id || null,
          order_position: subWallets.length,
        });

        if (result) {
          toast({
            title: "Success",
            description: `Sub-wallet created with auto-assigned ${autoColor} color`,
          });
          onUpdate();
        }
      }

      resetForm();
    } catch (error) {
      console.error('Error saving subwallet:', error);
      toast({
        title: "Error",
        description: "Failed to save sub-wallet",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      parentWalletType: 'saving',
      allocationPercentage: '',
      color: 'blue'
    });
    setEditingSubWallet(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (subWallet: SubWalletEntry) => {
    setEditingSubWallet(subWallet);
    setFormData({
      name: subWallet.name,
      parentWalletType: subWallet.parent_wallet_type as 'saving' | 'needs' | 'wants',
      allocationPercentage: subWallet.allocation_percentage.toString(),
      color: subWallet.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const success = await deleteSubWallet(id);
    if (success) {
      toast({
        title: "Success",
        description: "Sub-wallet deleted successfully",
      });
      onUpdate();
    }
  };

  const handleSetGoal = (subWallet: SubWalletEntry) => {
    setSelectedSubWallet(subWallet);
    setIsGoalDialogOpen(true);
  };

  const handleUpdateGoal = async (updatedSubWallet: any) => {
    await updateSubWallet(updatedSubWallet.id, {
      goal_enabled: updatedSubWallet.goalEnabled,
      goal_target_amount: updatedSubWallet.goalTargetAmount,
    });
    onUpdate();
  };

  const handleBalanceUpdate = async () => {
    await refetch();
    onUpdate();
  };

  const groupedSubWallets = {
    saving: subWallets.filter(sw => sw.parent_wallet_type === 'saving'),
    needs: subWallets.filter(sw => sw.parent_wallet_type === 'needs'),
    wants: subWallets.filter(sw => sw.parent_wallet_type === 'wants')
  };

  // Convert SubWalletEntry to the format expected by SubWalletCard
  const convertToCardFormat = (sw: SubWalletEntry) => ({
    id: sw.id,
    name: sw.name,
    parentWalletId: sw.parent_wallet_id || 0,
    parentWalletType: sw.parent_wallet_type as 'saving' | 'needs' | 'wants',
    allocationPercentage: sw.allocation_percentage,
    color: sw.color,
    order: sw.order_position || 0,
    balance: sw.balance || 0,
    goalEnabled: sw.goal_enabled || false,
    goalTargetAmount: sw.goal_target_amount || 0,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading sub-wallets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <WalletIcon className="h-6 w-6 text-primary" />
          Sub-Wallets
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Sub-Wallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {editingSubWallet ? 'Edit' : 'Create'} Sub-Wallet
              </DialogTitle>
              <DialogDescription>
                {editingSubWallet ? 'Update the' : 'Create a new'} sub-wallet with specific allocation percentage
                {!editingSubWallet && " (Color will be auto-assigned)"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Sub-Wallet Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter sub-wallet name"
                />
              </div>
              <div>
                <Label htmlFor="parentWallet">Parent Wallet</Label>
                <Select value={formData.parentWalletType} onValueChange={(value: 'saving' | 'needs' | 'wants') => setFormData({ ...formData, parentWalletType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saving">Saving Wallet</SelectItem>
                    <SelectItem value="needs">Needs Wallet</SelectItem>
                    <SelectItem value="wants">Wants Wallet</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Available allocation: {getAvailableAllocation(formData.parentWalletType, editingSubWallet?.id)}%
                </p>
              </div>
              <div>
                <Label htmlFor="allocation">Allocation Percentage</Label>
                <Input
                  id="allocation"
                  type="number"
                  value={formData.allocationPercentage}
                  onChange={(e) => setFormData({ ...formData, allocationPercentage: e.target.value })}
                  placeholder="Enter percentage (1-100)"
                  min="1"
                  max={getAvailableAllocation(formData.parentWalletType, editingSubWallet?.id)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingSubWallet ? 'Update' : 'Create'} Sub-Wallet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(groupedSubWallets).map(([walletType, subWalletList]) => {
        const parentWallet = getWalletByType(walletType as 'saving' | 'needs' | 'wants');
        if (!parentWallet || subWalletList.length === 0) return null;

        return (
          <div key={walletType} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center mb-4">
              <WalletIcon className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-medium capitalize text-foreground">
                {walletType} Wallet Sub-Wallets
              </h3>
              <span className="ml-auto text-sm text-muted-foreground">
                Total Allocated: {getTotalAllocationForWallet(walletType as 'saving' | 'needs' | 'wants')}%
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subWalletList.map((subWallet) => (
                <SubWalletCard
                  key={subWallet.id}
                  subWallet={convertToCardFormat(subWallet)}
                  onEdit={() => handleEdit(subWallet)}
                  onDelete={handleDelete}
                  onSetGoal={() => handleSetGoal(subWallet)}
                  onBalanceUpdate={handleBalanceUpdate}
                />
              ))}
            </div>
          </div>
        );
      })}

      {subWallets.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No sub-wallets created yet</p>
          <p className="text-sm text-muted-foreground">Create sub-wallets to better organize your finances</p>
        </div>
      )}

      {selectedSubWallet && (
        <SubWalletGoalDialog
          isOpen={isGoalDialogOpen}
          onClose={() => {
            setIsGoalDialogOpen(false);
            setSelectedSubWallet(null);
          }}
          subWallet={convertToCardFormat(selectedSubWallet)}
          onUpdate={handleUpdateGoal}
        />
      )}
    </div>
  );
};

export default SubWalletManager;
