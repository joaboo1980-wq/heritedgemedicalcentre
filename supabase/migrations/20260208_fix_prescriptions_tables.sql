-- Migration: Fix Prescriptions Tables
-- Description: Ensure prescriptions and prescription_items tables have correct structure and foreign keys
-- Date: 2026-02-08

-- Check if prescriptions table exists and update it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'prescriptions'
  ) THEN
    -- Drop any existing medicine_id column if it exists (it should not be in prescriptions table)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'medicine_id'
    ) THEN
      ALTER TABLE public.prescriptions DROP COLUMN IF EXISTS medicine_id CASCADE;
    END IF;

    -- Drop foreign key constraint if it exists with wrong reference
    ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_doctor_id_fkey;
    
    -- Add the proper foreign key if doctor_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'doctor_id'
    ) THEN
      ALTER TABLE public.prescriptions 
      ADD CONSTRAINT prescriptions_doctor_id_fkey 
      FOREIGN KEY (doctor_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
    END IF;
  ELSE
    -- Create prescriptions table if it doesn't exist
    CREATE TABLE public.prescriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
      doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Create prescription_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.prescription_items (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON public.prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_medication_id ON public.prescription_items(medication_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctors can create prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Users can update prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Admins can delete prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Users can view prescription items" ON public.prescription_items;
DROP POLICY IF EXISTS "Doctors can create prescription items" ON public.prescription_items;
DROP POLICY IF EXISTS "Users can update prescription items" ON public.prescription_items;

-- RLS Policies for prescriptions table
CREATE POLICY "Users can view prescriptions"
  ON public.prescriptions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Doctors can create prescriptions"
  ON public.prescriptions
  FOR INSERT
  WITH CHECK (
    auth.uid() = doctor_id AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'doctor'
    )
  );

CREATE POLICY "Users can update prescriptions"
  ON public.prescriptions
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    (
      auth.uid() = doctor_id OR
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'doctor')
      )
    )
  );

CREATE POLICY "Admins can delete prescriptions"
  ON public.prescriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for prescription_items table
CREATE POLICY "Users can view prescription items"
  ON public.prescription_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Doctors can create prescription items"
  ON public.prescription_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id AND p.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Users can update prescription items"
  ON public.prescription_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id AND (
        p.doctor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_prescriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_prescription_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS prescriptions_updated_at_trigger ON public.prescriptions;
CREATE TRIGGER prescriptions_updated_at_trigger
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prescriptions_updated_at();

DROP TRIGGER IF EXISTS prescription_items_updated_at_trigger ON public.prescription_items;
CREATE TRIGGER prescription_items_updated_at_trigger
  BEFORE UPDATE ON public.prescription_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prescription_items_updated_at();
