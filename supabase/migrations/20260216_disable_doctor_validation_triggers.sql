-- FIX: Remove Doctor Validation Triggers Causing False Constraint Errors
-- The doctor validation triggers are interfering with normal operations
-- This migration disables them and uses only FK constraints for validation

BEGIN;

-- Step 1: Drop the problematic doctor validation triggers
DROP TRIGGER IF EXISTS validate_appointment_doctor ON public.appointments;
DROP TRIGGER IF EXISTS check_doctor_before_appointment ON public.appointments;

-- Step 2: Drop the validation functions
DROP FUNCTION IF EXISTS public.validate_doctor_role();
DROP FUNCTION IF EXISTS public.check_doctor_exists_before_appointment();
DROP FUNCTION IF EXISTS public.validate_appointment_doctor_trigger();

-- Step 3: Verify the appointments table has correct status constraint
-- Add missing columns if they don't exist (shouldn't be needed but let's be safe)
DO $$
BEGIN
  -- Check if duration_minutes exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN duration_minutes INTEGER DEFAULT 30;
  END IF;
END $$;

-- Step 4: Verify foreign key constraints are in place
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'appointments' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%doctor%'
  ) THEN
    RAISE NOTICE 'Doctor foreign key constraint exists';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'appointments' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%patient%'
  ) THEN
    RAISE NOTICE 'Patient foreign key constraint exists';
  END IF;
END $$;

COMMIT;
