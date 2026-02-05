-- Drop the old trigger and function that was trying to generate prescription_number (which doesn't exist in the current schema)
DROP TRIGGER IF EXISTS generate_prescription_number_trigger ON public.prescriptions;
DROP FUNCTION IF EXISTS public.generate_prescription_number();

-- Create indexes for better query performance on prescriptions table
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medicine_id ON public.prescriptions(medicine_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_prescribed_by ON public.prescriptions(prescribed_by);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);


