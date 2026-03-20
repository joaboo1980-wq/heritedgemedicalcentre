-- Add reassignment tracking columns to patient_assignments table
ALTER TABLE patient_assignments
ADD COLUMN IF NOT EXISTS reassignment_reason TEXT,
ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMP WITH TIME ZONE;

-- Add index for reassigned_at for tracking reassignment history
CREATE INDEX IF NOT EXISTS idx_patient_assignments_reassigned_at 
ON patient_assignments(reassigned_at DESC);
