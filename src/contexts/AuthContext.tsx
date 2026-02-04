import React, { createContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
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

  useEffect(() => {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');

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
    }}>
      {children}
    </AuthContext.Provider>
  );
};