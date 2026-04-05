import React, { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AuthContext } from '@/contexts/AuthContext';
// Session validation handled automatically by Supabase JWT
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  Plus,
  Phone,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';
import WaitingRoom from '@/components/dashboard/WaitingRoom';
import { AddToTriageQueueButton } from '@/components/dashboard/AddToTriageQueueDialog';
import { CheckInAndAssignDialog } from '@/components/dashboard/CheckInAndAssignDialog';
import { useTriageQueueStats } from '@/hooks/useTriageQueue';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ReceptionDashboard = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.id;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isCheckInAndAssignDialogOpen, setIsCheckInAndAssignDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Form states
  const [registerForm, setRegisterForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
  });

  const [scheduleForm, setScheduleForm] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
  });

  const [editForm, setEditForm] = useState({
    appointment_id: '',
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
  });

  // Appointment status mutation (check-in, cancel, etc.)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['reception-waiting-patients'] });
      toast.success('Status updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Register new patient mutation
  const registerPatientMutation = useMutation({
    mutationFn: async (data: typeof registerForm) => {
      if (!userId) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Check for duplicate patient registration by unique identifiers
      console.log('[Reception] Checking for existing patient with same phone or email...');
      
      // Check: Phone number match (if phone is provided)
      if (data.phone?.trim()) {
        console.log('[Reception] Checking for existing patient with phone:', data.phone);
        const { data: existingByPhone, error: checkError1 } = await supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number, phone')
          .eq('phone', data.phone.trim());
        
        if (checkError1) {
          console.error('[Reception] Error checking phone duplicates:', checkError1);
          throw new Error('Error checking for duplicate patients');
        }
        
        if (existingByPhone && existingByPhone.length > 0) {
          const existingPatient = existingByPhone[0];
          console.log('[Reception] Found existing patient by phone:', existingPatient);
          throw new Error(
            `A patient with the phone number "${data.phone}" already exists (${existingPatient.first_name} ${existingPatient.last_name}, Patient #${existingPatient.patient_number}). Please verify the information or use the existing record.`
          );
        }
      }

      // Check: Email address match (if email is provided)
      if (data.email?.trim()) {
        console.log('[Reception] Checking for existing patient with email:', data.email);
        const { data: existingByEmail, error: checkError2 } = await supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number, email')
          .eq('email', data.email.trim());
        
        if (checkError2) {
          console.error('[Reception] Error checking email duplicates:', checkError2);
          throw new Error('Error checking for duplicate patients');
        }
        
        if (existingByEmail && existingByEmail.length > 0) {
          const existingPatient = existingByEmail[0];
          console.log('[Reception] Found existing patient by email:', existingPatient);
          throw new Error(
            `A patient with the email "${data.email}" already exists (${existingPatient.first_name} ${existingPatient.last_name}, Patient #${existingPatient.patient_number}). Please verify the information or use the existing record.`
          );
        }
      }

      const { error } = await supabase
        .from('patients')
        .insert({
          ...data,
          patient_number: `PAT-${Date.now()}`,
        });
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-new-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['all-patients'] }); // Refresh patient list for scheduling immediately
      toast.success('Patient registered successfully');
      setIsRegisterDialogOpen(false);
      setRegisterForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        gender: '',
        date_of_birth: '',
      });
    },
    onError: (error: Error) => toast.error(`Failed to register patient: ${error.message}`),
  });

  // Schedule appointment mutation
  const scheduleAppointmentMutation = useMutation({
    mutationFn: async (data: typeof scheduleForm) => {
      if (!userId) {
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('[ReceptionDashboard] ========== SCHEDULING APPOINTMENT ==========');
      console.log('[ReceptionDashboard] Form data:', data);
      
      // Get the selected patient and doctor details for logging
      const selectedPatient = patients.find((p: any) => p.id === data.patient_id);
      const selectedDoctor = doctors.find((d: any) => d.id === data.doctor_id);
      
      console.log('[ReceptionDashboard] Selected Patient:', selectedPatient);
      console.log('[ReceptionDashboard] Selected Doctor:', selectedDoctor);
      
      // Validate doctor is actually available
      if (!selectedDoctor) {
        throw new Error(`Doctor not found in available doctors list. Doctor ID: ${data.doctor_id}`);
      }
      
      // Validate patient exists
      if (!selectedPatient) {
        throw new Error(`Patient not found in available patients list. Patient ID: ${data.patient_id}`);
      }
      
      console.log('[ReceptionDashboard] Sending payload:', {
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        reason: data.reason,
        status: 'scheduled',
        note: 'Using "scheduled" as default status (valid in CHECK constraint)'
      });

      const { error, data: response } = await supabase
        .from('appointments')
        .insert({
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          reason: data.reason,
          status: 'scheduled',  // Use 'scheduled' (default status in schema)
        });
      
      if (error) {
        console.error('[ReceptionDashboard] ❌ SUPABASE ERROR ❌');
        console.error('[ReceptionDashboard] Error code:', error.code);
        console.error('[ReceptionDashboard] Error message:', error.message);
        console.error('[ReceptionDashboard] Full error object:', JSON.stringify(error, null, 2));
        console.error('[ReceptionDashboard] Patient ID used:', data.patient_id);
        console.error('[ReceptionDashboard] Doctor ID used:', data.doctor_id);
        console.error('[ReceptionDashboard] Doctor exists in list:', !!selectedDoctor);
        console.error('[ReceptionDashboard] Patient exists in list:', !!selectedPatient);
        throw new Error(`Failed to create appointment: ${error.message}`);
      }
      
      console.log('[ReceptionDashboard] ✓ Insert successful, response:', response);
      return { success: true };
    },
    onSuccess: () => {
      console.log('[ReceptionDashboard] ✓ MUTATION SUCCESS');
      queryClient.invalidateQueries({ queryKey: ['reception-today-appointments'] });
      toast.success('Appointment scheduled successfully');
      setIsScheduleDialogOpen(false);
      setScheduleForm({
        patient_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        reason: '',
      });
    },
    onError: (error: Error) => {
      console.error('[ReceptionDashboard] ❌ MUTATION FAILED ❌');
      console.error('[ReceptionDashboard] Error message:', error.message);
      if ('code' in error) {
        console.error('[ReceptionDashboard] Error code:', (error as any).code);
      }
      toast.error(`Failed to schedule appointment: ${error.message}`);
    },
  });

  // Edit appointment mutation
  const editAppointmentMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      if (!userId) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const { appointment_id, ...updateData } = data;
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment_id);
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-today-appointments'] });
      toast.success('Appointment updated successfully');
      setIsEditDialogOpen(false);
      setEditForm({
        appointment_id: '',
        patient_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        reason: '',
      });
    },
    onError: (error: Error) => toast.error(`Failed to update appointment: ${error.message}`),
  });

  // Reschedule appointment mutation
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async (data: { appointment_id: string; appointment_date: string; appointment_time: string }) => {
      if (!userId) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const { appointment_id, ...updateData } = data;
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment_id);
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-today-appointments'] });
      toast.success('Appointment rescheduled successfully');
      setIsRescheduleDialogOpen(false);
      setSelectedAppointment(null);
    },
    onError: (error: Error) => toast.error(`Failed to reschedule appointment: ${error.message}`),
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-pending-payments'] });
      toast.success('Payment processed successfully');
      setSelectedPaymentInvoice(null);
    },
    onError: (error: Error) => toast.error(`Failed to process payment: ${error.message}`),
  });
  // Fetch today's appointments
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointments, isLoading: loadingAppointments, refetch: refetchAppointments } = useQuery({
    queryKey: ['reception-today-appointments', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, appointment_date, status, patient_id, doctor_id, reason')
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true }) as { data: any; error: any };
      if (error) throw error;
      
      // Fetch patient and doctor data separately to avoid nested select issues
      const appointmentData = data || [];
      const patientIds = [...new Set(appointmentData.map((apt: any) => apt.patient_id).filter(Boolean))] as string[];
      const doctorIds = [...new Set(appointmentData.map((apt: any) => apt.doctor_id).filter(Boolean))] as string[];
      
      let patients: any = {};
      let doctors: any = {};
      
      if (patientIds.length > 0) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .in('id', patientIds);
        patients = (patientData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
      
      if (doctorIds.length > 0) {
        const { data: doctorData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', doctorIds);
        doctors = (doctorData || []).reduce((acc: any, d: any) => {
          acc[d.id] = d;
          return acc;
        }, {});
      }
      
      return appointmentData.map((apt: any) => {
        const patient = patients[apt.patient_id];
        const doctor = doctors[apt.doctor_id];
        return {
          id: apt.id,
          patient_id: apt.patient_id,
          doctor_id: apt.doctor_id,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
          doctor_name: doctor?.full_name || 'Unknown',
          appointment_time: apt.appointment_time,
          appointment_date: apt.appointment_date,
          reason: apt.reason,
          status: apt.status,
        };
      });
    },
    refetchInterval: 60000,
  });

  // Fetch waiting patients (status = 'waiting')
  const { data: waitingPatients, isLoading: loadingWaiting, refetch: refetchWaitingPatients } = useQuery({
    queryKey: ['reception-waiting-patients', today],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, patient_id, doctor_id, status, appointment_time')
          .eq('appointment_date', today)
          .eq('status', 'waiting');
        
        if (error) {
          console.error('[ReceptionDashboard] Error fetching waiting patients:', error);
          throw error;
        }
        
        const appointmentData = data || [];
        const patientIds = [...new Set(appointmentData.map((apt: any) => apt.patient_id).filter(Boolean))] as string[];
        const doctorIds = [...new Set(appointmentData.map((apt: any) => apt.doctor_id).filter(Boolean))] as string[];
        
        let patients: any = {};
        let doctors: any = {};
        
        if (patientIds.length > 0) {
          const { data: patientData } = await supabase
            .from('patients')
            .select('id, first_name, last_name')
            .in('id', patientIds);
          patients = (patientData || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
        
        if (doctorIds.length > 0) {
          const { data: doctorData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', doctorIds);
          doctors = (doctorData || []).reduce((acc: any, d: any) => {
            acc[d.id] = d;
            return acc;
          }, {});
        }
        
        return appointmentData.map((apt: any) => {
          const patient = patients[apt.patient_id];
          const doctor = doctors[apt.doctor_id];
          return {
            id: apt.id,
            patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
            doctor_name: doctor?.full_name || 'Unknown',
            appointment_time: apt.appointment_time,
            status: apt.status,
          };
        });
      } catch (err) {
        console.error('[ReceptionDashboard] Waiting patients query failed:', err);
        return [];
      }
    },
    staleTime: 0, // Treat as stale immediately
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch new registrations today
  const { data: newRegistrations, refetch: refetchNewRegistrations } = useQuery({
    queryKey: ['reception-new-registrations'],
    queryFn: async () => {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59');
      return count || 0;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch pending payments
  const { data: pendingPayments, isLoading: loadingPayments, refetch: refetchPendingPayments } = useQuery({
    queryKey: ['reception-pending-payments', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, total_amount, status, patient_id, created_at')
        .eq('status', 'pending') as { data: any; error: any };
      if (error) throw error;
      
      // Fetch patient data separately
      const invoiceData = data || [];
      const patientIds = [...new Set(invoiceData.map((inv: any) => inv.patient_id).filter(Boolean))] as string[];
      
      let patients: any = {};
      if (patientIds.length > 0) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .in('id', patientIds);
        patients = (patientData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
      
      return invoiceData.map((inv: any) => {
        const patient = patients[inv.patient_id];
        return {
          ...inv,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
        };
      });
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch all patients for scheduling
  const { data: patients = [], refetch: refetchPatients } = useQuery({
    queryKey: ['all-patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, patient_number, phone')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 0, // Treat as stale immediately to ensure fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch all doctors for scheduling
  const { data: doctors = [], refetch: refetchDoctors } = useQuery({
    queryKey: ['all-doctors'],
    queryFn: async () => {
      try {
        console.log('[ReceptionDashboard] Fetching doctors...');
        
        // First fetch doctor role assignments from user_roles
        const { data: doctorRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'doctor');
        
        if (rolesError) {
          console.error('[ReceptionDashboard] Error fetching doctor roles:', rolesError);
          throw rolesError;
        }
        
        console.log('[ReceptionDashboard] Doctor roles found:', doctorRoles?.length || 0);
        
        if (!doctorRoles || doctorRoles.length === 0) {
          console.warn('[ReceptionDashboard] No doctors found in user_roles');
          return [];
        }
        
        // Get list of doctor user IDs
        const doctorUserIds = doctorRoles.map((dr: any) => dr.user_id);
        console.log('[ReceptionDashboard] Doctor user IDs:', doctorUserIds);
        
        // Now fetch the profiles for these doctor IDs
        const { data: doctorProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', doctorUserIds)
          .order('full_name');
        
        if (profileError) {
          console.error('[ReceptionDashboard] Error fetching doctor profiles:', profileError);
          return [];
        }
        
        console.log('[ReceptionDashboard] Doctor profiles fetched:', doctorProfiles?.length || 0);
        
        // Transform to match expected format
        const transformedDoctors = (doctorProfiles || []).map((p: any) => ({
          id: p.user_id,
          full_name: p.full_name,
        }));
        
        console.log('[ReceptionDashboard] Transformed doctors for UI:', transformedDoctors);
        transformedDoctors.forEach((d: any) => {
          console.log(`  - ${d.full_name} (ID: ${d.id})`);
        });
        
        return transformedDoctors;
      } catch (err) {
        console.error('[ReceptionDashboard] Fetch doctors error:', err);
        return [];
      }
    },
    staleTime: 0, // Treat as stale immediately to ensure fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Calculate stats
  const { data: triageStats } = useTriageQueueStats();
  const stats = {
    todayAppointments: appointments?.length || 0,
    confirmedAppointments: appointments?.filter(a => a.status === 'confirmed').length || 0,
    waitingPatients: waitingPatients?.length || 0,
    avgWait: waitingPatients && waitingPatients.length > 0 ? '15 min' : '0 min',
    newRegistrations: newRegistrations || 0,
    pendingPayments: pendingPayments?.length || 0,
    pendingPaymentsAmount: pendingPayments?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
    triageWaiting: triageStats?.waiting || 0,
    triageInProgress: triageStats?.in_progress || 0,
    triageCritical: triageStats?.critical || 0,
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Comprehensive refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Perform all refetch operations in parallel
      await Promise.all([
        refetchAppointments(),
        refetchWaitingPatients(),
        refetchNewRegistrations(),
        refetchPendingPayments(),
        refetchPatients(),
        refetchDoctors(),
      ]);
      
      toast.success('Dashboard refreshed successfully');
    } catch (error: any) {
      console.error('[ReceptionDashboard] Refresh error:', error);
      toast.error('Failed to refresh dashboard. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">Reception Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, <span className="font-semibold">{user?.email?.split('@')[0] || 'Staff'}</span>! Manage appointments and patient services.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
          title="Refresh all dashboard data"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Appointments */}
        <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-pink-500 to-rose-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/90">Today's Appointments</p>
                <p className="text-3xl font-bold mt-2">{loadingAppointments ? '...' : stats.todayAppointments}</p>
                <p className="text-xs text-white/80 mt-1">{stats.confirmedAppointments} confirmed</p>
              </div>
              <Calendar className="h-10 w-10 text-white/30" />
            </div>
          </CardContent>
        </Card>

        {/* Waiting Patients */}
        <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/90">Waiting Patients</p>
                <p className="text-3xl font-bold mt-2">{loadingWaiting ? '...' : stats.waitingPatients}</p>
                <p className="text-xs text-white/80 mt-1">Average wait: {stats.avgWait}</p>
              </div>
              <Users className="h-10 w-10 text-white/30" />
            </div>
          </CardContent>
        </Card>

        {/* New Registrations */}
        <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/90">New Registrations</p>
                <p className="text-3xl font-bold mt-2">{newRegistrations}</p>
                <p className="text-xs text-white/80 mt-1">Total registered</p>
              </div>
              <Users className="h-10 w-10 text-white/30" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/90">Pending Payments</p>
                <p className="text-3xl font-bold mt-2">{loadingPayments ? '...' : stats.pendingPayments}</p>
                <p className="text-xs text-white/80 mt-1">UGX {(stats.pendingPaymentsAmount || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="h-10 w-10 text-white/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <p className="text-sm text-muted-foreground mb-4">Common front desk tasks</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-24 bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center gap-2" size="lg">
                <Users className="h-6 w-6" />
                <span>Register New Patient</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Patient</DialogTitle>
                <DialogDescription>
                  Enter the patient's personal information to register them in the system.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  registerPatientMutation.mutate(registerForm);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      placeholder="First name"
                      value={registerForm.first_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      placeholder="Last name"
                      value={registerForm.last_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="Phone number"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={registerForm.gender} onValueChange={(v) => setRegisterForm({ ...registerForm, gender: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={registerForm.date_of_birth}
                      onChange={(e) => setRegisterForm({ ...registerForm, date_of_birth: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerPatientMutation.isPending || !registerForm.first_name || !registerForm.last_name}
                >
                  {registerPatientMutation.isPending ? 'Registering...' : 'Register Patient'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-24 bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center justify-center gap-2" size="lg">
                <Calendar className="h-6 w-6" />
                <span>Schedule Appointment</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
                <DialogDescription>
                  Select a patient and doctor to create a new appointment.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Validate all required fields
                  if (!scheduleForm.patient_id) {
                    toast.error('Please select a patient');
                    return;
                  }
                  if (!scheduleForm.doctor_id) {
                    toast.error('Please select a doctor');
                    return;
                  }
                  if (!scheduleForm.appointment_date) {
                    toast.error('Please select an appointment date');
                    return;
                  }
                  if (!scheduleForm.appointment_time) {
                    toast.error('Please select an appointment time');
                    return;
                  }
                  console.log('[ReceptionDashboard] Form validation passed, submitting:', scheduleForm);
                  scheduleAppointmentMutation.mutate(scheduleForm);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Combobox
                    options={
                      patients.map((p: any) => ({
                        value: p.id,
                        label: `${p.first_name} ${p.last_name}${p.patient_number ? ` (${p.patient_number})` : ''}${p.phone ? ` - ${p.phone}` : ''}`,
                      })) || []
                    }
                    value={scheduleForm.patient_id}
                    onValueChange={(v) => setScheduleForm({ ...scheduleForm, patient_id: v })}
                    placeholder="Select patient"
                    searchPlaceholder="Search patient name..."
                    emptyText="No patient found."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Doctor *</Label>
                  <Select value={scheduleForm.doctor_id} onValueChange={(v) => setScheduleForm({ ...scheduleForm, doctor_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={scheduleForm.appointment_date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, appointment_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={scheduleForm.appointment_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, appointment_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason for Visit</Label>
                  <Input
                    placeholder="Reason"
                    value={scheduleForm.reason}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, reason: e.target.value })}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={scheduleAppointmentMutation.isPending || !scheduleForm.patient_id || !scheduleForm.doctor_id}
                >
                  {scheduleAppointmentMutation.isPending ? 'Scheduling...' : 'Schedule'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button className="w-full h-24 bg-green-600 hover:bg-green-700 text-white flex flex-col items-center justify-center gap-2" size="lg">
            <Phone className="h-6 w-6" />
            <span>Answer Calls</span>
          </Button>

          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-24 bg-pink-600 hover:bg-pink-700 text-white flex flex-col items-center justify-center gap-2" size="lg">
                <DollarSign className="h-6 w-6" />
                <span>Process Payment</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Process Payment</DialogTitle>
                <DialogDescription>
                  Select a pending invoice and confirm payment to mark it as paid.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {loadingPayments ? (
                  <div className="text-center py-8">Loading pending invoices...</div>
                ) : pendingPayments && pendingPayments.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      <Label>Select Invoice</Label>
                      <Select value={selectedPaymentInvoice?.id || ''} onValueChange={(invoiceId) => {
                        const inv = pendingPayments.find((p: any) => p.id === invoiceId);
                        setSelectedPaymentInvoice(inv);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select invoice" />
                        </SelectTrigger>
                        <SelectContent>
                          {pendingPayments.map((inv: any) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.patient_name} - UGX {Number(inv.total_amount).toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedPaymentInvoice && (
                      <div className="border-t pt-4">
                        <div className="flex justify-between mb-2">
                          <span>Patient:</span>
                          <span className="font-semibold">{selectedPaymentInvoice.patient_name}</span>
                        </div>
                        <div className="flex justify-between mb-4">
                          <span>Amount:</span>
                          <span className="font-bold text-lg">UGX {Number(selectedPaymentInvoice.total_amount).toLocaleString()}</span>
                        </div>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => processPaymentMutation.mutate(selectedPaymentInvoice.id)}
                          disabled={processPaymentMutation.isPending}
                        >
                          {processPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No pending invoices</div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Appointment Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update the appointment details below.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                editAppointmentMutation.mutate(editForm);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={editForm.patient_id} onValueChange={(v) => setEditForm({ ...editForm, patient_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Doctor</Label>
                <Select value={editForm.doctor_id} onValueChange={(v) => setEditForm({ ...editForm, doctor_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editForm.appointment_date}
                    onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={editForm.appointment_time}
                    onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason for Visit</Label>
                <Input
                  placeholder="Reason"
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={editAppointmentMutation.isPending}
              >
                {editAppointmentMutation.isPending ? 'Updating...' : 'Update Appointment'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Appointment Modal */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for the appointment.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedAppointment.appointment_date || !selectedAppointment.appointment_time) {
                  toast.error('Please select both date and time');
                  return;
                }
                rescheduleAppointmentMutation.mutate({
                  appointment_id: selectedAppointment.id,
                  appointment_date: selectedAppointment.appointment_date,
                  appointment_time: selectedAppointment.appointment_time,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Patient</Label>
                <div className="p-2 bg-muted rounded border text-sm">
                  {selectedAppointment.patient_name}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Doctor</Label>
                <div className="p-2 bg-muted rounded border text-sm">
                  {selectedAppointment.doctor_name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Date *</Label>
                  <Input
                    type="date"
                    value={selectedAppointment.appointment_date || ''}
                    onChange={(e) => setSelectedAppointment({ ...selectedAppointment, appointment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Time *</Label>
                  <Input
                    type="time"
                    value={selectedAppointment.appointment_time || ''}
                    onChange={(e) => setSelectedAppointment({ ...selectedAppointment, appointment_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={rescheduleAppointmentMutation.isPending}
              >
                {rescheduleAppointmentMutation.isPending ? 'Rescheduling...' : 'Reschedule Appointment'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Today's Schedule & Waiting Room */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Appointments for today</p>
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {appointments
                  .filter((apt: any) =>
                    apt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    apt.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((apt: any) => (
                    <div key={apt.id} className="border rounded-lg p-4 hover:bg-muted/50 transition">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold">{apt.patient_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {apt.appointment_time} • Dr. {apt.doctor_name}
                          </p>
                        </div>
                        <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-3">
                        {apt.status !== 'waiting' && apt.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            className="bg-slate-900 hover:bg-slate-800 text-white"
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setIsCheckInAndAssignDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Check In
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setEditForm({
                              appointment_id: apt.id,
                              patient_id: apt.patient_id,
                              doctor_id: apt.doctor_id,
                              appointment_date: apt.appointment_date,
                              appointment_time: apt.appointment_time,
                              reason: apt.reason || '',
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setIsRescheduleDialogOpen(true);
                          }}
                        >
                          Reschedule
                        </Button>
                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => updateStatusMutation.mutate({ id: apt.id, status: 'cancelled' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No appointments for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waiting Room Component */}
        <WaitingRoom hideReadyToCheckIn={true} />
      </div>

      {/* Pending Payments Table */}
      {pendingPayments && pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pending Payments
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Outstanding bills and payment processing</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="font-semibold">Patient</TableHead>
                    <TableHead className="font-semibold">Service</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment: any) => (
                    <TableRow key={payment.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{payment.patient_name}</TableCell>
                      <TableCell className="text-sm">Consultation</TableCell>
                      <TableCell className="font-semibold">UGX {Number(payment.total_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{payment.created_at ? format(parseISO(payment.created_at), 'MMM dd, yyyy') : 'Today'}</TableCell>
                      <TableCell>
                        <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            setSelectedPaymentInvoice(payment);
                            setIsPaymentDialogOpen(true);
                          }}
                        >
                          Process Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check In & Assign Dialog */}
      {selectedAppointment && (
        <CheckInAndAssignDialog
          patientId={selectedAppointment.patient_id}
          patientName={selectedAppointment.patient_name}
          appointmentReason={selectedAppointment.reason}
          appointmentId={selectedAppointment.id}
          isOpen={isCheckInAndAssignDialogOpen}
          onClose={() => {
            setIsCheckInAndAssignDialogOpen(false);
            setSelectedAppointment(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['reception-today-appointments'] });
          }}
        />
      )}
    </div>
  );
};

export default ReceptionDashboard;
