-- Add the missing columns to lab_tests table to match the data structure
ALTER TABLE public.lab_tests 
ADD COLUMN IF NOT EXISTS test_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS test_name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS normal_range TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT;
