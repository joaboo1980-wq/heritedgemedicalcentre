-- Create user_sessions table to track active sessions and prevent concurrent logins
-- This helps prevent duplicate records when the same user logs in from multiple devices simultaneously

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT, -- Browser, OS, IP address info (for audit)
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Only system/backend can create/manage sessions
CREATE POLICY "Backend can manage sessions" ON public.user_sessions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the purpose
COMMENT ON TABLE public.user_sessions IS 'Tracks active user sessions to prevent concurrent logins and duplicate records from same user on multiple devices';
COMMENT ON COLUMN public.user_sessions.session_token IS 'Unique session identifier for this login instance';
COMMENT ON COLUMN public.user_sessions.last_activity IS 'Timestamp of last user activity in this session';
COMMENT ON COLUMN public.user_sessions.expires_at IS 'Session expiration time (typically 24 hours from login or last activity)';
