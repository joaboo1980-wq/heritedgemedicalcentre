-- CLEAN FIX: Drop ALL existing profiles policies and recreate them cleanly
-- This ensures no conflicts or duplicates

-- Step 1: Drop ALL existing policies on profiles (regardless of name)
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- Loop through all policies on the profiles table and drop them
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Step 2: Recreate all profiles policies from scratch

-- Everyone can SELECT (view) all profiles
CREATE POLICY "All staff can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can INSERT their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can INSERT any profile
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can UPDATE their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can UPDATE any profile
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Everyone can DELETE their own profile (for cleanup)
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can DELETE any profile
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
