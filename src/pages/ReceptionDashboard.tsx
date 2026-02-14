import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ReceptionDashboard = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState<any>(null);
  
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
      const { error } = await supabase
        .from('patients')
        .insert({
          ...data,
          patient_number: `PAT-${Date.now()}`,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-new-registrations'] });
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
      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          reason: data.reason,
          status: 'confirmed',
        });
      if (error) throw error;
    },
    onSuccess: () => {
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
    onError: (error: Error) => toast.error(`Failed to schedule appointment: ${error.message}`),
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
        .select('id, appointment_time, status, patient_id, doctor_id')
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
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
          doctor_name: doctor?.full_name || 'Unknown',
          appointment_time: apt.appointment_time,
          status: apt.status,
        };
      });
    },
    refetchInterval: 60000,
  });

  // Fetch waiting patients (status = 'waiting')
  const { data: waitingPatients, isLoading: loadingWaiting } = useQuery({
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
    refetchInterval: 30000, // Refetch every 30 seconds for reception updates
  });

  // Fetch new registrations today
  const { data: newRegistrations } = useQuery({
    queryKey: ['reception-new-registrations', today],
    queryFn: async () => {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59');
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Fetch pending payments
  const { data: pendingPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ['reception-pending-payments', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, total_amount, status, patient_id')
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
    refetchInterval: 60000,
  });

  // Fetch all patients for scheduling
  const { data: patients = [] } = useQuery({
    queryKey: ['all-patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 120000,
  });

  // Fetch all doctors for scheduling
  const { data: doctors = [] } = useQuery({
    queryKey: ['all-doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'doctor')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 120000,
  });

  // Calculate stats
  const stats = {
    todayAppointments: appointments?.length || 0,
    confirmedAppointments: appointments?.filter(a => a.status === 'confirmed').length || 0,
    waitingPatients: waitingPatients?.length || 0,
    avgWait: waitingPatients && waitingPatients.length > 0 ? '15 min' : '0 min',
    newRegistrations: newRegistrations || 0,
    pendingPayments: pendingPayments?.length || 0,
    pendingPaymentsAmount: pendingPayments?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
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
          onClick={() => {
            refetchAppointments();
            queryClient.invalidateQueries({ queryKey: ['reception-waiting-patients'] });
            queryClient.invalidateQueries({ queryKey: ['reception-new-registrations'] });
            queryClient.invalidateQueries({ queryKey: ['reception-pending-payments'] });
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Appointments */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">Today's Appointments</p>
                <p className="text-4xl font-bold mt-2">{loadingAppointments ? '...' : stats.todayAppointments}</p>
                <p className="text-xs text-white/70 mt-1">{stats.confirmedAppointments} confirmed</p>
              </div>
              <Calendar className="h-8 w-8 text-white/40" />
            </div>
          </CardContent>
        </Card>

        {/* Waiting Patients */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">Waiting Patients</p>
                <p className="text-4xl font-bold mt-2">{loadingWaiting ? '...' : stats.waitingPatients}</p>
                <p className="text-xs text-white/70 mt-1">Avg wait: {stats.avgWait}</p>
              </div>
              <Users className="h-8 w-8 text-white/40" />
            </div>
          </CardContent>
        </Card>

        {/* New Registrations */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">New Registrations</p>
                <p className="text-4xl font-bold mt-2">{newRegistrations}</p>
                <p className="text-xs text-white/70 mt-1">Today</p>
              </div>
              <Plus className="h-8 w-8 text-white/40" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">Pending Payments</p>
                <p className="text-4xl font-bold mt-2">{loadingPayments ? '...' : stats.pendingPayments}</p>
                <p className="text-xs text-white/70 mt-1">UGX {(stats.pendingPaymentsAmount || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-white/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Register Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register New Patient</DialogTitle>
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
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" size="lg">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                scheduleAppointmentMutation.mutate(scheduleForm);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Patient *</Label>
                <Select value={scheduleForm.patient_id} onValueChange={(v) => setScheduleForm({ ...scheduleForm, patient_id: v })}>
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

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
              <DollarSign className="h-4 w-4 mr-2" />
              Process Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
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

        <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" size="lg" disabled>
          <Phone className="h-4 w-4 mr-2" />
          Call Logs
        </Button>
      </div>

      {/* Today's Schedule & Waiting Room */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
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
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{apt.patient_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {apt.appointment_time} • {apt.doctor_name}
                          </p>
                        </div>
                        <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {apt.status === 'confirmed' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateStatusMutation.mutate({ id: apt.id, status: 'waiting' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Check In
                          </Button>
                        )}
                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
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

        {/* Waiting Room */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Waiting Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingWaiting ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : waitingPatients && waitingPatients.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {waitingPatients.map((wp: any) => (
                  <div key={wp.id} className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{wp.patient_name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Waiting for {wp.doctor_name}
                        </p>
                      </div>
                      <Badge className="bg-yellow-600 text-white">Waiting</Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => updateStatusMutation.mutate({ id: wp.id, status: 'in_progress' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: wp.id, status: 'cancelled' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        No Show
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No patients waiting</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments Table */}
      {pendingPayments && pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount (UGX)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.patient_name}</TableCell>
                    <TableCell>{Number(payment.total_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className="bg-orange-100 text-orange-800">
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedPaymentInvoice(payment);
                          setIsPaymentDialogOpen(true);
                        }}
                      >
                        Process
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReceptionDashboard;
