-- Create patients table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', NULL)),
    allergies TEXT[],
    medical_notes TEXT,
    insurance_provider TEXT,
    insurance_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create appointments table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES auth.users(id) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    reason TEXT,
    notes TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patients
CREATE POLICY "Staff can view all patients"
ON public.patients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can create patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Admins can delete patients"
ON public.patients
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for appointments
CREATE POLICY "Staff can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can create appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Staff can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'receptionist')
);

-- Create triggers for updated_at
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate patient number
CREATE OR REPLACE FUNCTION public.generate_patient_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    seq_num INTEGER;
BEGIN
    year_prefix := 'P' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 6) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM public.patients
    WHERE patient_number LIKE year_prefix || '%';
    new_number := year_prefix || '-' || LPAD(seq_num::TEXT, 5, '0');
    NEW.patient_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_patient_number_trigger
BEFORE INSERT ON public.patients
FOR EACH ROW
WHEN (NEW.patient_number IS NULL OR NEW.patient_number = '')
EXECUTE FUNCTION public.generate_patient_number();