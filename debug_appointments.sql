-- Debug appointments
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_time,
  a.status,
  a.reason,
  a.department,
  p.first_name,
  p.last_name,
  pr.full_name as doctor_name,
  a.created_at
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN profiles pr ON a.doctor_id = pr.user_id
ORDER BY a.created_at DESC
LIMIT 20;
