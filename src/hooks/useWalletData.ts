import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { roundToTwoDecimals } from '@/utils/interestEngine';

export interface WalletEntry {
  id: number;
  user_id: string;
  name: string;
  balance: number;
  type: string;
  color: string;
  bank_account_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubWalletEntry {
  id: number;
  user_id: string;
  name: string;
  balance: number;
  parent_wallet_id?: number | null;
  parent_wallet_type: string;
  allocation_percentage: number;
  color: string;
  order_position?: number;
  goal_enabled?: boolean;
  goal_target_amount?: number | null;
  bank_account_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const useWalletData = (bankAccountId?: string | null) => {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [subWallets, setSubWallets] = useState<SubWalletEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallets = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all wallets and subwallets for the user (don't filter by bank_account_id to ensure visibility)
      // This allows seeing wallets/subwallets even if they have mismatched or null bank_account_id
      const walletQuery = supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true });

      const subWalletQuery = supabase
        .from('user_subwallets')
        .select('*')
        .eq('user_id', user.id)
        .order('order_position', { ascending: true });

      const [walletsResult, subWalletsResult] = await Promise.all([
        walletQuery,
        subWalletQuery,
      ]);

      if (walletsResult.error) {
        console.error('Error fetching wallets:', walletsResult.error);
      } else {
        setWallets(walletsResult.data || []);
      }

      if (subWalletsResult.error) {
        console.error('Error fetching subwallets:', subWalletsResult.error);
      } else {
        setSubWallets(subWalletsResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, bankAccountId]);

  const updateSubWalletBalance = async (id: number, newBalance: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_subwallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating subwallet balance:', error);
        toast.error('Failed to update balance');
        return false;
      }

      setSubWallets(prev =>
        prev.map(sw => (sw.id === id ? { ...sw, balance: newBalance } : sw))
      );
      
      // Dispatch event for UI refresh
      window.dispatchEvent(new CustomEvent('walletDataChanged'));
      return true;
    } catch (error) {
      console.error('Error updating subwallet balance:', error);
      return false;
    }
  };

  const updateSubWallet = async (id: number, updates: Partial<SubWalletEntry>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_subwallets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating subwallet:', error);
        toast.error('Failed to update subwallet');
        return false;
      }

      setSubWallets(prev =>
        prev.map(sw => (sw.id === id ? { ...sw, ...updates } : sw))
      );
      
      window.dispatchEvent(new CustomEvent('walletDataChanged'));
      return true;
    } catch (error) {
      console.error('Error updating subwallet:', error);
      return false;
    }
  };

  const createSubWallet = async (subWallet: {
    name: string;
    parent_wallet_type: string;
    allocation_percentage: number;
    color: string;
    bank_account_id?: string | null;
    order_position?: number;
  }) => {
    if (!user) {
      toast.error('Please login to create subwallet');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_subwallets')
        .insert({
          user_id: user.id,
          name: subWallet.name,
          balance: 0,
          parent_wallet_type: subWallet.parent_wallet_type,
          allocation_percentage: subWallet.allocation_percentage,
          color: subWallet.color,
          bank_account_id: subWallet.bank_account_id || null,
          order_position: subWallet.order_position || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subwallet:', error);
        toast.error('Failed to create subwallet');
        return null;
      }

      setSubWallets(prev => [...prev, data]);
      window.dispatchEvent(new CustomEvent('walletDataChanged'));
      return data;
    } catch (error) {
      console.error('Error creating subwallet:', error);
      return null;
    }
  };

  const deleteSubWallet = async (id: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_subwallets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting subwallet:', error);
        toast.error('Failed to delete subwallet');
        return false;
      }

      setSubWallets(prev => prev.filter(sw => sw.id !== id));
      window.dispatchEvent(new CustomEvent('walletDataChanged'));
      return true;
    } catch (error) {
      console.error('Error deleting subwallet:', error);
      return false;
    }
  };

  // Process income distribution to subwallets and main wallets in backend (Bug 2 Fix - Forward Leak Prevention)
  const processIncomeDistribution = async (
    incomeAmount: number,
    distribution: { saving: number; needs: number; wants: number }
  ) => {
    if (!user) return;

    try {
      const savingShare = (incomeAmount * distribution.saving) / 100;
      const needsShare = (incomeAmount * distribution.needs) / 100;
      const wantsShare = (incomeAmount * distribution.wants) / 100;

      const shares: Record<'saving' | 'needs' | 'wants', number> = {
        saving: savingShare,
        needs: needsShare,
        wants: wantsShare,
      };

      // Query latest wallets & subwallets for accurate balances
      const [swRes, wRes] = await Promise.all([
        supabase.from('user_subwallets').select('*').eq('user_id', user.id),
        supabase.from('user_wallets').select('*').eq('user_id', user.id),
      ]);
      const currentSubs = swRes.data || subWallets;
      const currentWals = wRes.data || wallets;

      for (const walletType of ['saving', 'needs', 'wants'] as const) {
        const typeShare = shares[walletType];
        if (typeShare <= 0) continue;

        const typeSubwallets = currentSubs.filter(sw => sw.parent_wallet_type === walletType);

        if (typeSubwallets.length > 0) {
          const totalAllocatedPct = typeSubwallets.reduce((s, sw) => s + (sw.allocation_percentage || 0), 0);
          for (const sw of typeSubwallets) {
            const addAmount = (typeShare * (sw.allocation_percentage || 0)) / 100;
            const newBal = roundToTwoDecimals((sw.balance || 0) + addAmount);
            await supabase
              .from('user_subwallets')
              .update({ balance: newBal, updated_at: new Date().toISOString() })
              .eq('id', sw.id)
              .eq('user_id', user.id);
          }

          // If subwallets don't cover 100%, credit remainder to main wallet in user_wallets
          if (totalAllocatedPct < 100) {
            const remainder = (typeShare * (100 - totalAllocatedPct)) / 100;
            const w = currentWals.find(wallet => wallet.type === walletType);
            if (w) {
              const newBal = roundToTwoDecimals((w.balance || 0) + remainder);
              await supabase
                .from('user_wallets')
                .update({ balance: newBal, updated_at: new Date().toISOString() })
                .eq('id', w.id)
                .eq('user_id', user.id);
            }
          }
        } else {
          // No subwallets exist for this wallet type: credit directly to user_wallets!
          const w = currentWals.find(wallet => wallet.type === walletType);
          if (w) {
            const newBal = roundToTwoDecimals((w.balance || 0) + typeShare);
            await supabase
              .from('user_wallets')
              .update({ balance: newBal, updated_at: new Date().toISOString() })
              .eq('id', w.id)
              .eq('user_id', user.id);
          } else {
            // If wallet row doesn't exist, create it
            await supabase
              .from('user_wallets')
              .insert([{
                user_id: user.id,
                name: `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} Wallet`,
                balance: roundToTwoDecimals(typeShare),
                type: walletType,
                color: walletType === 'saving' ? 'green' : walletType === 'needs' ? 'blue' : 'purple',
                bank_account_id: bankAccountId || null,
              }]);
          }
        }
      }

      // Refresh data
      await fetchWallets();
      window.dispatchEvent(new CustomEvent('walletDataChanged'));
    } catch (error) {
      console.error('Error processing income distribution:', error);
    }
  };

  // Process expense deductions from subwallets in backend
  const processExpenseDeductions = async (
    deductions: { type: 'wallet' | 'subwallet'; id: number; amount: number }[]
  ) => {
    if (!user) return false;

    try {
      for (const deduction of deductions) {
        if (deduction.type === 'subwallet') {
          const subWallet = subWallets.find(sw => sw.id === deduction.id);
          if (subWallet) {
            const newBalance = Math.max(0, (subWallet.balance || 0) - deduction.amount);
            await supabase
              .from('user_subwallets')
              .update({ balance: newBalance, updated_at: new Date().toISOString() })
              .eq('id', deduction.id)
              .eq('user_id', user.id);
          }
        }
      }

      await fetchWallets();
      window.dispatchEvent(new CustomEvent('walletDataChanged'));
      return true;
    } catch (error) {
      console.error('Error processing expense deductions:', error);
      return false;
    }
  };

  // Reverse an income distribution (when an income is deleted)
  const reverseIncomeDistribution = async (incomeAmount: number) => {
    if (!user) return false;
    try {
      let distribution = { saving: 50, needs: 30, wants: 20 };
      try {
        const s = JSON.parse(localStorage.getItem('userSettings') || '{}');
        if (s?.distribution) distribution = { ...distribution, ...s.distribution };
      } catch {}

      const [swRes, wRes] = await Promise.all([
        supabase.from('user_subwallets').select('*').eq('user_id', user.id),
        supabase.from('user_wallets').select('*').eq('user_id', user.id),
      ]);
      const currentSubs = swRes.data || [];
      const currentWals = wRes.data || [];

      for (const walletType of ['saving', 'needs', 'wants'] as const) {
        const pct = (distribution as any)[walletType] || 0;
        const typeShare = (incomeAmount * pct) / 100;
        if (typeShare <= 0) continue;

        const subs = currentSubs.filter(sw => sw.parent_wallet_type === walletType);
        if (subs.length > 0) {
          const totalAllocatedPct = subs.reduce((s, sw) => s + (sw.allocation_percentage || 0), 0);
          for (const sw of subs) {
            const remove = (typeShare * (sw.allocation_percentage || 0)) / 100;
            const newBal = Math.max(0, roundToTwoDecimals((sw.balance || 0) - remove));
            await supabase
              .from('user_subwallets')
              .update({ balance: newBal, updated_at: new Date().toISOString() })
              .eq('id', sw.id)
              .eq('user_id', user.id);
          }
          if (totalAllocatedPct < 100) {
            const remainder = (typeShare * (100 - totalAllocatedPct)) / 100;
            const w = currentWals.find(w => w.type === walletType);
            if (w) {
              const newBal = Math.max(0, roundToTwoDecimals((w.balance || 0) - remainder));
              await supabase
                .from('user_wallets')
                .update({ balance: newBal, updated_at: new Date().toISOString() })
                .eq('id', w.id)
                .eq('user_id', user.id);
            }
          }
        } else {
          const w = currentWals.find(w => w.type === walletType);
          if (w) {
            const newBal = Math.max(0, roundToTwoDecimals((w.balance || 0) - typeShare));
            await supabase
              .from('user_wallets')
              .update({ balance: newBal, updated_at: new Date().toISOString() })
              .eq('id', w.id)
              .eq('user_id', user.id);
          }
        }
      }

      await fetchWallets();
      window.dispatchEvent(new CustomEvent('walletDataChanged'));
      return true;
    } catch (error) {
      console.error('Error reversing income distribution:', error);
      return false;
    }
  };

  // Restore expense deductions (add amounts back to subwallets when expense is deleted)
  const restoreExpenseDeductions = async (
    deductions: { type: 'wallet' | 'subwallet'; id: number; amount: number }[]
  ) => {
    if (!user) return false;

    try {
      for (const deduction of deductions) {
        if (deduction.type === 'subwallet') {
          // Fetch current balance from database to ensure accuracy
          const { data: currentSubWallet } = await supabase
            .from('user_subwallets')
            .select('balance')
            .eq('id', deduction.id)
            .eq('user_id', user.id)
            .single();

          if (currentSubWallet) {
            const newBalance = (currentSubWallet.balance || 0) + deduction.amount;
            await supabase
              .from('user_subwallets')
              .update({ balance: newBalance, updated_at: new Date().toISOString() })
              .eq('id', deduction.id)
              .eq('user_id', user.id);
          }
        }
      }

      await fetchWallets();
      window.dispatchEvent(new CustomEvent('walletDataChanged'));
      return true;
    } catch (error) {
      console.error('Error restoring expense deductions:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  // Listen for wallet data changes
  useEffect(() => {
    const handleWalletChange = () => {
      fetchWallets();
    };

    window.addEventListener('walletDataChanged', handleWalletChange);
    return () => window.removeEventListener('walletDataChanged', handleWalletChange);
  }, [fetchWallets]);

  return {
    wallets,
    subWallets,
    loading,
    updateSubWalletBalance,
    updateSubWallet,
    createSubWallet,
    deleteSubWallet,
    processIncomeDistribution,
    processExpenseDeductions,
    restoreExpenseDeductions,
    reverseIncomeDistribution,
    refetch: fetchWallets,
  };
};
