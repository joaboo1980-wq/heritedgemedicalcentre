-- This creates a proper function to validate doctor exists before insert
-- Add this trigger to prevent FK constraint errors with better messaging

CREATE OR REPLACE FUNCTION public.check_doctor_exists_before_appointment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the doctor_id exists as an actual auth user
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = NEW.doctor_id 
    AND ur.role = 'doctor'
  ) THEN
    RAISE EXCEPTION 'Doctor not found or does not have doctor role. User ID: %', NEW.doctor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_doctor_before_appointment ON public.appointments;

-- Create the new trigger
CREATE TRIGGER check_doctor_before_appointment
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.check_doctor_exists_before_appointment();
