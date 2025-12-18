import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

export interface IncomeEntry {
  id: number;
  user_id: string;
  source: string;
  amount: number;
  date: string;
  category: string;
  bank_account_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const useIncomeData = (bankAccountId?: string | null) => {
  const { user } = useAuth();
  const [incomeData, setIncomeData] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncomeData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('user_income')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching income:', error);
        toast.error('Failed to load income data');
        return;
      }

      setIncomeData(data || []);
    } catch (error) {
      console.error('Error fetching income:', error);
    } finally {
      setLoading(false);
    }
  }, [user, bankAccountId]);

  const addIncome = async (income: {
    source: string;
    amount: number;
    date: string;
    category: string;
    bank_account_id?: string | null;
  }) => {
    if (!user) {
      toast.error('Please login to add income');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_income')
        .insert({
          user_id: user.id,
          source: income.source,
          amount: income.amount,
          date: income.date,
          category: income.category,
          bank_account_id: income.bank_account_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding income:', error);
        toast.error('Failed to add income');
        return null;
      }

      setIncomeData(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('Failed to add income');
      return null;
    }
  };

  const updateIncome = async (id: number, updates: Partial<IncomeEntry>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_income')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating income:', error);
        toast.error('Failed to update income');
        return false;
      }

      setIncomeData(prev =>
        prev.map(item => (item.id === id ? { ...item, ...updates } : item))
      );
      return true;
    } catch (error) {
      console.error('Error updating income:', error);
      return false;
    }
  };

  const deleteIncome = async (id: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_income')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting income:', error);
        toast.error('Failed to delete income');
        return false;
      }

      setIncomeData(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting income:', error);
      return false;
    }
  };

  const getTotalIncome = useCallback(() => {
    return incomeData.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [incomeData]);

  useEffect(() => {
    fetchIncomeData();
  }, [fetchIncomeData]);

  return {
    incomeData,
    loading,
    addIncome,
    updateIncome,
    deleteIncome,
    getTotalIncome,
    refetch: fetchIncomeData,
  };
};
