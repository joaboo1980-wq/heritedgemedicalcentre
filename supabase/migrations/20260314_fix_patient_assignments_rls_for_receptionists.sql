-- Fix patient_assignments RLS to allow receptionists to create/update assignments during check-in
-- Issue: Receptionists were getting RLS errors when trying to assign patients to nurses

BEGIN;

-- Update INSERT policy to allow receptionists
DROP POLICY IF EXISTS "charge_nurses_create_assignments" ON public.patient_assignments;
CREATE POLICY "charge_nurses_create_assignments" ON public.patient_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor', 'receptionist')
    )
  );

-- Update UPDATE policy to allow receptionists
DROP POLICY IF EXISTS "charge_nurses_update_assignments" ON public.patient_assignments;
CREATE POLICY "charge_nurses_update_assignments" ON public.patient_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor', 'receptionist')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor', 'receptionist')
    )
  );

COMMIT;
