-- Create triage_queue table for managing patient triage workflow
CREATE TABLE IF NOT EXISTS triage_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  checked_in_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_nurse_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  chief_complaint TEXT,
  status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  queue_position INTEGER,
  checked_in_at TIMESTAMP DEFAULT NOW(),
  triage_started_at TIMESTAMP,
  triage_completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE triage_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view triage queue
CREATE POLICY "View triage queue" ON triage_queue
  FOR SELECT USING (true);

-- Receptionist and nurses can add to queue
CREATE POLICY "Add to triage queue" ON triage_queue
  FOR INSERT WITH CHECK (
    auth.uid() = checked_in_by OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('receptionist', 'nurse', 'admin')
    )
  );

-- Update triage queue (for nurses to claim/update)
CREATE POLICY "Update triage queue" ON triage_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('nurse', 'admin')
    )
  );

-- Indexes for performance
CREATE INDEX idx_triage_queue_patient_id ON triage_queue(patient_id);
CREATE INDEX idx_triage_queue_status ON triage_queue(status);
CREATE INDEX idx_triage_queue_assigned_nurse_id ON triage_queue(assigned_nurse_id);
CREATE INDEX idx_triage_queue_priority ON triage_queue(priority);
CREATE INDEX idx_triage_queue_checked_in_at ON triage_queue(checked_in_at DESC);

-- Trigger to update queue_position automatically
CREATE OR REPLACE FUNCTION update_triage_queue_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'waiting' THEN
    NEW.queue_position := (
      SELECT COUNT(*) + 1 FROM triage_queue
      WHERE status = 'waiting' AND checked_in_at < NEW.checked_in_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_triage_queue_position
BEFORE INSERT ON triage_queue
FOR EACH ROW
EXECUTE FUNCTION update_triage_queue_position();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_triage_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_triage_queue_timestamp
BEFORE UPDATE ON triage_queue
FOR EACH ROW
EXECUTE FUNCTION update_triage_queue_timestamp();
