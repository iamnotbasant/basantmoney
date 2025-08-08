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
        localStorage.setItem('currentBankAccountId', primaryAccount.id);
        window.dispatchEvent(new Event('bankAccountChanged'));

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
      if (data.is_primary) {
        setCurrentAccount(data);
        localStorage.setItem('currentBankAccountId', data.id);
        window.dispatchEvent(new Event('bankAccountChanged'));
      }
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

  const updateBankAccount = async (
    accountId: string,
    updates: {
      name?: string;
      bank_name?: string;
      account_type?: string;
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('user_bank_accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;

      setBankAccounts((prev) => prev.map((acc) => (acc.id === accountId ? { ...acc, ...data } : acc)));
      setCurrentAccount((prev) => (prev && prev.id === accountId ? { ...prev, ...data } : prev));

      toast({ title: 'Updated', description: 'Bank account updated successfully' });
    } catch (error) {
      console.error('Error updating bank account:', error);
      toast({ title: 'Error', description: 'Failed to update bank account', variant: 'destructive' });
      throw error;
    }
  };

  const setPrimaryAccount = async (accountId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Clear primary
      const { error: clearErr } = await supabase
        .from('user_bank_accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id);
      if (clearErr) throw clearErr;

      // Set selected as primary
      const { data: updated, error: setErr } = await supabase
        .from('user_bank_accounts')
        .update({ is_primary: true })
        .eq('id', accountId)
        .eq('user_id', user.id)
        .select()
        .single();
      if (setErr) throw setErr;

      await fetchBankAccounts();
      if (updated) {
        setCurrentAccount(updated);
        localStorage.setItem('currentBankAccountId', updated.id);
        window.dispatchEvent(new Event('bankAccountChanged'));
      }


      toast({ title: 'Switched', description: 'Current bank account changed' });
    } catch (error) {
      console.error('Error setting primary account:', error);
      toast({ title: 'Error', description: 'Failed to switch account', variant: 'destructive' });
      throw error;
    }
  };

  const deleteBankAccount = async (accountId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete related records first
      await supabase
        .from('user_bank_transfers')
        .delete()
        .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
        .eq('user_id', user.id);

      await supabase
        .from('user_income')
        .delete()
        .eq('bank_account_id', accountId)
        .eq('user_id', user.id);

      await supabase
        .from('user_expenses')
        .delete()
        .eq('bank_account_id', accountId)
        .eq('user_id', user.id);

      await supabase
        .from('user_financial_goals')
        .delete()
        .eq('bank_account_id', accountId)
        .eq('user_id', user.id);

      await supabase
        .from('user_subwallets')
        .delete()
        .eq('bank_account_id', accountId)
        .eq('user_id', user.id);

      await supabase
        .from('user_wallets')
        .delete()
        .eq('bank_account_id', accountId)
        .eq('user_id', user.id);

      // Finally, delete the bank account
      const { error } = await supabase
        .from('user_bank_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh list
      await fetchBankAccounts();

      // Adjust current account if needed
      if (currentAccount?.id === accountId) {
        const next = bankAccounts.find((acc) => acc.is_primary) || bankAccounts.find((acc) => acc.id !== accountId) || null;
        setCurrentAccount(next);
        if (next) {
          localStorage.setItem('currentBankAccountId', next.id);
        } else {
          localStorage.removeItem('currentBankAccountId');
        }
        window.dispatchEvent(new Event('bankAccountChanged'));
      }


      toast({ title: 'Deleted', description: 'Bank account and related data removed' });
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast({ title: 'Error', description: 'Failed to delete bank account', variant: 'destructive' });
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
    updateBankAccount,
    setPrimaryAccount,
    deleteBankAccount,
    transferFunds,
  };
};