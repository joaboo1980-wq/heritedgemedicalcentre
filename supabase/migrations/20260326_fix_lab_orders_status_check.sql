-- Fix lab_orders CHECK constraint to support 'rejected' and 'in_progress' statuses

BEGIN;

-- Drop the old CHECK constraint
ALTER TABLE public.lab_orders 
DROP CONSTRAINT IF EXISTS lab_orders_status_check;

-- Add the new CHECK constraint with all required statuses
ALTER TABLE public.lab_orders
ADD CONSTRAINT lab_orders_status_check 
CHECK (status IN ('pending', 'sample_collected', 'in_progress', 'processing', 'completed', 'rejected', 'cancelled'));

COMMIT;
