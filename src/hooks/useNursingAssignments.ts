import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  NursingTask,
  PatientAssignment,
  CreateTaskFormData,
  UpdateTaskFormData,
  AssignPatientFormData,
  ReassignPatientFormData,
} from '@/types/nursing';
import { format } from 'date-fns';

// ============================================================================
// NURSING TASKS HOOKS
// ============================================================================

// Real-time subscription setup helper (for future enhancement)
// Note: Simplified approach using React Query invalidation on mutations
// Full Supabase realtime subscriptions can be added when API is stable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useRealtimeTaskUpdates = (queryClient: any) => {
  useEffect(() => {
    console.log('[REALTIME] Task update subscriptions enabled via mutations');
    return () => {
      console.log('[REALTIME] Cleanup');
    };
  }, [queryClient]);
};

export const useNursingTasks = (filters?: { status?: string; nurse_id?: string }) => {
  const queryClient = useQueryClient();
  useRealtimeTaskUpdates(queryClient);

  return useQuery({
    queryKey: ['nursing-tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('nursing_tasks')
        .select('*')
        .order('due_time', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.nurse_id) {
        query = query.eq('assigned_nurse_id', filters.nurse_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching nursing tasks:', error);
        throw error;
      }

      return (data || []) as NursingTask[];
    },
  });
};

export const useNursingTasksForNurse = (nurse_id?: string) => {
  const queryClient = useQueryClient();
  useRealtimeTaskUpdates(queryClient);

  return useQuery({
    queryKey: ['nursing-tasks-for-nurse', nurse_id],
    enabled: !!nurse_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nursing_tasks')
        .select('*')
        .eq('assigned_nurse_id', nurse_id || '')
        .order('due_time', { ascending: true });

      if (error) {
        console.error('Error fetching nurse tasks:', error);
        throw error;
      }

      return (data || []) as NursingTask[];
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskFormData) => {
      const { error } = await supabase
        .from('nursing_tasks')
        .insert({
          patient_id: data.patient_id,
          assigned_nurse_id: data.assigned_nurse_id,
          assigned_by_id: (await supabase.auth.getUser()).data.user?.id,
          title: data.title,
          description: data.description,
          priority: data.priority,
          due_time: data.due_time,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks-for-nurse'], exact: false });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: UpdateTaskFormData }) => {
      console.log('[useUpdateTask] Starting mutation for taskId:', taskId);
      console.log('[useUpdateTask] Data being sent:', data);

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.status !== undefined) {
        updateData.status = data.status;
        console.log('[useUpdateTask] Status update:', data.status);
      }
      if (data.completed_notes !== undefined) {
        updateData.completed_notes = data.completed_notes;
        console.log('[useUpdateTask] Notes update:', data.completed_notes);
      }
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.due_time !== undefined) updateData.due_time = data.due_time;

      if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        console.log('[useUpdateTask] Setting completed_at timestamp');
      }

      console.log('[useUpdateTask] Sending to database:', updateData);
      const { error } = await supabase.from('nursing_tasks').update(updateData).eq('id', taskId);

      if (error) {
        console.error('[useUpdateTask] Database error:', error);
        throw error;
      }

      console.log('[useUpdateTask] Update successful for taskId:', taskId);
    },
    onSuccess: () => {
      console.log('[useUpdateTask] Invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks-for-nurse'], exact: false });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      console.error('[useUpdateTask] Mutation error:', error);
      toast.error('Failed to update task');
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('nursing_tasks').delete().eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks-for-nurse'], exact: false });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    },
  });
};

export const useCompletedTasks = (nurse_id?: string) => {
  const queryClient = useQueryClient();
  useRealtimeTaskUpdates(queryClient);

  return useQuery({
    queryKey: ['completed-tasks', nurse_id],
    enabled: !!nurse_id,
    queryFn: async () => {
      let query = supabase
        .from('nursing_tasks')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (nurse_id) {
        query = query.eq('assigned_nurse_id', nurse_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useCompletedTasks] Error fetching completed tasks:', error);
        throw error;
      }

      console.log('[useCompletedTasks] Fetched', data?.length || 0, 'completed tasks');
      return (data || []) as NursingTask[];
    },
  });
};

export const useTaskStatistics = (nurse_id?: string) => {
  const queryClient = useQueryClient();
  useRealtimeTaskUpdates(queryClient);

  return useQuery({
    queryKey: ['task-statistics', nurse_id],
    enabled: !!nurse_id,
    queryFn: async () => {
      const { data: allTasks, error: allError } = await supabase
        .from('nursing_tasks')
        .select('*')
        .eq('assigned_nurse_id', nurse_id || '');

      if (allError) throw allError;

      const tasks = (allTasks || []) as NursingTask[];
      const completed = tasks.filter((t: NursingTask) => t.status === 'completed').length;
      const pending = tasks.filter((t: NursingTask) => t.status === 'pending').length;
      const inProgress = tasks.filter((t: NursingTask) => t.status === 'in_progress').length;
      const total = tasks.length;

      const completedToday = tasks.filter((t: NursingTask) => {
        if (t.status !== 'completed' || !t.completed_at) return false;
        const completedDate = new Date(t.completed_at).toDateString();
        const today = new Date().toDateString();
        return completedDate === today;
      }).length;

      console.log('[useTaskStatistics] Calculated stats:', {
        total,
        completed,
        pending,
        inProgress,
        completedToday,
      });

      return {
        total,
        completed,
        pending,
        inProgress,
        completedToday,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    },
  });
};

// ============================================================================
// PATIENT ASSIGNMENT HOOKS
// ============================================================================

export const usePatientAssignments = (filters?: { shift_date?: string; nurse_id?: string }) => {
  return useQuery({
    queryKey: ['patient-assignments', filters],
    queryFn: async () => {
      let query = supabase
        .from('patient_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.shift_date) {
        query = query.eq('shift_date', filters.shift_date);
      }

      if (filters?.nurse_id) {
        query = query.eq('nurse_id', filters.nurse_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching patient assignments:', error);
        throw error;
      }

      return (data || []) as PatientAssignment[];
    },
  });
};

export const usePatientAssignmentsForToday = (nurse_id?: string) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['patient-assignments-today', nurse_id],
    enabled: !!nurse_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_assignments')
        .select('*')
        .eq('shift_date', today)
        .eq('nurse_id', nurse_id || '')
        .order('is_primary_nurse', { ascending: false });

      if (error) {
        console.error('Error fetching nurse assignments:', error);
        throw error;
      }

      return (data || []) as PatientAssignment[];
    },
  });
};

export const useAssignPatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssignPatientFormData) => {
      const currentUser = await supabase.auth.getUser();

      const { error } = await supabase.from('patient_assignments').insert({
        patient_id: data.patient_id,
        nurse_id: data.nurse_id,
        assigned_by_id: currentUser.data.user?.id,
        shift_date: data.shift_date,
        priority: data.priority,
        is_primary_nurse: data.is_primary_nurse,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-assignments'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['patient-assignments-today'], exact: false });
      toast.success('Patient assigned successfully');
    },
    onError: (error: Error) => {
      console.error('Error assigning patient:', error);
      toast.error('Failed to assign patient');
    },
  });
};

export const useReassignPatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      newNurseId,
      reason,
    }: {
      assignmentId: string;
      newNurseId: string;
      reason: string;
    }) => {
      const currentUser = await supabase.auth.getUser();

      // Get the current assignment to find the patient and shift date
      const { data: assignment, error: fetchError } = await supabase
        .from('patient_assignments')
        .select('patient_id, nurse_id, shift_date')
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;

      // Create new assignment for the new nurse (marking as reassignment)
      const { error: insertError } = await supabase.from('patient_assignments').insert({
        patient_id: assignment.patient_id,
        nurse_id: newNurseId,
        assigned_by_id: currentUser.data.user?.id,
        shift_date: assignment.shift_date,
        reassigned_from_id: assignment.nurse_id,
        reassignment_reason: reason,
      });

      if (insertError) throw insertError;

      // Update the old assignment to mark it as superseded by setting reassigned_from_id
      // (This is handled by the new assignment's reassigned_from_id field)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-assignments'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['patient-assignments-today'], exact: false });
      toast.success('Patient reassigned successfully');
    },
    onError: (error: Error) => {
      console.error('Error reassigning patient:', error);
      toast.error('Failed to reassign patient');
    },
  });
};

export const useDeletePatientAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('patient_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-assignments'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['patient-assignments-today'], exact: false });
      toast.success('Patient assignment deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete patient assignment');
    },
  });
};

// Helper hook to fetch patient information by ID
export const usePatientInfo = (patientId?: string) => {
  return useQuery({
    queryKey: ['patient-info', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return data;
    },
  });
};

// Helper hook to fetch nurse/user information by ID
export const useUserInfo = (userId?: string) => {
  return useQuery({
    queryKey: ['user-info', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    },
  });
};

// Hook to fetch nursing tasks with enriched patient data
export const useNursingTasksWithPatients = (filters?: { status?: string; nurse_id?: string }) => {
  return useQuery({
    queryKey: ['nursing-tasks-with-patients', filters],
    queryFn: async () => {
      let query = supabase
        .from('nursing_tasks')
        .select('*')
        .order('due_time', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.nurse_id) {
        query = query.eq('assigned_nurse_id', filters.nurse_id);
      }

      const { data: tasks, error } = await query;

      if (error) {
        console.error('Error fetching nursing tasks:', error);
        throw error;
      }

      if (!tasks || tasks.length === 0) return [];

      // Fetch patient data for all tasks
      const patientIds = [...new Set(tasks.map(t => t.patient_id))];
      const { data: patients, error: patientError } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .in('id', patientIds);

      if (patientError) {
        console.error('Error fetching patients:', patientError);
        return tasks;
      }

      // Map patient data to tasks
      const patientMap = new Map(patients?.map(p => [p.id, p]) || []);
      
      return tasks.map(task => ({
        ...task,
        patient_first_name: patientMap.get(task.patient_id)?.first_name || 'Unknown',
        patient_last_name: patientMap.get(task.patient_id)?.last_name || 'Patient',
      }));
    },
  });
};

// Hook to fetch patient assignments with enriched patient data
export const usePatientAssignmentsWithPatients = (filters?: { shift_date?: string; nurse_id?: string }) => {
  return useQuery({
    queryKey: ['patient-assignments-with-patients', filters],
    queryFn: async () => {
      let query = supabase
        .from('patient_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.shift_date) {
        query = query.eq('shift_date', filters.shift_date);
      }

      if (filters?.nurse_id) {
        query = query.eq('nurse_id', filters.nurse_id);
      }

      const { data: assignments, error } = await query;

      if (error) {
        console.error('Error fetching patient assignments:', error);
        throw error;
      }

      if (!assignments || assignments.length === 0) return [];

      // Fetch patient data for all assignments
      const patientIds = [...new Set(assignments.map(a => a.patient_id))];
      const { data: patients, error: patientError } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .in('id', patientIds);

      if (patientError) {
        console.error('Error fetching patients:', patientError);
        return assignments;
      }

      // Map patient data to assignments
      const patientMap = new Map(patients?.map(p => [p.id, p]) || []);
      
      return assignments.map(assignment => ({
        ...assignment,
        patient_first_name: patientMap.get(assignment.patient_id)?.first_name || 'Unknown',
        patient_last_name: patientMap.get(assignment.patient_id)?.last_name || 'Patient',
      }));
    },
  });
};

// Hook to fetch care plans for a patient using direct POST to Supabase
export const useCarePlans = (patientId?: string) => {
  console.log('[useCarePlans] Hook called with patientId:', patientId);
  
  return useQuery({
    queryKey: ['care-plans', patientId],
    enabled: !!patientId,
    staleTime: 0,
    queryFn: async () => {
      if (!patientId) {
        console.log('[useCarePlans] No patientId provided, returning empty array');
        return [];
      }

      console.log(`[useCarePlans] Starting fetch for patient ${patientId}`);
      try {
        // Use supabase client directly - it handles auth automatically
        // @ts-expect-error - care_plans table exists in Supabase but TypeScript cache out of sync
        const { data, error } = await supabase.from('care_plans')
          .select('id, patient_id, care_goals, nursing_interventions, evaluation_criteria, status, created_at, updated_at, created_by')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[useCarePlans] Supabase error:', error);
          return [];
        }
        
        console.log(`[useCarePlans] Fetched ${data?.length || 0} care plans for patient ${patientId}:`, data);
        return data || [];
      } catch (err) {
        console.error('[useCarePlans] Fetch error:', err);
        return [];
      }
    },
  });
};

// Hook to create a medication administration task from a prescription
export const useCreateMedicationTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      prescriptionId,
      assignedNurseId,
      medicationName,
      dosage,
      route,
      frequency,
    }: {
      patientId: string;
      prescriptionId: string;
      assignedNurseId: string;
      medicationName: string;
      dosage: string;
      route: string;
      frequency: string;
    }) => {
      const currentUser = await supabase.auth.getUser();

      // Create a nursing task for medication administration
      const { error } = await supabase.from('nursing_tasks').insert({
        patient_id: patientId,
        assigned_nurse_id: assignedNurseId,
        assigned_by_id: currentUser.data.user?.id,
        title: `Administer ${medicationName} (${dosage} - ${route})`,
        description: `Prescription ID: ${prescriptionId}\nFrequency: ${frequency}\nAdminister ${medicationName} ${dosage} via ${route}`,
        priority: 'normal',
        status: 'pending',
        due_time: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks-for-nurse'], exact: false });
      toast.success('Medication administration task created');
    },
    onError: (error: Error) => {
      console.error('Error creating medication task:', error);
      toast.error('Failed to create medication task');
    },
  });
};

// ============================================================================
// NURSE REPORTS HOOKS
// ============================================================================

export interface NurseReport {
  id: string;
  nurse_id: string;
  title: string;
  description?: string;
  report_data: {
    tasks?: Array<Record<string, unknown>>;
    stats?: Record<string, unknown>;
    dateRange?: { from: string; to: string };
  };
  date_from?: string;
  date_to?: string;
  task_count: number;
  completed_count: number;
  pending_count: number;
  completion_rate: number;
  report_type: 'summary' | 'detailed' | 'custom';
  status: 'submitted' | 'reviewed' | 'archived';
  reviewed_by_id?: string;
  review_notes?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export const useNurseReports = (nurse_id?: string) => {
  return useQuery({
    queryKey: ['nurse-reports', nurse_id],
    enabled: !!nurse_id,
    queryFn: async () => {
      let query = supabase
        .from('nurse_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (nurse_id) {
        query = query.eq('nurse_id', nurse_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useNurseReports] Error fetching reports:', error);
        throw error;
      }

      return (data || []) as NurseReport[];
    },
  });
};

export const useCreateNurseReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportData: Omit<NurseReport, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('nurse_reports')
        .insert({
          ...reportData,
          nurse_id: user.user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-reports'], exact: false });
      toast.success('Report submitted successfully');
    },
    onError: (error: Error) => {
      console.error('[useCreateNurseReport] Error:', error);
      toast.error('Failed to submit report');
    },
  });
};

export const useUpdateNurseReportStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      review_notes,
    }: {
      reportId: string;
      status: 'submitted' | 'reviewed' | 'archived';
      review_notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (review_notes) {
        updateData.review_notes = review_notes;
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by_id = user.user?.id;
      }

      const { error } = await supabase
        .from('nurse_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-reports'], exact: false });
      toast.success('Report updated successfully');
    },
    onError: (error: Error) => {
      console.error('[useUpdateNurseReportStatus] Error:', error);
      toast.error('Failed to update report');
    },
  });
};

export const useDeleteNurseReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('nurse_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-reports'], exact: false });
      toast.success('Report deleted successfully');
    },
    onError: (error: Error) => {
      console.error('[useDeleteNurseReport] Error:', error);
      toast.error('Failed to delete report');
    },
  });
};
