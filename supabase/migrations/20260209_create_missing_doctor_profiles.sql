-- Create missing doctor profiles from auth.users
-- This migration ensures all users with 'doctor' role have corresponding profile records

-- Step 1: Insert profiles for any doctors that don't have them yet
INSERT INTO public.profiles (user_id, full_name, email)
SELECT 
    ur.user_id,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        CONCAT(
            COALESCE(au.raw_user_meta_data->>'first_name', ''),
            ' ',
            COALESCE(au.raw_user_meta_data->>'last_name', '')
        ),
        'Dr. ' || SUBSTRING(au.email FROM 1 FOR POSITION('@' IN au.email) - 1)
    ) as full_name,
    au.email
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'doctor'
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = ur.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Verify - show all doctors now have profiles
SELECT 
    ur.user_id,
    ur.role,
    p.full_name,
    p.email
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.user_id
WHERE ur.role = 'doctor'
ORDER BY p.full_name;
