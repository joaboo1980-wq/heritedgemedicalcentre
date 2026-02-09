-- Diagnostic: Check Current Prescriptions Table Constraints
-- This script helps identify what CHECK constraints are currently on the prescriptions table

-- Query to see all constraints on prescriptions table
SELECT 
  constraint_name,
  constraint_type,
  table_name,
  column_name
FROM information_schema.constraint_column_usage
WHERE table_name = 'prescriptions' AND table_schema = 'public'
ORDER BY constraint_name;

-- Query to see CHECK constraint definitions
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public' AND constraint_name LIKE '%prescriptions%'
ORDER BY constraint_name;

-- Query to show current prescriptions status column definition
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'prescriptions' AND column_name = 'status'
AND table_schema = 'public';

-- Show first few prescriptions and their current status values
SELECT id, status, patient_id, created_at 
FROM public.prescriptions 
LIMIT 5;
