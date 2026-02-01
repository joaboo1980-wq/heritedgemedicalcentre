-- Create a public.users table that mirrors auth.users for foreign key constraints
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see themselves
CREATE POLICY "Users can view themselves"
ON public.users
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create a trigger to automatically add users to public.users when they're created in auth.users
-- Note: This requires a trigger on auth.users which we can't directly do,
-- so instead we'll use a function that's called during user creation

-- Function to ensure user exists in public.users
CREATE OR REPLACE FUNCTION public.ensure_user_in_public()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add all current auth users to public.users
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
