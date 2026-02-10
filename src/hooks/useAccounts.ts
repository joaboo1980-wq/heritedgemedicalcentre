import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types
export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  description: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_date: string;
  description: string;
  category: string;
  reference_number: string | null;
  amount: number;
  transaction_type: 'income' | 'expense';
  payment_method: string | null;
  account_code_id: string | null;
  invoice_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  budget_year: number;
  category: string;
  budgeted_amount: number;
  spent_amount: number;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankReconciliation {
  id: string;
  reconciliation_date: string;
  bank_statement_balance: number;
  book_balance: number;
  reconciliation_status: 'pending' | 'reconciled' | 'discrepancy';
  reconciled_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationItem {
  id: string;
  reconciliation_id: string;
  item_type: 'deposit' | 'check';
  description: string;
  amount: number;
  item_date: string | null;
  reference_number: string | null;
  created_at: string;
}

// Hooks for fetching data

export const useChartOfAccounts = () => {
  return useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code', { ascending: true });

      if (error) {
        console.error('[useChartOfAccounts] Error:', error);
        throw error;
      }

      return (data || []) as ChartOfAccount[];
    },
  });
};

export const useFinancialTransactions = (filters?: { 
  type?: 'income' | 'expense'; 
  startDate?: string; 
  endDate?: string;
}) => {
  return useQuery({
    queryKey: ['financial-transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (filters?.type) {
        query = query.eq('transaction_type', filters.type);
      }

      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useFinancialTransactions] Error:', error);
        throw error;
      }

      return (data || []) as FinancialTransaction[];
    },
  });
};

export const useBudgets = (year?: number) => {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['budgets', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('budget_year', currentYear)
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) {
        console.error('[useBudgets] Error:', error);
        throw error;
      }

      return (data || []) as Budget[];
    },
  });
};

export const useBankReconciliations = () => {
  return useQuery({
    queryKey: ['bank-reconciliations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .select('*')
        .order('reconciliation_date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[useBankReconciliations] Error:', error);
        throw error;
      }

      return (data || []) as BankReconciliation[];
    },
  });
};

export const useReconciliationItems = (reconciliationId?: string) => {
  return useQuery({
    queryKey: ['reconciliation-items', reconciliationId],
    queryFn: async () => {
      if (!reconciliationId) return [];

      const { data, error } = await supabase
        .from('reconciliation_items')
        .select('*')
        .eq('reconciliation_id', reconciliationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useReconciliationItems] Error:', error);
        throw error;
      }

      return (data || []) as ReconciliationItem[];
    },
    enabled: !!reconciliationId,
  });
};

// Calculate aggregated financial data
export const useFinancialSummary = () => {
  return useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      // Get all transactions
      const { data: transactions, error: txnError } = await supabase
        .from('financial_transactions')
        .select('amount, transaction_type');

      if (txnError) throw txnError;

      const totalRevenue = transactions
        ?.filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const totalExpenses = Math.abs(
        transactions
          ?.filter(t => t.transaction_type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0) || 0
      );

      const netProfit = totalRevenue - totalExpenses;

      // Get outstanding invoices
      const { data: outstandingInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('amount_paid, total_amount')
        .neq('status', 'paid');

      if (invoiceError) throw invoiceError;

      const outstanding = outstandingInvoices
        ?.reduce((sum, inv) => {
          const paid = inv.amount_paid || 0;
          const total = inv.total_amount || 0;
          return sum + (total - paid);
        }, 0) || 0;

      return {
        totalRevenue,
        totalExpenses,
        netProfit,
        outstanding,
      };
    },
  });
};

// Mutations

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert([
          {
            ...transaction,
            created_by: user?.id,
          },
        ])
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budget: Budget) => {
      const { data, error } = await supabase
        .from('budgets')
        .update({
          budgeted_amount: budget.budgeted_amount,
          spent_amount: budget.spent_amount,
          notes: budget.notes,
        })
        .eq('id', budget.id)
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useCompleteReconciliation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reconciliation: Omit<BankReconciliation, 'reconciled_by' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .update({
          reconciliation_status: reconciliation.reconciliation_status,
          notes: reconciliation.notes,
          reconciled_by: user?.id,
        })
        .eq('id', reconciliation.id)
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
    },
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert([account])
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: ChartOfAccount) => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .update({
          account_name: account.account_name,
          description: account.description,
          balance: account.balance,
        })
        .eq('id', account.id)
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};
