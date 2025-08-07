import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BankAccount } from '@/types/bank';
import { useToast } from '@/hooks/use-toast';

export const useBankAccounts = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBankAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setBankAccounts(data || []);
      
      // Set current account to primary or first account
      const primaryAccount = data?.find(acc => acc.is_primary) || data?.[0];
      if (primaryAccount && !currentAccount) {
        setCurrentAccount(primaryAccount);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load bank accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBankAccount = async (accountData: {
    name: string;
    bank_name: string;
    account_type: string;
  }): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_bank_accounts')
        .insert({
          user_id: user.id,
          ...accountData,
          is_primary: bankAccounts.length === 0, // First account is primary
        })
        .select()
        .single();

      if (error) throw error;

      setBankAccounts(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Bank account created successfully",
      });
    } catch (error) {
      console.error('Error creating bank account:', error);
      toast({
        title: "Error",
        description: "Failed to create bank account",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteBankAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('user_bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      setBankAccounts(prev => prev.filter(acc => acc.id !== accountId));
      
      // If deleted account was current, switch to another
      if (currentAccount?.id === accountId) {
        const remaining = bankAccounts.filter(acc => acc.id !== accountId);
        setCurrentAccount(remaining[0] || null);
      }

      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast({
        title: "Error",
        description: "Failed to delete bank account",
        variant: "destructive",
      });
      throw error;
    }
  };

  const transferFunds = async (transferData: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    description?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_bank_transfers')
        .insert({
          user_id: user.id,
          ...transferData,
        });

      if (error) throw error;

      // Refresh accounts to show updated balances
      await fetchBankAccounts();

      toast({
        title: "Success",
        description: "Transfer completed successfully",
      });
    } catch (error) {
      console.error('Error transferring funds:', error);
      toast({
        title: "Error",
        description: "Failed to transfer funds",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  return {
    bankAccounts,
    currentAccount,
    setCurrentAccount,
    loading,
    fetchBankAccounts,
    createBankAccount,
    deleteBankAccount,
    transferFunds,
  };
};