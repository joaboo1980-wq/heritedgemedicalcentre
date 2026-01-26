-- Update delete policy for patients to allow admins to delete
DROP POLICY IF EXISTS "Admins can delete patients" ON public.patients;

CREATE POLICY "Admins can delete patients"
ON public.patients
FOR DELETE
TO authenticated
USING (
  -- Allow if user is admin
  public.has_role(auth.uid(), 'admin')
  OR
  -- Allow if user created the patient
  created_by = auth.uid()
);

-- Also add update policy to allow editing
DROP POLICY IF EXISTS "Staff can update patients" ON public.patients;

CREATE POLICY "Staff can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
