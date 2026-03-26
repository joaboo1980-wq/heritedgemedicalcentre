-- Safely update lab_orders status CHECK constraint to include 'verified' for ISO 15189 compliance
-- First migrate any existing 'processing' status values to 'in_progress'
-- Then update the constraint

BEGIN;

-- Step 1: Migrate any existing 'processing' status to 'in_progress'
UPDATE public.lab_orders
SET status = 'in_progress'
WHERE status = 'processing';

-- Step 2: Drop old constraint with limited statuses
ALTER TABLE public.lab_orders 
DROP CONSTRAINT IF EXISTS lab_orders_status_check;

-- Step 3: Create new constraint including verification status
ALTER TABLE public.lab_orders
ADD CONSTRAINT lab_orders_status_check 
CHECK (status IN (
  'pending',
  'sample_collected', 
  'in_progress', 
  'completed',
  'verified',
  'reported',
  'rejected', 
  'cancelled'
));

COMMIT;
