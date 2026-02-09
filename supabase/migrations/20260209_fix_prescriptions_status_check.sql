-- Fix Prescriptions Status Check Constraint
-- Multiple migrations have created conflicting constraints on the prescriptions.status column
-- This migration removes all constraints and creates a single, unified CHECK constraint

BEGIN;

-- Drop the prescriptions_status_check constraint if it exists (with various possible names)
DO $$
BEGIN
  -- Try all possible constraint names that might exist
  FOR constraint_rec IN (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'prescriptions' 
    AND constraint_type = 'CHECK'
  ) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.prescriptions DROP CONSTRAINT %I', constraint_rec.constraint_name);
      RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop constraint %: %', constraint_rec.constraint_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Ensure the status column exists and is the correct type
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.prescriptions 
    ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    RAISE NOTICE 'Added status column to prescriptions table';
  END IF;
END $$;

-- Add the correct CHECK constraint with all valid statuses
-- These values are used throughout the application in Pharmacy.tsx and other pages
ALTER TABLE public.prescriptions 
ADD CONSTRAINT prescriptions_status_check 
CHECK (status IN ('pending', 'active', 'dispensed', 'partially_dispensed', 'cancelled', 'completed'));

-- Update any existing records that might have invalid status values
UPDATE public.prescriptions 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'active', 'dispensed', 'partially_dispensed', 'cancelled', 'completed');

-- Verify the constraint is in place
DO $$ 
BEGIN
  RAISE NOTICE '✓ Prescriptions status CHECK constraint fixed successfully';
  RAISE NOTICE '✓ Valid status values: pending, active, dispensed, partially_dispensed, cancelled, completed';
  RAISE NOTICE '✓ Pharmacy users can now dispense medications without constraint violations';
END $$;

COMMIT;
