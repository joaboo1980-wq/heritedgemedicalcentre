-- CLEAN FIX: Drop ALL existing appointments policies and recreate them cleanly
-- This ensures no conflicts or duplicates

-- Step 1: Drop ALL existing policies on appointments (regardless of name)
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- Loop through all policies on the appointments table and drop them
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'appointments'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.appointments';
    END LOOP;
END $$;

-- Step 2: Recreate all appointments policies from scratch

-- Everyone can SELECT (view) all appointments
CREATE POLICY "All staff can view appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);

-- Everyone can INSERT (create) new appointments
CREATE POLICY "All staff can create appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Everyone can UPDATE appointments
CREATE POLICY "All staff can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only admins and receptionists can DELETE appointments
CREATE POLICY "Admins and receptionists can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'receptionist')
);
