/* eslint-disable @typescript-eslint/no-explicit-any */
import { useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook to validate session before making API requests
 * Usage: const { validateSession } = useSessionValidation();
 */
export const useSessionValidation = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('useSessionValidation must be used within AuthProvider');
  }

  const { user, sessionToken, signOut } = authContext;

  const validateSession = useCallback(async (): Promise<boolean> => {
    // If no user or session token, session is invalid
    if (!user || !sessionToken) {
      return false;
    }

    try {
      // Check if session is still valid in database
      const { data: isValid, error } = await supabase.rpc('is_session_valid', {
        p_user_id: user.id,
        p_session_token: sessionToken,
      });

      if (error) {
        console.error('[SessionValidation] Error checking session:', error);
        return false;
      }

      if (!isValid) {
        // Session is invalid - logout user
        console.warn('[SessionValidation] Session is no longer valid');
        toast.error('Your session has expired. Please log in again.');
        await signOut();
        return false;
      }

      return true;
    } catch (err) {
      console.error('[SessionValidation] Exception:', err);
      return false;
    }
  }, [user, sessionToken, signOut]);

  const withSessionValidation = useCallback(
    async <T extends (...args: any[]) => Promise<any>>(fn: T): Promise<ReturnType<T> | null> => {
      const isValid = await validateSession();
      if (!isValid) {
        return null;
      }
      return fn();
    },
    [validateSession]
  );

  return { validateSession, withSessionValidation };
};

/**
 * Hook to automatically add session validation to every data mutation
 * Usage: const { mutateWithSession } = useSessionMutation();
 */
export const useSessionMutation = () => {
  const { validateSession } = useSessionValidation();

  const mutateWithSession = useCallback(
    async (mutationFn: () => Promise<any>): Promise<any> => {
      const isValid = await validateSession();
      if (!isValid) {
        throw new Error('Session validation failed');
      }
      return mutationFn();
    },
    [validateSession]
  );

  return { mutateWithSession };
};
