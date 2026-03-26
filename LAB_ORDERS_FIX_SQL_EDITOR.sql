-- Direct SQL fix for lab_orders sample rejection
-- Execute this in the Supabase SQL editor
-- Issue: The lab_orders table CHECK constraint doesn't include 'rejected' or 'in_progress' statuses

BEGIN;

-- Step 1: Fix the CHECK constraint to include 'rejected' and 'in_progress' statuses
ALTER TABLE public.lab_orders 
DROP CONSTRAINT IF EXISTS lab_orders_status_check;

ALTER TABLE public.lab_orders
ADD CONSTRAINT lab_orders_status_check 
CHECK (status IN ('pending', 'sample_collected', 'in_progress', 'processing', 'completed', 'rejected', 'cancelled'));

-- Step 2: Also fix the RLS UPDATE policy to include all relevant roles
DROP POLICY IF EXISTS "Lab staff can update lab orders" ON public.lab_orders;
DROP POLICY IF EXISTS "authorized_staff_can_update_lab_orders" ON public.lab_orders;

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

COMMIT;
