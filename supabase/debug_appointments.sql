-- Test query to verify appointments are in the database
SELECT 
  a.id,
  a.patient_id,
  a.doctor_id,
  a.appointment_date,
  a.appointment_time,
  a.status,
  p.first_name,
  p.last_name
FROM public.appointments a
LEFT JOIN public.patients p ON a.patient_id = p.id
ORDER BY a.appointment_date DESC;

-- Also check if there are any auth.users with doctor/admin role
SELECT 
  au.id,
  au.email,
  ur.role
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
ORDER BY au.created_at DESC
LIMIT 10;
