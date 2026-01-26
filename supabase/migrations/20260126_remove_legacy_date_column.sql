-- Remove legacy 'date' column from appointments table if it exists
ALTER TABLE public.appointments
DROP COLUMN IF EXISTS date;
