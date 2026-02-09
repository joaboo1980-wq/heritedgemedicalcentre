-- Direct Fix for Prescriptions Table
-- This migration removes the medicine_id column from prescriptions table
-- The medicine_id should only exist in prescription_items table

-- Step 0: Drop any triggers that might auto-populate columns
DROP TRIGGER IF EXISTS prescriptions_auto_prescribed_date_trigger ON public.prescriptions;
DROP TRIGGER IF EXISTS prescriptions_auto_prescribed_by_trigger ON public.prescriptions;
DROP TRIGGER IF EXISTS prescriptions_set_prescribed_date_trigger ON public.prescriptions;
DROP TRIGGER IF EXISTS prescriptions_set_prescribed_by_trigger ON public.prescriptions;

-- Step 1: Check and drop incorrect columns from prescriptions table
DO $$
BEGIN
  -- Drop medicine_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'prescriptions' 
      AND column_name = 'medicine_id'
  ) THEN
    ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_medicine_id_fkey CASCADE;
    ALTER TABLE public.prescriptions DROP COLUMN medicine_id CASCADE;
    RAISE NOTICE 'Dropped medicine_id column';
  END IF;
  
  -- Drop dosage if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'prescriptions' 
      AND column_name = 'dosage'
  ) THEN
    ALTER TABLE public.prescriptions DROP COLUMN dosage CASCADE;
    RAISE NOTICE 'Dropped dosage column';
  END IF;
  
  -- Drop frequency if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'prescriptions' 
      AND column_name = 'frequency'
  ) THEN
    ALTER TABLE public.prescriptions DROP COLUMN frequency CASCADE;
    RAISE NOTICE 'Dropped frequency column';
  END IF;
  
  -- Drop duration if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'prescriptions' 
      AND column_name = 'duration'
  ) THEN
    ALTER TABLE public.prescriptions DROP COLUMN duration CASCADE;
    RAISE NOTICE 'Dropped duration column';
  END IF;
  
  -- Drop prescribed_date if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'prescriptions' 
      AND column_name = 'prescribed_date'
  ) THEN
    ALTER TABLE public.prescriptions DROP COLUMN prescribed_date CASCADE;
    RAISE NOTICE 'Dropped prescribed_date column';
  END IF;
  
  -- Drop prescribed_by if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'prescriptions' 
      AND column_name = 'prescribed_by'
  ) THEN
    ALTER TABLE public.prescriptions DROP COLUMN prescribed_by CASCADE;
    RAISE NOTICE 'Dropped prescribed_by column';
  END IF;
END $$;

-- Step 2: Ensure prescriptions table has correct structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'prescriptions'
  ) THEN
    CREATE TABLE public.prescriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
      doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    RAISE NOTICE 'Created prescriptions table';
  ELSE
    -- Table exists, ensure doctor_id foreign key is correct
    ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_doctor_id_fkey;
    ALTER TABLE public.prescriptions 
    ADD CONSTRAINT prescriptions_doctor_id_fkey 
    FOREIGN KEY (doctor_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
    RAISE NOTICE 'Updated prescriptions table constraints';
  END IF;
END $$;

-- Step 3: Fix prescription_items table structure
DO $$
BEGIN
  -- Drop existing prescription_items table to rebuild it correctly
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'prescription_items'
  ) THEN
    DROP TABLE IF EXISTS public.prescription_items CASCADE;
    RAISE NOTICE 'Dropped existing prescription_items table';
  END IF;
  
  -- Create prescription_items with correct structure (no NOT NULL constraints on optional fields)
  CREATE TABLE public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE RESTRICT,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  RAISE NOTICE 'Created prescription_items table with correct structure';
END $$;

-- Step 4: Verify indexes exist
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON public.prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_medication_id ON public.prescription_items(medication_id);

-- Step 5: Verify RLS is enabled
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- Step 5a: Create RLS policies for prescriptions table
DROP POLICY IF EXISTS "prescriptions_select_policy" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_insert_policy" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_update_policy" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_delete_policy" ON public.prescriptions;

CREATE POLICY "prescriptions_select_policy" ON public.prescriptions
  FOR SELECT USING (true);

CREATE POLICY "prescriptions_insert_policy" ON public.prescriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "prescriptions_update_policy" ON public.prescriptions
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "prescriptions_delete_policy" ON public.prescriptions
  FOR DELETE USING (true);

-- Step 5b: Create RLS policies for prescription_items table
DROP POLICY IF EXISTS "prescription_items_select_policy" ON public.prescription_items;
DROP POLICY IF EXISTS "prescription_items_insert_policy" ON public.prescription_items;
DROP POLICY IF EXISTS "prescription_items_update_policy" ON public.prescription_items;
DROP POLICY IF EXISTS "prescription_items_delete_policy" ON public.prescription_items;

CREATE POLICY "prescription_items_select_policy" ON public.prescription_items
  FOR SELECT USING (true);

CREATE POLICY "prescription_items_insert_policy" ON public.prescription_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "prescription_items_update_policy" ON public.prescription_items
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "prescription_items_delete_policy" ON public.prescription_items
  FOR DELETE USING (true);

-- Step 6: Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.update_prescriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prescriptions_updated_at_trigger ON public.prescriptions;
CREATE TRIGGER prescriptions_updated_at_trigger
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prescriptions_updated_at();

-- Final verification message
DO $$
BEGIN
  RAISE NOTICE 'Prescriptions table fix migration completed successfully';
END $$;
