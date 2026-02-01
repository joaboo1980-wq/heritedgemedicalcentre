-- Create a trigger to automatically add doctors to public.users when they're assigned the doctor role

CREATE OR REPLACE FUNCTION public.sync_doctor_to_users_table()
RETURNS TRIGGER AS $$
BEGIN
  -- If a user is being assigned the doctor role, add them to public.users
  IF NEW.role = 'doctor' THEN
    INSERT INTO public.users (id, auth_id, email, full_name, role)
    SELECT 
      gen_random_uuid(),
      NEW.user_id,
      p.email,
      p.full_name,
      'doctor'
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS sync_doctor_to_users_on_role_insert ON public.user_roles;
CREATE TRIGGER sync_doctor_to_users_on_role_insert
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_doctor_to_users_table();

-- Also handle updates (in case someone changes a role to doctor)
DROP TRIGGER IF EXISTS sync_doctor_to_users_on_role_update ON public.user_roles;
CREATE TRIGGER sync_doctor_to_users_on_role_update
AFTER UPDATE ON public.user_roles
FOR EACH ROW
WHEN (NEW.role = 'doctor' AND OLD.role != 'doctor')
EXECUTE FUNCTION public.sync_doctor_to_users_table();
