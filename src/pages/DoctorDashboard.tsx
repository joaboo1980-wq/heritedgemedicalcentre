// export default DoctorDashboard;
import React, { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,

} from '@heroicons/react/24/solid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { usePatientLatestVitals } from '@/hooks/useNurseTriageAssignment';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PatientConsultationHistory } from '@/components/doctor/PatientConsultationHistory';
import { toast } from 'sonner';
import { format } from 'date-fns';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Appointment {
  id: string;
  appointment_time: string;
  appointment_date: string;
  doctor_id: string;
  status: string;
  reason: string | null;
  notes: string | null;
  duration_minutes: number | null;
  patients: { first_name: string; last_name: string; patient_number: string } | null;
  patient_name: string;
  patient_id: string;
}

interface Patient {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_type: string | null;
}

interface Prescription {
  id: string;
  patient_id: string;
  medicine_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: string;
  prescribed_date: string;
  patients: { first_name: string; last_name: string } | null;
  medications: { name: string } | null;
  patient_name: string;
  medicine_name: string;
}

interface LabResult {
  id: string;
  order_number: string;
  patient_id: string;
  patient_name: string;
  test_type: string;
  result_date: string | null;
  created_at: string;
  status: string;
  priority: string;
  result_value: string | null;
  result_notes: string | null;
  is_abnormal: boolean | null;
  sample_collected_at: string | null;
}

interface MedicalExamination {
  id: string;
  patient_id: string;
  examination_date: string;
  chief_complaint: string;
  assessment_diagnosis: string;
  history_of_present_illness: string | null;
  past_medical_history: string | null;
  past_surgical_history: string | null;
  medication_list: string | null;
  allergies: string | null;
  family_history: string | null;
  social_history: string | null;
  general_appearance: string | null;
  heent_examination: string | null;
  cardiovascular_examination: string | null;
  respiratory_examination: string | null;
  abdominal_examination: string | null;
  neurological_examination: string | null;
  musculoskeletal_examination: string | null;
  skin_examination: string | null;
  other_systems: string | null;
  triage_temperature: number | null;
  triage_blood_pressure: string | null;
  triage_pulse_rate: number | null;
  triage_respiratory_rate: number | null;
  triage_oxygen_saturation: number | null;
  triage_weight: number | null;
  triage_height: number | null;
  triage_bmi: number | null;
  triage_notes: string | null;
  plan_treatment: string | null;
  medications_prescribed: string | null;
  follow_up_date: string | null;
  referrals: string | null;
  patients: { first_name: string; last_name: string } | null;
  patient_name: string;
}

const DoctorDashboard = () => {
  const { user } = useAuth();
  const { hasPermission, canAccessModule } = usePermissions();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // State for UI
  const [activeTab, setActiveTab] = useState<'appointments' | 'patients' | 'prescriptions' | 'lab-tests' | 'lab-results' | 'consultations'>(
    'appointments'
  );
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [appointmentDialog, setAppointmentDialog] = useState(false);
  const [cancelAppointmentDialog, setCancelAppointmentDialog] = useState(false);
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [selectedLabResult, setSelectedLabResult] = useState<LabResult | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isViewExaminationModalOpen, setIsViewExaminationModalOpen] = useState(false);
  const [isEditExaminationModalOpen, setIsEditExaminationModalOpen] = useState(false);
  const [isDeleteExaminationDialogOpen, setIsDeleteExaminationDialogOpen] = useState(false);
  const [isNewExaminationModalOpen, setIsNewExaminationModalOpen] = useState(false);
  const [selectedExamination, setSelectedExamination] = useState<MedicalExamination | null>(null);
  const [editingExamination, setEditingExamination] = useState<Partial<MedicalExamination> | null>(null);
  const [newExaminationForm, setNewExaminationForm] = useState({
    patient_id: '',
    chief_complaint: '',
    assessment_diagnosis: '',
    history_of_present_illness: '',
    triage_temperature: '',
    triage_blood_pressure: '',
    triage_pulse_rate: '',
    triage_respiratory_rate: '',
    triage_oxygen_saturation: '',
    triage_weight: '',
    triage_height: '',
    plan_treatment: '',
    medications_prescribed: '',
    follow_up_date: '',
    referrals: '',
  });
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPrescriptionPatient, setSelectedPrescriptionPatient] = useState<Patient | null>(null);
  const [selectedEditingPrescription, setSelectedEditingPrescription] = useState<Prescription | null>(null);
  const [medicationSearch, setMedicationSearch] = useState('');
  const [showMedicationList, setShowMedicationList] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    patient_id: '',
    medicines: [] as Array<{
      medicine_id: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>,
  });
  const [selectedMedicationDetails, setSelectedMedicationDetails] = useState<Array<{ id: string; name: string; strength: string; form: string }>>([]);

  // Diagnosis form state
  const [diagnosisForm, setDiagnosisForm] = useState({
    chief_complaint: '',
    history_of_present_illness: '',
    past_medical_history: '',
    past_surgical_history: '',
    medication_list: '',
    allergies: '',
    family_history: '',
    social_history: '',
    general_appearance: '',
    heent_examination: '',
    cardiovascular_examination: '',
    respiratory_examination: '',
    abdominal_examination: '',
    neurological_examination: '',
    musculoskeletal_examination: '',
    skin_examination: '',
    other_systems: '',
    triage_temperature: '',
    triage_blood_pressure: '',
    triage_pulse_rate: '',
    triage_respiratory_rate: '',
    triage_oxygen_saturation: '',
    triage_weight: '',
    triage_height: '',
    triage_bmi: '',
    triage_notes: '',
    assessment_diagnosis: '',
    plan_treatment: '',
    medications_prescribed: '',
    follow_up_date: '',
    referrals: '',
  });

  // ===== LAB ORDER FORM STATE =====
  const [isAddLabOrderDialogOpen, setIsAddLabOrderDialogOpen] = useState(false);
  const [isViewLabOrderModalOpen, setIsViewLabOrderModalOpen] = useState(false);
  const [isEditLabOrderModalOpen, setIsEditLabOrderModalOpen] = useState(false);
  const [isCancelLabOrderDialogOpen, setIsCancelLabOrderDialogOpen] = useState(false);
  const [testSearch, setTestSearch] = useState('');
  const [showTestList, setShowTestList] = useState(false);
  const [selectedLabOrder, setSelectedLabOrder] = useState<LabResult | null>(null);
  const [newLabOrder, setNewLabOrder] = useState({
    patient_id: '',
    test_ids: [] as string[], // Array for multiple tests
    priority: 'normal',
  });
  const [editLabOrderForm, setEditLabOrderForm] = useState({
    priority: 'normal',
    result_value: '',
    result_notes: '',
    is_abnormal: false,
  });
  const [selectedTestDetails, setSelectedTestDetails] = useState<Array<{ id: string; name: string; code: string; price: number }>>([]);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());

  const doctorId = user?.id;
  const doctorName = user?.user_metadata?.full_name || '';

  // ===== APPOINTMENTS QUERY =====
  const { data: appointments, isLoading: loadingAppointments } = useQuery<Appointment[]>({
    queryKey: ['doctor-today-appointments', doctorId, today],
    queryFn: async () => {
      if (!doctorId) return [];
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(
            `id, appointment_time, appointment_date, doctor_id, status, reason, notes, 
             duration_minutes, patient_id, patients(first_name, last_name, patient_number)`
          )
          .eq('doctor_id', doctorId)
          .eq('appointment_date', today)
          .order('appointment_time', { ascending: true });

        if (error) {
          console.error('[DoctorDashboard] Error fetching appointments:', error);
          throw error;
        }
        return (data || []).map((a: any) => ({
          ...a,
          patient_name: a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : 'Unknown',
        }));
      } catch (err) {
        console.error('[DoctorDashboard] Appointments query failed:', err);
        throw err;
      }
    },
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  // ===== ACTIVE PATIENTS QUERY =====
  const { data: activePatients, isLoading: loadingPatients } = useQuery<Patient[]>({
    queryKey: ['doctor-active-patients', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      try {
        // Get all patients and filter those with appointments from this doctor
        const { data, error } = await supabase
          .from('patients')
          .select('id, patient_number, first_name, last_name, date_of_birth, gender, blood_type');

        if (error) {
          console.error('[DoctorDashboard] Error fetching patients:', error);
          throw error;
        }
        return data || [];
      } catch (err) {
        console.error('[DoctorDashboard] Patients query failed:', err);
        throw err;
      }
    },
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  // ===== PRESCRIPTIONS QUERY =====
 const { data: activePrescriptions, isLoading: loadingPrescriptions } = useQuery<any[]>({
  queryKey: ['doctor-active-prescriptions', doctorId],
  queryFn: async () => {
    if (!doctorId) return [];
    try {
      const { data, error } = await (supabase as any)
        .from('prescriptions')
        .select(
          'id, patient_id, status, created_at, patients(first_name, last_name), prescription_items(medication_id, dosage, frequency, duration, medications(name))'
        )
        .eq('doctor_id', doctorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DoctorDashboard] Error fetching prescriptions:', error);
        throw error;
      }
      return (data || []).flatMap((p: any) => 
        (p.prescription_items || []).map((item: any) => ({
          id: p.id,
          patient_id: p.patient_id,
          medicine_id: item.medication_id,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          status: p.status,
          prescribed_date: p.created_at,
          patient_name: p.patients ? `${p.patients.first_name} ${p.patients.last_name}` : 'Unknown',
          medicine_name: item.medications?.name || 'Unknown',
        }))
      );
    } catch (err) {
      console.error('[DoctorDashboard] Prescriptions query failed:', err);
      throw err;
    }
  },
  enabled: !!doctorId,
  refetchInterval: 60000,
});

  // ===== LAB RESULTS QUERY =====
  const { data: labResults, isLoading: loadingLabResults } = useQuery<LabResult[]>({
    queryKey: ['doctor-lab-results', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      try {
        const { data, error } = await supabase
          .from('lab_orders')
          .select(
            `id, order_number, patient_id, status, priority, result_value, result_notes, 
             is_abnormal, completed_at, sample_collected_at, created_at,
             patients(first_name, last_name), lab_tests(test_name)`
          )
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[DoctorDashboard] Error fetching lab results:', error);
          throw error;
        }
        return (data || []).map((lr: any) => ({
          id: lr.id,
          order_number: lr.order_number,
          patient_id: lr.patient_id,
          patient_name: lr.patients ? `${lr.patients.first_name} ${lr.patients.last_name}` : 'Unknown',
          test_type: lr.lab_tests?.test_name || 'Unknown',
          result_date: lr.completed_at,
          created_at: lr.created_at,
          status: lr.status,
          priority: lr.priority,
          result_value: lr.result_value,
          result_notes: lr.result_notes,
          is_abnormal: lr.is_abnormal,
          sample_collected_at: lr.sample_collected_at,
        }));
      } catch (err) {
        console.error('[DoctorDashboard] Lab results query failed:', err);
        throw err;
      }
    },
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  // ===== LAB TESTS CATALOG QUERY =====
  const { data: labTests, isLoading: testsLoading } = useQuery({
    queryKey: ['lab-tests'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('lab_tests')
          .select('id, test_code, test_name, category, price')
          .order('test_code');
        
        if (error) {
          console.error('[DoctorDashboard] Lab tests fetch error:', error);
          throw error;
        }
        
        return data || [];
      } catch (err) {
        console.error('[DoctorDashboard] Lab tests query failed:', err);
        return [];
      }
    },
  });

  // Filter tests based on search term
  const filteredTests = labTests?.filter(t =>
    t.test_name.toLowerCase().includes(testSearch.toLowerCase()) ||
    t.test_code.toLowerCase().includes(testSearch.toLowerCase()) ||
    t.category.toLowerCase().includes(testSearch.toLowerCase())
  ) || [];

  // ===== PATIENTS LIST QUERY =====
  const { data: patientsList } = useQuery({
    queryKey: ['patients-list-for-lab'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number')
          .order('first_name');
        
        if (error) {
          console.error('[DoctorDashboard] Patients list fetch error:', error);
          throw error;
        }
        
        return data || [];
      } catch (err) {
        console.error('[DoctorDashboard] Patients list query failed:', err);
        return [];
      }
    },
  });

  // ===== PATIENT LAB ORDERS QUERY =====
  const { data: patientLabOrders } = useQuery({
    queryKey: ['patient-lab-orders', selectedLabOrder?.patient_id],
    queryFn: async () => {
      if (!selectedLabOrder?.patient_id) return [];
      try {
        const { data, error } = await supabase
          .from('lab_orders')
          .select('id, order_number, patient_id, status, priority, result_value, result_notes, is_abnormal, created_at, patients(first_name, last_name), lab_tests(test_name, test_code, category)')
          .eq('patient_id', selectedLabOrder.patient_id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('[DoctorDashboard] Patient lab orders fetch error:', error);
          throw error;
        }
        
        return data || [];
      } catch (err) {
        console.error('[DoctorDashboard] Patient lab orders query failed:', err);
        return [];
      }
    },
    enabled: !!selectedLabOrder?.patient_id,
  });

  // ===== CANCEL LAB ORDER MUTATION =====
  const cancelLabOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      try {
        const { error } = await supabase
          .from('lab_orders')
          .update({ status: 'cancelled' })
          .eq('id', orderId);
        
        if (error) {
          console.error('[DoctorDashboard] Error cancelling lab order:', error);
          throw error;
        }
        console.log('[DoctorDashboard] Lab order cancelled successfully');
      } catch (err) {
        console.error('[DoctorDashboard] Lab order cancellation failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-lab-results'] });
      queryClient.invalidateQueries({ queryKey: ['patient-lab-orders'] });
      setIsCancelLabOrderDialogOpen(false);
      setSelectedLabOrder(null);
      toast.success('Lab order cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel lab order: ${error.message}`);
    },
  });

  const editLabOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: any }) => {
      try {
        const { error } = await supabase
          .from('lab_orders')
          .update(updates)
          .eq('id', orderId);
        
        if (error) {
          console.error('[DoctorDashboard] Error updating lab order:', error);
          throw error;
        }
        console.log('[DoctorDashboard] Lab order updated successfully');
      } catch (err) {
        console.error('[DoctorDashboard] Lab order update failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-lab-results'] });
      queryClient.invalidateQueries({ queryKey: ['patient-lab-orders'] });
      setIsEditLabOrderModalOpen(false);
      setSelectedLabOrder(null);
      setEditLabOrderForm({
        priority: 'normal',
        result_value: '',
        result_notes: '',
        is_abnormal: false,
      });
      toast.success('Lab order updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update lab order: ${error.message}`);
    },
  });

  // ===== MEDICAL EXAMINATIONS QUERY =====
  const { data: medicalExaminations, isLoading: loadingExaminations } = useQuery<MedicalExamination[]>({
    queryKey: ['doctor-medical-examinations', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      try {
        console.log('[DoctorDashboard] Fetching medical examinations for doctor:', doctorId);
        const { data, error } = await (supabase as any)
          .from('medical_examinations')
          .select(
            `id, patient_id, examination_date, chief_complaint, assessment_diagnosis,
             triage_temperature, triage_blood_pressure, triage_pulse_rate, plan_treatment,
             patients(first_name, last_name)`
          )
          .eq('examined_by', doctorId)
          .order('examination_date', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[DoctorDashboard] Error fetching medical examinations:', error);
          throw error;
        }
        
        console.log('[DoctorDashboard] Medical examinations fetched:', data?.length, 'records');
        
        const mapped = (data || []).map((me: any) => ({
          ...me,
          patient_name: me.patients ? `${me.patients.first_name} ${me.patients.last_name}` : 'Unknown',
        }));
        
        console.log('[DoctorDashboard] Mapped examinations:', mapped);
        
        return mapped;
      } catch (err) {
        console.error('[DoctorDashboard] Medical examinations query failed:', err);
        throw err;
      }
    },
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  // ===== PATIENT EXAMINATIONS QUERY =====
  const { data: patientExaminations, isLoading: loadingPatientExaminations } = useQuery<MedicalExamination[]>({
    queryKey: ['patient-examinations', newExaminationForm.patient_id],
    queryFn: async () => {
      if (!newExaminationForm.patient_id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from('medical_examinations')
          .select(
            `id, patient_id, examination_date, chief_complaint, assessment_diagnosis,
             history_of_present_illness, past_medical_history, past_surgical_history,
             medication_list, allergies, family_history, social_history,
             general_appearance, heent_examination, cardiovascular_examination,
             respiratory_examination, abdominal_examination, neurological_examination,
             musculoskeletal_examination, skin_examination, other_systems,
             triage_temperature, triage_blood_pressure, triage_pulse_rate,
             triage_respiratory_rate, triage_oxygen_saturation, triage_weight,
             triage_height, triage_bmi, triage_notes, plan_treatment,
             medications_prescribed, follow_up_date, referrals,
             patients(first_name, last_name)`
          )
          .eq('patient_id', newExaminationForm.patient_id)
          .order('examination_date', { ascending: false });

        if (error) {
          console.error('[DoctorDashboard] Error fetching patient examinations:', error);
          throw error;
        }
        return (data || []).map((me: any) => ({
          ...me,
          patient_name: me.patients ? `${me.patients.first_name} ${me.patients.last_name}` : 'Unknown',
        }));
      } catch (err) {
        console.error('[DoctorDashboard] Patient examinations query failed:', err);
        throw err;
      }
    },
    enabled: !!newExaminationForm.patient_id,
  });

  // ===== VITALS QUERY FOR NEW EXAMINATION FORM =====
  const selectedPatientIdForExam = newExaminationForm.patient_id || undefined;
  const { data: latestVitals, isLoading: vitalsLoading } = usePatientLatestVitals(selectedPatientIdForExam);

  // Auto-fill vitals when patient is selected in new examination form
  useEffect(() => {
    if (selectedPatientIdForExam && latestVitals) {
      const vitals: any = latestVitals;
      
      // Only update fields that have values, preserve existing form state
      const updates: any = {};
      
      if (vitals?.temperature) {
        updates.triage_temperature = String(vitals.temperature);
      }
      
      if (vitals?.blood_pressure_systolic && vitals?.blood_pressure_diastolic) {
        updates.triage_blood_pressure = `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}`;
      }
      
      if (vitals?.heart_rate) {
        updates.triage_pulse_rate = String(vitals.heart_rate);
      }
      
      if (vitals?.respiratory_rate) {
        updates.triage_respiratory_rate = String(vitals.respiratory_rate);
      }
      
      if (vitals?.oxygen_saturation) {
        updates.triage_oxygen_saturation = String(vitals.oxygen_saturation);
      }
      
      if (vitals?.weight) {
        updates.triage_weight = String(vitals.weight);
      }
      
      if (vitals?.height) {
        updates.triage_height = String(vitals.height);
      }

      // Only update if we have at least one field to fill
      if (Object.keys(updates).length > 0) {
        setNewExaminationForm((prev) => ({
          ...prev,
          ...updates,
        }));
      }
    }
  }, [selectedPatientIdForExam, latestVitals]);

  // ===== MUTATIONS =====
  const confirmAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'confirmed' })
          .eq('id', appointmentId);
        if (error) throw error;
      } catch (err) {
        console.error('[DoctorDashboard] Confirm appointment error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-today-appointments'] });
      toast.success('Appointment confirmed');
      setSelectedAppointment(null);
      setAppointmentDialog(false);
    },
    onError: (error: any) => {
      console.error('[DoctorDashboard] Confirm appointment failed:', error);
      toast.error(error?.message || 'Failed to confirm appointment');
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointmentId);
        if (error) throw error;
      } catch (err) {
        console.error('[DoctorDashboard] Cancel appointment error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-today-appointments'] });
      toast.success('Appointment cancelled');
      setSelectedAppointment(null);
      setCancelAppointmentDialog(false);
    },
    onError: (error: any) => {
      console.error('[DoctorDashboard] Cancel appointment failed:', error);
      toast.error(error?.message || 'Failed to cancel appointment');
    },
  });

  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, date, time }: { appointmentId: string; date: string; time: string }) => {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ appointment_date: date, appointment_time: time + ':00', status: 'scheduled' })
          .eq('id', appointmentId);
        if (error) throw error;
      } catch (err) {
        console.error('[DoctorDashboard] Reschedule appointment error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-today-appointments'] });
      toast.success('Appointment rescheduled');
      setSelectedAppointment(null);
      setRescheduleDialog(false);
    },
    onError: (error: any) => {
      console.error('[DoctorDashboard] Reschedule appointment failed:', error);
      toast.error(error?.message || 'Failed to reschedule appointment');
    },
  });

  const createDiagnosisMutation = useMutation({
    mutationFn: async (examinationData: any) => {
    const { data, error } = await (supabase as any)
      .from('medical_examinations')
      .insert([
        {
          patient_id: selectedPatient?.id,
          examined_by: doctorId,
          examination_date: new Date().toISOString(),
          ...examinationData,
        },
      ]);
    if (error) throw error;
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-examinations'] });
      toast.success('Examination record created successfully');
      setIsDiagnosisModalOpen(false);
      setDiagnosisForm({
        chief_complaint: '',
        history_of_present_illness: '',
        past_medical_history: '',
        past_surgical_history: '',
        medication_list: '',
        allergies: '',
        family_history: '',
        social_history: '',
        general_appearance: '',
        heent_examination: '',
        cardiovascular_examination: '',
        respiratory_examination: '',
        abdominal_examination: '',
        neurological_examination: '',
        musculoskeletal_examination: '',
        skin_examination: '',
        other_systems: '',
        triage_temperature: '',
        triage_blood_pressure: '',
        triage_pulse_rate: '',
        triage_respiratory_rate: '',
        triage_oxygen_saturation: '',
        triage_weight: '',
        triage_height: '',
        triage_bmi: '',
        triage_notes: '',
        assessment_diagnosis: '',
        plan_treatment: '',
        medications_prescribed: '',
        follow_up_date: '',
        referrals: '',
      });
    },
    onError: () => {
      toast.error('Failed to create examination record');
    },
  });

const { data: availableMedications, isLoading: loadingMedications } = useQuery({
  queryKey: ['available-medications'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('medications')
      .select('id, name, strength, form, category')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
});

  // Filter medications based on search term
  const filteredMedications = availableMedications?.filter(m =>
    m.name.toLowerCase().includes(medicationSearch.toLowerCase()) ||
    m.strength.toLowerCase().includes(medicationSearch.toLowerCase()) ||
    m.form.toLowerCase().includes(medicationSearch.toLowerCase())
  ) || [];


const createPrescriptionMutation = useMutation({
  mutationFn: async (prescriptionData: any) => {
    // Validate that we have a doctor ID
    if (!prescriptionData.doctor_user_id) {
      throw new Error('Doctor information is missing. Please ensure you are logged in as a doctor.');
    }

    if (!prescriptionData.patient_id) {
      throw new Error('Patient ID is required');
    }

    if (!prescriptionData.medicines || prescriptionData.medicines.length === 0) {
      throw new Error('At least one medication is required');
    }

    // Create the prescription record
    // The prescriptions table expects: patient_id, doctor_id, status
    // prescription_items table contains: prescription_id, medication_id, dosage, frequency, duration
    const { data: prescriptionResponse, error: prescriptionError } = await (supabase as any)
      .from('prescriptions')
      .insert({
        patient_id: prescriptionData.patient_id,
        doctor_id: prescriptionData.doctor_user_id, // Using doctor_id as per the actual table structure
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (prescriptionError) {
      console.error('[DoctorDashboard] Prescription insert error:', prescriptionError);
      throw prescriptionError;
    }

    // Now create prescription items for each medicine
    const prescriptionItems = prescriptionData.medicines.map((med: any) => ({
      prescription_id: prescriptionResponse.id,
      medication_id: med.medicine_id,
      dosage: med.dosage || null,
      frequency: med.frequency || null,
      duration: med.duration || null,
    }));

    const { error: itemError } = await (supabase as any)
      .from('prescription_items')
      .insert(prescriptionItems);

    if (itemError) {
      console.error('[DoctorDashboard] Prescription items insert error:', itemError);
      throw itemError;
    }

    return prescriptionResponse;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['doctor-active-prescriptions', doctorId] });
    toast.success('Prescriptions created successfully');
    setIsPrescriptionModalOpen(false);
    setPrescriptionForm({
      patient_id: '',
      medicines: [],
    });
    setSelectedMedicationDetails([]);
    setMedicationSearch('');
    setShowMedicationList(false);
    setSelectedPrescriptionPatient(null);
  },
  onError: (error: Error) => {
    console.error('[DoctorDashboard] Prescription creation error:', error);
    toast.error('Failed to create prescription: ' + error.message);
  },
});

const updatePrescriptionMutation = useMutation({
  mutationFn: async (prescriptionData: any) => {
    if (!prescriptionData.prescription_id) {
      throw new Error('Prescription ID is required');
    }

    // Update prescription_items with new medication details
    const { error: itemError } = await (supabase as any)
      .from('prescription_items')
      .update({
        medication_id: prescriptionData.medicine_id,
        dosage: prescriptionData.dosage || null,
        frequency: prescriptionData.frequency || null,
        duration: prescriptionData.duration || null,
      })
      .eq('prescription_id', prescriptionData.prescription_id);

    if (itemError) {
      console.error('[DoctorDashboard] Prescription item update error:', itemError);
      throw itemError;
    }

    return { id: prescriptionData.prescription_id };
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['doctor-active-prescriptions', doctorId] });
    toast.success('Prescription updated successfully');
    setIsPrescriptionModalOpen(false);
    setSelectedEditingPrescription(null);
    setPrescriptionForm({
      patient_id: '',
      medicines: [],
    });
    setSelectedMedicationDetails([]);
  },
  onError: (error: Error) => {
    console.error('[DoctorDashboard] Prescription update error:', error);
    toast.error('Failed to update prescription: ' + error.message);
  },
});

const cancelPrescriptionMutation = useMutation({
  mutationFn: async (prescriptionId: string) => {
    const { error } = await (supabase as any)
      .from('prescriptions')
      .update({ status: 'cancelled' })
      .eq('id', prescriptionId);

    if (error) {
      console.error('[DoctorDashboard] Prescription cancel error:', error);
      throw error;
    }

    return { id: prescriptionId };
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['doctor-active-prescriptions', doctorId] });
    toast.success('Prescription cancelled successfully');
  },
  onError: (error: Error) => {
    console.error('[DoctorDashboard] Prescription cancel error:', error);
    toast.error('Failed to cancel prescription: ' + error.message);
  },
});

  // Update Examination Mutation
  const updateExaminationMutation = useMutation({
    mutationFn: async (examination: Partial<MedicalExamination> & { id: string }) => {
      const { error } = await supabase
        .from('medical_examinations')
        .update({
          chief_complaint: examination.chief_complaint,
          assessment_diagnosis: examination.assessment_diagnosis,
          history_of_present_illness: examination.history_of_present_illness,
          triage_blood_pressure: examination.triage_blood_pressure,
          triage_temperature: examination.triage_temperature,
          triage_pulse_rate: examination.triage_pulse_rate,
          triage_respiratory_rate: examination.triage_respiratory_rate,
          triage_oxygen_saturation: examination.triage_oxygen_saturation,
          plan_treatment: examination.plan_treatment,
          medications_prescribed: examination.medications_prescribed,
          follow_up_date: examination.follow_up_date,
          referrals: examination.referrals,
        })
        .eq('id', examination.id);
      
      if (error) throw error;
      return examination.id;
    },
    onSuccess: (examinationId) => {
      queryClient.invalidateQueries({ queryKey: ['medicalExaminations'] });
      queryClient.invalidateQueries({ queryKey: ['examinationsByDoctor'] });
      setIsEditExaminationModalOpen(false);
      setEditingExamination(null);
      toast.success('Examination updated successfully');
    },
    onError: (error: Error) => {
      console.error('[DoctorDashboard] Examination update error:', error);
      toast.error('Failed to update examination: ' + error.message);
    },
  });

  // Delete Examination Mutation
  const deleteExaminationMutation = useMutation({
    mutationFn: async (examinationId: string) => {
      const { error } = await supabase
        .from('medical_examinations')
        .delete()
        .eq('id', examinationId);
      
      if (error) throw error;
      return examinationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalExaminations'] });
      queryClient.invalidateQueries({ queryKey: ['examinationsByDoctor'] });
      setIsDeleteExaminationDialogOpen(false);
      setIsViewExaminationModalOpen(false);
      setSelectedExamination(null);
      toast.success('Examination deleted successfully');
    },
    onError: (error: Error) => {
      console.error('[DoctorDashboard] Examination delete error:', error);
      toast.error('Failed to delete examination: ' + error.message);
    },
  });

  // Create Examination Mutation
  const createExaminationMutation = useMutation({
    mutationFn: async (examinationData: any) => {
      const { data, error } = await supabase
        .from('medical_examinations')
        .insert({
          patient_id: examinationData.patient_id,
          examined_by: doctorId,
          examination_date: new Date().toISOString(),
          chief_complaint: examinationData.chief_complaint,
          assessment_diagnosis: examinationData.assessment_diagnosis,
          history_of_present_illness: examinationData.history_of_present_illness,
          triage_temperature: examinationData.triage_temperature ? parseFloat(examinationData.triage_temperature) : null,
          triage_blood_pressure: examinationData.triage_blood_pressure,
          triage_pulse_rate: examinationData.triage_pulse_rate ? parseInt(examinationData.triage_pulse_rate) : null,
          triage_respiratory_rate: examinationData.triage_respiratory_rate ? parseInt(examinationData.triage_respiratory_rate) : null,
          triage_oxygen_saturation: examinationData.triage_oxygen_saturation ? parseFloat(examinationData.triage_oxygen_saturation) : null,
          plan_treatment: examinationData.plan_treatment,
          medications_prescribed: examinationData.medications_prescribed,
          follow_up_date: examinationData.follow_up_date,
          referrals: examinationData.referrals,
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-medical-examinations', doctorId] });
      setIsNewExaminationModalOpen(false);
      setNewExaminationForm({
        patient_id: '',
        chief_complaint: '',
        assessment_diagnosis: '',
        history_of_present_illness: '',
        triage_temperature: '',
        triage_blood_pressure: '',
        triage_pulse_rate: '',
        triage_respiratory_rate: '',
        triage_oxygen_saturation: '',
        triage_weight: '',
        triage_height: '',
        plan_treatment: '',
        medications_prescribed: '',
        follow_up_date: '',
        referrals: '',
      });
      toast.success('Examination created successfully');
    },
    onError: (error: Error) => {
      console.error('[DoctorDashboard] Examination create error:', error);
      toast.error('Failed to create examination: ' + error.message);
    },
  });

  // ===== CREATE LAB ORDER MUTATION =====
  const createLabOrderMutation = useMutation({
    mutationFn: async (data: { patient_id: string; test_ids: string[]; priority: string }) => {
      // Validate required fields
      if (!data.patient_id?.trim()) {
        throw new Error('Patient is required');
      }
      if (!data.test_ids || data.test_ids.length === 0) {
        throw new Error('At least one test is required');
      }

      try {
        // Check for duplicate/existing pending orders
        const { data: existingOrders, error: checkError } = await supabase
          .from('lab_orders')
          .select('test_id, status')
          .eq('patient_id', data.patient_id)
          .in('status', ['pending', 'sample_collected', 'processing']);
        
        if (checkError) {
          console.error('[DoctorDashboard] Error checking existing orders:', checkError);
          throw checkError;
        }

        const existingTestIds = new Set(existingOrders?.map((o: any) => o.test_id) || []);
        const duplicateTests = data.test_ids.filter(testId => existingTestIds.has(testId));

        if (duplicateTests.length > 0) {
          const duplicateTestNames = duplicateTests
            .map(id => labTests?.find(t => t.id === id)?.test_name)
            .filter(Boolean)
            .join(', ');
          throw new Error(`These tests are already pending for this patient: ${duplicateTestNames}`);
        }

        // Generate unique order numbers (format: LAB + YYYYMMDD + unique counter)
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const generateOrderNumber = (index: number) => {
          // Use timestamp milliseconds + random + index to ensure uniqueness even in batch inserts
          const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const counter = index.toString().padStart(2, '0');
          return `LAB${dateStr}-${timestamp}${random}${counter}`;
        };

        // Create orders for all tests with unique order numbers
        const ordersToInsert = data.test_ids.map((testId, index) => ({
          patient_id: data.patient_id,
          test_id: testId,
          priority: data.priority,
          ordered_by: doctorId,
          order_number: generateOrderNumber(index),
        }));

        const { error } = await supabase.from('lab_orders').insert(ordersToInsert);
        
        if (error) {
          console.error('[DoctorDashboard] Error creating lab orders:', error);
          throw error;
        }
        console.log('[DoctorDashboard] Lab orders created successfully for', data.test_ids.length, 'tests');
      } catch (err) {
        console.error('[DoctorDashboard] Lab order creation failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-lab-results'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
      setIsAddLabOrderDialogOpen(false);
      setNewLabOrder({ patient_id: '', test_ids: [], priority: 'normal' });
      setSelectedTestDetails([]);
      setTestSearch('');
      setShowTestList(false);
      toast.success('Lab orders created successfully');
    },
    onError: (error: Error) => {
      console.error('[DoctorDashboard] Lab order mutation error:', error.message);
      toast.error(`Failed to create lab order: ${error.message}`);
    },
  });

  // SMS reminder mutation disabled - pending Twilio integration
  // const sendSmsReminderMutation = useMutation({
  //   ... mutation code removed ...
  // });

  // ===== HANDLERS =====
  const handleConfirmAppointment = (appointment: Appointment) => {
    confirmAppointmentMutation.mutate(appointment.id);
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    cancelAppointmentMutation.mutate(appointment.id);
  };

  const handleRescheduleAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDate(appointment.appointment_date || '');
    setRescheduleTime(appointment.appointment_time?.slice(0, 5) || '');
    setRescheduleDialog(true);
  };

  const handleSubmitReschedule = () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) {
      toast.error('Please select a date and time');
      return;
    }
    rescheduleAppointmentMutation.mutate({
      appointmentId: selectedAppointment.id,
      date: rescheduleDate,
      time: rescheduleTime,
    });
  };

  const handleExportAppointments = () => {
    if (!appointments || appointments.length === 0) {
      toast.error('No appointments to export');
      return;
    }

    setExporting(true);
    try {
      const exportData = appointments.map((a) => ({
        Date: a.appointment_date,
        Time: a.appointment_time?.slice(0, 5),
        Patient: a.patient_name,
        Reason: a.reason || 'N/A',
        Status: a.status,
      }));
      const headers = Object.keys(exportData[0]).join(',');
      const rows = exportData.map((row) => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointments_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Appointments exported');
    } catch (error) {
      toast.error('Failed to export appointments');
    } finally {
      setExporting(false);
    }
  };

  // ===== STATS CALCULATION =====
  const stats = {
    todayAppointments: appointments?.length || 0,
    pendingConfirmation: appointments?.filter((a) => a.status === 'scheduled' || a.status === 'pending').length || 0,
    activePatients: activePatients?.length || 0,
    activePrescriptions: activePrescriptions?.length || 0,
    labResults: labResults?.length || 0,
    criticalLabResults: labResults?.filter((lr) => lr.priority === 'critical').length || 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'stat':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Toggle patient expansion
  const togglePatientExpansion = (patientId: string) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedPatients(newExpanded);
  };

  // HANDLER FOR VIEW PATIENT BUTTON
  const handleViewPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    try {
      // Fetch medical examinations for this patient
      const { data, error } = await (supabase as any)
        .from('medical_examinations')
        .select('*')
        .eq('patient_id', patient.id)
        .order('examination_date', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSelectedExamination(data[0]);
        setIsViewExaminationModalOpen(true);
      } else {
        toast.error('No medical examinations found for this patient');
      }
    } catch (err) {
      console.error('Error fetching patient examinations:', err);
      toast.error('Failed to load patient examinations');
    }
  };

  // HANDLER FOR EXPORT BUTTON
  const handleExportPatient = (patient: Patient) => {
    try {
      // Create CSV content
      const csvContent = [
        ['Patient Information'],
        ['Patient Number', patient.patient_number],
        ['Name', `${patient.first_name} ${patient.last_name}`],
        ['Gender', patient.gender || 'N/A'],
        ['Date of Birth', patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM dd, yyyy') : 'N/A'],
        ['Blood Type', patient.blood_type || 'N/A'],
      ].map(row => row.join(',')).join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `patient_${patient.patient_number}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Patient data exported: ${patient.first_name} ${patient.last_name}`);
    } catch (err) {
      console.error('Error exporting patient:', err);
      toast.error('Failed to export patient data');
    }
  };

  // HANDLER FOR DIAGNOSE BUTTON
  const handleDiagnoseClick = (patient: Patient) => {
    setSelectedPatient(patient);
    // Reset diagnosis form
    setDiagnosisForm({
      chief_complaint: '',
      assessment_diagnosis: '',
    });
    setIsDiagnosisModalOpen(true);
  };

  // HANDLER FOR PRESCRIPTION BUTTON
  const handleCreatePrescription = (patient: Patient) => {
    setSelectedPrescriptionPatient(patient);
    setPrescriptionForm({
      patient_id: patient.id,
      medicines: [],
    });
    setSelectedMedicationDetails([]);
    setMedicationSearch('');
    setShowMedicationList(false);
    setIsPrescriptionModalOpen(true);
  };

  const handleSubmitDiagnosis = () => {
    if (!diagnosisForm.chief_complaint || !diagnosisForm.assessment_diagnosis) {
      toast.error('Please fill in Chief Complaint and Assessment/Diagnosis');
      return;
    }

    const dataToSubmit = {
      chief_complaint: diagnosisForm.chief_complaint,
      history_of_present_illness: diagnosisForm.history_of_present_illness || null,
      past_medical_history: diagnosisForm.past_medical_history || null,
      past_surgical_history: diagnosisForm.past_surgical_history || null,
      medication_list: diagnosisForm.medication_list || null,
      allergies: diagnosisForm.allergies || null,
      family_history: diagnosisForm.family_history || null,
      social_history: diagnosisForm.social_history || null,
      general_appearance: diagnosisForm.general_appearance || null,
      heent_examination: diagnosisForm.heent_examination || null,
      cardiovascular_examination: diagnosisForm.cardiovascular_examination || null,
      respiratory_examination: diagnosisForm.respiratory_examination || null,
      abdominal_examination: diagnosisForm.abdominal_examination || null,
      neurological_examination: diagnosisForm.neurological_examination || null,
      musculoskeletal_examination: diagnosisForm.musculoskeletal_examination || null,
      skin_examination: diagnosisForm.skin_examination || null,
      other_systems: diagnosisForm.other_systems || null,
      triage_temperature: diagnosisForm.triage_temperature ? parseFloat(diagnosisForm.triage_temperature) : null,
      triage_blood_pressure: diagnosisForm.triage_blood_pressure || null,
      triage_pulse_rate: diagnosisForm.triage_pulse_rate ? parseInt(diagnosisForm.triage_pulse_rate) : null,
      triage_respiratory_rate: diagnosisForm.triage_respiratory_rate ? parseInt(diagnosisForm.triage_respiratory_rate) : null,
      triage_oxygen_saturation: diagnosisForm.triage_oxygen_saturation ? parseFloat(diagnosisForm.triage_oxygen_saturation) : null,
      triage_weight: diagnosisForm.triage_weight ? parseFloat(diagnosisForm.triage_weight) : null,
      triage_height: diagnosisForm.triage_height ? parseFloat(diagnosisForm.triage_height) : null,
      triage_bmi: diagnosisForm.triage_bmi ? parseFloat(diagnosisForm.triage_bmi) : null,
      triage_notes: diagnosisForm.triage_notes || null,
      assessment_diagnosis: diagnosisForm.assessment_diagnosis,
      plan_treatment: diagnosisForm.plan_treatment || null,
      medications_prescribed: diagnosisForm.medications_prescribed || null,
      follow_up_date: diagnosisForm.follow_up_date || null,
      referrals: diagnosisForm.referrals || null,
    };

    createDiagnosisMutation.mutate(dataToSubmit);
  };

  const handleSubmitPrescription = () => {
    // Validate all required fields
    if (!prescriptionForm.patient_id) {
      toast.error('Please select a patient');
      return;
    }
    if (!prescriptionForm.medicines || prescriptionForm.medicines.length === 0) {
      toast.error('Please add at least one medication');
      return;
    }
    
    // Validate each medicine has required fields
    for (const med of prescriptionForm.medicines) {
      if (!med.dosage) {
        toast.error('Please enter dosage for all medications');
        return;
      }
      if (!med.frequency) {
        toast.error('Please select frequency for all medications');
        return;
      }
    }
    
    if (!user?.id) {
      toast.error('Doctor information not available. Please ensure you are logged in.');
      return;
    }

    // Create new prescriptions (multi-medicine support)
    createPrescriptionMutation.mutate({
      ...prescriptionForm,
      doctor_user_id: user.id,
    });
  };

  const handleEditPrescription = (prescription: Prescription) => {
    // For now, edit mode is disabled for multi-medicine prescriptions
    // TODO: Implement full edit flow for multiple medicines
    toast.error('Edit functionality will be updated for multi-prescription support');
  };

  const handleCancelPrescription = (prescriptionId: string) => {
    if (confirm('Are you sure you want to cancel this prescription?')) {
      cancelPrescriptionMutation.mutate(prescriptionId);
    }
  };

  const handleDiagnosisFormChange = (field: string, value: string) => {
    setDiagnosisForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePrescriptionFormChange = (field: string, value: string) => {
    setPrescriptionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-700">Doctor Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, <b>Dr. {doctorName || 'Doctor'}</b>! Manage patient care and consultations.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 text-white rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/80">Today's Appointments</p>
              <p className="text-4xl font-bold mt-2">{stats.todayAppointments}</p>
              <p className="text-xs text-white/70 mt-2">{stats.pendingConfirmation} pending</p>
            </div>
            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
              <CalendarDaysIcon className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/80">Active Patients</p>
              <p className="text-4xl font-bold mt-2">{stats.activePatients}</p>
              <p className="text-xs text-white/70 mt-2">Under your care</p>
            </div>
            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
              <UserGroupIcon className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 text-white rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/80">Active Prescriptions</p>
              <p className="text-4xl font-bold mt-2">{stats.activePrescriptions}</p>
              <p className="text-xs text-white/70 mt-2">Currently active</p>
            </div>
            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
              <ClipboardDocumentListIcon className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-orange-600 via-orange-500 to-red-500 text-white rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/80">Lab Results</p>
              <p className="text-4xl font-bold mt-2">{stats.labResults}</p>
              <p className="text-xs text-white/70 mt-2">{stats.criticalLabResults} critical</p>
            </div>
            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
              <BeakerIcon className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-6 flex-wrap">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors duration-150 ${
            activeTab === 'appointments' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
          }`}
          onClick={() => setActiveTab('appointments')}
        >
          <CalendarDaysIcon className="w-5 h-5" />
          Appointments
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors duration-150 ${
            activeTab === 'patients' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-purple-100'
          }`}
          onClick={() => setActiveTab('patients')}
        >
          <UserGroupIcon className="w-5 h-5" />
          Patients
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors duration-150 ${
            activeTab === 'prescriptions' ? 'bg-green-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-green-100'
          }`}
          onClick={() => setActiveTab('prescriptions')}
        >
          <ClipboardDocumentListIcon className="w-5 h-5" />
          Prescriptions
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors duration-150 ${
            activeTab === 'lab-tests' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-indigo-100'
          }`}
          onClick={() => setActiveTab('lab-tests')}
        >
          <BeakerIcon className="w-5 h-5" />
          Lab Tests
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors duration-150 ${
            activeTab === 'lab-results' ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
          }`}
          onClick={() => setActiveTab('lab-results')}
        >
          <BeakerIcon className="w-5 h-5" />
          Lab Results
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors duration-150 ${
            activeTab === 'consultations' ? 'bg-pink-500 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-pink-100'
          }`}
          onClick={() => setActiveTab('consultations')}
        >
          <ChatBubbleLeftRightIcon className="w-5 h-5" />
          Consultations
        </button>
      </div>

      {/* APPOINTMENTS TAB */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Today's Appointments</h2>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              onClick={handleExportAppointments}
              disabled={exporting || !appointments || appointments.length === 0}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {loadingAppointments ? (
            <div className="text-center py-8">Loading appointments...</div>
          ) : !appointments || appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No appointments scheduled for today</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold">Reason</th>
                    <th className="text-left py-3 px-4 font-semibold">Duration</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{apt.appointment_time?.slice(0, 5)}</td>
                      <td className="py-3 px-4">{apt.patient_name}</td>
                      <td className="py-3 px-4 max-w-xs break-words whitespace-normal">{apt.reason || 'N/A'}</td>
                      <td className="py-3 px-4">{apt.duration_minutes ? `${apt.duration_minutes} min` : 'N/A'}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        {apt.status === 'scheduled' || apt.status === 'pending' ? (
                          <button
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                            onClick={() => handleConfirmAppointment(apt)}
                            disabled={confirmAppointmentMutation.isPending}
                          >
                            Confirm
                          </button>
                        ) : null}
                        {apt.status !== 'cancelled' && apt.status !== 'completed' ? (
                          <>
                            <button
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
                              onClick={() => handleRescheduleAppointment(apt)}
                            >
                              Reschedule
                            </button>
                            <button
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                              onClick={() => {
                                setSelectedAppointment(apt);
                                setCancelAppointmentDialog(true);
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reschedule Dialog */}
          {rescheduleDialog && selectedAppointment && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Reschedule Appointment</h3>
                <p className="mb-4 text-gray-600">Reschedule appointment for <strong>{selectedAppointment.patient_name}</strong></p>
                <div className="mb-4 flex gap-2">
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    onClick={() => setRescheduleDialog(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    onClick={handleSubmitReschedule}
                    disabled={rescheduleAppointmentMutation.isPending}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Dialog */}
          {cancelAppointmentDialog && selectedAppointment && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-red-600">Cancel Appointment</h3>
                <p className="mb-6 text-gray-600">
                  Are you sure you want to cancel the appointment for <strong>{selectedAppointment.patient_name}</strong>?
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    onClick={() => setCancelAppointmentDialog(false)}
                  >
                    Keep Appointment
                  </button>
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    onClick={() => handleCancelAppointment(selectedAppointment)}
                    disabled={cancelAppointmentMutation.isPending}
                  >
                    Confirm Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PATIENTS TAB */}
      {activeTab === 'patients' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Active Patients</h2>

          {loadingPatients ? (
            <div className="text-center py-8">Loading patients...</div>
          ) : !activePatients || activePatients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No patients found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Patient Number</th>
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Gender</th>
                    <th className="text-left py-3 px-4 font-semibold">Date of Birth</th>
                    <th className="text-left py-3 px-4 font-semibold">Blood Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activePatients.map((patient) => (
                    <tr key={patient.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{patient.patient_number}</td>
                      <td className="py-3 px-4">{`${patient.first_name} ${patient.last_name}`}</td>
                      <td className="py-3 px-4">{patient.gender || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-blue-100 text-blue-800">{patient.blood_type || 'N/A'}</Badge>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        <button
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                          onClick={() => handleViewPatient(patient)}
                        >
                          View
                        </button>
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          onClick={() => handleDiagnoseClick(patient)}
                        >
                          Diagnose
                        </button>
                        <button
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                          onClick={() => handleExportPatient(patient)}
                        >
                          Export
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Diagnosis Modal */}
{isDiagnosisModalOpen && selectedPatient && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
      <h3 className="text-xl font-bold mb-4">Diagnosis</h3>
      <p className="mb-4 text-gray-600">
        Diagnosing patient <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>
      </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
                  <textarea
                    value={diagnosisForm.chief_complaint}
                    onChange={(e) => handleDiagnosisFormChange('chief_complaint', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assessment/Diagnosis</label>
                  <textarea
                    value={diagnosisForm.assessment_diagnosis}
                    onChange={(e) => handleDiagnosisFormChange('assessment_diagnosis', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan/Treatment</label>
                  <textarea
                    value={diagnosisForm.plan_treatment}
                    onChange={(e) => handleDiagnosisFormChange('plan_treatment', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    onClick={() => setIsDiagnosisModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    onClick={handleSubmitDiagnosis}
                    disabled={createDiagnosisMutation.isPending}
                  >
                    Save Diagnosis
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Examinations Modal */}
          {isViewExaminationModalOpen && selectedExamination && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl my-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold">Examination Details</h3>
                  <button
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                    onClick={() => {
                      setIsViewExaminationModalOpen(false);
                      setSelectedPatient(null);
                      setSelectedExamination(null);
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6 max-h-96 overflow-y-auto">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg">Examination Record</h4>
                      <span className="text-sm text-gray-600">
                        {format(new Date(selectedExamination.examination_date), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Patient</p>
                        <p className="font-medium">{selectedExamination.patient_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Chief Complaint</p>
                        <p className="font-medium">{selectedExamination.chief_complaint}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Assessment/Diagnosis</p>
                        <p className="font-medium">{selectedExamination.assessment_diagnosis}</p>
                      </div>
                      {selectedExamination.history_of_present_illness && (
                        <div className="col-span-2">
                          <p className="text-gray-600">History of Present Illness</p>
                          <p className="font-medium">{selectedExamination.history_of_present_illness}</p>
                        </div>
                      )}
                      {selectedExamination.triage_temperature && (
                        <div>
                          <p className="text-gray-600">Temperature</p>
                          <p className="font-medium">{selectedExamination.triage_temperature}°C</p>
                        </div>
                      )}
                      {selectedExamination.triage_blood_pressure && (
                        <div>
                          <p className="text-gray-600">Blood Pressure</p>
                          <p className="font-medium">{selectedExamination.triage_blood_pressure}</p>
                        </div>
                      )}
                      {selectedExamination.triage_pulse_rate && (
                        <div>
                          <p className="text-gray-600">Pulse Rate</p>
                          <p className="font-medium">{selectedExamination.triage_pulse_rate} bpm</p>
                        </div>
                      )}
                      {selectedExamination.triage_respiratory_rate && (
                        <div>
                          <p className="text-gray-600">Respiratory Rate</p>
                          <p className="font-medium">{selectedExamination.triage_respiratory_rate} breaths/min</p>
                        </div>
                      )}
                      {selectedExamination.triage_oxygen_saturation && (
                        <div>
                          <p className="text-gray-600">O₂ Saturation</p>
                          <p className="font-medium">{selectedExamination.triage_oxygen_saturation}%</p>
                        </div>
                      )}
                      {selectedExamination.plan_treatment && (
                        <div className="col-span-2">
                          <p className="text-gray-600">Treatment Plan</p>
                          <p className="font-medium whitespace-pre-wrap">{selectedExamination.plan_treatment}</p>
                        </div>
                      )}
                      {selectedExamination.medications_prescribed && (
                        <div className="col-span-2">
                          <p className="text-gray-600">Medications Prescribed</p>
                          <p className="font-medium whitespace-pre-wrap">{selectedExamination.medications_prescribed}</p>
                        </div>
                      )}
                      {selectedExamination.follow_up_date && (
                        <div>
                          <p className="text-gray-600">Follow-up Date</p>
                          <p className="font-medium">{format(new Date(selectedExamination.follow_up_date), 'MMM dd, yyyy')}</p>
                        </div>
                      )}
                      {selectedExamination.referrals && (
                        <div className="col-span-2">
                          <p className="text-gray-600">Referrals</p>
                          <p className="font-medium">{selectedExamination.referrals}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-6">
                  <button
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                    onClick={() => {
                      setEditingExamination(selectedExamination);
                      setIsEditExaminationModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                    onClick={() => setIsDeleteExaminationDialogOpen(true)}
                  >
                    Delete
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    onClick={() => {
                      setIsViewExaminationModalOpen(false);
                      setSelectedPatient(null);
                      setSelectedExamination(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* EDIT EXAMINATION MODAL */}
        {isEditExaminationModalOpen && editingExamination && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl my-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">Edit Examination</h3>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => {
                    setIsEditExaminationModalOpen(false);
                    setEditingExamination(null);
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-1">Chief Complaint</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.chief_complaint || ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, chief_complaint: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Assessment/Diagnosis</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.assessment_diagnosis || ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, assessment_diagnosis: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={editingExamination.triage_blood_pressure || ''}
                      onChange={(e) => setEditingExamination({ ...editingExamination, triage_blood_pressure: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      value={editingExamination.triage_temperature || ''}
                      onChange={(e) => setEditingExamination({ ...editingExamination, triage_temperature: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      value={editingExamination.triage_pulse_rate || ''}
                      onChange={(e) => setEditingExamination({ ...editingExamination, triage_pulse_rate: e.target.value ? parseInt(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">O₂ Saturation (%)</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      value={editingExamination.triage_oxygen_saturation || ''}
                      onChange={(e) => setEditingExamination({ ...editingExamination, triage_oxygen_saturation: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Treatment Plan</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.plan_treatment || ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, plan_treatment: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Medications Prescribed</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.medications_prescribed || ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, medications_prescribed: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.follow_up_date ? editingExamination.follow_up_date.split('T')[0] : ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, follow_up_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  onClick={() => {
                    setIsEditExaminationModalOpen(false);
                    setEditingExamination(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  onClick={() => {
                    if (editingExamination.id) {
                      updateExaminationMutation.mutate(editingExamination as any);
                    }
                  }}
                  disabled={updateExaminationMutation.isPending}
                >
                  {updateExaminationMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE EXAMINATION CONFIRMATION DIALOG */}
        {isDeleteExaminationDialogOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Delete Examination</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this examination record? This action cannot be undone.
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  onClick={() => setIsDeleteExaminationDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                  onClick={() => {
                    if (selectedExamination?.id) {
                      deleteExaminationMutation.mutate(selectedExamination.id);
                    }
                  }}
                  disabled={deleteExaminationMutation.isPending}
                >
                  {deleteExaminationMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

     {/* PRESCRIPTIONS TAB */}
{activeTab === 'prescriptions' && (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold">Active Prescriptions</h2>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => {
          setSelectedPrescriptionPatient(null);
          setPrescriptionForm({
            patient_id: '',
            medicines: [],
          });
          setSelectedMedicationDetails([]);
          setMedicationSearch('');
          setShowMedicationList(false);
          setIsPrescriptionModalOpen(true);
        }}
      >
        + New Prescription
      </button>
    </div>

    {loadingPrescriptions ? (
      <div className="text-center py-8">Loading prescriptions...</div>
    ) : !activePrescriptions || activePrescriptions.length === 0 ? (
      <div className="text-center py-8 text-gray-500">No active prescriptions</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 w-6"></th>
              <th className="text-left py-3 px-4 font-semibold">Patient</th>
              <th className="text-left py-3 px-4 font-semibold">Medications</th>
              <th className="text-left py-3 px-4 font-semibold">Last Prescribed</th>
              <th className="text-left py-3 px-4 font-semibold">Status</th>
              <th className="text-left py-3 px-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from(
              activePrescriptions.reduce((acc, prescription) => {
                if (!acc.has(prescription.patient_id)) {
                  acc.set(prescription.patient_id, []);
                }
                acc.get(prescription.patient_id)!.push(prescription);
                return acc;
              }, new Map<string, typeof activePrescriptions>())
            )
              .sort((a, b) => a[1][0].patient_name.localeCompare(b[1][0].patient_name))
              .map(([patientId, patientMedicines]) => {
                const isExpanded = expandedPatients.has(patientId);
                const lastPrescription = patientMedicines[0];
                return (
                  <React.Fragment key={patientId}>
                    {/* Patient Row */}
                    <tr
                      className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                      onClick={() => togglePatientExpansion(patientId)}
                    >
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{lastPrescription.patient_name}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-blue-100 text-blue-800">{patientMedicines.length} medicines</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {lastPrescription.prescribed_date ? new Date(lastPrescription.prescribed_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(lastPrescription.status)}>{lastPrescription.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePatientExpansion(patientId);
                          }}
                        >
                          {isExpanded ? 'Collapse' : 'View All'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Patient Medicines */}
                    {isExpanded &&
                      patientMedicines.map((medicine) => (
                        <tr key={`${patientId}-${medicine.id}-${medicine.medicine_id}`} className="border-b border-gray-100 bg-blue-50 hover:bg-blue-100">
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 pl-12">
                            <div className="text-sm">
                              <div className="font-medium text-gray-700">{medicine.medicine_name}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div className="text-gray-700">{medicine.dosage} • {medicine.frequency}</div>
                              {medicine.duration && <div className="text-gray-600">{medicine.duration}</div>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {medicine.prescribed_date ? new Date(medicine.prescribed_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(medicine.status)}>{medicine.status}</Badge>
                          </td>
                          <td className="py-3 px-4 flex gap-2">
                            <button
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                              onClick={() => handleCancelPrescription(medicine.id)}
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      </div>
    )}

    {/* Create/Edit Prescription Modal */}
    {isPrescriptionModalOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md my-4">
          <h3 className="text-xl font-bold mb-4">Create Prescription</h3>
          <p className="mb-4 text-gray-600">Create a new prescription with multiple medications for the selected patient.</p>

          {/* Patient Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
            <select
              value={prescriptionForm.patient_id}
              onChange={(e) => {
                const patientId = e.target.value;
                setPrescriptionForm({ ...prescriptionForm, patient_id: patientId });
                const patient = activePatients?.find((p) => p.id === patientId);
                if (patient) setSelectedPrescriptionPatient(patient);
              }}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select patient</option>
              {activePatients?.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name} ({patient.patient_number})
                </option>
              ))}
            </select>
          </div>

          {/* Medication Search and Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Medications * {loadingMedications && <span className="text-xs text-gray-500">(loading...)</span>}</label>
            <div className="relative">
              <input
                type="text"
                placeholder={loadingMedications ? "Loading medications..." : "Search medications by name, strength, or form..."}
                value={medicationSearch}
                onChange={(e) => {
                  setMedicationSearch(e.target.value);
                  setShowMedicationList(true);
                }}
                onFocus={() => setShowMedicationList(true)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                disabled={loadingMedications}
              />
              {showMedicationList && medicationSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredMedications.length > 0 ? (
                    filteredMedications.map((med: any) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => {
                          // Check if medication is already selected
                          if (!prescriptionForm.medicines.some(m => m.medicine_id === med.id)) {
                            setPrescriptionForm({
                              ...prescriptionForm,
                              medicines: [
                                ...prescriptionForm.medicines,
                                {
                                  medicine_id: med.id,
                                  dosage: '',
                                  frequency: '',
                                  duration: '',
                                },
                              ],
                            });
                            setSelectedMedicationDetails([
                              ...selectedMedicationDetails,
                              {
                                id: med.id,
                                name: med.name,
                                strength: med.strength,
                                form: med.form,
                              },
                            ]);
                            setMedicationSearch('');
                          }
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0 transition ${
                          prescriptionForm.medicines.some(m => m.medicine_id === med.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{med.name}</div>
                        <div className="text-xs text-gray-500">{med.strength} {med.form} • {med.category}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">No medications found</div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Medications */}
            {prescriptionForm.medicines.length > 0 && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <p className="text-sm font-semibold text-gray-700">Selected Medications ({prescriptionForm.medicines.length}):</p>
                {prescriptionForm.medicines.map((med, idx) => {
                  const medDetails = selectedMedicationDetails.find(m => m.id === med.medicine_id);
                  return (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm text-gray-800">{medDetails?.name}</div>
                          <div className="text-xs text-gray-600">{medDetails?.strength} {medDetails?.form}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPrescriptionForm({
                              ...prescriptionForm,
                              medicines: prescriptionForm.medicines.filter((_, i) => i !== idx),
                            });
                            setSelectedMedicationDetails(selectedMedicationDetails.filter(m => m.id !== med.medicine_id));
                          }}
                          className="text-red-500 hover:text-red-700 font-semibold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Dosage for this medication */}
                      <input
                        type="text"
                        placeholder="Dosage (e.g., 10mg)"
                        value={med.dosage}
                        onChange={(e) => {
                          const updatedMeds = [...prescriptionForm.medicines];
                          updatedMeds[idx].dosage = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updatedMeds });
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
                      />

                      {/* Frequency for this medication */}
                      <select
                        value={med.frequency}
                        onChange={(e) => {
                          const updatedMeds = [...prescriptionForm.medicines];
                          updatedMeds[idx].frequency = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updatedMeds });
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
                      >
                        <option value="">Select frequency</option>
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Four times daily">Four times daily</option>
                        <option value="Every 6 hours">Every 6 hours</option>
                        <option value="Every 8 hours">Every 8 hours</option>
                        <option value="Every 12 hours">Every 12 hours</option>
                        <option value="As needed">As needed</option>
                      </select>

                      {/* Duration for this medication */}
                      <input
                        type="text"
                        placeholder="Duration (e.g., 7 days)"
                        value={med.duration}
                        onChange={(e) => {
                          const updatedMeds = [...prescriptionForm.medicines];
                          updatedMeds[idx].duration = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updatedMeds });
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              onClick={() => {
                setIsPrescriptionModalOpen(false);
                setSelectedEditingPrescription(null);
                setPrescriptionForm({
                  patient_id: '',
                  medicines: [],
                });
                setSelectedMedicationDetails([]);
                setMedicationSearch('');
                setShowMedicationList(false);
                setSelectedPrescriptionPatient(null);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              onClick={handleSubmitPrescription}
              disabled={createPrescriptionMutation.isPending}
            >
              {createPrescriptionMutation.isPending ? 'Creating...' : 'Create Prescriptions'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)}

      {/* LAB TESTS TAB */}
      {activeTab === 'lab-tests' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Lab Test Orders</h2>
              <p className="text-sm text-gray-500 mt-1">Manage and order laboratory tests</p>
            </div>
            <Dialog open={isAddLabOrderDialogOpen} onOpenChange={setIsAddLabOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">New Lab Test</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Lab Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newLabOrder.patient_id?.trim()) {
                    toast.error('Patient is required');
                    return;
                  }
                  if (newLabOrder.test_ids.length === 0) {
                    toast.error('At least one test is required');
                    return;
                  }
                  createLabOrderMutation.mutate(newLabOrder);
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Patient *</Label>
                    <Select value={newLabOrder.patient_id} onValueChange={(v) => {
                      setNewLabOrder({ ...newLabOrder, patient_id: v });
                      // Reset selected tests when patient changes
                      setSelectedTestDetails([]);
                      setNewLabOrder(prev => ({ ...prev, test_ids: [] }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>
                        {patientsList?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tests * {testsLoading && <span className="text-xs text-gray-500">(loading...)</span>}</Label>
                    <div className="relative">
                      <Input
                        placeholder={testsLoading ? "Loading tests..." : "Search and add tests..."}
                        value={testSearch}
                        onChange={(e) => {
                          setTestSearch(e.target.value);
                          setShowTestList(true);
                        }}
                        onFocus={() => setShowTestList(true)}
                        className="w-full"
                        disabled={testsLoading || !newLabOrder.patient_id}
                      />
                      {!newLabOrder.patient_id && <p className="text-xs text-red-500 mt-1">Select patient first</p>}
                      {showTestList && testSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {filteredTests.length > 0 ? (
                            filteredTests.map((test: any) => {
                              const isSelected = newLabOrder.test_ids.includes(test.id);
                              const isDuplicate = labResults?.some((lr: any) => 
                                lr.patient_id === newLabOrder.patient_id &&
                                lr.id.includes(test.id) &&
                                ['pending', 'sample_collected', 'processing'].includes(lr.status)
                              );
                              return (
                                <button
                                  key={test.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setNewLabOrder({
                                        ...newLabOrder,
                                        test_ids: newLabOrder.test_ids.filter(id => id !== test.id)
                                      });
                                      setSelectedTestDetails(selectedTestDetails.filter(t => t.id !== test.id));
                                    } else {
                                      setNewLabOrder({
                                        ...newLabOrder,
                                        test_ids: [...newLabOrder.test_ids, test.id]
                                      });
                                      setSelectedTestDetails([
                                        ...selectedTestDetails,
                                        {
                                          id: test.id,
                                          name: test.test_name,
                                          code: test.test_code,
                                          price: test.price
                                        }
                                      ]);
                                    }
                                    setTestSearch('');
                                  }}
                                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition ${
                                    isSelected ? 'bg-blue-100 hover:bg-blue-150' : isDuplicate ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100'
                                  } ${isDuplicate ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  disabled={isDuplicate}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{test.test_name}</div>
                                      <div className="text-xs text-gray-500">{test.test_code} • {test.category} • ${test.price}</div>
                                    </div>
                                    {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                                    {isDuplicate && <span className="text-red-600 text-xs font-semibold">Already pending</span>}
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">No tests found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Tests Display */}
                  {selectedTestDetails.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selected Tests ({selectedTestDetails.length})</Label>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                        {selectedTestDetails.map((test) => (
                          <div key={test.id} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                            <div>
                              <div className="font-medium text-sm text-gray-900">{test.name}</div>
                              <div className="text-xs text-gray-500">{test.code} • ${test.price}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewLabOrder({
                                  ...newLabOrder,
                                  test_ids: newLabOrder.test_ids.filter(id => id !== test.id)
                                });
                                setSelectedTestDetails(selectedTestDetails.filter(t => t.id !== test.id));
                              }}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <div className="text-right text-sm font-semibold text-gray-900 pt-2 border-t border-blue-200">
                          Total: ${selectedTestDetails.reduce((sum, t) => sum + t.price, 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newLabOrder.priority} onValueChange={(v) => setNewLabOrder({ ...newLabOrder, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="stat">STAT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createLabOrderMutation.isPending}>
                    {createLabOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lab Orders List - Grouped by Patient */}
          {loadingLabResults ? (
            <div className="text-center py-8">Loading lab orders...</div>
          ) : !labResults || labResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No lab orders yet. Create one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold w-8">
                      <span className="text-gray-400">▼</span>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold">Orders Count</th>
                    <th className="text-left py-3 px-4 font-semibold">Last Order Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    labResults.reduce((acc, order) => {
                      if (!acc.has(order.patient_id)) {
                        acc.set(order.patient_id, []);
                      }
                      acc.get(order.patient_id)!.push(order);
                      return acc;
                    }, new Map<string, LabResult[]>())
                  )
                    .sort((a, b) => a[1][0].patient_name.localeCompare(b[1][0].patient_name))
                    .map(([patientId, patientOrders]) => {
                      const isExpanded = expandedPatients.has(patientId);
                      const lastOrder = patientOrders[0];
                      return (
                        <React.Fragment key={patientId}>
                          {/* Patient Row */}
                          <tr
                            className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                            onClick={() => togglePatientExpansion(patientId)}
                          >
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                ▼
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-800">{lastOrder.patient_name}</td>
                            <td className="py-3 px-4">
                              <Badge className="bg-blue-100 text-blue-800">{patientOrders.length} orders</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {patientOrders[0].created_at ? new Date(patientOrders[0].created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePatientExpansion(patientId);
                                }}
                              >
                                {isExpanded ? 'Collapse' : 'View All'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Patient Orders */}
                          {isExpanded &&
                            patientOrders.map((order) => (
                              <tr key={order.id} className="border-b border-gray-100 bg-blue-50 hover:bg-blue-100">
                                <td className="py-3 px-4"></td>
                                <td className="py-3 px-4 pl-12">
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-700">{order.order_number}</div>
                                    <div className="text-gray-600">{order.test_type}</div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-3 px-4 flex gap-2">
                                  <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                                    onClick={() => {
                                      setSelectedLabOrder(order);
                                      setIsViewLabOrderModalOpen(true);
                                    }}
                                  >
                                    Details
                                  </button>
                                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                                    <>
                                      <button
                                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                                        onClick={() => {
                                          setSelectedLabOrder(order);
                                          setEditLabOrderForm({
                                            priority: order.priority,
                                            result_value: order.result_value || '',
                                            result_notes: order.result_notes || '',
                                            is_abnormal: order.is_abnormal || false,
                                          });
                                          setIsEditLabOrderModalOpen(true);
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs"
                                        onClick={() => {
                                          setSelectedLabOrder(order);
                                          setIsCancelLabOrderDialogOpen(true);
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* View Lab Order Modal */}
          {isViewLabOrderModalOpen && selectedLabOrder && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Lab Order Details</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-gray-600 text-sm">Order Number</p>
                    <p className="font-semibold">{selectedLabOrder.order_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Patient</p>
                    <p className="font-semibold">{selectedLabOrder.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Test Type</p>
                    <p className="font-semibold">{selectedLabOrder.test_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Date Created</p>
                    <p className="font-semibold">{selectedLabOrder.created_at ? new Date(selectedLabOrder.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Status</p>
                    <Badge className={getStatusColor(selectedLabOrder.status)}>{selectedLabOrder.status}</Badge>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Priority</p>
                    <Badge className={getPriorityColor(selectedLabOrder.priority)}>{selectedLabOrder.priority}</Badge>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Result Value</p>
                    <p className="font-semibold">{selectedLabOrder.result_value || 'Pending'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Abnormal</p>
                    <p className="font-semibold">{selectedLabOrder.is_abnormal ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                {selectedLabOrder.result_notes && (
                  <div className="mb-6">
                    <p className="text-gray-600 text-sm">Notes</p>
                    <p className="font-semibold">{selectedLabOrder.result_notes}</p>
                  </div>
                )}
                {selectedLabOrder.sample_collected_at && (
                  <div className="mb-6">
                    <p className="text-gray-600 text-sm">Sample Collected At</p>
                    <p className="font-semibold">{new Date(selectedLabOrder.sample_collected_at).toLocaleString()}</p>
                  </div>
                )}
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setIsViewLabOrderModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Cancel Lab Order Dialog */}
          {isCancelLabOrderDialogOpen && selectedLabOrder && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Cancel Lab Order</h3>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to cancel the lab order <strong>{selectedLabOrder.order_number}</strong> for <strong>{selectedLabOrder.patient_name}</strong>?
                </p>
                <div className="flex gap-4">
                  <button
                    className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                    onClick={() => {
                      setIsCancelLabOrderDialogOpen(false);
                      setSelectedLabOrder(null);
                    }}
                  >
                    Keep Order
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => {
                      if (selectedLabOrder) {
                        cancelLabOrderMutation.mutate(selectedLabOrder.id);
                      }
                    }}
                    disabled={cancelLabOrderMutation.isPending}
                  >
                    {cancelLabOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Lab Order Modal */}
          {isEditLabOrderModalOpen && selectedLabOrder && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Edit Lab Order</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-600 text-sm font-semibold">Priority</label>
                    <select
                      value={editLabOrderForm.priority}
                      onChange={(e) => setEditLabOrderForm({ ...editLabOrderForm, priority: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-semibold">Abnormal</label>
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        checked={editLabOrderForm.is_abnormal}
                        onChange={(e) => setEditLabOrderForm({ ...editLabOrderForm, is_abnormal: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <span className="ml-2">{editLabOrderForm.is_abnormal ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-600 text-sm font-semibold">Result Value</label>
                    <input
                      type="text"
                      value={editLabOrderForm.result_value}
                      onChange={(e) => setEditLabOrderForm({ ...editLabOrderForm, result_value: e.target.value })}
                      placeholder="e.g., 125 mg/dL"
                      className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-600 text-sm font-semibold">Result Notes</label>
                    <textarea
                      value={editLabOrderForm.result_notes}
                      onChange={(e) => setEditLabOrderForm({ ...editLabOrderForm, result_notes: e.target.value })}
                      placeholder="Add any notes about this result..."
                      className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                    onClick={() => {
                      setIsEditLabOrderModalOpen(false);
                      setSelectedLabOrder(null);
                      setEditLabOrderForm({
                        priority: 'normal',
                        result_value: '',
                        result_notes: '',
                        is_abnormal: false,
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    onClick={() => {
                      if (selectedLabOrder) {
                        editLabOrderMutation.mutate({
                          orderId: selectedLabOrder.id,
                          updates: editLabOrderForm,
                        });
                      }
                    }}
                    disabled={editLabOrderMutation.isPending}
                  >
                    {editLabOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LAB RESULTS TAB */}
      {activeTab === 'lab-results' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Laboratory Results</h2>

          {loadingLabResults ? (
            <div className="text-center py-8">Loading lab results...</div>
          ) : !labResults || labResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No lab results found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold w-8">
                      <span className="text-gray-400">▼</span>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold">Results Count</th>
                    <th className="text-left py-3 px-4 font-semibold">Last Result Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    labResults.reduce((acc, result) => {
                      if (!acc.has(result.patient_id)) {
                        acc.set(result.patient_id, []);
                      }
                      acc.get(result.patient_id)!.push(result);
                      return acc;
                    }, new Map<string, LabResult[]>())
                  )
                    .sort((a, b) => a[1][0].patient_name.localeCompare(b[1][0].patient_name))
                    .map(([patientId, patientResults]) => {
                      const isExpanded = expandedPatients.has(patientId);
                      const lastResult = patientResults[0];
                      return (
                        <React.Fragment key={patientId}>
                          {/* Patient Row */}
                          <tr
                            className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                            onClick={() => togglePatientExpansion(patientId)}
                          >
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                ▼
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-800">{lastResult.patient_name}</td>
                            <td className="py-3 px-4">
                              <Badge className="bg-blue-100 text-blue-800">{patientResults.length} results</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {lastResult.created_at ? new Date(lastResult.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePatientExpansion(patientId);
                                }}
                              >
                                {isExpanded ? 'Collapse' : 'View All'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Patient Results */}
                          {isExpanded &&
                            patientResults.map((result) => (
                              <tr key={result.id} className="border-b border-gray-100 bg-blue-50 hover:bg-blue-100">
                                <td className="py-3 px-4"></td>
                                <td className="py-3 px-4 pl-12">
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-700">{result.order_number}</div>
                                    <div className="text-gray-600">{result.test_type}</div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={getStatusColor(result.status)}>{result.status}</Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={getPriorityColor(result.priority)}>{result.priority}</Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {result.result_date ? new Date(result.result_date).toLocaleDateString() : 'Pending'}
                                </td>
                                <td className="py-3 px-4 flex gap-2">
                                  <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                                    onClick={() => {
                                      setSelectedLabResult(result);
                                      setIsResultDialogOpen(true);
                                    }}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Lab Result Details Modal */}
          {isResultDialogOpen && selectedLabResult && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Lab Result Details</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-gray-600 text-sm">Order Number</p>
                    <p className="font-semibold">{selectedLabResult.order_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Patient</p>
                    <p className="font-semibold">{selectedLabResult.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Test Type</p>
                    <p className="font-semibold">{selectedLabResult.test_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Date</p>
                    <p className="font-semibold">{selectedLabResult.result_date}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Status</p>
                    <Badge className={getStatusColor(selectedLabResult.status)}>{selectedLabResult.status}</Badge>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Priority</p>
                    <Badge className={getPriorityColor(selectedLabResult.priority)}>
                      {selectedLabResult.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Result Value</p>
                    <p className="font-semibold">{selectedLabResult.result_value || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Abnormal</p>
                    <p className="font-semibold">{selectedLabResult.is_abnormal ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                {selectedLabResult.result_notes && (
                  <div className="mb-6">
                    <p className="text-gray-600 text-sm">Notes</p>
                    <p className="font-semibold">{selectedLabResult.result_notes}</p>
                  </div>
                )}
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setIsResultDialogOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONSULTATIONS TAB */}
      {activeTab === 'consultations' && canAccessModule('doctor_examination') && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Medical Examinations & Consultations</h2>
            {hasPermission('doctor_examination', 'create') && (
              <button 
                onClick={() => setIsNewExaminationModalOpen(true)}
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Consultation
              </button>
            )}
          </div>

          {loadingExaminations ? (
            <div className="text-center py-8">Loading consultations...</div>
          ) : !medicalExaminations || medicalExaminations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No medical examinations found</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse table-auto">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold min-w-[120px]">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold min-w-[140px]">Examination Date</th>
                    <th className="text-left py-3 px-4 font-semibold min-w-[150px]">Diagnosis</th>
                    <th className="text-left py-3 px-4 font-semibold min-w-[80px]">BP</th>
                    <th className="text-left py-3 px-4 font-semibold min-w-[80px]">Temp</th>
                    <th className="text-left py-3 px-4 font-semibold min-w-[220px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicalExaminations.map((exam) => (
                    <tr key={exam.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium align-top">{exam.patient_name}</td>
                      <td className="py-4 px-4 align-top">
                        {format(new Date(exam.examination_date), 'MMM dd, yyyy')}
                      </td>

                      <td className="py-4 px-4 align-top">{exam.assessment_diagnosis}</td>
                      <td className="py-4 px-4 align-top">{exam.triage_blood_pressure || 'N/A'}</td>
                      <td className="py-4 px-4 align-top">{exam.triage_temperature ? `${exam.triage_temperature}°C` : 'N/A'}</td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex gap-2 flex-wrap">
                          {hasPermission('doctor_examination', 'view') && (
                            <button
                              type="button"
                              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-3 py-1 rounded text-sm cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[DEBUG] View button clicked for exam:', exam.id, exam.patient_name);
                                setSelectedExamination(exam);
                                setSelectedPatient({
                                  id: exam.patient_id,
                                  patient_number: '',
                                  first_name: exam.patient_name?.split(' ')[0] || '',
                                  last_name: exam.patient_name?.split(' ').slice(1).join(' ') || '',
                                  date_of_birth: '',
                                  gender: '',
                                  blood_type: null,
                                });
                                console.log('[DEBUG] Setting isViewExaminationModalOpen to true');
                                setIsViewExaminationModalOpen(true);
                              }}
                            >
                              View
                            </button>
                          )}
                          {hasPermission('doctor_examination', 'edit') && (
                            <button
                              type="button"
                              className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white px-3 py-1 rounded text-sm cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[DEBUG] Edit button clicked for exam:', exam.id);
                                setSelectedExamination(exam);
                                setEditingExamination(exam);
                                console.log('[DEBUG] Setting isEditExaminationModalOpen to true');
                                setIsEditExaminationModalOpen(true);
                              }}
                            >
                              Edit
                            </button>
                          )}
                          {hasPermission('doctor_examination', 'delete') && (
                            <button
                              type="button"
                              className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-3 py-1 rounded text-sm cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[DEBUG] Delete button clicked for exam:', exam.id);
                                setSelectedExamination(exam);
                                console.log('[DEBUG] Setting isDeleteExaminationDialogOpen to true');
                                setIsDeleteExaminationDialogOpen(true);
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODALS - Rendered at root level to avoid overflow clipping */}

      {/* View Examinations Modal */}
      {isViewExaminationModalOpen && selectedExamination && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl my-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Examination Details</h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl"
                onClick={() => {
                  setIsViewExaminationModalOpen(false);
                  setSelectedPatient(null);
                  setSelectedExamination(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-lg">Examination Record</h4>
                  <span className="text-sm text-gray-600">
                    {format(new Date(selectedExamination.examination_date), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Patient</p>
                    <p className="font-medium">{selectedExamination.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Chief Complaint</p>
                    <p className="font-medium">{selectedExamination.chief_complaint}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Assessment/Diagnosis</p>
                    <p className="font-medium">{selectedExamination.assessment_diagnosis}</p>
                  </div>
                  {selectedExamination.history_of_present_illness && (
                    <div className="col-span-2">
                      <p className="text-gray-600">History of Present Illness</p>
                      <p className="font-medium">{selectedExamination.history_of_present_illness}</p>
                    </div>
                  )}
                  {selectedExamination.triage_temperature && (
                    <div>
                      <p className="text-gray-600">Temperature</p>
                      <p className="font-medium">{selectedExamination.triage_temperature}°C</p>
                    </div>
                  )}
                  {selectedExamination.triage_blood_pressure && (
                    <div>
                      <p className="text-gray-600">Blood Pressure</p>
                      <p className="font-medium">{selectedExamination.triage_blood_pressure}</p>
                    </div>
                  )}
                  {selectedExamination.triage_pulse_rate && (
                    <div>
                      <p className="text-gray-600">Pulse Rate</p>
                      <p className="font-medium">{selectedExamination.triage_pulse_rate} bpm</p>
                    </div>
                  )}
                  {selectedExamination.triage_respiratory_rate && (
                    <div>
                      <p className="text-gray-600">Respiratory Rate</p>
                      <p className="font-medium">{selectedExamination.triage_respiratory_rate} breaths/min</p>
                    </div>
                  )}
                  {selectedExamination.triage_oxygen_saturation && (
                    <div>
                      <p className="text-gray-600">O₂ Saturation</p>
                      <p className="font-medium">{selectedExamination.triage_oxygen_saturation}%</p>
                    </div>
                  )}
                  {selectedExamination.plan_treatment && (
                    <div className="col-span-2">
                      <p className="text-gray-600">Treatment Plan</p>
                      <p className="font-medium whitespace-pre-wrap">{selectedExamination.plan_treatment}</p>
                    </div>
                  )}
                  {selectedExamination.medications_prescribed && (
                    <div className="col-span-2">
                      <p className="text-gray-600">Medications Prescribed</p>
                      <p className="font-medium whitespace-pre-wrap">{selectedExamination.medications_prescribed}</p>
                    </div>
                  )}
                  {selectedExamination.follow_up_date && (
                    <div>
                      <p className="text-gray-600">Follow-up Date</p>
                      <p className="font-medium">{format(new Date(selectedExamination.follow_up_date), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                  {selectedExamination.referrals && (
                    <div className="col-span-2">
                      <p className="text-gray-600">Referrals</p>
                      <p className="font-medium">{selectedExamination.referrals}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                onClick={() => {
                  setEditingExamination(selectedExamination);
                  setIsEditExaminationModalOpen(true);
                }}
              >
                Edit
              </button>
              <button
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                onClick={() => setIsDeleteExaminationDialogOpen(true)}
              >
                Delete
              </button>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                onClick={() => {
                  setIsViewExaminationModalOpen(false);
                  setSelectedPatient(null);
                  setSelectedExamination(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EXAMINATION MODAL */}
      {isEditExaminationModalOpen && editingExamination && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl my-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Edit Examination</h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl"
                onClick={() => {
                  setIsEditExaminationModalOpen(false);
                  setEditingExamination(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Chief Complaint</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={editingExamination.chief_complaint || ''}
                  onChange={(e) => setEditingExamination({ ...editingExamination, chief_complaint: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Assessment/Diagnosis</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={editingExamination.assessment_diagnosis || ''}
                  onChange={(e) => setEditingExamination({ ...editingExamination, assessment_diagnosis: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.triage_blood_pressure || ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, triage_blood_pressure: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.triage_temperature || ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, triage_temperature: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.triage_pulse_rate || ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, triage_pulse_rate: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">O₂ Saturation (%)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingExamination.triage_oxygen_saturation || ''}
                    onChange={(e) => setEditingExamination({ ...editingExamination, triage_oxygen_saturation: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Treatment Plan</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={editingExamination.plan_treatment || ''}
                  onChange={(e) => setEditingExamination({ ...editingExamination, plan_treatment: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Medications Prescribed</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={editingExamination.medications_prescribed || ''}
                  onChange={(e) => setEditingExamination({ ...editingExamination, medications_prescribed: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={editingExamination.follow_up_date ? editingExamination.follow_up_date.split('T')[0] : ''}
                  onChange={(e) => setEditingExamination({ ...editingExamination, follow_up_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                onClick={() => {
                  setIsEditExaminationModalOpen(false);
                  setEditingExamination(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                onClick={() => {
                  if (editingExamination.id) {
                    updateExaminationMutation.mutate(editingExamination as any);
                  }
                }}
                disabled={updateExaminationMutation.isPending}
              >
                {updateExaminationMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE EXAMINATION CONFIRMATION DIALOG */}
      {isDeleteExaminationDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Delete Examination</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this examination record? This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                onClick={() => setIsDeleteExaminationDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                onClick={() => {
                  if (selectedExamination?.id) {
                    deleteExaminationMutation.mutate(selectedExamination.id);
                  }
                }}
                disabled={deleteExaminationMutation.isPending}
              >
                {deleteExaminationMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW EXAMINATION MODAL */}
      {isNewExaminationModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">New Medical Examination</h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl"
                onClick={() => {
                  setIsNewExaminationModalOpen(false);
                  setNewExaminationForm({
                    patient_id: '',
                    chief_complaint: '',
                    assessment_diagnosis: '',
                    history_of_present_illness: '',
                    triage_temperature: '',
                    triage_blood_pressure: '',
                    triage_pulse_rate: '',
                    triage_respiratory_rate: '',
                    triage_oxygen_saturation: '',
                    triage_weight: '',
                    triage_height: '',
                    plan_treatment: '',
                    medications_prescribed: '',
                    follow_up_date: '',
                    referrals: '',
                  });
                }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Consultation History */}
              <div className="lg:col-span-1">
                {newExaminationForm.patient_id && (
                  <PatientConsultationHistory
                    examinations={patientExaminations || []}
                    isLoading={loadingPatientExaminations}
                  />
                )}
                {!newExaminationForm.patient_id && (
                  <div className="p-4 bg-gray-100 rounded-lg text-sm text-gray-600 text-center">
                    Select a patient to view consultation history
                  </div>
                )}
              </div>

              {/* Right Column: Examination Form */}
              <div className="lg:col-span-2 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Patient *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.patient_id}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, patient_id: e.target.value })}
                  required
                >
                  <option value="">Select a patient</option>
                  {activePatients?.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Chief Complaint *</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.chief_complaint}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, chief_complaint: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Assessment/Diagnosis</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.assessment_diagnosis}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, assessment_diagnosis: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">History of Present Illness</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.history_of_present_illness}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, history_of_present_illness: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={newExaminationForm.triage_blood_pressure}
                    onChange={(e) => setNewExaminationForm({ ...newExaminationForm, triage_blood_pressure: e.target.value })}
                    placeholder="e.g., 120/80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={newExaminationForm.triage_temperature}
                    onChange={(e) => setNewExaminationForm({ ...newExaminationForm, triage_temperature: e.target.value })}
                    step="0.1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={newExaminationForm.triage_pulse_rate}
                    onChange={(e) => setNewExaminationForm({ ...newExaminationForm, triage_pulse_rate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Respiratory Rate (breaths/min)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={newExaminationForm.triage_respiratory_rate}
                    onChange={(e) => setNewExaminationForm({ ...newExaminationForm, triage_respiratory_rate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">O₂ Saturation (%)</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.triage_oxygen_saturation}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, triage_oxygen_saturation: e.target.value })}
                  min="0"
                  max="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={newExaminationForm.triage_weight}
                    onChange={(e) => setNewExaminationForm({ ...newExaminationForm, triage_weight: e.target.value })}
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Height (cm)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={newExaminationForm.triage_height}
                    onChange={(e) => setNewExaminationForm({ ...newExaminationForm, triage_height: e.target.value })}
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Treatment Plan</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.plan_treatment}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, plan_treatment: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Medications Prescribed</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.medications_prescribed}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, medications_prescribed: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.follow_up_date}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, follow_up_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Referrals</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={newExaminationForm.referrals}
                  onChange={(e) => setNewExaminationForm({ ...newExaminationForm, referrals: e.target.value })}
                />
              </div>
            </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                onClick={() => {
                  setIsNewExaminationModalOpen(false);
                  setNewExaminationForm({
                    patient_id: '',
                    chief_complaint: '',
                    assessment_diagnosis: '',
                    history_of_present_illness: '',
                    triage_temperature: '',
                    triage_blood_pressure: '',
                    triage_pulse_rate: '',
                    triage_respiratory_rate: '',
                    triage_oxygen_saturation: '',
                    triage_weight: '',
                    triage_height: '',
                    plan_treatment: '',
                    medications_prescribed: '',
                    follow_up_date: '',
                    referrals: '',
                  });
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded"
                onClick={() => {
                  if (!newExaminationForm.patient_id || !newExaminationForm.chief_complaint) {
                    toast.error('Please fill in required fields (Patient and Chief Complaint)');
                    return;
                  }
                  createExaminationMutation.mutate(newExaminationForm);
                }}
                disabled={createExaminationMutation.isPending}
              >
                {createExaminationMutation.isPending ? 'Creating...' : 'Create Examination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
