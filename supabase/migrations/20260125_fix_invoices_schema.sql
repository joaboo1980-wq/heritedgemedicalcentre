-- Ensure amount_paid column exists on invoices table
-- This fixes schema cache issues when the column is missing

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0;

-- Ensure all required columns exist with proper defaults
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.amount_paid IS 'Total amount paid towards this invoice';
