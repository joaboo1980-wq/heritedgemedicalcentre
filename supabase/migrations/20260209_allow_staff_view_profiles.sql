-- Allow all authenticated users to view profiles (for doctor/staff selection in forms)
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
