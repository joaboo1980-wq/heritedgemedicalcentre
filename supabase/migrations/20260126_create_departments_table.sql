-- Create departments table with standard departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard departments
INSERT INTO public.departments (name, description) VALUES
  ('General Medicine', 'General medical care and treatment'),
  ('Cardiology', 'Heart and cardiovascular system treatment'),
  ('Pediatrics', 'Medical care for children and infants'),
  ('Neurology', 'Nervous system disorders treatment'),
  ('Administration', 'Administrative and management staff'),
  ('Laboratory', 'Laboratory testing and diagnostics')
ON CONFLICT (name) DO NOTHING;

-- Add department_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Migrate existing department text to department_id
UPDATE public.profiles 
SET department_id = d.id 
FROM public.departments d 
WHERE profiles.department = d.name AND profiles.department_id IS NULL;

-- Add department_id column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Enable RLS for departments table
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments - everyone can read
CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

-- Create index for department lookups
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_department_id ON public.appointments(department_id);
