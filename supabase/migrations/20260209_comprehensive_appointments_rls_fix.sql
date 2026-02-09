-- COMPREHENSIVE FIX: Ensure all authenticated users can view and manage appointments
-- This fixes the issue where NO roles can see appointments

-- Step 1: Drop all conflicting appointment policies
DROP POLICY IF EXISTS "Staff can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authorized staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authorized staff can update appointments" ON public.appointments;

-- Step 2: Create clear, working policies for all authenticated users
-- IMPORTANT: These policies use simple 'true' conditions to allow access to all authenticated users

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

-- Step 3: Verify the policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;
