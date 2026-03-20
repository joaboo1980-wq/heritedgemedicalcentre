-- Allow nurses to create patient assignments when claiming from triage queue
-- Issue: Nurses couldn't claim patients from queue due to RLS policy

BEGIN;

-- Update INSERT policy to include nurses
DROP POLICY IF EXISTS "charge_nurses_create_assignments" ON public.patient_assignments;
CREATE POLICY "charge_nurses_create_assignments" ON public.patient_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor', 'receptionist', 'nurse')
    )
  );

-- Update UPDATE policy to include nurses
DROP POLICY IF EXISTS "charge_nurses_update_assignments" ON public.patient_assignments;
CREATE POLICY "charge_nurses_update_assignments" ON public.patient_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor', 'receptionist', 'nurse')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor', 'receptionist', 'nurse')
    )
  );

-- Also add a SELECT policy to allow nurses to read assignments
DROP POLICY IF EXISTS "users_read_own_assignments" ON public.patient_assignments;
CREATE POLICY "users_read_own_assignments" ON public.patient_assignments
  FOR SELECT USING (
    auth.uid() = nurse_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor', 'receptionist')
    )
  );

COMMIT;
