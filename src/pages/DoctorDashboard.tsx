// export default DoctorDashboard;
import React, { useState } from 'react';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/solid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
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
  result_date: string;
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
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // State for UI
  const [activeTab, setActiveTab] = useState<'appointments' | 'patients' | 'prescriptions' | 'lab-results' | 'consultations'>(
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
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPrescriptionPatient, setSelectedPrescriptionPatient] = useState<Patient | null>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    patient_id: '',
    medicine_id: '',
    dosage: '',
    frequency: '',
    duration: '',
  });

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

  const doctorId = user?.id;
  const doctorName = user?.user_metadata?.full_name || '';

  // ===== APPOINTMENTS QUERY =====
  const { data: appointments, isLoading: loadingAppointments } = useQuery<Appointment[]>({
    queryKey: ['doctor-today-appointments', doctorId, today],
    queryFn: async () => {
      if (!doctorId) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `id, appointment_time, appointment_date, doctor_id, status, reason, notes, 
           duration_minutes, patient_id, patients(first_name, last_name, patient_number)`
        )
        .eq('doctor_id', doctorId)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        patient_name: a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : 'Unknown',
      }));
    },
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  // ===== ACTIVE PATIENTS QUERY =====
  const { data: activePatients, isLoading: loadingPatients } = useQuery<Patient[]>({
    queryKey: ['doctor-active-patients', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      // Get all patients and filter those with appointments from this doctor
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_number, first_name, last_name, date_of_birth, gender, blood_type');

      if (error) throw error;
      return data || [];
    },
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  // ===== PRESCRIPTIONS QUERY =====
 const { data: activePrescriptions, isLoading: loadingPrescriptions } = useQuery<Prescription[]>({
  queryKey: ['doctor-active-prescriptions', doctorId],
  queryFn: async () => {
    if (!doctorId) return [];
    const { data, error }: { data: any; error: any } = await supabase
      .from('prescriptions')
      .select(
        `id, patient_id, status, created_at,
         patients(first_name, last_name),
         prescription_items(medication_id, dosage, frequency, duration,
           medications(name))`
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((p: any) => {
      const item = p.prescription_items?.[0];
      return {
        id: p.id,
        patient_id: p.patient_id,
        medicine_id: item?.medication_id,
        dosage: item?.dosage,
        frequency: item?.frequency,
        duration: item?.duration,
        status: p.status,
        prescribed_date: p.created_at,
        patient_name: p.patients ? `${p.patients.first_name} ${p.patients.last_name}` : 'Unknown',
        medicine_name: item?.medications?.name || 'Unknown',
      };
    });
  },
  enabled: !!doctorId,
  refetchInterval: 60000,
});

  // ===== LAB RESULTS QUERY =====
  const { data: labResults, isLoading: loadingLabResults } = useQuery<LabResult[]>({
    queryKey: ['doctor-lab-results', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      const { data, error } = await supabase
        .from('lab_orders')
        .select(
          `id, order_number, patient_id, status, priority, result_value, result_notes, 
           is_abnormal, completed_at, sample_collected_at,
           patients(first_name, last_name), lab_tests(test_name)`
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((lr: any) => ({
        id: lr.id,
        order_number: lr.order_number,
        patient_id: lr.patient_id,
        patient_name: lr.patients ? `${lr.patients.first_name} ${lr.patients.last_name}` : 'Unknown',
        test_type: lr.lab_tests?.test_name || 'Unknown',
        result_date: lr.completed_at ? new Date(lr.completed_at).toLocaleDateString() : 'Pending',
        status: lr.status,
        priority: lr.priority,
        result_value: lr.result_value,
        result_notes: lr.result_notes,
        is_abnormal: lr.is_abnormal,
        sample_collected_at: lr.sample_collected_at,
      }));
    },
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  // ===== MEDICAL EXAMINATIONS QUERY =====
  const { data: medicalExaminations, isLoading: loadingExaminations } = useQuery<MedicalExamination[]>({
    queryKey: ['doctor-medical-examinations', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      const { data, error } = await (supabase as any)
        .from('medical_examinations')
        .select(
          `id, patient_id, examination_date, chief_complaint, assessment_diagnosis,
           triage_temperature, triage_blood_pressure, triage_pulse_rate, plan_treatment,
           patients(first_name, last_name)`
        )
        .order('examination_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((me: any) => ({
        ...me,
        patient_name: me.patients ? `${me.patients.first_name} ${me.patients.last_name}` : 'Unknown',
      }));
    },
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  // ===== PATIENT EXAMINATIONS QUERY =====
  const { data: patientExaminations, isLoading: loadingPatientExaminations } = useQuery<MedicalExamination[]>({
    queryKey: ['patient-examinations', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient?.id) return [];
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
        .eq('patient_id', selectedPatient.id)
        .order('examination_date', { ascending: false });

      if (error) throw error;
      return (data || []).map((me: any) => ({
        ...me,
        patient_name: me.patients ? `${me.patients.first_name} ${me.patients.last_name}` : 'Unknown',
      }));
    },
    enabled: !!selectedPatient?.id,
  });

  // ===== MUTATIONS =====
  const confirmAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-today-appointments'] });
      toast.success('Appointment confirmed');
      setSelectedAppointment(null);
      setAppointmentDialog(false);
    },
    onError: () => {
      toast.error('Failed to confirm appointment');
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-today-appointments'] });
      toast.success('Appointment cancelled');
      setSelectedAppointment(null);
      setCancelAppointmentDialog(false);
    },
    onError: () => {
      toast.error('Failed to cancel appointment');
    },
  });

  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, date, time }: { appointmentId: string; date: string; time: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ appointment_date: date, appointment_time: time + ':00', status: 'rescheduled' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-today-appointments'] });
      toast.success('Appointment rescheduled');
      setRescheduleDialog(false);
      setSelectedAppointment(null);
      setRescheduleDate('');
      setRescheduleTime('');
    },
    onError: () => {
      toast.error('Failed to reschedule appointment');
    },
  });

  const createExaminationMutation = useMutation({
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


const createPrescriptionMutation = useMutation({
  mutationFn: async (prescriptionData: any) => {
    // Generate prescription_number in the format: RXYYYYMMdd-####
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const prescriptionNumber = `RX${dateStr}-${randomNum}`;

    // Create the prescription record with generated prescription_number
    const { data: prescriptionResponse, error: prescriptionError } = await (supabase as any)
      .from('prescriptions')
      .insert({
        patient_id: prescriptionData.patient_id,
        prescription_number: prescriptionNumber,
        status: 'pending',
      })
      .select()
      .single();

    if (prescriptionError) throw prescriptionError;
    
    const prescriptionId = prescriptionResponse?.id;
    if (!prescriptionId) throw new Error('Failed to create prescription');

    // Step 2: Create the prescription item with medication details
    const { error: itemError } = await (supabase as any)
      .from('prescription_items')
      .insert({
        prescription_id: prescriptionId,
        medication_id: prescriptionData.medicine_id,
        quantity: 1,
        dosage: prescriptionData.dosage,
        frequency: prescriptionData.frequency,
        duration: prescriptionData.duration || null,
      });

    if (itemError) throw itemError;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['doctor-active-prescriptions'] });
    toast.success('Prescription created successfully');
    setIsPrescriptionModalOpen(false);
    setPrescriptionForm({
      patient_id: '',
      medicine_id: '',
      dosage: '',
      frequency: '',
      duration: '',
    });
    setSelectedPrescriptionPatient(null);
  },
  onError: (error: Error) => {
    toast.error('Failed to create prescription: ' + error.message);
  },
});
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

  // HANDLER FOR DIAGNOSE BUTTON
  const handleDiagnoseClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDiagnosisModalOpen(true);
  };

  // HANDLER FOR PRESCRIPTION BUTTON
  const handleCreatePrescription = (patient: Patient) => {
    setSelectedPrescriptionPatient(patient);
    setPrescriptionForm({
      ...prescriptionForm,
      patient_id: patient.id,
    });
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

    createExaminationMutation.mutate(dataToSubmit);
  };

  const handleSubmitPrescription = () => {
    if (!prescriptionForm.patient_id || !prescriptionForm.medicine_id || !prescriptionForm.dosage || !prescriptionForm.frequency) {
      toast.error('Please fill in all required fields');
      return;
    }
    createPrescriptionMutation.mutate(prescriptionForm);
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
        <div className="bg-blue-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Today's Appointments</div>
          <div className="text-3xl font-bold">{stats.todayAppointments}</div>
          <div className="text-sm">{stats.pendingConfirmation} pending confirmation</div>
        </div>
        <div className="bg-purple-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Active Patients</div>
          <div className="text-3xl font-bold">{stats.activePatients}</div>
          <div className="text-sm">Under your care</div>
        </div>
        <div className="bg-green-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Active Prescriptions</div>
          <div className="text-3xl font-bold">{stats.activePrescriptions}</div>
          <div className="text-sm">Currently active</div>
        </div>
        <div className="bg-orange-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Lab Results</div>
          <div className="text-3xl font-bold">{stats.labResults}</div>
          <div className="text-sm">{stats.criticalLabResults} critical</div>
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
                      <td className="py-3 px-4">{apt.reason || 'N/A'}</td>
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
                          onClick={() => {
                            setSelectedPatient(patient);
                            setIsViewExaminationModalOpen(true);
                          }}
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
                          onClick={() => alert('Export action (to be implemented)')}
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
                    disabled={createExaminationMutation.isPending}
                  >
                    Save Diagnosis
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Examinations Modal */}
          {isViewExaminationModalOpen && selectedPatient && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl my-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold">Examination Records - {selectedPatient.first_name} {selectedPatient.last_name}</h3>
                  <button
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                    onClick={() => {
                      setIsViewExaminationModalOpen(false);
                      setSelectedPatient(null);
                    }}
                  >
                    ✕
                  </button>
                </div>

                {loadingPatientExaminations ? (
                  <div className="text-center py-8">Loading examination records...</div>
                ) : !patientExaminations || patientExaminations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No examination records found for this patient</div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {patientExaminations.map((exam, index) => (
                      <div key={exam.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-lg">
                            Examination #{index + 1}
                          </h4>
                          <span className="text-sm text-gray-600">
                            {format(new Date(exam.examination_date), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Chief Complaint</p>
                            <p className="font-medium">{exam.chief_complaint}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Assessment/Diagnosis</p>
                            <p className="font-medium">{exam.assessment_diagnosis}</p>
                          </div>
                          {exam.triage_temperature && (
                            <div>
                              <p className="text-gray-600">Temperature</p>
                              <p className="font-medium">{exam.triage_temperature}°C</p>
                            </div>
                          )}
                          {exam.triage_blood_pressure && (
                            <div>
                              <p className="text-gray-600">Blood Pressure</p>
                              <p className="font-medium">{exam.triage_blood_pressure}</p>
                            </div>
                          )}
                          {exam.triage_pulse_rate && (
                            <div>
                              <p className="text-gray-600">Pulse Rate</p>
                              <p className="font-medium">{exam.triage_pulse_rate} bpm</p>
                            </div>
                          )}
                          {exam.plan_treatment && (
                            <div className="col-span-2">
                              <p className="text-gray-600">Treatment Plan</p>
                              <p className="font-medium">{exam.plan_treatment}</p>
                            </div>
                          )}
                          {exam.follow_up_date && (
                            <div>
                              <p className="text-gray-600">Follow-up Date</p>
                              <p className="font-medium">{format(new Date(exam.follow_up_date), 'MMM dd, yyyy')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 justify-end mt-6">
                  <button
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    onClick={() => {
                      setIsViewExaminationModalOpen(false);
                      setSelectedPatient(null);
                    }}
                  >
                    Close
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
            medicine_id: '',
            dosage: '',
            frequency: '',
            duration: '',
           
          });
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
              <th className="text-left py-3 px-4 font-semibold">Patient</th>
              <th className="text-left py-3 px-4 font-semibold">Medication</th>
              <th className="text-left py-3 px-4 font-semibold">Dosage</th>
              <th className="text-left py-3 px-4 font-semibold">Frequency</th>
              <th className="text-left py-3 px-4 font-semibold">Duration</th>
              <th className="text-left py-3 px-4 font-semibold">Prescribed Date</th>
              <th className="text-left py-3 px-4 font-semibold">Status</th>
              <th className="text-left py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activePrescriptions.map((prescription) => (
              <tr key={prescription.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{prescription.patient_name}</td>
                <td className="py-3 px-4">{prescription.medicine_name}</td>
                <td className="py-3 px-4">{prescription.dosage}</td>
                <td className="py-3 px-4">{prescription.frequency}</td>
                <td className="py-3 px-4">{prescription.duration}</td>
                <td className="py-3 px-4">
                  {format(new Date(prescription.prescribed_date), 'MMM dd, yyyy')}
                </td>
                <td className="py-3 px-4">
                  <Badge className={getStatusColor(prescription.status)}>{prescription.status}</Badge>
                </td>
                <td className="py-3 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    onClick={() => alert('Edit functionality to be implemented')}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    onClick={() => alert('Cancel functionality to be implemented')}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {/* Create/Edit Prescription Modal */}
    {isPrescriptionModalOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md my-4">
          <h3 className="text-xl font-bold mb-4">Create Prescription</h3>
          <p className="mb-4 text-gray-600">Create a new prescription for the selected patient.</p>

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

          {/* Medication Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Medication *</label>
            <select
              value={prescriptionForm.medicine_id}
              onChange={(e) => handlePrescriptionFormChange('medicine_id', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              disabled={loadingMedications}
            >
              <option value="">
                {loadingMedications ? 'Loading medications...' : 'Select medication'}
              </option>
              {availableMedications?.map((med: any) => (
                <option key={med.id} value={med.id}>
                  {med.name} ({med.strength} {med.form})
                </option>
              ))}
            </select>
          </div>

          {/* Dosage */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
            <input
              type="text"
              placeholder="e.g., 10mg"
              value={prescriptionForm.dosage}
              onChange={(e) => handlePrescriptionFormChange('dosage', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          {/* Frequency */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
            <select
              value={prescriptionForm.frequency}
              onChange={(e) => handlePrescriptionFormChange('frequency', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
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
          </div>

          {/* Duration */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <input
              type="text"
              placeholder="e.g., 7 days, 2 weeks, 30 days"
              value={prescriptionForm.duration}
              onChange={(e) => handlePrescriptionFormChange('duration', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

    

          <div className="flex gap-2 justify-end">
            <button
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              onClick={() => {
                setIsPrescriptionModalOpen(false);
                setPrescriptionForm({
                  patient_id: '',
                  medicine_id: '',
                  dosage: '',
                  frequency: '',
                  duration: '',
                 
                });
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
              {createPrescriptionMutation.isPending ? 'Creating...' : 'Create Prescription'}
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
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Order #</th>
                    <th className="text-left py-3 px-4 font-semibold">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold">Test Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Result Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Priority</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {labResults.map((lr) => (
                    <tr key={lr.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{lr.order_number}</td>
                      <td className="py-3 px-4">{lr.patient_name}</td>
                      <td className="py-3 px-4">{lr.test_type}</td>
                      <td className="py-3 px-4">{lr.result_date}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(lr.status)}>{lr.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getPriorityColor(lr.priority)}>{lr.priority}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          onClick={() => {
                            setSelectedLabResult(lr);
                            setIsResultDialogOpen(true);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
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
      {activeTab === 'consultations' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Medical Examinations & Consultations</h2>

          {loadingExaminations ? (
            <div className="text-center py-8">Loading consultations...</div>
          ) : !medicalExaminations || medicalExaminations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No medical examinations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold">Examination Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Chief Complaint</th>
                    <th className="text-left py-3 px-4 font-semibold">Diagnosis</th>
                    <th className="text-left py-3 px-4 font-semibold">BP</th>
                    <th className="text-left py-3 px-4 font-semibold">Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {medicalExaminations.map((exam) => (
                    <tr key={exam.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{exam.patient_name}</td>
                      <td className="py-3 px-4">
                        {format(new Date(exam.examination_date), 'MMM dd, yyyy')}
                      </td>

                      <td className="py-3 px-4">{exam.chief_complaint}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{exam.assessment_diagnosis}</td>
                      <td className="py-3 px-4">{exam.triage_blood_pressure || 'N/A'}</td>
                      <td className="py-3 px-4">{exam.triage_temperature ? `${exam.triage_temperature}°C` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
