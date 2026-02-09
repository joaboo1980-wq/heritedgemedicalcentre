-- Create vitals table for recording patient vital signs
CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  temperature NUMERIC(5, 2), -- in Celsius
  blood_pressure_systolic INTEGER, -- in mmHg
  blood_pressure_diastolic INTEGER, -- in mmHg
  heart_rate INTEGER, -- in beats per minute
  oxygen_saturation NUMERIC(5, 2), -- percentage (0-100)
  respiratory_rate INTEGER, -- breaths per minute
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create care plans table for documenting patient care goals and interventions
CREATE TABLE IF NOT EXISTS care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_goals TEXT NOT NULL,
  nursing_interventions TEXT NOT NULL,
  evaluation_criteria TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, archived
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX idx_vitals_recorded_at ON vitals(recorded_at DESC);
CREATE INDEX idx_care_plans_patient_id ON care_plans(patient_id);
CREATE INDEX idx_care_plans_status ON care_plans(status);

-- Enable RLS (Row Level Security)
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vitals table
CREATE POLICY "Users can view vitals for their assigned patients" ON vitals
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Nurses can insert vitals" ON vitals
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Nurses can update vitals" ON vitals
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Nurses can delete vitals" ON vitals
  FOR DELETE USING (
    auth.uid() IS NOT NULL
  );

-- Create RLS policies for care_plans table
CREATE POLICY "Users can view care plans for their assigned patients" ON care_plans
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Nurses can insert care plans" ON care_plans
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Nurses can update care plans" ON care_plans
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Nurses can delete care plans" ON care_plans
  FOR DELETE USING (
    auth.uid() IS NOT NULL
  );
