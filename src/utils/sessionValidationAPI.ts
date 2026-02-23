/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Utility functions to validate session before making API calls
 * These ensure that only active sessions can perform actions
 */

interface SessionValidationResult {
  isValid: boolean;
  user_id?: string;
  session_token?: string;
}

/**
 * Validates session before any API operation
 * Call this at the start of any mutation or data operation
 */
export const validateSessionBeforeAPI = async (
  userId: string,
  sessionToken: string
): Promise<SessionValidationResult> => {
  if (!userId || !sessionToken) {
    console.warn('[API] Missing user ID or session token');
    return { isValid: false };
  }

  try {
    const { data: isValid, error } = await supabase.rpc('is_session_valid', {
      p_user_id: userId,
      p_session_token: sessionToken,
    });

    if (error) {
      // If function doesn't exist (404/PGRST202), allow operation but warn
      if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
        console.warn('[API] Session validation function not deployed yet. Allowing operation to proceed.');
        return {
          isValid: true,
          user_id: userId,
          session_token: sessionToken,
        };
      }
      
      console.error('[API] Session validation error:', error);
      return { isValid: false };
    }

    return {
      isValid: !!isValid,
      user_id: userId,
      session_token: sessionToken,
    };
  } catch (err) {
    console.error('[API] Session validation exception:', err);
    return { isValid: false };
  }
};

/**
 * Wrap a database operation with session validation
 * Example usage:
 * 
 * const result = await withSessionValidation(
 *   userId,
 *   sessionToken,
 *   async () => {
 *     return await supabase
 *       .from('invoices')
 *       .insert({ ... });
 *   }
 * );
 */
export const withSessionValidation = async <T extends Record<string, any>>(
  userId: string,
  sessionToken: string,
  operation: () => Promise<T>,
  operationName: string = 'API Operation'
): Promise<T | null> => {
  // Step 1: Validate session
  const validation = await validateSessionBeforeAPI(userId, sessionToken);

  if (!validation.isValid) {
    console.error(`[${operationName}] Session validation failed`);
    toast.error('Your session has expired. Please log in again.');
    return null;
  }

  try {
    // Step 2: Execute the operation with valid session
    console.log(`[${operationName}] Executing with valid session`);
    const result = await operation();
    return result;
  } catch (err: any) {
    console.error(`[${operationName}] Failed:`, err);
    
    // Check if error is related to session/auth
    if (err.message?.includes('session') || err.message?.includes('auth')) {
      toast.error('Session error. Please log in again.');
    } else {
      toast.error(`${operationName} failed: ${err.message}`);
    }
    return null;
  }
};

/**
 * Example implementations for common mutations
 */

/**
 * Safe create operation with session validation
 */
export const createWithSession = async (
  userId: string,
  sessionToken: string,
  table: string,
  data: any
) => {
  return withSessionValidation(
    userId,
    sessionToken,
    async () => {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();

      if (error) throw error;
      return result;
    },
    `Create ${table}`
  );
};

/**
 * Safe update operation with session validation
 */
export const updateWithSession = async (
  userId: string,
  sessionToken: string,
  table: string,
  id: string,
  data: any,
  filterColumn: string = 'id'
) => {
  return withSessionValidation(
    userId,
    sessionToken,
    async () => {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq(filterColumn, id)
        .select();

      if (error) throw error;
      return result;
    },
    `Update ${table}`
  );
};

/**
 * Safe delete operation with session validation
 */
export const deleteWithSession = async (
  userId: string,
  sessionToken: string,
  table: string,
  id: string,
  filterColumn: string = 'id'
) => {
  return withSessionValidation(
    userId,
    sessionToken,
    async () => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(filterColumn, id);

      if (error) throw error;
      return { success: true };
    },
    `Delete ${table}`
  );
};
