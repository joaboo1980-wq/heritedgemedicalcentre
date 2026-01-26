-- Add missing columns to appointments table if not present
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS appointment_time TEXT NOT NULL DEFAULT '09:00';
