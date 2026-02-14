-- Create medication_administration_log table for audit trail
CREATE TABLE IF NOT EXISTS public.medication_administration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_item_id UUID NOT NULL REFERENCES public.prescription_items(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  administered_by_id UUID NOT NULL REFERENCES auth.users(id),
  administered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  dosage_given VARCHAR(100),
  route VARCHAR(50),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'administered' CHECK (status IN ('administered', 'skipped', 'refused', 'delayed')),
  reason_if_skipped TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create scheduled_doses table to track when each dose is due
CREATE TABLE IF NOT EXISTS public.scheduled_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_item_id UUID NOT NULL REFERENCES public.prescription_items(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  route VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'due', 'administered', 'skipped', 'cancelled')),
  administered_at TIMESTAMP WITH TIME ZONE,
  administered_by_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medication_admin_log_patient_id ON public.medication_administration_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_admin_log_administered_by ON public.medication_administration_log(administered_by_id);
CREATE INDEX IF NOT EXISTS idx_medication_admin_log_created_at ON public.medication_administration_log(created_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_patient_id ON public.scheduled_doses(patient_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_status ON public.scheduled_doses(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_scheduled_time ON public.scheduled_doses(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_prescription_item ON public.scheduled_doses(prescription_item_id);

-- Enable RLS
ALTER TABLE public.medication_administration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_doses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medication_administration_log

-- Admins can view all administration logs
DROP POLICY IF EXISTS "admins_view_all_admin_logs" ON public.medication_administration_log;
CREATE POLICY "admins_view_all_admin_logs" ON public.medication_administration_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Nurses can view logs for their administered medications and patients
DROP POLICY IF EXISTS "nurses_view_own_admin_logs" ON public.medication_administration_log;
CREATE POLICY "nurses_view_own_admin_logs" ON public.medication_administration_log
  FOR SELECT USING (
    administered_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Nurses can insert their own administration records
DROP POLICY IF EXISTS "nurses_insert_admin_logs" ON public.medication_administration_log;
CREATE POLICY "nurses_insert_admin_logs" ON public.medication_administration_log
  FOR INSERT WITH CHECK (
    administered_by_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'nurse'
    )
  );

-- RLS Policies for scheduled_doses

-- Admins can view all scheduled doses
DROP POLICY IF EXISTS "admins_view_all_doses" ON public.scheduled_doses;
CREATE POLICY "admins_view_all_doses" ON public.scheduled_doses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Nurses can view scheduled doses for their assigned patients
DROP POLICY IF EXISTS "nurses_view_assigned_doses" ON public.scheduled_doses;
CREATE POLICY "nurses_view_assigned_doses" ON public.scheduled_doses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patient_assignments pa
      WHERE pa.patient_id = patient_id
      AND pa.nurse_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Nurses can update doses they're administering
DROP POLICY IF EXISTS "nurses_update_doses" ON public.scheduled_doses;
CREATE POLICY "nurses_update_doses" ON public.scheduled_doses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.patient_assignments pa
      WHERE pa.patient_id = patient_id
      AND pa.nurse_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patient_assignments pa
      WHERE pa.patient_id = patient_id
      AND pa.nurse_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to generate scheduled doses from prescriptions
CREATE OR REPLACE FUNCTION public.generate_scheduled_doses_for_prescription(
  p_prescription_id UUID,
  p_prescription_item_id UUID,
  p_patient_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS void AS $$
DECLARE
  v_item RECORD;
  v_frequency_times TEXT[] := ARRAY['06:00', '12:00', '18:00', '22:00'];
  v_current_time TIMESTAMP WITH TIME ZONE;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_times_per_day INTEGER := 1;
  i INTEGER;
  j INTEGER;
BEGIN
  -- Get the prescription item details
  SELECT * INTO v_item FROM public.prescription_items WHERE id = p_prescription_item_id;
  
  IF v_item IS NULL THEN
    RETURN;
  END IF;

  v_end_time := p_start_date + (p_days_ahead || ' days')::INTERVAL;
  v_current_time := DATE_TRUNC('day', p_start_date);

  -- Parse frequency to determine times per day
  IF v_item.frequency ILIKE '%once%' OR v_item.frequency ILIKE '%daily%' OR v_item.frequency ILIKE '%OD%' THEN
    v_times_per_day := 1;
  ELSIF v_item.frequency ILIKE '%twice%' OR v_item.frequency ILIKE '%BD%' THEN
    v_times_per_day := 2;
  ELSIF v_item.frequency ILIKE '%three%' OR v_item.frequency ILIKE '%TDS%' THEN
    v_times_per_day := 3;
  ELSIF v_item.frequency ILIKE '%four%' OR v_item.frequency ILIKE '%QID%' THEN
    v_times_per_day := 4;
  ELSIF v_item.frequency ILIKE '%every 6%' THEN
    v_times_per_day := 4;
  ELSIF v_item.frequency ILIKE '%every 8%' THEN
    v_times_per_day := 3;
  ELSIF v_item.frequency ILIKE '%every 12%' THEN
    v_times_per_day := 2;
  ELSIF v_item.frequency ILIKE '%as needed%' OR v_item.frequency ILIKE '%PRN%' THEN
    v_times_per_day := 0; -- Will be recorded manually
    RETURN;
  END IF;

  -- Generate scheduled doses
  WHILE v_current_time < v_end_time LOOP
    FOR j IN 1..v_times_per_day LOOP
      INSERT INTO public.scheduled_doses (
        prescription_item_id,
        prescription_id,
        patient_id,
        scheduled_time,
        dosage,
        frequency,
        route,
        status
      ) VALUES (
        p_prescription_item_id,
        p_prescription_id,
        p_patient_id,
        v_current_time + (v_frequency_times[j]::TIME),
        v_item.dosage,
        v_item.frequency,
        'oral', -- Default, can be updated
        CASE 
          WHEN v_current_time + (v_frequency_times[j]::TIME) < now() THEN 'administered'
          WHEN v_current_time + (v_frequency_times[j]::TIME) < now() + '1 hour'::INTERVAL THEN 'due'
          ELSE 'pending'
        END
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    v_current_time := v_current_time + '1 day'::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically generate scheduled doses when prescription status changes
CREATE OR REPLACE FUNCTION public.auto_generate_doses_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_item_id UUID;
BEGIN
  -- When prescription is marked as 'active' or 'dispensed', generate doses
  IF (NEW.status = 'dispensed' OR NEW.status = 'pending') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    -- Generate doses for each prescription item
    FOR v_item_id IN
      SELECT id FROM public.prescription_items 
      WHERE prescription_id = NEW.id
    LOOP
      PERFORM public.generate_scheduled_doses_for_prescription(
        NEW.id,
        v_item_id,
        NEW.patient_id,
        now(),
        30
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prescription_auto_generate_doses ON public.prescriptions;
CREATE TRIGGER prescription_auto_generate_doses
  AFTER INSERT OR UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_doses_trigger();

-- Create a function to record medication administration and create audit log
CREATE OR REPLACE FUNCTION public.record_medication_administration(
  p_scheduled_dose_id UUID,
  p_prescribed_by_id UUID,
  p_dosage_given VARCHAR,
  p_route VARCHAR,
  p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
  v_dose RECORD;
  v_log_id UUID;
BEGIN
  -- Get the scheduled dose details
  SELECT * INTO v_dose FROM public.scheduled_doses WHERE id = p_scheduled_dose_id;
  
  IF v_dose IS NULL THEN
    RAISE EXCEPTION 'Scheduled dose not found';
  END IF;

  -- Create audit log entry
  INSERT INTO public.medication_administration_log (
    prescription_item_id,
    patient_id,
    administered_by_id,
    dosage_given,
    route,
    notes,
    status
  ) VALUES (
    v_dose.prescription_item_id,
    v_dose.patient_id,
    p_prescribed_by_id,
    p_dosage_given,
    p_route,
    p_notes,
    'administered'
  ) RETURNING id INTO v_log_id;

  -- Update the scheduled dose
  UPDATE public.scheduled_doses
  SET 
    status = 'administered',
    administered_at = now(),
    administered_by_id = p_prescribed_by_id,
    updated_at = now()
  WHERE id = p_scheduled_dose_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to mark doses as due based on current time
CREATE OR REPLACE FUNCTION public.update_due_doses()
RETURNS void AS $$
BEGIN
  UPDATE public.scheduled_doses
  SET status = 'due'
  WHERE status = 'pending'
    AND scheduled_time <= now()
    AND scheduled_time > now() - '1 hour'::INTERVAL
    AND prescription_id IN (
      SELECT id FROM public.prescriptions 
      WHERE status IN ('dispensed', 'pending')
    );
END;
$$ LANGUAGE plpgsql;
