-- Add a function to validate doctor exists and has doctor role
CREATE OR REPLACE FUNCTION public.validate_doctor_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if doctor_id references a valid user with doctor role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.doctor_id AND role = 'doctor'
  ) THEN
    RAISE EXCEPTION 'Invalid doctor_id: User must have doctor role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate doctor role on insert/update
DROP TRIGGER IF EXISTS validate_appointment_doctor ON public.appointments;
CREATE TRIGGER validate_appointment_doctor
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_doctor_role();
