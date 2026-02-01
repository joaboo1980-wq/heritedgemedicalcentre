-- Ensure admin user has the admin role
-- Get the admin user ID first (assuming there's a user with email hillaryemokol@gmail.com)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the admin user
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'hillaryemokol@gmail.com' LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Insert admin role if it doesn't already exist
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user not found with email hillaryemokol@gmail.com';
  END IF;
END $$;
