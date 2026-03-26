-- Add qualifications fields to profiles table for staff credentials
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS academic_qualifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS professional_qualifications JSONB DEFAULT '[]'::jsonb;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_academic_qualifications ON public.profiles USING GIN (academic_qualifications);
CREATE INDEX IF NOT EXISTS idx_profiles_professional_qualifications ON public.profiles USING GIN (professional_qualifications);

-- Add comment explaining the structure
COMMENT ON COLUMN public.profiles.academic_qualifications IS 'Array of objects with fields: {degree, institution, year, field_of_study}';
COMMENT ON COLUMN public.profiles.professional_qualifications IS 'Array of objects with fields: {title, organization, date_obtained, license_number, expiry_date}';
