-- Add missing department column to appointments table if not present
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS department TEXT;
