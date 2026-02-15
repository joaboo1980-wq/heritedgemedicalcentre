-- CRITICAL DIAGNOSTIC: Identify Exact Cause of Appointment Constraint Violation
-- Run this in Supabase SQL Editor and share the output

DO $$
BEGIN
  RAISE NOTICE 'APPOINTMENT SCHEDULING DIAGNOSTIC REPORT';
END $$;

-- 1. Get exact CHECK constraint definition
DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO v_constraint_def
  FROM pg_constraint
  WHERE conname = 'appointments_status_check'
  AND conrelid = 'public.appointments'::regclass;
  
  RAISE NOTICE 'Status CHECK constraint: %', v_constraint_def;
END $$;

-- 2. Check all constraints on appointments table
DO $$
DECLARE
  v_constraint_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name = 'appointments';
  
  RAISE NOTICE 'Total constraints on appointments table: %', v_constraint_count;
END $$;

-- 3. Check all triggers
DO $$
DECLARE
  v_trigger_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public' AND event_object_table = 'appointments';
  
  RAISE NOTICE 'Total triggers on appointments table: %', v_trigger_count;
END $$;

-- 4. Test data availability
DO $$
DECLARE
  v_patient_count INT;
  v_doctor_count INT;
BEGIN
  SELECT COUNT(*) INTO v_patient_count FROM public.patients;
  SELECT COUNT(DISTINCT ur.user_id)
  INTO v_doctor_count
  FROM public.user_roles ur
  WHERE ur.role = 'doctor';
  
  RAISE NOTICE 'Patients available: %', v_patient_count;
  RAISE NOTICE 'Doctors with doctor role: %', v_doctor_count;
END $$;

-- 5. Try actual insert with best available data
DO $$
DECLARE
  v_patient_id UUID;
  v_doctor_id UUID;
  v_patient_count INT;
  v_doctor_count INT;
BEGIN
  SELECT COUNT(*) INTO v_patient_count FROM public.patients;
  SELECT COUNT(*)
  INTO v_doctor_count
  FROM public.user_roles ur
  WHERE ur.role = 'doctor';
  
  IF v_patient_count = 0 THEN
    RAISE NOTICE 'ERROR: No patients in database';
    RETURN;
  END IF;
  
  IF v_doctor_count = 0 THEN
    RAISE NOTICE 'ERROR: No doctors with doctor role in database';
    RETURN;
  END IF;
  
  SELECT id INTO v_patient_id FROM public.patients LIMIT 1;
  SELECT ur.user_id INTO v_doctor_id
  FROM public.user_roles ur
  WHERE ur.role = 'doctor'
  LIMIT 1;
  
  RAISE NOTICE 'Testing INSERT with patient: % and doctor: %', v_patient_id, v_doctor_id;
  
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
      '14:00',
      'DIAGNOSTIC_TEST',
      'scheduled'
    );
    
    DELETE FROM public.appointments
    WHERE reason = 'DIAGNOSTIC_TEST';
    
    RAISE NOTICE 'SUCCESS: Appointment creation works with status scheduled';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAILED: %', SQLERRM;
  END;
END $$;
