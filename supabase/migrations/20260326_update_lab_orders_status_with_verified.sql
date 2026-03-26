-- Update lab_orders status CHECK constraint to include 'verified' for ISO 15189 compliance
-- New workflow: pending → sample_collected → in_progress → completed → verified → reported

BEGIN;

-- Drop old constraint with limited statuses
ALTER TABLE public.lab_orders 
DROP CONSTRAINT IF EXISTS lab_orders_status_check;

-- Create new constraint including verification status
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
