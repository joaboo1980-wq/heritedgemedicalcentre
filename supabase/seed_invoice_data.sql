-- SQL Script to insert test invoice data for Billing page testing
-- Run this in your Supabase SQL editor to populate test data

-- First, let's check existing data
-- SELECT COUNT(*) FROM invoices;
-- SELECT COUNT(*) FROM patients;

-- Insert test invoices if you have patients in the system
-- Get a patient ID first and replace 'patient-uuid' with actual UUID

-- Insert test invoice 1 (Paid)
INSERT INTO public.invoices (
  invoice_number,
  patient_id,
  status,
  subtotal,
  tax_amount,
  discount_amount,
  total_amount,
  amount_paid,
  due_date,
  notes,
  created_at
)
SELECT
  'INV-2026-001',
  id,
  'paid',
  150000,
  15000,
  0,
  165000,
  165000,
  '2026-02-15',
  'Consultation and lab tests',
  NOW()
FROM public.patients
LIMIT 1
ON CONFLICT (invoice_number) DO NOTHING;

-- Insert test invoice 2 (Pending)
INSERT INTO public.invoices (
  invoice_number,
  patient_id,
  status,
  subtotal,
  tax_amount,
  discount_amount,
  total_amount,
  amount_paid,
  due_date,
  notes,
  created_at
)
SELECT
  'INV-2026-002',
  id,
  'pending',
  250000,
  25000,
  0,
  275000,
  0,
  '2026-02-20',
  'Surgery and medications',
  NOW()
FROM public.patients
WHERE patient_number != (SELECT patient_number FROM public.patients LIMIT 1)
LIMIT 1
ON CONFLICT (invoice_number) DO NOTHING;

-- Insert test invoice 3 (Partially Paid)
INSERT INTO public.invoices (
  invoice_number,
  patient_id,
  status,
  subtotal,
  tax_amount,
  discount_amount,
  total_amount,
  amount_paid,
  due_date,
  notes,
  created_at
)
SELECT
  'INV-2026-003',
  id,
  'partially_paid',
  180000,
  18000,
  0,
  198000,
  100000,
  '2026-02-10',
  'Multiple services',
  NOW()
FROM public.patients
LIMIT 1 OFFSET 2
ON CONFLICT (invoice_number) DO NOTHING;

-- Insert test invoice 4 (Draft)
INSERT INTO public.invoices (
  invoice_number,
  patient_id,
  status,
  subtotal,
  tax_amount,
  discount_amount,
  total_amount,
  amount_paid,
  due_date,
  notes,
  created_at
)
SELECT
  'INV-2026-004',
  id,
  'draft',
  320000,
  32000,
  0,
  352000,
  0,
  '2026-03-15',
  'Upcoming procedure',
  NOW()
FROM public.patients
LIMIT 1 OFFSET 1
ON CONFLICT (invoice_number) DO NOTHING;

-- Insert test invoice items for the first invoice
INSERT INTO public.invoice_items (invoice_id, description, item_type, quantity, unit_price, total_price, created_at)
SELECT
  i.id,
  'Consultation Fee',
  'consultation',
  1,
  50000,
  50000,
  NOW()
FROM public.invoices i
WHERE i.invoice_number = 'INV-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO public.invoice_items (invoice_id, description, item_type, quantity, unit_price, total_price, created_at)
SELECT
  i.id,
  'Blood Test',
  'lab_test',
  2,
  50000,
  100000,
  NOW()
FROM public.invoices i
WHERE i.invoice_number = 'INV-2026-001'
ON CONFLICT DO NOTHING;

-- Insert test items for second invoice
INSERT INTO public.invoice_items (invoice_id, description, item_type, quantity, unit_price, total_price, created_at)
SELECT
  i.id,
  'Surgical Procedure',
  'procedure',
  1,
  200000,
  200000,
  NOW()
FROM public.invoices i
WHERE i.invoice_number = 'INV-2026-002'
ON CONFLICT DO NOTHING;

INSERT INTO public.invoice_items (invoice_id, description, item_type, quantity, unit_price, total_price, created_at)
SELECT
  i.id,
  'Medication - Antibiotic',
  'medication',
  1,
  75000,
  75000,
  NOW()
FROM public.invoices i
WHERE i.invoice_number = 'INV-2026-002'
ON CONFLICT DO NOTHING;

-- Insert test payment to demonstrate partially paid status
INSERT INTO public.payments (
  payment_number,
  invoice_id,
  amount,
  payment_method,
  reference_number,
  notes,
  created_at
)
SELECT
  'PAY-2026-001',
  i.id,
  100000,
  'mobile_money',
  'MTN-123456789',
  'First payment installment',
  NOW()
FROM public.invoices i
WHERE i.invoice_number = 'INV-2026-003'
LIMIT 1
ON CONFLICT (payment_number) DO NOTHING;

-- Verify insertions
SELECT 'Invoices created:' as message, COUNT(*) as count FROM public.invoices;
SELECT 'Invoice items created:' as message, COUNT(*) as count FROM public.invoice_items;
SELECT 'Sample payments created:' as message, COUNT(*) as count FROM public.payments;

-- View summary
SELECT 
  invoice_number,
  total_amount,
  amount_paid,
  (total_amount - amount_paid) as balance_due,
  status
FROM public.invoices
ORDER BY created_at DESC;
