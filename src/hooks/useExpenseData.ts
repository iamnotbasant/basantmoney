import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface ExpenseEntry {
  id: number;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  deductions?: Json;
  bank_account_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeductionItem {
  type: 'wallet' | 'subwallet';
  id: number;
  amount: number;
}

export const useExpenseData = (bankAccountId?: string | null) => {
  const { user } = useAuth();
  const [expenseData, setExpenseData] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenseData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('user_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching expenses:', error);
        toast.error('Failed to load expense data');
        return;
      }

      setExpenseData(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [user, bankAccountId]);

  const addExpense = async (expense: {
    description: string;
    amount: number;
    date: string;
    category: string;
    deductions?: DeductionItem[];
    bank_account_id?: string | null;
  }) => {
    if (!user) {
      toast.error('Please login to add expense');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_expenses')
        .insert({
          user_id: user.id,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          category: expense.category,
          deductions: expense.deductions as unknown as Json,
          bank_account_id: expense.bank_account_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding expense:', error);
        toast.error('Failed to add expense');
        return null;
      }

      setExpenseData(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
      return null;
    }
  };

  const updateExpense = async (id: number, updates: Partial<ExpenseEntry>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_expenses')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating expense:', error);
        toast.error('Failed to update expense');
        return false;
      }

      setExpenseData(prev =>
        prev.map(item => (item.id === id ? { ...item, ...updates } : item))
      );
      return true;
    } catch (error) {
      console.error('Error updating expense:', error);
      return false;
    }
  };

  const deleteExpense = async (id: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting expense:', error);
        toast.error('Failed to delete expense');
        return false;
      }

      setExpenseData(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
  };

  const getTotalExpenses = useCallback(() => {
    return expenseData.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [expenseData]);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData]);

  return {
    expenseData,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    getTotalExpenses,
    refetch: fetchExpenseData,
  };
};
