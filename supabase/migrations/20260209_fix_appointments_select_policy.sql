-- Ensure appointments table has a proper SELECT policy for all authenticated users
-- This migration fixes the issue where receptionists can't see appointments

-- First, check and drop conflicting policies if they exist
DROP POLICY IF EXISTS "Users can view appointments" ON public.appointments;

-- Create a clear SELECT policy allowing all authenticated users to view appointments
CREATE POLICY "Authenticated users can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);
