-- Comprehensive fix for nurse assignment RLS policies
-- Issue: Nurses still can't claim patients due to RLS policies

BEGIN;

-- Drop all existing policies on patient_assignments for a clean slate
DROP POLICY IF EXISTS "charge_nurses_create_assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "charge_nurses_update_assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "users_read_own_assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.patient_assignments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.patient_assignments;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.patient_assignments;

-- CREATE policy - Allow admins, doctors, receptionists, and nurses to create assignments
CREATE POLICY "allow_create_assignments" ON public.patient_assignments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'doctor', 'receptionist', 'nurse')
    )
  );

-- UPDATE policy - Allow admins, doctors, receptionists, and nurses to update assignments
CREATE POLICY "allow_update_assignments" ON public.patient_assignments
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'doctor', 'receptionist', 'nurse')
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'doctor', 'receptionist', 'nurse')
    )
  );

-- SELECT policy - Allow nurses to read their own assignments, and admins/doctors/receptionists to read all
CREATE POLICY "allow_read_assignments" ON public.patient_assignments
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      auth.uid() = nurse_id
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'doctor', 'receptionist', 'nurse')
      )
    )
  );

-- DELETE policy - Allow admins and receptionists to delete assignments
CREATE POLICY "allow_delete_assignments" ON public.patient_assignments
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'receptionist')
    )
  );

COMMIT;
