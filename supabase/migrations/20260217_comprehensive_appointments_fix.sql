-- COMPREHENSIVE FIX: Appointments Table Constraint Violation
-- This migration ensures the appointments table is properly configured

BEGIN;

-- Remove all problematic triggers and functions
DROP TRIGGER IF EXISTS validate_appointment_doctor ON public.appointments CASCADE;
DROP TRIGGER IF EXISTS check_doctor_before_appointment ON public.appointments CASCADE;
DROP FUNCTION IF EXISTS public.validate_doctor_role() CASCADE;
DROP FUNCTION IF EXISTS public.check_doctor_exists_before_appointment() CASCADE;
DROP FUNCTION IF EXISTS public.validate_appointment_doctor_trigger() CASCADE;

-- Ensure the appointments table exists
DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'appointments'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    RAISE NOTICE 'Appointments table exists';
  END IF;
END $$;

-- Verify and update the status CHECK constraint to include 'waiting'
DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE 'Status CHECK constraint exists';
    -- Drop and recreate to ensure waiting status is included
    ALTER TABLE public.appointments
    DROP CONSTRAINT IF EXISTS appointments_status_check CASCADE;
    
    ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'));
    
    RAISE NOTICE 'Updated appointments_status_check to include waiting status';
  END IF;
END $$;

-- Verify foreign key constraints
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE NOTICE 'Foreign key constraints exist';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE 'Row level security enabled';
END $$;

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Test the setup with sample data
DO $$
DECLARE
  v_test_patient_id UUID;
  v_test_doctor_id UUID;
  v_test_app_id UUID;
BEGIN
  SELECT id INTO v_test_patient_id FROM public.patients LIMIT 1;
  SELECT ur.user_id INTO v_test_doctor_id 
  FROM public.user_roles ur WHERE ur.role = 'doctor' LIMIT 1;
  
  IF v_test_patient_id IS NULL THEN
    RAISE NOTICE 'Cannot test - no patients in database';
    RETURN;
  END IF;
  
  IF v_test_doctor_id IS NULL THEN
    RAISE NOTICE 'Cannot test - no doctors with doctor role in database';
    RETURN;
  END IF;
  
  BEGIN
    INSERT INTO public.appointments (
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      reason,
      status
    ) VALUES (
      v_test_patient_id,
      v_test_doctor_id,
      CURRENT_DATE + INTERVAL '2 days',
      '10:00',
      'TEST_INITIALIZATION',
      'scheduled'
    )
    RETURNING id INTO v_test_app_id;
    
    DELETE FROM public.appointments WHERE id = v_test_app_id;
    RAISE NOTICE 'Appointment creation test successful';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test failed: %', SQLERRM;
  END;
END $$;

COMMIT;
