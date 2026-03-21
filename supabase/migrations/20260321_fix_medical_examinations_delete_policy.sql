-- Fix DELETE policy for medical_examinations table
-- Issue: Delete operations were blocked by old restrictive policy

BEGIN;

-- Drop the old restrictive delete policy if it exists
DROP POLICY IF EXISTS "Admins can delete examinations" ON public.medical_examinations;
DROP POLICY IF EXISTS "Staff can delete examinations" ON public.medical_examinations;

-- Create a new, permissive DELETE policy for authenticated users
CREATE POLICY "authenticated_can_delete_examinations"
ON public.medical_examinations
FOR DELETE
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT DELETE ON public.medical_examinations TO authenticated;

COMMIT;
