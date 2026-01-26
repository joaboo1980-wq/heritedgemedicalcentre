-- Create a view for all doctors with identity, role, and profile info
CREATE OR REPLACE VIEW public.doctor_directory AS
SELECT
  u.id AS doctor_id,
  u.email,
  COALESCE(p.full_name, u.email, u.id::text) AS display_name,
  p.department
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'doctor'
LEFT JOIN profiles p ON p.user_id = u.id;
