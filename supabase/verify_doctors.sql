-- Check if the doctor user exists in auth.users
-- Replace 'user_id_here' with the actual user_id you're trying to use

SELECT 
  ur.user_id,
  ur.role,
  p.full_name,
  p.email,
  CASE 
    WHEN EXISTS(SELECT 1 FROM auth.users au WHERE au.id = ur.user_id) THEN 'YES - Exists'
    ELSE 'NO - Missing in auth.users'
  END AS "Auth User Status"
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.role = 'doctor'
ORDER BY p.full_name;

-- If a doctor shows "NO - Missing in auth.users", that's the problem.
-- The user_roles entry points to a user_id that doesn't exist in auth.users table.
