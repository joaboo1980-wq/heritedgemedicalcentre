import React, { createContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* eslint-disable @typescript-eslint/no-explicit-any */

type AppRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  department: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isSessionValid: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

// Helper function to get device info
const getDeviceInfo = (): string => {
  const ua = navigator.userAgent;
  const browserInfo = ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : ua.includes('Firefox') ? 'Firefox' : 'Unknown Browser';
  const osInfo = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Unknown OS';
  return `${browserInfo} on ${osInfo}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track refresh timer to prevent multiple simultaneous refreshes
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserData = async (userId: string): Promise<void> => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Fetch profile
      const { data: profileDataArray, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId);
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }
      
      if (profileDataArray && profileDataArray.length > 0) {
        setProfile(profileDataArray[0] as Profile);
      }

      // Fetch roles directly from user_roles table
      console.log('Fetching roles...');
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (rolesError) {
        console.error('Roles fetch error:', rolesError);
        setRoles([]);
      } else if (rolesData && Array.isArray(rolesData)) {
        const roles = rolesData.map((item: any) => item.role as AppRole);
        console.log('Roles fetched:', roles);
        setRoles(roles);
      } else {
        console.log('No roles data received');
        setRoles([]);
      }
      console.log('User data fetch completed');
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setRoles([]);
    } finally {
      // Ensure loading is set to false after all state updates
      setLoading(false);
    }
  };

  // Automatic token refresh every 45 minutes (assuming 1-hour expiration)
  // Supabase refreshes tokens automatically, but we schedule an explicit refresh to stay ahead
  useEffect(() => {
    if (!session?.user) return;

    console.log('[AUTH] Setting up automatic token refresh');

    const scheduleRefresh = () => {
      // Refresh 15 minutes before expiration (token expires in ~60 min, refresh at 45 min)
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        try {
          console.log('[AUTH] Automatic token refresh triggered');
          
          // Get current session and refresh if needed
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('[AUTH] Token refresh failed:', error);
            // If refresh fails, user will need to log in again
            return;
          }
          
          if (data.session) {
            console.log('[AUTH] Token refreshed successfully');
            setSession(data.session);
            // Reschedule the next refresh
            scheduleRefresh();
          }
        } catch (err) {
          console.error('[AUTH] Token refresh error:', err);
        }
      }, 45 * 60 * 1000); // 45 minutes
    };

    scheduleRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [session?.user]);

  useEffect(() => {
    console.log('[AUTH] Initializing auth state listener');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        try {
          console.log('[AUTH] Auth state changed:', event);
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Fetch user data - loading will be set to false inside fetchUserData
            fetchUserData(session.user.id)
              .catch(error => {
                console.error('Error fetching user data:', error);
                setLoading(false);
              });
          } else {
            setProfile(null);
            setRoles([]);
            setLoading(false);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setLoading(false);
        }
      }
    );

    // Check for existing session (from Supabase's internal storage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      try {
        console.log('[AUTH] Retrieved existing session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data - loading will be set to false inside fetchUserData
          fetchUserData(session.user.id)
            .catch(error => {
              console.error('Error fetching user session data:', error);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Get session error:', error);
        setLoading(false);
      }
    });

    return () => {
      console.log('[AUTH] Cleaning up auth subscription');
      subscription.unsubscribe();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Step 1: Standard Supabase login (JWT is kept in memory automatically)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('[AUTH] Sign in error:', error);
        return { error: error as Error };
      }

      if (!data.user) {
        return { error: new Error('No user returned from login') };
      }

      console.log('[AUTH] User authenticated:', data.user.id);
      
      // Step 2: Enforce single-session policy - invalidate old sessions for audit/tracking
      const deviceInfo = getDeviceInfo();
      const { error: sessionError } = await supabase.rpc(
        'enforce_single_session',
        {
          p_user_id: data.user.id,
          p_new_session_token: `secure_session_${Date.now()}`, // Minimal token for audit logging only
          p_device_info: deviceInfo,
        }
      );

      if (sessionError) {
        console.warn('[AUTH] Session enforcement warning (non-critical):', sessionError);
        // Non-fatal error - JWT is still valid, session tracking just failed
      } else {
        console.log('[AUTH] Session tracking enforced');
      }

      // NOTE: Token is now kept in memory by Supabase and will be automatically refreshed
      // No localStorage usage for security
      
      return { error: null };
    } catch (err: any) {
      console.error('[AUTH] Sign in exception:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      console.log('[AUTH] Signing out user');

      // Optional: Invalidate all sessions (more secure but prevents other device access)
      // if (user?.id) {
      //   await supabase.rpc('logout_all_sessions', { p_user_id: user.id });
      // }

      // Sign out from Supabase (clears JWT from memory)
      await supabase.auth.signOut();

      // Clear any scheduled refresh timers
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      // Clear context state
      setUser(null);
      setSession(null);
      setProfile(null);
      setRoles([]);
      
      console.log('[AUTH] User signed out successfully');
    } catch (error) {
      console.error('[AUTH] Sign out error:', error);
      throw error;
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');

  const isSessionValid = (): boolean => {
    // Session is valid if user is authenticated and session exists
    // JWT expiration is handled automatically by Supabase
    return !!user && !!session;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      loading,
      signIn,
      signOut,
      hasRole,
      isAdmin,
      isSessionValid,
    }}>
      {children}
    </AuthContext.Provider>
  );
};