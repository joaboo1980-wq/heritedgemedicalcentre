-- Apply accounting features fixes
-- Run this in Supabase SQL Editor to enable delete operations and report generation

-- Drop old placeholder policies if they exist
DROP POLICY IF EXISTS "Admin can create accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Admin can update accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Admin and accountant can create transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Admin can update transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Admin can manage budgets" ON public.budgets;
DROP POLICY IF EXISTS "Admin can create budgets" ON public.budgets;
DROP POLICY IF EXISTS "Admin can update budgets" ON public.budgets;

-- Add missing DELETE policies for chart_of_accounts
CREATE POLICY "Authenticated staff can delete accounts" ON public.chart_of_accounts
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add missing DELETE policies for financial_transactions
CREATE POLICY "Authenticated staff can delete transactions" ON public.financial_transactions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add missing DELETE policies for budgets
CREATE POLICY "Authenticated staff can delete budgets" ON public.budgets
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Verify policies are in place
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('chart_of_accounts', 'financial_transactions', 'budgets')
ORDER BY tablename, policyname;
