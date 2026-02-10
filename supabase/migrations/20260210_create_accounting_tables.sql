-- Create accounting tables for Accounts module

-- Chart of Accounts table
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code varchar(20) NOT NULL UNIQUE,
  account_name varchar(255) NOT NULL,
  account_type varchar(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
  description text,
  balance numeric(15, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Financial Transactions table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL,
  description varchar(255) NOT NULL,
  category varchar(100) NOT NULL,
  reference_number varchar(50),
  amount numeric(15, 2) NOT NULL,
  transaction_type varchar(20) NOT NULL, -- income, expense
  payment_method varchar(50),
  account_code_id uuid REFERENCES public.chart_of_accounts(id),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Budget table
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  category varchar(100) NOT NULL,
  budgeted_amount numeric(15, 2) NOT NULL,
  spent_amount numeric(15, 2) DEFAULT 0,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(budget_year, category)
);

-- Bank Reconciliation table
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date date NOT NULL,
  bank_statement_balance numeric(15, 2) NOT NULL,
  book_balance numeric(15, 2) NOT NULL,
  reconciliation_status varchar(50) NOT NULL DEFAULT 'pending', -- pending, reconciled, discrepancy
  reconciled_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Outstanding items for reconciliation
CREATE TABLE IF NOT EXISTS public.reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid NOT NULL REFERENCES public.bank_reconciliations(id) ON DELETE CASCADE,
  item_type varchar(50) NOT NULL, -- deposit, check
  description varchar(255) NOT NULL,
  amount numeric(15, 2) NOT NULL,
  item_date date,
  reference_number varchar(50),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON public.financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_invoice ON public.financial_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_budgets_year ON public.budgets(budget_year);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON public.chart_of_accounts(account_code);

-- RLS Policies for chart_of_accounts
CREATE POLICY "Staff can view chart of accounts" ON public.chart_of_accounts
  FOR SELECT USING (true);

CREATE POLICY "Admin can create accounts" ON public.chart_of_accounts
  FOR INSERT WITH CHECK (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

CREATE POLICY "Admin can update accounts" ON public.chart_of_accounts
  FOR UPDATE USING (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

-- RLS Policies for financial_transactions
CREATE POLICY "Staff can view financial transactions" ON public.financial_transactions
  FOR SELECT USING (true);

CREATE POLICY "Admin and accountant can create transactions" ON public.financial_transactions
  FOR INSERT WITH CHECK (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin')
    ))
  );

CREATE POLICY "Admin can update transactions" ON public.financial_transactions
  FOR UPDATE USING (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

-- RLS Policies for budgets
CREATE POLICY "Staff can view budgets" ON public.budgets
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage budgets" ON public.budgets
  FOR ALL USING (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

CREATE POLICY "Admin can create budgets" ON public.budgets
  FOR INSERT WITH CHECK (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

CREATE POLICY "Admin can update budgets" ON public.budgets
  FOR UPDATE USING (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

-- RLS Policies for bank_reconciliations
CREATE POLICY "Staff can view reconciliations" ON public.bank_reconciliations
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage reconciliations" ON public.bank_reconciliations
  FOR ALL USING (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

-- RLS Policies for reconciliation_items
CREATE POLICY "Staff can view reconciliation items" ON public.reconciliation_items
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage reconciliation items" ON public.reconciliation_items
  FOR ALL USING (
    (SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

-- Insert default chart of accounts
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, description, balance)
VALUES
  ('1000', 'Cash', 'Asset', 'Cash on hand and in bank accounts', 45000.00),
  ('1100', 'Accounts Receivable', 'Asset', 'Money owed by patients', 12450.00),
  ('1200', 'Medical Equipment', 'Asset', 'Medical and office equipment', 125000.00),
  ('2000', 'Accounts Payable', 'Liability', 'Money owed to suppliers', -8500.00),
  ('3000', 'Owner''s Equity', 'Equity', 'Owner equity and retained earnings', 150000.00),
  ('4000', 'Patient Revenue', 'Revenue', 'Income from patient services', 124780.00),
  ('5000', 'Medical Supplies Expense', 'Expense', 'Cost of medical supplies', 25000.00),
  ('5100', 'Staff Salaries', 'Expense', 'Staff compensation and salaries', 45000.00),
  ('5200', 'Equipment Maintenance', 'Expense', 'Equipment maintenance and repairs', 8500.00),
  ('5300', 'Utilities', 'Expense', 'Electricity, water, and utilities', 3200.00)
ON CONFLICT (account_code) DO NOTHING;

-- Insert sample budgets for current year
INSERT INTO public.budgets (budget_year, category, budgeted_amount, spent_amount)
VALUES
  (EXTRACT(YEAR FROM now())::integer, 'Medical Supplies', 30000.00, 25000.00),
  (EXTRACT(YEAR FROM now())::integer, 'Staff Salaries', 50000.00, 45000.00),
  (EXTRACT(YEAR FROM now())::integer, 'Equipment', 15000.00, 8500.00),
  (EXTRACT(YEAR FROM now())::integer, 'Utilities', 5000.00, 3200.00)
ON CONFLICT (budget_year, category) DO NOTHING;
