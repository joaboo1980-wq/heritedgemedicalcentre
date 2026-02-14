import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ScheduledDose = {
  id: string;
  prescription_item_id: string;
  prescription_id: string;
  patient_id: string;
  scheduled_time: string;
  dosage: string;
  frequency: string;
  route: string;
  status: 'pending' | 'due' | 'administered' | 'skipped' | 'cancelled';
  administered_at: string | null;
  administered_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MedicationAdministrationLog = {
  id: string;
  prescription_item_id: string;
  patient_id: string;
  administered_by_id: string;
  administered_at: string;
  dosage_given: string;
  route: string;
  notes: string | null;
  status: 'administered' | 'skipped' | 'refused' | 'delayed';
  reason_if_skipped: string | null;
  created_at: string;
};

// Hook to fetch scheduled doses for a patient or nurse
export const useScheduledDoses = (filters?: {
  patientId?: string;
  status?: string;
  dateRange?: { from: Date; to: Date };
}) => {
  return useQuery({
    queryKey: ['scheduled-doses', filters],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('scheduled_doses')
        .select(
          `
          *,
          prescription_items!prescription_item_id (
            medication_id,
            dosage,
            frequency,
            medications!medication_id (
              name,
              description,
              contraindications
            )
          ),
          prescriptions!prescription_id (
            doctor_id,
            status,
            issued_date,
            expiry_date
          )
        `
        );

      if (filters?.patientId) {
        query = query.eq('patient_id', filters.patientId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateRange) {
        query = query.gte('scheduled_time', filters.dateRange.from.toISOString());
        query = query.lte('scheduled_time', filters.dateRange.to.toISOString());
      }

      const { data, error } = await query.order('scheduled_time', { ascending: true });

      if (error) {
        console.error('[useScheduledDoses] Error:', error);
        throw new Error(`Failed to fetch scheduled doses: ${error.message}`);
      }

      return data as ScheduledDose[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch due medications (for nurses)
export const useDueMedications = (patientId?: string) => {
  return useQuery({
    queryKey: ['due-medications', patientId],
    queryFn: async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('scheduled_doses')
        .select(
          `
          *,
          prescription_items!prescription_item_id (
            medication_id,
            dosage,
            frequency,
            medications!medication_id (
              name,
              description
            )
          ),
          prescriptions!prescription_id (
            status
          )
        `
        )
        .in('status', ['due', 'pending']);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      query = query.lte('scheduled_time', now.toISOString());

      const { data, error } = await query.order('scheduled_time', { ascending: true });

      if (error) {
        console.error('[useDueMedications] Error:', error);
        throw new Error(`Failed to fetch due medications: ${error.message}`);
      }

      return data as ScheduledDose[];
    },
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook to record medication administration
export const useRecordMedicationAdministration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      scheduledDoseId: string;
      dosageGiven: string;
      route: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error('User not authenticated');

      console.log('[useRecordMedicationAdministration] Recording dose:', data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .rpc('record_medication_administration', {
          p_scheduled_dose_id: data.scheduledDoseId,
          p_prescribed_by_id: user.user.id,
          p_dosage_given: data.dosageGiven,
          p_route: data.route,
          p_notes: data.notes || null,
        });

      if (error) {
        console.error('[useRecordMedicationAdministration] Error:', error);
        throw new Error(`Failed to record administration: ${error.message}`);
      }

      return result;
    },
    onSuccess: (data) => {
      console.log('[useRecordMedicationAdministration] Success:', data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['scheduled-doses'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['due-medications'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['medication-audit-log'], exact: false });
      toast.success('Medication administration recorded');
    },
    onError: (error: Error) => {
      console.error('[useRecordMedicationAdministration] Failed:', error);
      toast.error(`Failed to record administration: ${error.message}`);
    },
  });
};

// Hook to fetch medication administration history/audit log
export const useMedicationAuditLog = (filters?: {
  patientId?: string;
  administeredById?: string;
  dateRange?: { from: Date; to: Date };
}) => {
  return useQuery({
    queryKey: ['medication-audit-log', filters],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('medication_administration_log')
        .select(
          `
          *,
          prescription_items!prescription_item_id (
            medication_id,
            dosage,
            medications!medication_id (
              name,
              description
            )
          ),
          patients!patient_id (
            first_name,
            last_name
          ),
          auth.users!administered_by_id (
            email
          )
        `
        );

      if (filters?.patientId) {
        query = query.eq('patient_id', filters.patientId);
      }

      if (filters?.administeredById) {
        query = query.eq('administered_by_id', filters.administeredById);
      }

      if (filters?.dateRange) {
        query = query.gte('created_at', filters.dateRange.from.toISOString());
        query = query.lte('created_at', filters.dateRange.to.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[useMedicationAuditLog] Error:', error);
        throw new Error(`Failed to fetch audit log: ${error.message}`);
      }

      return data as MedicationAdministrationLog[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to skip/refuse a scheduled dose
export const useSkipScheduledDose = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { scheduledDoseId: string; reason: string }) => {
      console.log('[useSkipScheduledDose] Skipping dose:', data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from('scheduled_doses')
        .update({
          status: 'skipped',
          notes: data.reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.scheduledDoseId);

      if (error) {
        console.error('[useSkipScheduledDose] Error:', error);
        throw new Error(`Failed to skip dose: ${error.message}`);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-doses'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['due-medications'], exact: false });
      toast.success('Dose marked as skipped');
    },
    onError: (error: Error) => {
      console.error('[useSkipScheduledDose] Failed:', error);
      toast.error(`Failed to skip dose: ${error.message}`);
    },
  });
};

// Hook to fetch medication history for a patient
export const usePatientMedicationHistory = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-medication-history', patientId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('scheduled_doses')
        .select(
          `
          *,
          prescription_items!prescription_item_id (
            dosage,
            frequency,
            medications!medication_id (
              name
            )
          ),
          prescriptions!prescription_id (
            doctor_id,
            issued_date
          )
        `
        )
        .eq('patient_id', patientId)
        .in('status', ['administered', 'skipped'])
        .order('scheduled_time', { ascending: false });

      if (error) {
        console.error('[usePatientMedicationHistory] Error:', error);
        throw new Error(`Failed to fetch medication history: ${error.message}`);
      }

      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Hook to generate scheduled doses for a prescription
export const useGenerateScheduledDoses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      prescriptionId: string;
      prescriptionItemId: string;
      patientId: string;
      daysAhead?: number;
    }) => {
      console.log('[useGenerateScheduledDoses] Generating doses:', data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any).rpc(
        'generate_scheduled_doses_for_prescription',
        {
          p_prescription_id: data.prescriptionId,
          p_prescription_item_id: data.prescriptionItemId,
          p_patient_id: data.patientId,
          p_start_date: new Date().toISOString(),
          p_days_ahead: data.daysAhead || 30,
        }
      );

      if (error) {
        console.error('[useGenerateScheduledDoses] Error:', error);
        throw new Error(`Failed to generate doses: ${error.message}`);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-doses'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['due-medications'], exact: false });
      toast.success('Medication schedule generated');
    },
    onError: (error: Error) => {
      console.error('[useGenerateScheduledDoses] Failed:', error);
      toast.error(`Failed to generate schedule: ${error.message}`);
    },
  });
};
