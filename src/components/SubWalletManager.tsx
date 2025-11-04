import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wallet as WalletIcon, Sparkles } from 'lucide-react';
import { SubWallet, Wallet } from '@/types/finance';
import SubWalletCard from './SubWalletCard';
import SubWalletGoalDialog from './SubWalletGoalDialog';
import { useToast } from '@/hooks/use-toast';
import { getAvailableColor, getAllUsedColors } from '@/utils/colorGenerator';
import { WalletService } from '@/utils/walletService';

interface SubWalletManagerProps {
  wallets: Wallet[];
  onUpdate: () => void;
}

const SubWalletManager: React.FC<SubWalletManagerProps> = ({ wallets, onUpdate }) => {
  const { toast } = useToast();
  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [selectedSubWallet, setSelectedSubWallet] = useState<SubWallet | null>(null);
  const [editingSubWallet, setEditingSubWallet] = useState<SubWallet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    parentWalletType: 'saving' as 'saving' | 'needs' | 'wants',
    allocationPercentage: '',
    color: 'blue'
  });

  const colors = [
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'purple', label: 'Purple' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'red', label: 'Red' }
  ];

  useEffect(() => {
    loadSubWallets();

    // Listen for bank account changes
    const handleBankAccountChanged = () => {
      loadSubWallets();
    };

    window.addEventListener('bankAccountChanged', handleBankAccountChanged);
    return () => {
      window.removeEventListener('bankAccountChanged', handleBankAccountChanged);
    };
  }, []);

  const loadSubWallets = () => {
    WalletService.ensureInitialized();
    const stored = localStorage.getItem(WalletService.storageKey('subWallets'));
    if (stored) {
      const parsedSubWallets = JSON.parse(stored);
      console.log('Loading user-created subwallets:', parsedSubWallets);
      setSubWallets(parsedSubWallets);
    } else {
      console.log('No subwallets found - starting with empty array');
      setSubWallets([]);
    }
  };

  const saveSubWallets = (newSubWallets: SubWallet[]) => {
    localStorage.setItem(WalletService.storageKey('subWallets'), JSON.stringify(newSubWallets));
    setSubWallets(newSubWallets);
    onUpdate();
    
    // Dispatch event for wallet data changes
    window.dispatchEvent(new CustomEvent('walletDataChanged'));
  };

  const getWalletByType = (type: 'saving' | 'needs' | 'wants') => {
    return wallets.find(w => w.type === type);
  };

  const getTotalAllocationForWallet = (walletType: 'saving' | 'needs' | 'wants', excludeId?: number) => {
    return subWallets
      .filter(sw => sw.parentWalletType === walletType && sw.id !== excludeId)
      .reduce((sum, sw) => sum + sw.allocationPercentage, 0);
  };

  const getAvailableAllocation = (walletType: 'saving' | 'needs' | 'wants', excludeId?: number) => {
    return 100 - getTotalAllocationForWallet(walletType, excludeId);
  };

  const calculateSubWalletBalance = (subWallet: SubWallet) => {
    const parentWallet = getWalletByType(subWallet.parentWalletType);
    if (!parentWallet) return 0;
    
    // Calculate allocated balance from parent wallet
    const allocatedFromParent = (parentWallet.balance * subWallet.allocationPercentage) / 100;
    
    // Check if this sub-wallet has a stored balance (from previous transactions)
    const existingSubWallet = subWallets.find(sw => sw.id === subWallet.id);
    if (existingSubWallet && existingSubWallet.balance !== undefined) {
      // If it has a manual balance set, keep it regardless of allocation changes
      if ((existingSubWallet as any).manualBalance) {
        return existingSubWallet.balance;
      }
      // If allocation percentage changed, keep the balance (don't reduce it)
      if (existingSubWallet.allocationPercentage !== subWallet.allocationPercentage) {
        return existingSubWallet.balance;
      }
      // Otherwise keep the existing balance
      return existingSubWallet.balance;
    }
    
    return allocatedFromParent;
  };

  const handleSubmit = () => {
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

    const parentWallet = getWalletByType(formData.parentWalletType);
    if (!parentWallet) {
      toast({
        title: "Error",
        description: "Parent wallet not found",
        variant: "destructive",
      });
      return;
    }

    if (editingSubWallet) {
      // Update existing sub-wallet
      const updatedSubWallets = subWallets.map(sw => 
        sw.id === editingSubWallet.id 
          ? {
              ...sw,
              name: formData.name,
              parentWalletType: formData.parentWalletType,
              parentWalletId: parentWallet.id,
              allocationPercentage: allocation,
              color: formData.color,
              balance: calculateSubWalletBalance({
                ...sw,
                parentWalletType: formData.parentWalletType,
                allocationPercentage: allocation
              }),
              manualBalance: (sw as any).manualBalance
            }
          : sw
      );
      saveSubWallets(updatedSubWallets);
      toast({
        title: "Success",
        description: "Sub-wallet updated successfully",
      });
    } else {
      // Auto-assign color for new sub-wallet
      const usedColors = getAllUsedColors(subWallets);
      const autoColor = getAvailableColor(usedColors);
      
      // Create new sub-wallet
      const newSubWallet: SubWallet = {
        id: Date.now(),
        name: formData.name,
        parentWalletId: parentWallet.id,
        parentWalletType: formData.parentWalletType,
        allocationPercentage: allocation,
        color: autoColor,
        order: subWallets.length,
        balance: 0
      };
      
      newSubWallet.balance = calculateSubWalletBalance(newSubWallet);
      const updatedSubWallets = [...subWallets, newSubWallet];
      saveSubWallets(updatedSubWallets);
      
      toast({
        title: "Success",
        description: `Sub-wallet created with auto-assigned ${autoColor} color`,
      });
    }

    resetForm();
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

  const handleEdit = (subWallet: SubWallet) => {
    setEditingSubWallet(subWallet);
    setFormData({
      name: subWallet.name,
      parentWalletType: subWallet.parentWalletType,
      allocationPercentage: subWallet.allocationPercentage.toString(),
      color: subWallet.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    const updatedSubWallets = subWallets.filter(sw => sw.id !== id);
    saveSubWallets(updatedSubWallets);
    toast({
      title: "Success",
      description: "Sub-wallet deleted successfully",
    });
  };

  const handleSetGoal = (subWallet: SubWallet) => {
    setSelectedSubWallet(subWallet);
    setIsGoalDialogOpen(true);
  };

  const handleUpdateGoal = (updatedSubWallet: SubWallet) => {
    const updatedSubWallets = subWallets.map(sw => 
      sw.id === updatedSubWallet.id ? updatedSubWallet : sw
    );
    saveSubWallets(updatedSubWallets);
  };

  // Update sub-wallet balances when parent wallet balances change (only for newly created ones)
  useEffect(() => {
    const updatedSubWallets = subWallets.map(sw => {
      // Only recalculate if the sub-wallet doesn't have custom balance from transactions
      const parentWallet = getWalletByType(sw.parentWalletType);
      if (!parentWallet) return sw;
      
      const expectedBalance = (parentWallet.balance * sw.allocationPercentage) / 100;
      
      // If the current balance is very close to the expected allocation balance,
      // it means it hasn't been modified by transactions, so update it
      if (Math.abs(sw.balance - expectedBalance) < 0.01) {
        return {
          ...sw,
          balance: expectedBalance
        };
      }
      
      // Otherwise, keep the existing balance (it's been modified by transactions)
      return sw;
    });
    
    if (JSON.stringify(updatedSubWallets) !== JSON.stringify(subWallets)) {
      setSubWallets(updatedSubWallets);
      localStorage.setItem(WalletService.storageKey('subWallets'), JSON.stringify(updatedSubWallets));
    }
  }, [wallets]);

  const groupedSubWallets = {
    saving: subWallets.filter(sw => sw.parentWalletType === 'saving'),
    needs: subWallets.filter(sw => sw.parentWalletType === 'needs'),
    wants: subWallets.filter(sw => sw.parentWalletType === 'wants')
  };

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
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
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
                  subWallet={subWallet}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetGoal={handleSetGoal}
                  onBalanceUpdate={loadSubWallets}
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
          subWallet={selectedSubWallet}
          onUpdate={handleUpdateGoal}
        />
      )}
    </div>
  );
};

export default SubWalletManager;
