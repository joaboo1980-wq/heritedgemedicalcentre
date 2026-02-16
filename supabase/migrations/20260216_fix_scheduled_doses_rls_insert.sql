-- Fix for scheduled_doses RLS: Add missing INSERT policies
-- Issue: Medication dispensing fails because RLS policy blocks INSERT operations
-- Solution: Add INSERT policies for pharmacists, nurses, and admins

-- Allow admins to insert scheduled doses (via trigger when prescription is dispensed)
DROP POLICY IF EXISTS "admins_insert_doses" ON public.scheduled_doses;
CREATE POLICY "admins_insert_doses" ON public.scheduled_doses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow pharmacists to insert scheduled doses (via trigger when they dispense medication)
DROP POLICY IF EXISTS "pharmacists_insert_doses" ON public.scheduled_doses;
CREATE POLICY "pharmacists_insert_doses" ON public.scheduled_doses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'pharmacist'
    )
  );

-- Allow nurses to insert scheduled doses if needed
DROP POLICY IF EXISTS "nurses_insert_doses" ON public.scheduled_doses;
CREATE POLICY "nurses_insert_doses" ON public.scheduled_doses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'nurse'
    )
  );
