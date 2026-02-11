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
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: FinancialTransaction) => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .update({
          transaction_date: transaction.transaction_date,
          description: transaction.description,
          category: transaction.category,
          amount: transaction.amount,
          transaction_type: transaction.transaction_type,
          payment_method: transaction.payment_method,
          notes: transaction.notes,
        })
        .eq('id', transaction.id)
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

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;
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
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};

// Reporting Hooks

export const useIncomeStatement = (filters?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: ['income-statement', filters],
    queryFn: async () => {
      // Get income transactions
      const { data: incomeData, error: incomeError } = await supabase
        .from('financial_transactions')
        .select('amount, transaction_date, category')
        .eq('transaction_type', 'income');

      if (incomeError) throw incomeError;

      // Get expense transactions
      const { data: expenseData, error: expenseError } = await supabase
        .from('financial_transactions')
        .select('amount, transaction_date, category')
        .eq('transaction_type', 'expense');

      if (expenseError) throw expenseError;

      const totalRevenue = incomeData?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = expenseData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Group by category
      const incomeByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};

      incomeData?.forEach(t => {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      });

      expenseData?.forEach(t => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      });

      return {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        incomeByCategory,
        expenseByCategory,
        incomeTransactions: incomeData || [],
        expenseTransactions: expenseData || [],
      };
    },
  });
};

export const useBudgetVsActual = (filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) => {
  return useQuery({
    queryKey: ['budget-vs-actual', filters],
    queryFn: async () => {
      // Get budgets
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*');

      if (budgetError) throw budgetError;

      // Get actual expenses
      const { data: expenses, error: expenseError } = await supabase
        .from('financial_transactions')
        .select('amount, category, transaction_type')
        .eq('transaction_type', 'expense');

      if (expenseError) throw expenseError;

      // Calculate actual by category
      const actualByCategory: Record<string, number> = {};
      expenses?.forEach(e => {
        actualByCategory[e.category] = (actualByCategory[e.category] || 0) + e.amount;
      });

      // Join budget and actual
      const comparison = budgetData?.map(budget => {
        const actual = actualByCategory[budget.category] || 0;
        const budgeted = budget.budgeted_amount || 0;
        const variance = budgeted - actual;
        const variancePercent = budgeted > 0 ? ((variance / budgeted) * 100).toFixed(2) : 0;

        return {
          category: budget.category,
          budgeted,
          actual,
          variance,
          variancePercent: parseFloat(String(variancePercent)),
          status: variance >= 0 ? 'under' : 'over',
        };
      }) || [];

      return {
        comparison,
        totalBudget: budgetData?.reduce((sum, b) => sum + (b.budgeted_amount || 0), 0) || 0,
        totalActual: expenses?.reduce((sum, e) => sum + e.amount, 0) || 0,
      };
    },
  });
};

export const useAccountsReceivableAging = () => {
  interface InvoiceItem {
    id: string;
    created_at: string;
    amount_paid: number;
    total_amount: number;
    due_date: string;
    outstanding?: number;
    daysOverdue?: number;
  }

  return useQuery({
    queryKey: ['ar-aging'],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, created_at, amount_paid, total_amount, due_date')
        .neq('status', 'paid');

      if (error) throw error;

      const today = new Date();
      const current: InvoiceItem[] = [];
      const thirtyDays: InvoiceItem[] = [];
      const sixtyDays: InvoiceItem[] = [];
      const ninetyDays: InvoiceItem[] = [];
      const ninetyPlus: InvoiceItem[] = [];

      invoices?.forEach(inv => {
        const dueDate = new Date(inv.due_date || inv.created_at);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const outstanding = (inv.total_amount || 0) - (inv.amount_paid || 0);

        const item: InvoiceItem = { ...inv, outstanding, daysOverdue };

        if (daysOverdue <= 0) current.push(item);
        else if (daysOverdue <= 30) thirtyDays.push(item);
        else if (daysOverdue <= 60) sixtyDays.push(item);
        else if (daysOverdue <= 90) ninetyDays.push(item);
        else ninetyPlus.push(item);
      });

      return {
        current: {
          count: current.length,
          total: current.reduce((sum, i) => sum + (i.outstanding || 0), 0),
        },
        thirtyDays: {
          count: thirtyDays.length,
          total: thirtyDays.reduce((sum, i) => sum + (i.outstanding || 0), 0),
        },
        sixtyDays: {
          count: sixtyDays.length,
          total: sixtyDays.reduce((sum, i) => sum + (i.outstanding || 0), 0),
        },
        ninetyDays: {
          count: ninetyDays.length,
          total: ninetyDays.reduce((sum, i) => sum + (i.outstanding || 0), 0),
        },
        ninetyPlus: {
          count: ninetyPlus.length,
          total: ninetyPlus.reduce((sum, i) => sum + (i.outstanding || 0), 0),
        },
        totalOutstanding: invoices?.reduce((sum, i) => sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0,
      };
    },
  });
};

export const useExpenseAnalysis = (filters?: {
  startDate?: string;
  endDate?: string;
}) => {
  interface ExpenseItem {
    amount: number;
    category: string;
    transaction_date: string;
    description: string;
  }

  interface CategoryData {
    total: number;
    count: number;
    items: ExpenseItem[];
  }

  return useQuery({
    queryKey: ['expense-analysis', filters],
    queryFn: async () => {
      const { data: expenses, error } = await supabase
        .from('financial_transactions')
        .select('amount, category, transaction_date, description')
        .eq('transaction_type', 'expense')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const byCategory: Record<string, CategoryData> = {};
      const all = expenses || [];

      all.forEach(exp => {
        if (!byCategory[exp.category]) {
          byCategory[exp.category] = { total: 0, count: 0, items: [] };
        }
        byCategory[exp.category].total += exp.amount;
        byCategory[exp.category].count += 1;
        byCategory[exp.category].items.push(exp);
      });

      const totalExpenses = all.reduce((sum, e) => sum + e.amount, 0);

      const analysis = Object.entries(byCategory).map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        average: data.total / data.count,
        percentage: (data.total / totalExpenses) * 100,
      }));

      return {
        byCategory: analysis.sort((a, b) => b.total - a.total),
        totalExpenses,
        details: all,
      };
    },
  });
};