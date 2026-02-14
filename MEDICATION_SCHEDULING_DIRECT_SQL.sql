-- Medication Scheduling & Audit Trail - Direct Supabase Execution
-- Paste this entire script into Supabase SQL Editor and execute

-- 1. Create medication_administration_log table
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

-- 2. Create scheduled_doses table
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

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_medication_admin_log_patient_id ON public.medication_administration_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_admin_log_administered_by ON public.medication_administration_log(administered_by_id);
CREATE INDEX IF NOT EXISTS idx_medication_admin_log_created_at ON public.medication_administration_log(created_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_patient_id ON public.scheduled_doses(patient_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_status ON public.scheduled_doses(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_scheduled_time ON public.scheduled_doses(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_prescription_item ON public.scheduled_doses(prescription_item_id);

-- 4. Enable RLS
ALTER TABLE public.medication_administration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_doses ENABLE ROW LEVEL SECURITY;

-- 5. Medication admin log policies
DROP POLICY IF EXISTS "admin_medication_logs_select" ON public.medication_administration_log;
CREATE POLICY "admin_medication_logs_select" ON public.medication_administration_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "nurse_medication_logs_select" ON public.medication_administration_log;
CREATE POLICY "nurse_medication_logs_select" ON public.medication_administration_log
  FOR SELECT USING (administered_by_id = auth.uid());

DROP POLICY IF EXISTS "nurse_medication_logs_insert" ON public.medication_administration_log;
CREATE POLICY "nurse_medication_logs_insert" ON public.medication_administration_log
  FOR INSERT WITH CHECK (administered_by_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'nurse'));

-- 6. Scheduled doses policies
DROP POLICY IF EXISTS "admin_scheduled_doses_select" ON public.scheduled_doses;
CREATE POLICY "admin_scheduled_doses_select" ON public.scheduled_doses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "nurse_scheduled_doses_select" ON public.scheduled_doses;
CREATE POLICY "nurse_scheduled_doses_select" ON public.scheduled_doses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.patient_assignments pa WHERE pa.patient_id = patient_id AND pa.nurse_id = auth.uid()));

DROP POLICY IF EXISTS "nurse_scheduled_doses_update" ON public.scheduled_doses;
CREATE POLICY "nurse_scheduled_doses_update" ON public.scheduled_doses
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.patient_assignments pa WHERE pa.patient_id = patient_id AND pa.nurse_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.patient_assignments pa WHERE pa.patient_id = patient_id AND pa.nurse_id = auth.uid()));

-- 7. Create functions
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
  j INTEGER;
BEGIN
  SELECT * INTO v_item FROM public.prescription_items WHERE id = p_prescription_item_id;
  IF v_item IS NULL THEN RETURN; END IF;

  v_end_time := p_start_date + (p_days_ahead || ' days')::INTERVAL;
  v_current_time := DATE_TRUNC('day', p_start_date);

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
    RETURN;
  END IF;

  WHILE v_current_time < v_end_time LOOP
    FOR j IN 1..v_times_per_day LOOP
      INSERT INTO public.scheduled_doses (
        prescription_item_id, prescription_id, patient_id, scheduled_time,
        dosage, frequency, route, status
      ) VALUES (
        p_prescription_item_id, p_prescription_id, p_patient_id,
        v_current_time + (v_frequency_times[j]::TIME),
        v_item.dosage, v_item.frequency, 'oral',
        CASE WHEN v_current_time + (v_frequency_times[j]::TIME) < now() THEN 'administered'
             WHEN v_current_time + (v_frequency_times[j]::TIME) < now() + '1 hour'::INTERVAL THEN 'due'
             ELSE 'pending' END
      ) ON CONFLICT DO NOTHING;
    END LOOP;
    v_current_time := v_current_time + '1 day'::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.record_medication_administration(
  p_scheduled_dose_id UUID,
  p_nurse_id UUID,
  p_dosage_given VARCHAR,
  p_route VARCHAR,
  p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
  v_dose RECORD;
  v_log_id UUID;
BEGIN
  SELECT * INTO v_dose FROM public.scheduled_doses WHERE id = p_scheduled_dose_id;
  IF v_dose IS NULL THEN RAISE EXCEPTION 'Scheduled dose not found'; END IF;

  INSERT INTO public.medication_administration_log (
    prescription_item_id, patient_id, administered_by_id,
    dosage_given, route, notes, status
  ) VALUES (
    v_dose.prescription_item_id, v_dose.patient_id, p_nurse_id,
    p_dosage_given, p_route, p_notes, 'administered'
  ) RETURNING id INTO v_log_id;

  UPDATE public.scheduled_doses
  SET status = 'administered', administered_at = now(), 
      administered_by_id = p_nurse_id, updated_at = now()
  WHERE id = p_scheduled_dose_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.auto_generate_doses_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_item_id UUID;
BEGIN
  IF (NEW.status = 'dispensed' OR NEW.status = 'pending') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    FOR v_item_id IN SELECT id FROM public.prescription_items WHERE prescription_id = NEW.id LOOP
      PERFORM public.generate_scheduled_doses_for_prescription(NEW.id, v_item_id, NEW.patient_id, now(), 30);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_due_doses()
RETURNS void AS $$
BEGIN
  UPDATE public.scheduled_doses
  SET status = 'due'
  WHERE status = 'pending' AND scheduled_time <= now() AND scheduled_time > now() - '1 hour'::INTERVAL
    AND prescription_id IN (SELECT id FROM public.prescriptions WHERE status IN ('dispensed', 'pending'));
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger
DROP TRIGGER IF EXISTS prescription_auto_generate_doses ON public.prescriptions;
CREATE TRIGGER prescription_auto_generate_doses
  AFTER INSERT OR UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_doses_trigger();
