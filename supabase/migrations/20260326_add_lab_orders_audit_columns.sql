-- Add audit and quality control columns to lab_orders table
-- Supports ISO 15189 compliance with verification and rejection reason tracking

BEGIN;

-- Add columns for rejection reason and audit trail
ALTER TABLE public.lab_orders
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups by rejection status
CREATE INDEX IF NOT EXISTS idx_lab_orders_rejection_reason 
ON public.lab_orders(rejection_reason) 
WHERE status = 'rejected';

CREATE INDEX IF NOT EXISTS idx_lab_orders_verified_by 
ON public.lab_orders(verified_by) 
WHERE status = 'verified';

COMMIT;
