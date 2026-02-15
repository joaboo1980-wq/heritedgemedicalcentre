-- Add 'waiting' status to appointments constraint
-- This allows the waiting room check-in workflow

BEGIN;

-- Drop the existing CHECK constraint
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add new CHECK constraint that includes 'waiting' status
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'));

DO $$
BEGIN
  RAISE NOTICE 'Successfully added waiting status to appointments_status_check constraint';
END $$;

COMMIT;
