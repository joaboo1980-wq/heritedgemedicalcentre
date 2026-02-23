-- Create user_sessions table to track active sessions and prevent concurrent logins
-- This helps prevent duplicate records when the same user logs in from multiple devices simultaneously
-- ENFORCEMENT: Only 1 active session per user at a time - new login invalidates old sessions

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT, -- Browser, OS, IP address info (for audit)
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_user_active ON public.user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can see if they have active sessions (for debugging)
CREATE POLICY "Users can update their own sessions" ON public.user_sessions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only system/backend can create/manage sessions for enforcement
CREATE POLICY "System can manage all sessions" ON public.user_sessions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to invalidate old sessions when user logs in
-- This enforces single-session policy: only 1 active session per user at a time
CREATE OR REPLACE FUNCTION public.enforce_single_session(
  p_user_id UUID,
  p_new_session_token TEXT,
  p_device_info TEXT DEFAULT NULL
)
RETURNS TABLE(session_id UUID, session_token TEXT, message TEXT) AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Step 1: Invalidate ALL existing active sessions for this user
  UPDATE public.user_sessions
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  -- Step 2: Create new active session with 24-hour expiration
  INSERT INTO public.user_sessions (
    user_id, 
    session_token, 
    device_info, 
    is_active, 
    expires_at
  ) VALUES (
    p_user_id,
    p_new_session_token,
    p_device_info,
    true,
    CURRENT_TIMESTAMP + INTERVAL '24 hours'
  )
  RETURNING id INTO v_session_id;

  -- Step 3: Return success response
  RETURN QUERY SELECT 
    v_session_id,
    p_new_session_token,
    'Session created successfully. Previous sessions invalidated (single-session policy enforced).'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if session is still valid
CREATE OR REPLACE FUNCTION public.is_session_valid(
  p_user_id UUID,
  p_session_token TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_sessions
    WHERE user_id = p_user_id
      AND session_token = p_session_token
      AND is_active = true
      AND expires_at > CURRENT_TIMESTAMP
  ) INTO v_is_valid;
  
  RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually logout all sessions for a user (e.g., when password changes)
CREATE OR REPLACE FUNCTION public.logout_all_sessions(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments explaining the purpose
COMMENT ON TABLE public.user_sessions IS 'Tracks active user sessions to enforce single-session policy (only 1 active session per user at a time) and prevent duplicate records from concurrent logins on multiple devices';
COMMENT ON COLUMN public.user_sessions.session_token IS 'Unique session identifier for this login instance';
COMMENT ON COLUMN public.user_sessions.is_active IS 'Whether this session is currently active (false = user logged out or new session created on another device)';
COMMENT ON COLUMN public.user_sessions.last_activity IS 'Timestamp of last user activity in this session';
COMMENT ON COLUMN public.user_sessions.expires_at IS 'Session expiration time (24 hours from login)';
COMMENT ON FUNCTION public.enforce_single_session(UUID, TEXT, TEXT) IS 'CRITICAL: Invalidates all existing sessions for a user and creates a new one. Call this on every login attempt.';
COMMENT ON FUNCTION public.is_session_valid(UUID, TEXT) IS 'Validates if a session token is still active and not expired. Use this on every request to verify session is valid.';
COMMENT ON FUNCTION public.cleanup_expired_sessions() IS 'Removes expired session records. Should be called periodically (e.g., daily batch job).';
COMMENT ON FUNCTION public.logout_all_sessions(UUID) IS 'Force logout all sessions for a user. Use when password changes, suspicious activity, or account lockdown.';

