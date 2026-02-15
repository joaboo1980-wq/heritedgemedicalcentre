-- Comprehensive Diagnostic Script for Appointment Scheduling Issues
-- Run this in your Supabase SQL Editor to identify the real problem

-- 1. First, check what doctors are actually available
RAISE NOTICE '==== CHECKING AVAILABLE DOCTORS ====';
SELECT 
  ur.user_id,
  ur.role,
  p.full_name,
  p.email,
  p.department,
  EXISTS(SELECT 1 FROM auth.users au WHERE au.id = ur.user_id) as user_exists_in_auth
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.user_id
WHERE ur.role = 'doctor'
ORDER BY p.full_name;

-- 2. Check if there are any patients available
RAISE NOTICE '==== CHECKING AVAILABLE PATIENTS (first 10) ====';
SELECT 
  id,
  patient_number,
  first_name,
  last_name,
  email,
  phone
FROM public.patients
LIMIT 10;

-- 3. Check the appointments table structure
RAISE NOTICE '==== APPOINTMENTS TABLE STRUCTURE ====';
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY ordinal_position;

-- 4. Check constraints on appointments table
RAISE NOTICE '==== APPOINTMENTS TABLE CONSTRAINTS ====';
SELECT 
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY constraint_name;

-- 5. Check triggers on appointments table
RAISE NOTICE '==== APPOINTMENTS TABLE TRIGGERS ====';
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'appointments'
ORDER BY trigger_name;

-- 6. Try to create a test appointment with sample data
RAISE NOTICE '==== TESTING APPOINTMENT INSERT ====';
DO $$
DECLARE
  v_patient_id UUID;
  v_doctor_id UUID;
  v_appointment_id UUID;
BEGIN
  -- Get first available patient
  SELECT id INTO v_patient_id FROM public.patients LIMIT 1;
  
  -- Get first available doctor with doctor role
  SELECT ur.user_id INTO v_doctor_id 
  FROM public.user_roles ur 
  WHERE ur.role = 'doctor' 
  LIMIT 1;
  
  IF v_patient_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: No patients found in database';
    RETURN;
  END IF;
  
  IF v_doctor_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: No doctors with doctor role found in database';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ Found patient: %', v_patient_id;
  RAISE NOTICE '✓ Found doctor: %', v_doctor_id;
  
  -- Try to insert a test appointment
  BEGIN
    INSERT INTO public.appointments (
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      reason,
      status
    ) VALUES (
      v_patient_id,
      v_doctor_id,
      CURRENT_DATE + INTERVAL '1 day',
      '10:00',
      'Test appointment from diagnostic script',
      'confirmed'
    )
    RETURNING id INTO v_appointment_id;
    
    RAISE NOTICE '✓ TEST SUCCESSFUL: Appointment created with ID: %', v_appointment_id;
    
    -- Clean up: delete the test appointment
    DELETE FROM public.appointments WHERE id = v_appointment_id;
    RAISE NOTICE '✓ Test appointment deleted';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
    RAISE NOTICE '  Detail: %', SQLSTATE;
    RAISE NOTICE '  Context: %', PG_EXCEPTION_CONTEXT;
  END;
END $$;

RAISE NOTICE '==== DIAGNOSTIC COMPLETE ====';
