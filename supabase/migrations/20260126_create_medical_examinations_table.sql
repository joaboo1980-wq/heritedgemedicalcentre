-- Create update_timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create medical_examinations table for doctor's examination records
CREATE TABLE IF NOT EXISTS public.medical_examinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  examination_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  examined_by UUID REFERENCES auth.users(id),
  
  -- Triage/Vital Signs
  triage_temperature DECIMAL(5,2),
  triage_blood_pressure VARCHAR(20),
  triage_pulse_rate INTEGER,
  triage_respiratory_rate INTEGER,
  triage_oxygen_saturation DECIMAL(5,2),
  triage_weight DECIMAL(6,2),
  triage_height DECIMAL(5,2),
  triage_bmi DECIMAL(5,2),
  triage_notes TEXT,
  
  -- Chief Complaint and HPI
  chief_complaint TEXT NOT NULL,
  history_of_present_illness TEXT,
  
  -- Medical History
  past_medical_history TEXT,
  past_surgical_history TEXT,
  medication_list TEXT,
  allergies TEXT,
  family_history TEXT,
  social_history TEXT,
  
  -- Physical Examination
  general_appearance TEXT,
  heent_examination TEXT,
  cardiovascular_examination TEXT,
  respiratory_examination TEXT,
  abdominal_examination TEXT,
  neurological_examination TEXT,
  musculoskeletal_examination TEXT,
  skin_examination TEXT,
  other_systems TEXT,
  
  -- Assessment and Plan
  assessment_diagnosis TEXT NOT NULL,
  plan_treatment TEXT,
  medications_prescribed TEXT,
  follow_up_date DATE,
  referrals TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_examined_by FOREIGN KEY (examined_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.medical_examinations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Staff can view all examinations"
ON public.medical_examinations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can create examinations"
ON public.medical_examinations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update examinations"
ON public.medical_examinations
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Admins can delete examinations"
ON public.medical_examinations
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR
  examined_by = auth.uid()
);

-- Create trigger for updated_at
CREATE TRIGGER update_medical_examinations_updated_at
BEFORE UPDATE ON public.medical_examinations
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create index for patient_id
CREATE INDEX idx_medical_examinations_patient_id ON public.medical_examinations(patient_id);
CREATE INDEX idx_medical_examinations_examination_date ON public.medical_examinations(examination_date DESC);
CREATE INDEX idx_medical_examinations_examined_by ON public.medical_examinations(examined_by);
