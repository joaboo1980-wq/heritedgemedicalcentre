-- Drop overly permissive policies
DROP POLICY IF EXISTS "Staff can create patients" ON public.patients;
DROP POLICY IF EXISTS "Staff can update patients" ON public.patients;
DROP POLICY IF EXISTS "Staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;

-- Create more restrictive policies using role checks

-- Patients: Only specific roles can create/update
CREATE POLICY "Authorized staff can create patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'nurse') OR 
    public.has_role(auth.uid(), 'receptionist')
);

CREATE POLICY "Authorized staff can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'nurse') OR 
    public.has_role(auth.uid(), 'receptionist')
);

-- Appointments: Only specific roles can create/update
CREATE POLICY "Authorized staff can create appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'nurse') OR 
    public.has_role(auth.uid(), 'receptionist')
);

CREATE POLICY "Authorized staff can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'nurse') OR 
    public.has_role(auth.uid(), 'receptionist')
);