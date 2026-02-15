-- Fix Duplicate Doctor Validation Triggers
-- The appointments table has two redundant triggers that validate doctor_id
-- This migration removes both and creates a single, unified trigger

BEGIN;

-- Step 1: Drop both existing triggers
DROP TRIGGER IF EXISTS validate_appointment_doctor ON public.appointments;
DROP TRIGGER IF EXISTS check_doctor_before_appointment ON public.appointments;

-- Step 2: Drop both existing functions
DROP FUNCTION IF EXISTS public.validate_doctor_role();
DROP FUNCTION IF EXISTS public.check_doctor_exists_before_appointment();

-- Step 3: Create a single, unified function that validates doctor exists with doctor role
CREATE OR REPLACE FUNCTION public.validate_appointment_doctor_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the doctor_id exists as a valid auth user with doctor role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = NEW.doctor_id 
    AND ur.role = 'doctor'
  ) THEN
    RAISE EXCEPTION 'Invalid doctor_id: Doctor does not exist or does not have doctor role. User ID: %', NEW.doctor_id
      USING HINT = 'Verify that the selected doctor has been registered with the doctor role.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Create the single unified trigger
CREATE TRIGGER validate_appointment_doctor
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_doctor_trigger();

-- Step 5: Verify the trigger is in place
DO $$
BEGIN
  RAISE NOTICE '✓ Unified doctor validation trigger created successfully';
  RAISE NOTICE '✓ Appointments will now validate doctor_id against user_roles table';
  RAISE NOTICE '✓ Only users with role=doctor can be selected as appointment doctors';
END $$;

COMMIT;
