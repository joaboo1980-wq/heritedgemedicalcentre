import React, { createContext, useEffect, useState } from 'react';
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
  sessionToken: string | null;
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

// Helper function to generate session token
const generateSessionToken = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Check session validity every 60 seconds
  useEffect(() => {
    if (!sessionToken || !user) return;

    const intervalId = setInterval(async () => {
      try {
        const { data: isValid, error } = await supabase.rpc('is_session_valid', {
          p_user_id: user.id,
          p_session_token: sessionToken,
        });

        if (error) {
          console.error('[Session] Validation error:', error);
          return;
        }

        if (!isValid) {
          // Session was invalidated (probably logged in from another device)
          console.warn('[Session] Session invalidated from another device');
          localStorage.removeItem('session_token');
          localStorage.removeItem('user_id');
          
          setSessionToken(null);
          setUser(null);
          setSession(null);
          setProfile(null);
          setRoles([]);
          
          toast.warning(
            'Your session has ended. You were logged in from another device. Please log in again.'
          );
        }
      } catch (err) {
        console.error('[Session] Validation exception:', err);
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(intervalId);
  }, [sessionToken, user]);

  useEffect(() => {
    // Restore session token from localStorage if it exists
    const savedSessionToken = localStorage.getItem('session_token');
    const savedUserId = localStorage.getItem('user_id');
    
    if (savedSessionToken) {
      setSessionToken(savedSessionToken);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        try {
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
            setSessionToken(null);
            setLoading(false);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      try {
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

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Step 1: Standard Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('[Auth] Sign in error:', error);
        return { error: error as Error };
      }

      if (!data.user) {
        return { error: new Error('No user returned from login') };
      }

      // Step 2: Generate unique session token
      const newSessionToken = generateSessionToken();
      const deviceInfo = getDeviceInfo();

      // Step 3: Enforce single-session policy - invalidate old sessions and create new one
      const { data: sessionResult, error: sessionError } = await supabase.rpc(
        'enforce_single_session',
        {
          p_user_id: data.user.id,
          p_new_session_token: newSessionToken,
          p_device_info: deviceInfo,
        }
      );

      if (sessionError) {
        console.error('[Auth] Session enforcement error:', sessionError);
        // Still allow login even if session tracking fails
        toast.warning('Login successful but session tracking failed. Please try again.');
      } else {
        console.log('[Auth] Session created:', sessionResult);
      }

      // Step 4: Store session token in localStorage
      localStorage.setItem('session_token', newSessionToken);
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('login_timestamp', new Date().toISOString());

      // Step 5: Update auth context
      setSessionToken(newSessionToken);
      
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Sign in exception:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      const userId = user?.id;

      // Optional: Invalidate all sessions (more secure but prevents other device access)
      // if (userId) {
      //   await supabase.rpc('logout_all_sessions', { p_user_id: userId });
      // }

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear local storage
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('login_timestamp');

      // Clear context
      setUser(null);
      setSession(null);
      setProfile(null);
      setRoles([]);
      setSessionToken(null);
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');

  const isSessionValid = (): boolean => {
    return !!sessionToken && !!user;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      sessionToken,
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