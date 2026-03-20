import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TriageQueueEntry {
  id: string;
  patient_id: string;
  checked_in_by: string;
  assigned_nurse_id: string | null;
  priority: 'low' | 'normal' | 'high' | 'critical';
  chief_complaint: string | null;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  queue_position: number | null;
  checked_in_at: string;
  triage_started_at: string | null;
  triage_completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    patient_number: string;
    date_of_birth: string;
  };
  nurse?: {
    id: string;
    full_name: string;
    email: string;
  };
  checked_in_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Get all patients in triage queue (waiting and in_progress)
export const useTriageQueue = () => {
  return useQuery({
    queryKey: ['triage-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('triage_queue')
        .select('*')
        .in('status', ['waiting', 'in_progress'])
        .order('status', { ascending: true })
        .order('queue_position', { ascending: true });

      if (error) {
        console.error('[useTriageQueue] Error:', error);
        throw error;
      }

      // Fetch patient details
      const patientIds = (data || []).map((entry: any) => entry.patient_id).filter(Boolean);
      let patients: any = {};

      if (patientIds.length > 0) {
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number, date_of_birth')
          .in('id', patientIds);

        if (patientError) {
          console.error('[useTriageQueue] Error fetching patients:', patientError);
        } else {
          patients = (patientData || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      return (data || []).map((entry: any) => ({
        ...entry,
        patient: patients[entry.patient_id],
      })) as TriageQueueEntry[];
    },
  });
};

// Get triage queue for a specific nurse (their current assignments)
export const useNurseTriageQueue = (nurseId?: string) => {
  return useQuery({
    queryKey: ['triage-queue-nurse', nurseId],
    enabled: !!nurseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('triage_queue')
        .select('*')
        .eq('assigned_nurse_id', nurseId || '')
        .in('status', ['waiting', 'in_progress'])
        .order('status', { ascending: true })
        .order('queue_position', { ascending: true });

      if (error) {
        console.error('[useNurseTriageQueue] Error:', error);
        throw error;
      }

      // Fetch patient details
      const patientIds = (data || []).map((entry: any) => entry.patient_id).filter(Boolean);
      let patients: any = {};

      if (patientIds.length > 0) {
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number, date_of_birth')
          .in('id', patientIds);

        if (patientError) {
          console.error('[useNurseTriageQueue] Error fetching patients:', patientError);
        } else {
          patients = (patientData || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      return (data || []).map((entry: any) => ({
        ...entry,
        patient: patients[entry.patient_id],
      })) as TriageQueueEntry[];
    },
  });
};

// Add patient to triage queue
export const useAddToTriageQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      patient_id: string;
      chief_complaint?: string;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      notes?: string;
    }) => {
      const currentUser = await supabase.auth.getUser();
      const userId = currentUser.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.from('triage_queue').insert({
        patient_id: data.patient_id,
        checked_in_by: userId,
        chief_complaint: data.chief_complaint || null,
        priority: data.priority || 'normal',
        notes: data.notes || null,
        status: 'waiting',
      });

      if (error) {
        console.error('[useAddToTriageQueue] Error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      toast.success('Patient added to triage queue');
    },
    onError: (error: Error) => {
      console.error('[useAddToTriageQueue] Mutation error:', error);
      toast.error(`Failed to add patient to queue: ${error.message}`);
    },
  });
};

// Claim patient from triage queue (nurse starts triage)
export const useClaimTriagePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      const currentUser = await supabase.auth.getUser();
      const nurseId = currentUser.data.user?.id;

      if (!nurseId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('triage_queue')
        .update({
          assigned_nurse_id: nurseId,
          status: 'in_progress',
          triage_started_at: new Date().toISOString(),
        })
        .eq('id', queueEntryId);

      if (error) {
        console.error('[useClaimTriagePatient] Error:', error);
        throw error;
      }

      return queueEntryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['triage-queue-nurse'] });
      toast.success('Patient claimed from triage queue');
    },
    onError: (error: Error) => {
      console.error('[useClaimTriagePatient] Mutation error:', error);
      toast.error(`Failed to claim patient: ${error.message}`);
    },
  });
};

// Complete triage for a patient and auto-assign to the nurse
export const useCompleteTriagePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      // First, get the triage queue entry to get nurse_id and patient_id
      const { data: triageData, error: fetchError } = await supabase
        .from('triage_queue')
        .select('assigned_nurse_id, patient_id')
        .eq('id', queueEntryId)
        .single();

      if (fetchError) {
        console.error('[useCompleteTriagePatient] Error fetching triage data:', fetchError);
        throw fetchError;
      }

      // Update triage status to completed
      const { error: updateError } = await supabase
        .from('triage_queue')
        .update({
          status: 'completed',
          triage_completed_at: new Date().toISOString(),
        })
        .eq('id', queueEntryId);

      if (updateError) {
        console.error('[useCompleteTriagePatient] Error updating triage:', updateError);
        throw updateError;
      }

      // Auto-assign patient to the nurse who completed triage
      if (triageData?.assigned_nurse_id && triageData?.patient_id) {
        const { error: assignError } = await supabase
          .from('patient_assignments')
          .insert({
            patient_id: triageData.patient_id,
            assigned_to: triageData.assigned_nurse_id,
            assignment_date: new Date().toISOString(),
            status: 'active',
          });

        if (assignError && !assignError.message.includes('duplicate')) {
          console.error('[useCompleteTriagePatient] Warning: Failed to create assignment:', assignError);
          // Don't throw - triage is already completed, assignment failure is not critical
        }
      }

      return queueEntryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['triage-queue-nurse'] });
      queryClient.invalidateQueries({ queryKey: ['patient-assignments'] });
      toast.success('Triage completed and patient assigned');
    },
    onError: (error: Error) => {
      console.error('[useCompleteTriagePatient] Mutation error:', error);
      toast.error(`Failed to complete triage: ${error.message}`);
    },
  });
};

// Cancel triage for a patient
export const useCancelTriagePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ queueEntryId, reason }: { queueEntryId: string; reason?: string }) => {
      const { error } = await supabase
        .from('triage_queue')
        .update({
          status: 'cancelled',
          notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        })
        .eq('id', queueEntryId);

      if (error) {
        console.error('[useCancelTriagePatient] Error:', error);
        throw error;
      }

      return queueEntryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['triage-queue-nurse'] });
      toast.success('Triage cancelled');
    },
    onError: (error: Error) => {
      console.error('[useCancelTriagePatient] Mutation error:', error);
      toast.error(`Failed to cancel triage: ${error.message}`);
    },
  });
};

// Admin: Reassign a patient from one nurse to another
export const useReassignPatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientAssignmentId,
      newNurseId,
      reason,
    }: {
      patientAssignmentId: string;
      newNurseId: string;
      reason?: string;
    }) => {
      // Update the assignment with new nurse
      const { error } = await supabase
        .from('patient_assignments')
        .update({
          assigned_to: newNurseId,
          reassignment_reason: reason,
          reassigned_at: new Date().toISOString(),
        })
        .eq('id', patientAssignmentId);

      if (error) {
        console.error('[useReassignPatient] Error:', error);
        throw error;
      }

      return patientAssignmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-patients'] });
      toast.success('Patient reassigned successfully');
    },
    onError: (error: Error) => {
      console.error('[useReassignPatient] Mutation error:', error);
      toast.error(`Failed to reassign patient: ${error.message}`);
    },
  });
};

// Get queue statistics
export const useTriageQueueStats = () => {
  return useQuery({
    queryKey: ['triage-queue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('triage_queue')
        .select('status, priority');

      if (error) {
        console.error('[useTriageQueueStats] Error:', error);
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        waiting: data?.filter((d: any) => d.status === 'waiting').length || 0,
        in_progress: data?.filter((d: any) => d.status === 'in_progress').length || 0,
        completed: data?.filter((d: any) => d.status === 'completed').length || 0,
        critical: data?.filter((d: any) => d.priority === 'critical' && d.status === 'waiting').length || 0,
      };

      return stats;
    },
  });
};
