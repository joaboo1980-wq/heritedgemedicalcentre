import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Search,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import PermissionGuard from '@/components/layout/PermissionGuard';
import { useToast } from '@/hooks/use-toast';
import {
  useChartOfAccounts,
  useFinancialTransactions,
  useBudgets,
  useBankReconciliations,
  useReconciliationItems,
  useFinancialSummary,
  useCreateTransaction,
  useCompleteReconciliation,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useUpdateTransaction,
  useDeleteTransaction,
  useUpdateBudget,
  useDeleteBudget,
  useIncomeStatement,
  useBudgetVsActual,
  useAccountsReceivableAging,
  useExpenseAnalysis,
} from '@/hooks/useAccounts';

// Sample data for Chart of Accounts
const chartOfAccountsData = [
  {
    code: '1000',
    name: 'Cash',
    type: 'Asset',
    balance: 45000.00,
  },
  {
    code: '1100',
    name: 'Accounts Receivable',
    type: 'Asset',
    balance: 12450.00,
  },
  {
    code: '1200',
    name: 'Medical Equipment',
    type: 'Asset',
    balance: 125000.00,
  },
  {
    code: '2000',
    name: 'Accounts Payable',
    type: 'Liability',
    balance: -8500.00,
  },
  {
    code: '3000',
    name: "Owner's Equity",
    type: 'Equity',
    balance: 150000.00,
  },
  {
    code: '4000',
    name: 'Patient Revenue',
    type: 'Revenue',
    balance: 124780.00,
  },
];

// Sample data for Transactions
const transactionsData = [
  {
    id: '1',
    date: '2025-05-22',
    description: 'Patient Payment - Emma Thompson',
    category: 'Patient Payments',
    reference: 'PAY-001',
    amount: 150000,
    type: 'income',
  },
  {
    id: '2',
    date: '2025-05-21',
    description: 'Medical Supplies Purchase',
    category: 'Supplies',
    reference: 'SUP-045',
    amount: 2400000,
    type: 'expense',
  },
  {
    id: '3',
    date: '2025-05-20',
    description: 'Insurance Reimbursement',
    category: 'Insurance',
    reference: 'INS-234',
    amount: 3200000,
    type: 'income',
  },
  {
    id: '4',
    date: '2025-05-19',
    description: 'Staff Salary - Dr. Williams',
    category: 'Salaries',
    reference: 'SAL-001',
    amount: 8500000,
    type: 'expense',
  },
  {
    id: '5',
    date: '2025-05-18',
    description: 'Equipment Maintenance',
    category: 'Equipment',
    reference: 'EQP-012',
    amount: 750000,
    type: 'expense',
  },
];

// Budget data
const budgetData = [
  {
    category: 'Medical Supplies',
    budget: 30000.00,
    spent: 25000.00,
  },
  {
    category: 'Staff Salaries',
    budget: 50000.00,
    spent: 45000.00,
  },
  {
    category: 'Equipment',
    budget: 15000.00,
    spent: 8500.00,
  },
  {
    category: 'Utilities',
    budget: 5000.00,
    spent: 3200.00,
  },
];

// Reconciliation data
const reconciliationData = {
  bankStatementBalance: 47250.00,
  bookBalance: 45000.00,
  difference: 2250.00,
  outstandingDeposits: [
    { description: 'Insurance Payment', amount: 1500.00, date: '2025-05-12' },
    { description: 'Patient Payment', amount: 750.00, date: '2025-05-11' },
  ],
  outstandingChecks: [
    { description: 'Medical Supplies', checkNum: '#1001', amount: -2450.00, date: '' },
    { description: 'Utilities', checkNum: '#1002', amount: -350.00, date: '' },
  ],
};

const Accounts = () => {
  const { toast } = useToast();
  
  // UI State
  const [activeTab, setActiveTab] = useState('transactions');
  const [accountTypeFilter, setAccountTypeFilter] = useState('All');
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [isViewTransactionOpen, setIsViewTransactionOpen] = useState(false);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [isDeleteTransactionOpen, setIsDeleteTransactionOpen] = useState(false);
  const [isViewAccountOpen, setIsViewAccountOpen] = useState(false);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);

  // Form State
  const [transactionForm, setTransactionForm] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [editTransactionForm, setEditTransactionForm] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [editAccountForm, setEditAccountForm] = useState({
    account_name: '',
    description: '',
    balance: '',
  });

  const [editBudgetForm, setEditBudgetForm] = useState({
    category: '',
    budgeted_amount: '',
    spent_amount: '',
    notes: '',
  });

  const [newAccountForm, setNewAccountForm] = useState({
    account_code: '',
    account_name: '',
    account_type: 'Asset' as 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense',
    description: '',
    balance: '0',
  });

  const [newBudgetForm, setNewBudgetForm] = useState({
    category: '',
    budgeted_amount: '',
    spent_amount: '0',
    notes: '',
  });

  const [reconciliationForm, setReconciliationForm] = useState({
    selected_account_id: '',
    bank_statement_balance: '',
    book_balance: '',
    reconciliation_date: new Date().toISOString().split('T')[0],
    notes: '',
    outstanding_deposits: [] as Array<{ description: string; amount: string; item_date: string; transaction_id?: string }>,
    outstanding_checks: [] as Array<{ description: string; reference_number: string; amount: string; transaction_id?: string }>,
  });

  const [accountTransactions, setAccountTransactions] = useState<any[]>([]);

  const [newDepositForm, setNewDepositForm] = useState({
    description: '',
    amount: '',
    item_date: new Date().toISOString().split('T')[0],
  });

  const [newCheckForm, setNewCheckForm] = useState({
    description: '',
    reference_number: '',
    amount: '',
  });

  // Reporting hooks
  const { data: incomeStatement } = useIncomeStatement();
  const { data: budgetVsActual } = useBudgetVsActual();
  const { data: arAging } = useAccountsReceivableAging();
  const { data: expenseAnalysis } = useExpenseAnalysis();

  // Mutations
  const createTransactionMutation = useCreateTransaction();
  const completeReconciliationMutation = useCompleteReconciliation();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const updateBudgetMutation = useUpdateBudget();
  const deleteBudgetMutation = useDeleteBudget();

  // Fetch data from Supabase
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary();
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useFinancialTransactions();
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const { data: reconciliations, isLoading: reconciliationsLoading } = useBankReconciliations();

  // Get the latest reconciliation for details
  const latestReconciliation = reconciliations?.length ? reconciliations[0] : null;
  const { data: reconciliationItems } = useReconciliationItems(latestReconciliation?.id);

  // Use actual data from Supabase, fallback to sample data if loading
  const totalRevenue = summary?.totalRevenue ?? 124780;
  const totalExpenses = summary?.totalExpenses ?? 78450;
  const netProfit = summary?.netProfit ?? 46330;

  const displayAccounts = accounts && accounts.length > 0 ? accounts : chartOfAccountsData;
  
  // Get AR from Chart of Accounts instead of invoices
  const arAccount = displayAccounts?.find(a => (a.account_name || a.name)?.toLowerCase().includes('receivable'));
  const outstanding = arAccount?.balance ?? 12450;
  const displayTransactions = transactions && transactions.length > 0 ? transactions : transactionsData;
  const displayBudgets = budgets && budgets.length > 0 ? budgets : budgetData;

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      'Patient Payments': 'bg-blue-100 text-blue-800',
      'Supplies': 'bg-purple-100 text-purple-800',
      'Insurance': 'bg-green-100 text-green-800',
      'Salaries': 'bg-orange-100 text-orange-800',
      'Equipment': 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getTransactionColor = (type: string) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600';
  };

  const getBudgetProgress = (spent: number, budget: number) => {
    return Math.round((spent / budget) * 100);
  };

  const getBudgetProgressColor = (percentage: number) => {
    if (percentage <= 50) return 'bg-green-500';
    if (percentage <= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAccountTypeColor = (type: string) => {
    if (type === 'Asset') return 'text-blue-600';
    if (type === 'Liability') return 'text-red-600';
    if (type === 'Equity') return 'text-purple-600';
    if (type === 'Revenue') return 'text-green-600';
    return 'text-gray-600';
  };

  const reconciliationAdjustment =
    latestReconciliation
      ? latestReconciliation.bank_statement_balance - latestReconciliation.book_balance
      : reconciliationData.difference;

  const adjustedBalance =
    latestReconciliation && reconciliationItems
      ? latestReconciliation.book_balance +
        reconciliationItems.filter(i => i.item_type === 'deposit').reduce((sum, dep) => sum + dep.amount, 0) +
        reconciliationItems.filter(i => i.item_type === 'check').reduce((sum, check) => sum + (check.amount >= 0 ? -check.amount : check.amount), 0)
      : latestReconciliation?.book_balance ?? 0;

  const isLoading = summaryLoading || accountsLoading || transactionsLoading || budgetsLoading || reconciliationsLoading;

  // Handlers
  const handleAddTransaction = async () => {
    if (!transactionForm.description || !transactionForm.amount || !transactionForm.category) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTransactionMutation.mutateAsync({
        transaction_date: transactionForm.date,
        description: transactionForm.description,
        category: transactionForm.category,
        amount: parseFloat(transactionForm.amount),
        transaction_type: transactionForm.type,
        payment_method: null,
        account_code_id: null,
        invoice_id: null,
        notes: transactionForm.notes || null,
        reference_number: null,
      });

      toast({
        title: 'Success',
        description: 'Transaction added successfully',
      });

      // Reset form
      setTransactionForm({
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setIsAddTransactionOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add transaction',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsViewTransactionOpen(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setEditTransactionForm({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.transaction_type || transaction.type,
      category: transaction.category,
      date: transaction.transaction_date || transaction.date,
      notes: transaction.notes || '',
    });
    setIsEditTransactionOpen(true);
  };

  const handleDeleteTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsDeleteTransactionOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      await deleteTransactionMutation.mutateAsync(selectedTransaction.id);
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      });
      setIsDeleteTransactionOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transaction',
        variant: 'destructive',
      });
    }
  };

  const handleSaveEditTransaction = async () => {
    if (!editTransactionForm.description || !editTransactionForm.amount || !editTransactionForm.category) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTransaction) return;

    try {
      await updateTransactionMutation.mutateAsync({
        ...selectedTransaction,
        transaction_date: editTransactionForm.date,
        description: editTransactionForm.description,
        category: editTransactionForm.category,
        amount: parseFloat(editTransactionForm.amount),
        transaction_type: editTransactionForm.type as 'income' | 'expense',
        payment_method: null,
        notes: editTransactionForm.notes || null,
      });

      toast({
        title: 'Success',
        description: 'Transaction updated successfully',
      });
      setIsEditTransactionOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update transaction',
        variant: 'destructive',
      });
    }
  };

  const handleViewAccount = (account: any) => {
    setSelectedAccount(account);
    setIsViewAccountOpen(true);
  };

  const handleEditAccount = (account: any) => {
    setSelectedAccount(account);
    setEditAccountForm({
      account_name: account.account_name || account.name,
      description: account.description || '',
      balance: (account.balance || 0).toString(),
    });
    setIsEditAccountOpen(true);
  };

  const handleSaveEditAccount = async () => {
    if (!editAccountForm.account_name) {
      toast({
        title: 'Validation Error',
        description: 'Account name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAccount) return;

    try {
      await updateAccountMutation.mutateAsync({
        ...selectedAccount,
        account_name: editAccountForm.account_name,
        description: editAccountForm.description || null,
        balance: parseFloat(editAccountForm.balance) || 0,
      });

      toast({
        title: 'Success',
        description: 'Account updated successfully',
      });
      setIsEditAccountOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update account',
        variant: 'destructive',
      });
    }
  };

  const handleEditBudget = (budget: any) => {
    setSelectedBudget(budget);
    setEditBudgetForm({
      category: budget.category,
      budgeted_amount: (budget.budgeted_amount || budget.budget).toString(),
      spent_amount: (budget.spent_amount || budget.spent).toString(),
      notes: budget.notes || '',
    });
    setIsEditBudgetOpen(true);
  };

  const handleSaveEditBudget = async () => {
    if (!editBudgetForm.category || !editBudgetForm.budgeted_amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBudget) return;

    try {
      await updateBudgetMutation.mutateAsync({
        ...selectedBudget,
        budgeted_amount: parseFloat(editBudgetForm.budgeted_amount),
        spent_amount: parseFloat(editBudgetForm.spent_amount) || 0,
        notes: editBudgetForm.notes || null,
      });

      toast({
        title: 'Success',
        description: 'Budget updated successfully',
      });
      setIsEditBudgetOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update budget',
        variant: 'destructive',
      });
    }
  }

  const handleCompleteReconciliation = async () => {
    if (!latestReconciliation) return;
    
    try {
      await completeReconciliationMutation.mutateAsync({
        id: latestReconciliation.id,
        reconciliation_date: new Date().toISOString().split('T')[0],
        bank_statement_balance: latestReconciliation.bank_statement_balance,
        book_balance: latestReconciliation.book_balance,
        reconciliation_status: 'reconciled',
        notes: null,
      });

      toast({
        title: 'Success',
        description: 'Bank reconciliation completed successfully',
      });

      setIsReconciliationOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete reconciliation',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async (account: any) => {
    if (!confirm(`Are you sure you want to delete account "${account.account_name}"?`)) {
      return;
    }

    try {
      await deleteAccountMutation.mutateAsync(account.id);
      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    }
  };

  const handleCreateBudget = async () => {
    if (!newBudgetForm.category || !newBudgetForm.budgeted_amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in category and budgeted amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const budgetYear = new Date().getFullYear();
      await createAccountMutation.mutateAsync({
        budget_year: budgetYear,
        category: newBudgetForm.category,
        budgeted_amount: parseFloat(newBudgetForm.budgeted_amount),
        spent_amount: parseFloat(newBudgetForm.spent_amount) || 0,
        notes: newBudgetForm.notes,
        is_active: true,
      });

      setNewBudgetForm({
        category: '',
        budgeted_amount: '',
        spent_amount: '0',
        notes: '',
      });
      setIsCreateBudgetOpen(false);

      toast({
        title: 'Success',
        description: 'Budget created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create budget',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBudget = async (budget: any) => {
    if (!confirm(`Are you sure you want to delete budget for "${budget.category}"?`)) {
      return;
    }

    try {
      await deleteBudgetMutation.mutateAsync(budget.id);
      toast({
        title: 'Success',
        description: 'Budget deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete budget',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateReport = async (type: 'account' | 'budget') => {
    try {
      if (type === 'account' && selectedAccount) {
        // Generate account report
        const reportData = `
Account Report
======================
Account Code: ${selectedAccount.account_code}
Account Name: ${selectedAccount.account_name}
Account Type: ${selectedAccount.account_type}
Balance: UGX ${selectedAccount.balance.toLocaleString('en-UG')}
Description: ${selectedAccount.description || 'N/A'}
Active: ${selectedAccount.is_active ? 'Yes' : 'No'}
Created: ${new Date(selectedAccount.created_at).toLocaleDateString('en-UG')}
        `;

        // Create and download file
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportData));
        element.setAttribute('download', `account-${selectedAccount.account_code}-report.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        toast({
          title: 'Success',
          description: 'Account report generated and downloaded',
        });
      } else if (type === 'budget' && selectedBudget) {
        // Generate budget report
        const variance = selectedBudget.budgeted_amount - (selectedBudget.spent_amount || 0);
        const variancePercent = (variance / selectedBudget.budgeted_amount * 100).toFixed(2);

        const reportData = `
Budget Report
======================
Category: ${selectedBudget.category}
Year: ${selectedBudget.budget_year}
Budgeted Amount: UGX ${selectedBudget.budgeted_amount.toLocaleString('en-UG')}
Spent Amount: UGX ${(selectedBudget.spent_amount || 0).toLocaleString('en-UG')}
Remaining: UGX ${variance.toLocaleString('en-UG')}
Variance %: ${variancePercent}%
Status: ${selectedBudget.is_active ? 'Active' : 'Inactive'}
Notes: ${selectedBudget.notes || 'N/A'}
        `;

        // Create and download file
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportData));
        element.setAttribute('download', `budget-${selectedBudget.category}-${selectedBudget.budget_year}-report.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        toast({
          title: 'Success',
          description: 'Budget report generated and downloaded',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountForm.account_code || !newAccountForm.account_name || !newAccountForm.account_type) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        account_code: newAccountForm.account_code,
        account_name: newAccountForm.account_name,
        account_type: newAccountForm.account_type,
        description: newAccountForm.description || null,
        balance: parseFloat(newAccountForm.balance) || 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast({
        title: 'Success',
        description: 'Account created successfully',
      });

      // Reset form
      setNewAccountForm({
        account_code: '',
        account_name: '',
        account_type: 'Asset',
        description: '',
        balance: '0',
      });
      setIsCreateAccountOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    }
  };

  const handleAddOutstandingDeposit = () => {
    if (!newDepositForm.description || !newDepositForm.amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setReconciliationForm({
      ...reconciliationForm,
      outstanding_deposits: [
        ...reconciliationForm.outstanding_deposits,
        {
          description: newDepositForm.description,
          amount: newDepositForm.amount,
          item_date: newDepositForm.item_date,
        },
      ],
    });

    setNewDepositForm({
      description: '',
      amount: '',
      item_date: new Date().toISOString().split('T')[0],
    });

    toast({
      title: 'Success',
      description: 'Outstanding deposit added',
    });
  };

  const handleRemoveOutstandingDeposit = (index: number) => {
    setReconciliationForm({
      ...reconciliationForm,
      outstanding_deposits: reconciliationForm.outstanding_deposits.filter((_, i) => i !== index),
    });
  };

  const handleAddOutstandingCheck = () => {
    if (!newCheckForm.description || !newCheckForm.amount || !newCheckForm.reference_number) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setReconciliationForm({
      ...reconciliationForm,
      outstanding_checks: [
        ...reconciliationForm.outstanding_checks,
        {
          description: newCheckForm.description,
          reference_number: newCheckForm.reference_number,
          amount: newCheckForm.amount,
        },
      ],
    });

    setNewCheckForm({
      description: '',
      reference_number: '',
      amount: '',
    });

    toast({
      title: 'Success',
      description: 'Outstanding check added',
    });
  };

  const handleRemoveOutstandingCheck = (index: number) => {
    setReconciliationForm({
      ...reconciliationForm,
      outstanding_checks: reconciliationForm.outstanding_checks.filter((_, i) => i !== index),
    });
  };

  const calculateReconciledBalance = () => {
    const bankBalance = parseFloat(reconciliationForm.bank_statement_balance) || 0;
    const deposits = reconciliationForm.outstanding_deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const checks = reconciliationForm.outstanding_checks.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    return bankBalance - checks + deposits;
  };

  const bookBalance = parseFloat(reconciliationForm.book_balance) || 0;
  const reconciledBalance = calculateReconciledBalance();
  const isReconciled = Math.abs(reconciledBalance - bookBalance) < 0.01;

  const handleSelectAccountForReconciliation = (accountId: string) => {
    const selectedAccount = displayAccounts.find(a => a.id === accountId);
    
    setReconciliationForm({
      ...reconciliationForm,
      selected_account_id: accountId,
      book_balance: (selectedAccount?.balance || 0).toString(),
    });

    // Load transactions for this account
    const accountTransactions = displayTransactions.filter(
      t => t.account_code_id === accountId || (selectedAccount && t.description?.includes(selectedAccount.account_name))
    );
    
    setAccountTransactions(accountTransactions);

    toast({
      title: 'Account Selected',
      description: `Loading transactions for ${selectedAccount?.account_name}...`,
    });
  };

  const handleCompleteReconciliationIntegrated = async () => {
    if (!reconciliationForm.selected_account_id) {
      toast({
        title: 'Error',
        description: 'Please select a bank account',
        variant: 'destructive',
      });
      return;
    }

    if (!isReconciled) {
      toast({
        title: 'Error',
        description: 'Accounts must be reconciled before completion',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get the selected account
      const selectedAccount = displayAccounts.find(a => a.id === reconciliationForm.selected_account_id);
      if (!selectedAccount) return;

      // Update the account balance to the reconciled balance
      await updateAccountMutation.mutateAsync({
        ...selectedAccount,
        balance: reconciledBalance,
      });

      // Complete the reconciliation record
      await completeReconciliationMutation.mutateAsync({
        id: latestReconciliation?.id || '',
        reconciliation_date: reconciliationForm.reconciliation_date,
        bank_statement_balance: parseFloat(reconciliationForm.bank_statement_balance) || 0,
        book_balance: bookBalance,
        reconciliation_status: 'reconciled',
        notes: reconciliationForm.notes || null,
      });

      toast({
        title: 'Success',
        description: `Reconciliation complete for ${selectedAccount.account_name}. Account balance updated.`,
      });

      // Reset reconciliation form
      setReconciliationForm({
        selected_account_id: '',
        bank_statement_balance: '',
        book_balance: '',
        reconciliation_date: new Date().toISOString().split('T')[0],
        notes: '',
        outstanding_deposits: [],
        outstanding_checks: [],
      });
      setAccountTransactions([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete reconciliation',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {isLoading && activeTab === 'all' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Accounts & Finance</h1>
        </div>
        <div className="flex gap-2">
          <PermissionGuard module="accounts" action="read">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGuard>
          {activeTab === 'transactions' && (
            <PermissionGuard module="accounts" action="create">
              <Button onClick={() => setIsAddTransactionOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </PermissionGuard>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600 mb-1">
              UGX {totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">↑ +12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Expenses</p>
            <p className="text-3xl font-bold text-red-600 mb-1">
              UGX {totalExpenses.toLocaleString()}
            </p>
            <p className="text-xs text-red-600">↑ +5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Net Profit</p>
            <p className="text-3xl font-bold text-green-600 mb-1">
              UGX {netProfit.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">↑ +18% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Outstanding</p>
            <p className="text-3xl font-bold text-amber-600 mb-1">
              UGX {outstanding.toLocaleString()}
            </p>
            <p className="text-xs text-red-600">↓ -8% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          {['transactions', 'chart-of-accounts', 'reconciliation', 'budgets'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'transactions' && 'Transactions'}
              {tab === 'chart-of-accounts' && 'Chart of Accounts'}
              {tab === 'reconciliation' && 'Reconciliation'}
              {tab === 'budgets' && 'Budgets'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transactions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {transactionsLoading ? 'Loading...' : `Showing ${displayTransactions.length} transactions`}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search transactions..." className="pl-9" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : displayTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No transactions found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {transaction.transaction_date || transaction.date}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadgeColor(transaction.category)}>
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.reference_number || transaction.reference}
                      </TableCell>
                      <TableCell
                        className={`font-bold ${getTransactionColor(transaction.transaction_type || transaction.type)}`}
                      >
                        {transaction.transaction_type === 'income' || transaction.type === 'income' ? '+' : '-'}
                        UGX {transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(transaction)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTransaction(transaction)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'chart-of-accounts' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Chart of Accounts</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {accountsLoading ? 'Loading...' : `Showing ${
                    accountTypeFilter === 'All' 
                      ? displayAccounts.length 
                      : displayAccounts.filter(a => (a.account_type || a.type) === accountTypeFilter).length
                  } accounts`}
                </p>
              </div>
              <PermissionGuard module="accounts" action="create">
                <Button onClick={() => setIsCreateAccountOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Account
                </Button>
              </PermissionGuard>
            </div>
          </CardHeader>

          {/* Account Type Filter Tabs */}
          <div className="border-b border-border px-6">
            <div className="flex gap-6">
              {['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((type) => (
                <button
                  key={type}
                  onClick={() => setAccountTypeFilter(type)}
                  className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                    accountTypeFilter === type
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <CardContent>
            {accountsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : displayAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No accounts found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayAccounts
                    .filter(a => accountTypeFilter === 'All' || (a.account_type || a.type) === accountTypeFilter)
                    .map((account) => (
                    <TableRow key={account.id || account.code}>
                      <TableCell className="font-medium">
                        {account.account_code || account.code}
                      </TableCell>
                      <TableCell className="text-primary hover:underline cursor-pointer">
                        {account.account_name || account.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${getAccountTypeColor(account.account_type || account.type)}`}
                        >
                          {account.account_type || account.type}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`font-bold ${
                          (account.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        UGX{' '}
                        {(account.balance ?? 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewAccount(account)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Transactions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Account
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleGenerateReport('account')}>
                              <Download className="h-4 w-4 mr-2" />
                              Generate Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteAccount(account)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reconciliation' && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Reconciliation</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Reconcile your bank statements with recorded transactions for accurate financial reporting.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Selection */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <label className="text-sm font-medium mb-3 block">Select Bank Account to Reconcile</label>
                <Select value={reconciliationForm.selected_account_id} onValueChange={handleSelectAccountForReconciliation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bank account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {displayAccounts
                      .filter(a => a.account_type === 'Asset') // Typically Cash accounts are assets
                      .map(account => (
                        <SelectItem key={account.id} value={account.id || ''}>
                          {account.account_code} - {account.account_name} (UGX {account.balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {reconciliationForm.selected_account_id && (
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm"><span className="font-medium">Account Transactions:</span> {accountTransactions.length} transactions loaded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transactions List for Selected Account */}
            {reconciliationForm.selected_account_id && accountTransactions.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Recent Transactions for Selected Account</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {accountTransactions.slice(0, 10).map((txn, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm border">
                        <div className="flex-1">
                          <p className="font-medium">{txn.description}</p>
                          <p className="text-xs text-muted-foreground">{txn.transaction_date || txn.date}</p>
                        </div>
                        <p className={`font-bold ${txn.transaction_type === 'income' || txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.transaction_type === 'income' || txn.type === 'income' ? '+' : '-'} UGX {Math.abs(txn.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reconciliation Form Section */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Bank & Book Balances */}
              <Card className="border">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold">Balance Information</h3>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Reconciliation Date</label>
                    <Input
                      type="date"
                      value={reconciliationForm.reconciliation_date}
                      onChange={(e) => setReconciliationForm({...reconciliationForm, reconciliation_date: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Bank Statement Balance</label>
                    <Input
                      type="number"
                      placeholder="Enter bank statement balance"
                      value={reconciliationForm.bank_statement_balance}
                      onChange={(e) => setReconciliationForm({...reconciliationForm, bank_statement_balance: e.target.value})}
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Book Balance</label>
                    <Input
                      type="number"
                      placeholder="Enter book balance"
                      value={reconciliationForm.book_balance}
                      onChange={(e) => setReconciliationForm({...reconciliationForm, book_balance: e.target.value})}
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                    <textarea
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                      placeholder="Add any reconciliation notes..."
                      value={reconciliationForm.notes}
                      onChange={(e) => setReconciliationForm({...reconciliationForm, notes: e.target.value})}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Right: Summary */}
              <Card className={`border ${isReconciled ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${isReconciled ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                    Reconciliation Status
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank Balance:</span>
                      <span className="font-bold">
                        UGX {parseFloat(reconciliationForm.bank_statement_balance || '0').toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outstanding Checks:</span>
                      <span className="font-bold text-red-600">
                        -UGX {reconciliationForm.outstanding_checks.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outstanding Deposits:</span>
                      <span className="font-bold text-green-600">
                        +UGX {reconciliationForm.outstanding_deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>

                    <div className="border-t border-gray-300 pt-3 flex justify-between font-bold text-base">
                      <span>Reconciled Balance:</span>
                      <span className={isReconciled ? 'text-green-600' : 'text-orange-600'}>
                        UGX {reconciledBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>

                    <div className="flex justify-between font-bold text-base">
                      <span>Book Balance:</span>
                      <span>
                        UGX {bookBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>

                    <div className="border-t border-gray-300 pt-3">
                      <div className={`text-center py-2 rounded font-bold ${isReconciled ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {isReconciled ? '✓ Reconciled' : `Difference: UGX ${Math.abs(reconciledBalance - bookBalance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Outstanding Items */}
            <div className="grid grid-cols-2 gap-6">
              {/* Outstanding Deposits */}
              <div>
                <h3 className="font-semibold mb-4">Outstanding Deposits</h3>
                <Card className="mb-4 border-green-200 bg-green-50">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Description</label>
                      <Input
                        placeholder="e.g., Insurance Reimbursement"
                        value={newDepositForm.description}
                        onChange={(e) => setNewDepositForm({...newDepositForm, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Amount</label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={newDepositForm.amount}
                        onChange={(e) => setNewDepositForm({...newDepositForm, amount: e.target.value})}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Date</label>
                      <Input
                        type="date"
                        value={newDepositForm.item_date}
                        onChange={(e) => setNewDepositForm({...newDepositForm, item_date: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleAddOutstandingDeposit} className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Deposit
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {reconciliationForm.outstanding_deposits.map((deposit, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{deposit.description}</p>
                        <p className="text-xs text-muted-foreground">{deposit.item_date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-green-600">+UGX {parseFloat(deposit.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOutstandingDeposit(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outstanding Checks */}
              <div>
                <h3 className="font-semibold mb-4">Outstanding Checks</h3>
                <Card className="mb-4 border-red-200 bg-red-50">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Description</label>
                      <Input
                        placeholder="e.g., Medical Supplies Payment"
                        value={newCheckForm.description}
                        onChange={(e) => setNewCheckForm({...newCheckForm, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Check #</label>
                      <Input
                        placeholder="e.g., 1001"
                        value={newCheckForm.reference_number}
                        onChange={(e) => setNewCheckForm({...newCheckForm, reference_number: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Amount</label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={newCheckForm.amount}
                        onChange={(e) => setNewCheckForm({...newCheckForm, amount: e.target.value})}
                        step="0.01"
                      />
                    </div>
                    <Button onClick={handleAddOutstandingCheck} className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Check
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {reconciliationForm.outstanding_checks.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{check.description}</p>
                        <p className="text-xs text-muted-foreground">Check #{check.reference_number}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-red-600">-UGX {parseFloat(check.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOutstandingCheck(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleCompleteReconciliationIntegrated}
                disabled={!isReconciled || !reconciliationForm.bank_statement_balance || !reconciliationForm.book_balance || !reconciliationForm.selected_account_id}
                className="flex-1"
              >
                {isReconciled && reconciliationForm.selected_account_id ? '✓ Mark as Reconciled' : 'Complete Reconciliation'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setReconciliationForm({
                    selected_account_id: '',
                    bank_statement_balance: '',
                    book_balance: '',
                    reconciliation_date: new Date().toISOString().split('T')[0],
                    notes: '',
                    outstanding_deposits: [],
                    outstanding_checks: [],
                  });
                  setAccountTransactions([]);
                  setNewDepositForm({ description: '', amount: '', item_date: new Date().toISOString().split('T')[0] });
                  setNewCheckForm({ description: '', reference_number: '', amount: '' });
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'budgets' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Budget Management</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {budgetsLoading ? 'Loading...' : `Showing ${displayBudgets.length} budgets for ${new Date().getFullYear()}`}
                </p>
              </div>
              <PermissionGuard module="accounts" action="create">
                <Button onClick={() => setIsCreateBudgetOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Budget
                </Button>
              </PermissionGuard>
            </div>
          </CardHeader>
          <CardContent>
            {budgetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : displayBudgets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No budgets found</div>
            ) : (
              <div className="space-y-6">
                {displayBudgets.map((budget) => {
                  const spent = budget.spent_amount ?? budget.spent ?? 0;
                  const budgeted = budget.budgeted_amount ?? budget.budget ?? 0;
                  const progress = getBudgetProgress(spent, budgeted);
                  const remaining = budgeted - spent;
                  const variance = remaining >= 0 ? remaining : -Math.abs(remaining);
                  const variancePercent = budgeted > 0 ? ((variance / budgeted) * 100).toFixed(1) : 0;
                  
                  // Budget Health: Green (under), Yellow (80-100%), Red (over)
                  const budgetHealth = progress <= 80 ? 'green' : progress <= 100 ? 'yellow' : 'red';
                  const healthColor = budgetHealth === 'green' ? 'bg-green-50 border-green-200' : budgetHealth === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

                  return (
                    <div key={budget.id || budget.category} className={`border rounded-lg p-4 ${healthColor}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-base">{budget.category}</p>
                            <p className="text-xs text-muted-foreground">Budget ID: {budget.id || 'N/A'}</p>
                          </div>
                          <Badge variant={budgetHealth === 'green' ? 'default' : budgetHealth === 'yellow' ? 'secondary' : 'destructive'}>
                            {progress}% Spent
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditBudget(budget)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Budget
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteBudget(budget)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Budget
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex-1 bg-gray-300 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${budgetHealth === 'green' ? 'bg-green-500' : budgetHealth === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Budget Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Budget</p>
                          <p className="font-bold">
                            UGX{' '}
                            {budgeted.toLocaleString('en-US', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Spent</p>
                          <p className="font-bold text-red-600">
                            UGX{' '}
                            {spent.toLocaleString('en-US', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Remaining</p>
                          <p className={`font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            UGX{' '}
                            {Math.abs(remaining).toLocaleString('en-US', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Variance</p>
                          <p className={`font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {variance >= 0 ? '+' : '-'}{Math.abs(variancePercent)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Health</p>
                          <p className={`font-bold text-sm ${budgetHealth === 'green' ? 'text-green-600' : budgetHealth === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {budgetHealth === 'green' ? '✓ Good' : budgetHealth === 'yellow' ? '⚠ Warning' : '✗ Alert'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Transaction Dialog */}
      <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>Record a new financial transaction for the clinic.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input 
                placeholder="Transaction description"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Amount (UGX)</label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select value={transactionForm.type} onValueChange={(value) => setTransactionForm({...transactionForm, type: value as 'income' | 'expense'})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={transactionForm.category} onValueChange={(value) => setTransactionForm({...transactionForm, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Patient Payments">Patient Payments</SelectItem>
                  <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                  <SelectItem value="Salaries">Salaries</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input 
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="Additional notes..."
                rows={3}
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTransaction} disabled={createTransactionMutation.isPending}>
              {createTransactionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Transaction'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Completion Dialog */}
      <Dialog open={isReconciliationOpen} onOpenChange={setIsReconciliationOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Reconciliation</DialogTitle>
            <DialogDescription>Confirm the reconciliation details before completing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Bank Statement Balance:</span>
                <span className="font-bold">
                  UGX{' '}
                  {(latestReconciliation?.bank_statement_balance ?? reconciliationData.bankStatementBalance).toLocaleString(
                    'en-US',
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Less: Outstanding Checks:</span>
                <span className="font-bold">
                  (UGX{' '}
                  {Math.abs(
                    reconciliationItems?.filter(i => i.item_type === 'check').reduce((sum, check) => sum + check.amount, 0) ??
                      reconciliationData.outstandingChecks.reduce((sum, check) => sum + check.amount, 0)
                  ).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Add: Outstanding Deposits:</span>
                <span className="font-bold">
                  UGX{' '}
                  {(
                    reconciliationItems?.filter(i => i.item_type === 'deposit').reduce((sum, dep) => sum + dep.amount, 0) ??
                    reconciliationData.outstandingDeposits.reduce((sum, dep) => sum + dep.amount, 0)
                  ).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="border-t border-blue-300 pt-3 flex justify-between font-bold">
                <span>Adjusted Bank Balance:</span>
                <span>
                  UGX{' '}
                  {adjustedBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsReconciliationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteReconciliation} disabled={completeReconciliationMutation.isPending}>
              {completeReconciliationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                'Complete Reconciliation'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Transaction Details Modal */}
      <Dialog open={isViewTransactionOpen} onOpenChange={setIsViewTransactionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p className="font-semibold">{selectedTransaction.description}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Date</label>
                  <p className="font-semibold">{selectedTransaction.transaction_date || selectedTransaction.date}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Amount</label>
                  <p className={`font-bold text-lg ${(selectedTransaction.transaction_type || selectedTransaction.type) === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {(selectedTransaction.transaction_type || selectedTransaction.type) === 'income' ? '+' : '-'} UGX {selectedTransaction.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Type</label>
                  <Badge>{selectedTransaction.transaction_type || selectedTransaction.type}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Category</label>
                  <p className="font-semibold">{selectedTransaction.category}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Reference</label>
                  <p className="font-mono text-sm">{selectedTransaction.reference_number || selectedTransaction.reference || 'N/A'}</p>
                </div>
              </div>
              {selectedTransaction.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">Notes</label>
                  <p className="text-sm">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsViewTransactionOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewTransactionOpen(false);
              handleEditTransaction(selectedTransaction);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={isEditTransactionOpen} onOpenChange={setIsEditTransactionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input 
                value={editTransactionForm.description}
                onChange={(e) => setEditTransactionForm({...editTransactionForm, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Amount (UGX)</label>
                <Input 
                  type="number"
                  value={editTransactionForm.amount}
                  onChange={(e) => setEditTransactionForm({...editTransactionForm, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select value={editTransactionForm.type} onValueChange={(value) => setEditTransactionForm({...editTransactionForm, type: value as 'income' | 'expense'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={editTransactionForm.category} onValueChange={(value) => setEditTransactionForm({...editTransactionForm, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Patient Payments">Patient Payments</SelectItem>
                  <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                  <SelectItem value="Salaries">Salaries</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input 
                type="date"
                value={editTransactionForm.date}
                onChange={(e) => setEditTransactionForm({...editTransactionForm, date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                value={editTransactionForm.notes}
                onChange={(e) => setEditTransactionForm({...editTransactionForm, notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditTransactionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditTransaction}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation Modal */}
      <Dialog open={isDeleteTransactionOpen} onOpenChange={setIsDeleteTransactionOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Transaction?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
              <p className="text-sm"><span className="font-semibold">Description:</span> {selectedTransaction.description}</p>
              <p className="text-sm"><span className="font-semibold">Amount:</span> UGX {selectedTransaction.amount.toLocaleString()}</p>
              <p className="text-sm"><span className="font-semibold">Date:</span> {selectedTransaction.transaction_date || selectedTransaction.date}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsDeleteTransactionOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteTransaction}>
              Delete Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Account Modal */}
      <Dialog open={isViewAccountOpen} onOpenChange={setIsViewAccountOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Account Code</label>
                  <p className="font-bold text-lg">{selectedAccount.account_code || selectedAccount.code}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Type</label>
                  <Badge>{selectedAccount.account_type || selectedAccount.type}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Account Name</label>
                <p className="font-semibold text-lg">{selectedAccount.account_name || selectedAccount.name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Description</label>
                <p className="text-sm">{selectedAccount.description || 'No description'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Balance</label>
                <p className={`font-bold text-xl ${(selectedAccount.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  UGX {(selectedAccount.balance ?? 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <Badge variant={selectedAccount.is_active !== false ? 'default' : 'secondary'}>
                  {selectedAccount.is_active !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsViewAccountOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewAccountOpen(false);
              handleEditAccount(selectedAccount);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Modal */}
      <Dialog open={isEditAccountOpen} onOpenChange={setIsEditAccountOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Account Name</label>
              <Input 
                value={editAccountForm.account_name}
                onChange={(e) => setEditAccountForm({...editAccountForm, account_name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                value={editAccountForm.description}
                onChange={(e) => setEditAccountForm({...editAccountForm, description: e.target.value})}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Balance (UGX)</label>
              <Input 
                type="number"
                value={editAccountForm.balance}
                onChange={(e) => setEditAccountForm({...editAccountForm, balance: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditAccountOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditAccount}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Modal */}
      <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Input 
                value={editBudgetForm.category}
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Budgeted Amount (UGX)</label>
                <Input 
                  type="number"
                  value={editBudgetForm.budgeted_amount}
                  onChange={(e) => setEditBudgetForm({...editBudgetForm, budgeted_amount: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Spent Amount (UGX)</label>
                <Input 
                  type="number"
                  value={editBudgetForm.spent_amount}
                  onChange={(e) => setEditBudgetForm({...editBudgetForm, spent_amount: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                value={editBudgetForm.notes}
                onChange={(e) => setEditBudgetForm({...editBudgetForm, notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditBudgetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditBudget}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Budget Modal */}
      <Dialog open={isCreateBudgetOpen} onOpenChange={setIsCreateBudgetOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>Set up a new budget for fiscal year {new Date().getFullYear()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={newBudgetForm.category} onValueChange={(value) => setNewBudgetForm({...newBudgetForm, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                  <SelectItem value="Staff Salaries">Staff Salaries</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Budgeted Amount (UGX) *</label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={newBudgetForm.budgeted_amount}
                  onChange={(e) => setNewBudgetForm({...newBudgetForm, budgeted_amount: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Initial Spent Amount (UGX)</label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={newBudgetForm.spent_amount}
                  onChange={(e) => setNewBudgetForm({...newBudgetForm, spent_amount: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="Budget notes or remarks..."
                value={newBudgetForm.notes}
                onChange={(e) => setNewBudgetForm({...newBudgetForm, notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsCreateBudgetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBudget} disabled={createAccountMutation.isPending}>
              {createAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Budget'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Account Modal */}
      <Dialog open={isCreateAccountOpen} onOpenChange={setIsCreateAccountOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>Add a new account to your chart of accounts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Account Code</label>
                <Input 
                  placeholder="e.g., 1500"
                  value={newAccountForm.account_code}
                  onChange={(e) => setNewAccountForm({...newAccountForm, account_code: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Account Type</label>
                <Select value={newAccountForm.account_type} onValueChange={(value) => setNewAccountForm({...newAccountForm, account_type: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Liability">Liability</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Account Name</label>
              <Input 
                placeholder="e.g., Office Supplies"
                value={newAccountForm.account_name}
                onChange={(e) => setNewAccountForm({...newAccountForm, account_name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="Enter account description..."
                value={newAccountForm.description}
                onChange={(e) => setNewAccountForm({...newAccountForm, description: e.target.value})}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Opening Balance (UGX)</label>
              <Input 
                type="number"
                placeholder="0.00"
                value={newAccountForm.balance}
                onChange={(e) => setNewAccountForm({...newAccountForm, balance: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsCreateAccountOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={createAccountMutation.isPending}>
              {createAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounts;
