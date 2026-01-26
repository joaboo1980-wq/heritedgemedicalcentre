-- Add missing duration_minutes column to appointments table if not present
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30;
