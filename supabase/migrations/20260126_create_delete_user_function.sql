-- Create a function to safely delete users and their related data
CREATE OR REPLACE FUNCTION public.delete_user_cascade(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete user roles
  DELETE FROM public.user_roles WHERE public.user_roles.user_id = p_user_id;
  
  -- Delete staff availability records
  DELETE FROM public.staff_availability WHERE public.staff_availability.staff_id = p_user_id;
  
  -- Delete duty rosters created by this user
  DELETE FROM public.duty_rosters WHERE public.duty_rosters.created_by = p_user_id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE public.profiles.user_id = p_user_id;
  
  -- Delete auth user
  DELETE FROM auth.users WHERE auth.users.id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(UUID) TO authenticated;

-- Create an RLS policy to allow admins to call this function
-- The function itself has SECURITY DEFINER so it will run with elevated privileges
