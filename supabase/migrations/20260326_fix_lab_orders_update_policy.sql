-- Fix UPDATE policy for lab_orders table
-- Issue: Sample rejection and other updates were blocked by incomplete RLS policy
-- Problem: UPDATE policy was missing WITH CHECK clause which is required by Supabase

BEGIN;

-- Drop the old incomplete update policy
DROP POLICY IF EXISTS "Lab staff can update lab orders" ON public.lab_orders;

-- Create a new UPDATE policy with both USING and WITH CHECK clauses
-- Allow admins, lab_technicians, doctors, and nurses to update lab orders
CREATE POLICY "authorized_staff_can_update_lab_orders"
ON public.lab_orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'lab_technician')
  OR public.has_role(auth.uid(), 'doctor')
  OR public.has_role(auth.uid(), 'nurse')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'lab_technician')
  OR public.has_role(auth.uid(), 'doctor')
  OR public.has_role(auth.uid(), 'nurse')
);

-- Grant necessary UPDATE permissions
GRANT UPDATE ON public.lab_orders TO authenticated;

COMMIT;
