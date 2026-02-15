-- Verify and Fix Appointments Table Setup
-- This script checks the current state and ensures everything is correct

BEGIN;

-- Step 1: Check current appointments table
RAISE NOTICE '==== CHECKING CURRENT APPOINTMENTS TABLE ====';
SELECT 
  'appointment schema' as check_type,
  table_name,
  'exists' as status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'appointments';

-- Step 2: Get all current triggers
RAISE NOTICE '==== CURRENT TRIGGERS ON APPOINTMENTS ====';
SELECT 
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'appointments';

-- Step 3: Get all current constraints
RAISE NOTICE '==== CURRENT CONSTRAINTS ON APPOINTMENTS ====';
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND table_name = 'appointments';

-- Step 4: Check the STATUS column and constraint details
RAISE NOTICE '==== APPOINTMENTS STATUS COLUMN DETAILS ====';
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'appointments' 
  AND column_name = 'status';

-- Step 5: Check the actual CHECK constraint definition
RAISE NOTICE '==== STATUS CHECK CONSTRAINT DEFINITION ====';
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public' 
  AND constraint_name LIKE '%appointments%status%';

-- Step 6: List first 5 appointments to see valid status values in use
RAISE NOTICE '==== SAMPLE APPOINTMENTS IN DATABASE ====';
SELECT 
  id,
  patient_id,
  doctor_id,
  status,
  created_at
FROM public.appointments
ORDER BY created_at DESC
LIMIT 5;

-- Step 7: Verify all functions exist
RAISE NOTICE '==== CHECKING APPOINTMENT VALIDATION FUNCTIONS ====';
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%appointment%doctor%';

COMMIT;
