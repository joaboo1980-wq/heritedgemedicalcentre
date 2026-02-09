

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/* eslint-disable @typescript-eslint/no-explicit-any */


const ReceptionDashboard = () => {
  const queryClient = useQueryClient();
  // Dialog state for register new patient (to be implemented)
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  // TODO: Add dialog state for schedule appointment, process payment, edit appointment, etc.

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
  // Fetch today's appointments
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
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
  const { data: pendingPayments } = useQuery({
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

  // Calculate stats
  const stats = {
    todayAppointments: appointments?.length || 0,
    confirmedAppointments: appointments?.filter(a => a.status === 'confirmed').length || 0,
    waitingPatients: waitingPatients?.length || 0,
    avgWait: waitingPatients && waitingPatients.length > 0 ? '15 min' : '0 min', // TODO: calculate real avg
    newRegistrations: newRegistrations || 0,
    pendingPayments: pendingPayments?.length || 0,
    pendingPaymentsAmount: pendingPayments?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-pink-700">Reception Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, <b>Emily Davis</b>! Manage appointments and patient services.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Appointments */}
        <div className="bg-pink-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Today's Appointments</div>
          <div className="text-3xl font-bold">{stats.todayAppointments}</div>
          <div className="text-sm">{stats.confirmedAppointments} confirmed</div>
        </div>
        {/* Waiting Patients */}
        <div className="bg-blue-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Waiting Patients</div>
          <div className="text-3xl font-bold">{stats.waitingPatients}</div>
          <div className="text-sm">Average wait: {stats.avgWait}</div>
        </div>
        {/* New Registrations */}
        <div className="bg-purple-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">New Registrations</div>
          <div className="text-3xl font-bold">{stats.newRegistrations}</div>
          <div className="text-sm">Total registered</div>
        </div>
        {/* Pending Payments */}
        <div className="bg-green-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Pending Payments</div>
          <div className="text-3xl font-bold">{stats.pendingPayments}</div>
          <div className="text-sm">UGX {stats.pendingPaymentsAmount}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          className="bg-blue-500 text-white rounded-lg p-4 font-semibold"
          onClick={() => setIsRegisterDialogOpen(true)}
        >Register New Patient</button>
        <button
          className="bg-purple-500 text-white rounded-lg p-4 font-semibold"
          onClick={() => toast.info('Schedule appointment (to be implemented)')}
        >Schedule Appointment</button>
        <button
          className="bg-green-500 text-white rounded-lg p-4 font-semibold"
          onClick={() => toast.info('Answer calls (to be implemented, needs call log schema)')}
        >Answer Calls</button>
        <button
          className="bg-pink-500 text-white rounded-lg p-4 font-semibold"
          onClick={() => toast.info('Process payment (to be implemented, needs payment dialog)')}
        >Process Payment</button>
      </div>

      {/* Today's Schedule & Waiting Room */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Today's Schedule</h2>
          {loadingAppointments ? (
            <div>Loading...</div>
          ) : (
            appointments && appointments.length > 0 ? appointments.map((apt) => (
              <div key={apt.id} className="bg-white rounded-lg shadow p-4 mb-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{apt.patient_name} <span className="ml-2 text-xs bg-blue-200 text-blue-800 rounded px-2 py-1">{apt.status}</span></div>
                  <div className="text-sm text-muted-foreground">{apt.appointment_time} - {apt.doctor_name}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-green-500 text-white px-3 py-1 rounded"
                    onClick={() => updateStatusMutation.mutate({ id: apt.id, status: 'in_progress' })}
                  >Check in</button>
                  <button
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
                    onClick={() => toast.info('Edit appointment (to be implemented)')}
                  >Edit</button>
                  <button
                    className="bg-yellow-400 text-white px-3 py-1 rounded"
                    onClick={() => toast.info('Reschedule appointment (to be implemented)')}
                  >Reschedule</button>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded"
                    onClick={() => updateStatusMutation.mutate({ id: apt.id, status: 'cancelled' })}
                  >Cancel</button>
                </div>
              </div>
            )) : <div>No appointments for today.</div>
          )}
        </div>
        {/* Waiting Room */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Waiting Room</h2>
          {loadingWaiting ? (
            <div>Loading...</div>
          ) : (
            waitingPatients && waitingPatients.length > 0 ? waitingPatients.map((wp) => (
              <div key={wp.id} className="bg-white rounded-lg shadow p-4 mb-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{wp.patient_name}</div>
                  <div className="text-sm text-muted-foreground">Waiting for {wp.doctor_name} - {/* TODO: calculate wait time */}15 min</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => toast.info('Call patient (to be implemented, needs call log schema)')}
                  >Call</button>
                  <button
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
                    onClick={() => toast.info('Update waiting status (to be implemented, needs clarification)')}
                  >Update</button>
                  {/* TODO: Add Register New Patient dialog/modal here, reusing logic from Patients.tsx */}
                </div>
              </div>
            )) : <div>No patients waiting.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboard;
