-- Comprehensive seed data for dashboard testing
-- This script automatically finds existing users and creates test data
-- Run this once and it will populate all dashboard data

-- ===== GET ADMIN/DOCTOR USER ID =====
-- We'll store the first admin or doctor user ID to use for appointments/lab orders
WITH user_ids AS (
  SELECT DISTINCT au.id
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON au.id = ur.user_id
  WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%'
  LIMIT 1
)

-- ===== INSERT TEST PATIENTS =====
INSERT INTO public.patients (
  first_name,
  last_name,
  patient_number,
  date_of_birth,
  gender,
  blood_type,
  phone,
  email,
  address,
  insurance_provider,
  insurance_number,
  emergency_contact_name,
  emergency_contact_phone
) VALUES
('John', 'Doe', 'PAT-001', '1985-03-15', 'male', 'O+', '0701234567', 'john.doe@example.com', '123 Main St', 'NSSF', 'NSSF123', 'Jane Doe', '0701234568'),
('Jane', 'Smith', 'PAT-002', '1990-07-22', 'female', 'A+', '0702345678', 'jane.smith@example.com', '456 Oak Ave', 'UIC', 'UIC456', 'John Smith', '0702345679'),
('Peter', 'Johnson', 'PAT-003', '1975-11-30', 'male', 'B+', '0703456789', 'peter.johnson@example.com', '789 Elm Rd', 'NSSF', 'NSSF789', 'Mary Johnson', '0703456790'),
('Sarah', 'Williams', 'PAT-004', '1988-05-12', 'female', 'AB+', '0704567890', 'sarah.williams@example.com', '321 Pine St', 'UIC', 'UIC321', 'Tom Williams', '0704567891'),
('Michael', 'Brown', 'PAT-005', '1992-09-25', 'male', 'O-', '0705678901', 'michael.brown@example.com', '654 Birch Ave', 'NSSF', 'NSSF654', 'Emma Brown', '0705678902'),
('Lisa', 'Davis', 'PAT-006', '1987-02-18', 'female', 'A-', '0706789012', 'lisa.davis@example.com', '987 Cedar Ln', 'Jubilee', 'JUB987', 'Chris Davis', '0706789013'),
('David', 'Miller', 'PAT-007', '1980-06-07', 'male', 'B-', '0707890123', 'david.miller@example.com', '147 Spruce Dr', 'APA', 'APA147', 'Anna Miller', '0707890124'),
('Emma', 'Wilson', 'PAT-008', '1995-04-14', 'female', 'O+', '0708901234', 'emma.wilson@example.com', '258 Walnut St', 'UIC', 'UIC258', 'Robert Wilson', '0708901235')
ON CONFLICT (patient_number) DO NOTHING;

-- ===== INSERT TEST APPOINTMENTS =====
-- Uses the first admin/doctor user found in the system
INSERT INTO public.appointments (
  patient_id,
  doctor_id,
  appointment_date,
  appointment_time,
  status,
  reason,
  department
) SELECT
  (SELECT id FROM patients WHERE patient_number = 'PAT-001' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  CURRENT_DATE,
  '09:00',
  'scheduled',
  'Chest pain consultation',
  'Cardiology'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor'))
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (
  patient_id,
  doctor_id,
  appointment_date,
  appointment_time,
  status,
  reason,
  department
) SELECT
  (SELECT id FROM patients WHERE patient_number = 'PAT-002' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  CURRENT_DATE,
  '10:30',
  'completed',
  'Routine checkup',
  'General Medicine'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor'))
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (
  patient_id,
  doctor_id,
  appointment_date,
  appointment_time,
  status,
  reason,
  department
) SELECT
  (SELECT id FROM patients WHERE patient_number = 'PAT-003' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day',
  '11:00',
  'scheduled',
  'Follow-up consultation',
  'Cardiology'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor'))
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (
  patient_id,
  doctor_id,
  appointment_date,
  appointment_time,
  status,
  reason,
  department
) SELECT
  (SELECT id FROM patients WHERE patient_number = 'PAT-004' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  CURRENT_DATE + INTERVAL '2 days',
  '14:00',
  'scheduled',
  'Blood pressure monitoring',
  'General Medicine'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor'))
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (
  patient_id,
  doctor_id,
  appointment_date,
  appointment_time,
  status,
  reason,
  department
) SELECT
  (SELECT id FROM patients WHERE patient_number = 'PAT-005' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  CURRENT_DATE + INTERVAL '3 days',
  '15:30',
  'scheduled',
  'ECG examination',
  'Cardiology'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor'))
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (
  patient_id,
  doctor_id,
  appointment_date,
  appointment_time,
  status,
  reason,
  department
) SELECT
  (SELECT id FROM patients WHERE patient_number = 'PAT-006' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  CURRENT_DATE + INTERVAL '7 days',
  '09:00',
  'scheduled',
  'Annual physical',
  'General Medicine'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor'))
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (
  patient_id,
  doctor_id,
  appointment_date,
  appointment_time,
  status,
  reason,
  department
) SELECT
  (SELECT id FROM patients WHERE patient_number = 'PAT-007' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  CURRENT_DATE + INTERVAL '10 days',
  '10:00',
  'scheduled',
  'Stress test',
  'Cardiology'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor'))
ON CONFLICT DO NOTHING;

-- ===== INSERT TEST LAB ORDERS =====
-- Lab orders require test_id references - will create simple lab orders if tests exist
INSERT INTO public.lab_orders (
  order_number,
  patient_id,
  ordered_by,
  test_id,
  status,
  priority
) SELECT
  'ORD-2026-001',
  (SELECT id FROM patients WHERE patient_number = 'PAT-001' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  (SELECT id FROM lab_tests LIMIT 1),
  'pending',
  'normal'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor')) AND EXISTS (SELECT 1 FROM lab_tests)
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO public.lab_orders (
  order_number,
  patient_id,
  ordered_by,
  test_id,
  status,
  priority
) SELECT
  'ORD-2026-002',
  (SELECT id FROM patients WHERE patient_number = 'PAT-002' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  (SELECT id FROM lab_tests LIMIT 1),
  'processing',
  'normal'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor')) AND EXISTS (SELECT 1 FROM lab_tests)
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO public.lab_orders (
  order_number,
  patient_id,
  ordered_by,
  test_id,
  status,
  priority
) SELECT
  'ORD-2026-003',
  (SELECT id FROM patients WHERE patient_number = 'PAT-003' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  (SELECT id FROM lab_tests LIMIT 1),
  'pending',
  'urgent'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor')) AND EXISTS (SELECT 1 FROM lab_tests)
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO public.lab_orders (
  order_number,
  patient_id,
  ordered_by,
  test_id,
  status,
  priority
) SELECT
  'ORD-2026-004',
  (SELECT id FROM patients WHERE patient_number = 'PAT-004' LIMIT 1),
  (SELECT id FROM auth.users WHERE id IN (SELECT au.id FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor') OR au.email LIKE '%admin%' OR au.email LIKE '%doctor%') LIMIT 1),
  (SELECT id FROM lab_tests LIMIT 1),
  'completed',
  'normal'
WHERE EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.user_roles ur ON au.id = ur.user_id WHERE ur.role IN ('admin', 'doctor')) AND EXISTS (SELECT 1 FROM lab_tests)
ON CONFLICT (order_number) DO NOTHING;

-- ===== INSERT TEST LAB TESTS =====
-- Skipping lab tests since they reference lab_orders which we're not creating

-- ===== INSERT TEST INVOICES =====
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
) VALUES
('INV-2026-001', (SELECT id FROM patients WHERE patient_number = 'PAT-001' LIMIT 1), 'pending', 200000, 20000, 0, 220000, 0, CURRENT_DATE + INTERVAL '30 days', 'Cardiology consultation and tests', NOW()),
('INV-2026-002', (SELECT id FROM patients WHERE patient_number = 'PAT-002' LIMIT 1), 'paid', 150000, 15000, 10000, 155000, 155000, CURRENT_DATE - INTERVAL '5 days', 'General checkup', NOW() - INTERVAL '3 days'),
('INV-2026-003', (SELECT id FROM patients WHERE patient_number = 'PAT-003' LIMIT 1), 'pending', 300000, 30000, 0, 330000, 100000, CURRENT_DATE + INTERVAL '15 days', 'Cardiology tests and imaging', NOW()),
('INV-2026-004', (SELECT id FROM patients WHERE patient_number = 'PAT-004' LIMIT 1), 'paid', 120000, 12000, 5000, 127000, 127000, CURRENT_DATE - INTERVAL '10 days', 'Lab tests', NOW() - INTERVAL '5 days')
ON CONFLICT (invoice_number) DO NOTHING;

-- ===== INSERT ACTIVITY LOG ENTRIES =====
-- Note: activity_log user_id references auth.users, skipping for now
-- Activity logs will be created automatically when users perform actions in the system

-- ===== VERIFY DATA =====
SELECT 'Patients created:' as info, COUNT(*) as count FROM patients;
SELECT 'Appointments created:' as info, COUNT(*) as count FROM appointments;
SELECT 'Lab orders created:' as info, COUNT(*) as count FROM lab_orders;
SELECT 'Invoices created:' as info, COUNT(*) as count FROM invoices;
