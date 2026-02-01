-- Fix the appointments table to reference auth.users directly instead of public.users
-- This removes the need for the public.users mirror table

-- Step 1: Drop the old foreign key constraint on appointments
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;

-- Step 2: Add the new foreign key constraint to auth.users
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Step 3: Drop the public.users table if it exists (we don't need it anymore)
DROP TABLE IF EXISTS public.users CASCADE;

-- Note: The doctor_id in appointments will now correctly reference auth.users
-- and we don't need to maintain a separate public.users table
