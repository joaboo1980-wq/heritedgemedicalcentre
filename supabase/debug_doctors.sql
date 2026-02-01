-- Debug query to check doctors and their auth entries
-- Run this to see what doctors exist and if they're in auth.users

-- First, check all users with doctor role
SELECT 
  ur.user_id,
  ur.role,
  p.full_name,
  p.email,
  p.department,
  CASE 
    WHEN EXISTS(SELECT 1 FROM auth.users au WHERE au.id = ur.user_id) THEN 'Yes'
    ELSE 'No'
  END AS "In auth.users"
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.role = 'doctor'
ORDER BY p.full_name;
