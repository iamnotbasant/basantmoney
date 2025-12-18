import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

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
      let walletQuery = supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true });

      let subWalletQuery = supabase
        .from('user_subwallets')
        .select('*')
        .eq('user_id', user.id)
        .order('order_position', { ascending: true });

      if (bankAccountId) {
        walletQuery = walletQuery.eq('bank_account_id', bankAccountId);
        subWalletQuery = subWalletQuery.eq('bank_account_id', bankAccountId);
      }

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

  // Process income distribution to subwallets in backend
  const processIncomeDistribution = async (
    incomeAmount: number,
    distribution: { saving: number; needs: number; wants: number }
  ) => {
    if (!user || subWallets.length === 0) return;

    try {
      const savingAmount = (incomeAmount * distribution.saving) / 100;
      const needsAmount = (incomeAmount * distribution.needs) / 100;
      const wantsAmount = (incomeAmount * distribution.wants) / 100;

      const updates = subWallets.map(sw => {
        let walletAllocation = 0;
        if (sw.parent_wallet_type === 'saving') walletAllocation = savingAmount;
        else if (sw.parent_wallet_type === 'needs') walletAllocation = needsAmount;
        else if (sw.parent_wallet_type === 'wants') walletAllocation = wantsAmount;

        const addAmount = (walletAllocation * sw.allocation_percentage) / 100;
        return {
          id: sw.id,
          newBalance: (sw.balance || 0) + addAmount,
        };
      });

      // Update all subwallets
      for (const update of updates) {
        await supabase
          .from('user_subwallets')
          .update({ balance: update.newBalance, updated_at: new Date().toISOString() })
          .eq('id', update.id)
          .eq('user_id', user.id);
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
    refetch: fetchWallets,
  };
};
