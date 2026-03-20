import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TriageAssignment {
  id: string;
  patient_id: string;
  nurse_id: string;
  assigned_by_id: string;
  shift_date: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  is_primary_nurse: boolean;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  // Triage fields stored via notes/metadata
  chief_complaint?: string;
  vital_signs?: Record<string, any>;
  assessment_notes?: string;
  triage_completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
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

// Get all nurse assignments for current shift with triage status
export const useNurseTriageAssignments = (nursId?: string) => {
  return useQuery({
    queryKey: ['nurse-triage-assignments', nursId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('patient_assignments')
        .select('*')
        .eq('shift_date', today)
        .in('priority', ['low', 'normal', 'high', 'critical']); // Filter for actual assignments

      if (nursId) {
        query = query.eq('nurse_id', nursId);
      }

      const { data, error } = await query.order('priority', { ascending: false }).order('created_at', { ascending: true });

      if (error) {
        console.error('[useNurseTriageAssignments] Error:', error);
        throw error;
      }

      // Fetch patient and nurse details
      const patientIds = (data || []).map((entry: any) => entry.patient_id).filter(Boolean);
      const nurseIds = (data || []).map((entry: any) => entry.nurse_id).filter(Boolean);
      const assignedByIds = (data || []).map((entry: any) => entry.assigned_by_id).filter(Boolean);
      
      let patients: any = {};
      let nurses: any = {};
      let assignedByUsers: any = {};

      if (patientIds.length > 0) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number, date_of_birth')
          .in('id', patientIds);
        patients = (patientData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      if (nurseIds.length > 0) {
        const { data: nurseData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', nurseIds);
        nurses = (nurseData || []).reduce((acc: any, n: any) => {
          acc[n.user_id] = n;
          return acc;
        }, {});
      }

      if (assignedByIds.length > 0) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', assignedByIds);
        assignedByUsers = (userData || []).reduce((acc: any, u: any) => {
          acc[u.user_id] = u;
          return acc;
        }, {});
      }

      return (data || []).map((entry: any) => ({
        ...entry,
        patient: patients[entry.patient_id],
        nurse: nurses[entry.nurse_id],
        checked_in_by_user: assignedByUsers[entry.assigned_by_id],
      })) as TriageAssignment[];
    },
  });
};

// Get waiting patients (not yet assigned to a nurse)
export const useWaitingPatientCheckIns = () => {
  return useQuery({
    queryKey: ['waiting-patient-checkins'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all appointments for today with scheduled/confirmed status that haven't been assigned yet
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, appointment_date, appointment_time, reason')
        .eq('appointment_date', today)
        .in('status', ['scheduled', 'confirmed', 'waiting'])
        .order('appointment_time', { ascending: true });

      if (aptError) throw aptError;

      // Get patients already assigned today
      const { data: assignedPatients, error: assignError } = await supabase
        .from('patient_assignments')
        .select('patient_id')
        .eq('shift_date', today);

      if (assignError) throw assignError;

      const assignedPatientIds = new Set((assignedPatients || []).map(a => a.patient_id));

      // Filter to only unassigned patients
      const unassignedAppointments = (appointments || []).filter(
        apt => !assignedPatientIds.has(apt.patient_id)
      );

      // Fetch patient details
      const patientIds = [...new Set(unassignedAppointments.map(apt => apt.patient_id))];
      let patients: any = {};

      if (patientIds.length > 0) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number')
          .in('id', patientIds);
        patients = (patientData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      return unassignedAppointments.map(apt => ({
        appointmentId: apt.id,
        patient_id: apt.patient_id,
        doctor_id: apt.doctor_id,
        appointment_time: apt.appointment_time,
        reason: apt.reason,
        patient: patients[apt.patient_id],
      }));
    },
  });
};

// Assign patient to nurse (check-in with assignment)
export const useAssignPatientTriage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      patient_id: string;
      nurse_id: string;
      assigned_by_id: string;
      priority: 'low' | 'normal' | 'high' | 'critical';
      chief_complaint?: string;
      notes?: string;
    }) => {
      const today = new Date().toISOString().split('T')[0];

      // First, check if an assignment already exists for this patient on this shift
      const { data: existingAssignments, error: checkError } = await supabase
        .from('patient_assignments')
        .select('id')
        .eq('patient_id', data.patient_id)
        .eq('shift_date', today)
        .limit(1);

      if (checkError) throw checkError;

      // If an assignment already exists, update it instead of inserting
      if (existingAssignments && existingAssignments.length > 0) {
        const existingId = existingAssignments[0].id;
        const { error: updateError, data: updateData } = await supabase
          .from('patient_assignments')
          .update({
            nurse_id: data.nurse_id,
            assigned_by_id: data.assigned_by_id,
            priority: data.priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingId)
          .select();

        if (updateError) throw updateError;

        return updateData?.[0];
      }

      // Otherwise create a new assignment
      const { error: assignError, data: assignData } = await supabase
        .from('patient_assignments')
        .insert({
          patient_id: data.patient_id,
          nurse_id: data.nurse_id,
          assigned_by_id: data.assigned_by_id,
          shift_date: today,
          priority: data.priority,
          is_primary_nurse: true,
        })
        .select();

      if (assignError) throw assignError;

      // Optionally store chief complaint in nursing task
      if (data.chief_complaint) {
        await supabase
          .from('nursing_tasks')
          .insert({
            patient_id: data.patient_id,
            assigned_nurse_id: data.nurse_id,
            assigned_by_id: data.assigned_by_id,
            title: `Triage - ${data.chief_complaint}`,
            description: data.chief_complaint,
            priority: data.priority,
            status: 'pending',
            due_time: new Date().toISOString(),
          });
      }

      return assignData?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-triage-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['waiting-patient-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks'] });
      toast.success('Patient assigned to nurse for triage');
    },
    onError: (error: Error) => {
      console.error('[useAssignPatientTriage] Error:', error);
      toast.error(`Failed to assign patient: ${error.message}`);
    },
  });
};

// Start triage (nurse begins working on patient)
export const useStartTriage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('patient_assignments')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-triage-assignments'] });
      toast.success('Started triage assessment');
    },
    onError: (error: Error) => toast.error(`Failed to start triage: ${error.message}`),
  });
};

// Complete triage (record vital signs and assessment)
export const useCompleteTriage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      assignmentId: string;
      patientId?: string;
      vital_signs?: Record<string, any>;
      assessment_notes?: string;
    }) => {
      // Update the assignment
      const { error: assignError } = await supabase
        .from('patient_assignments')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.assignmentId);

      if (assignError) throw assignError;

      // Save vitals to vitals table if provided
      if (data.patientId && data.vital_signs) {
        const { error: vitalsError } = await (supabase as any)
          .from('vitals')
          .insert({
            patient_id: data.patientId,
            temperature: data.vital_signs.temperature,
            blood_pressure_systolic: data.vital_signs.systolic_bp,
            blood_pressure_diastolic: data.vital_signs.diastolic_bp,
            heart_rate: data.vital_signs.heart_rate,
            oxygen_saturation: data.vital_signs.oxygen_saturation,
            respiratory_rate: data.vital_signs.respiratory_rate,
            weight: data.vital_signs.weight,
            height: data.vital_signs.height,
            recorded_at: data.vital_signs.recorded_at || new Date().toISOString(),
          });

        if (vitalsError) {
          console.error('Error saving vitals:', vitalsError);
          // Don't fail the whole operation if vitals save fails
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-triage-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-latest-vitals'] });
      queryClient.invalidateQueries({ queryKey: ['waiting-patients'] });
      queryClient.invalidateQueries({ queryKey: ['reception-today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['reception-waiting-patients'] });
      toast.success('Triage assessment completed and vitals recorded');
    },
    onError: (error: Error) => toast.error(`Failed to complete triage: ${error.message}`),
  });
};

// Fetch latest vitals for a patient
export const usePatientLatestVitals = (patientId?: string) => {
  return useQuery({
    queryKey: ['patient-latest-vitals', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      if (!patientId) return null;

      const { data, error } = await (supabase as any)
        .from('vitals')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(1);

      // If no error but no data, return null (patient has no vitals yet)
      if (error) {
        console.error('[usePatientLatestVitals] Error fetching vitals:', error);
        return null;
      }

      // Return the first record if it exists, otherwise null
      return data && data.length > 0 ? data[0] : null;
    },
  });
};
