
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Appointment {
  id: string;
  appointment_time: string;
  status: string;
  patients: { first_name: string; last_name: string } | null;
  patient_name: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface Prescription {
  id: string;
}

interface LabResult {
  id: string;
  patient_name: string;
  test_type: string;
  result_date: string;
  status: string;
  priority: string;
  result_value: string | null;
  result_notes: string | null;
}

const DoctorDashboard = () => {
  const { user } = useAuth();
  // State for viewing lab result details
  const [selectedLabResult, setSelectedLabResult] = useState<LabResult | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const { data: appointments, isLoading: loadingAppointments } = useQuery<Appointment[]>({
    queryKey: ['doctor-today-appointments', user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, status, patients (first_name, last_name)') as { data: any; error: any };
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        patient_name: a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : 'Unknown',
      }));
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Fetch active patients for this doctor
  const { data: activePatients } = useQuery<Patient[]>({
    queryKey: ['doctor-active-patients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name') as { data: any; error: any };
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Fetch active prescriptions for this doctor
  const { data: activePrescriptions } = useQuery<Prescription[]>({
    queryKey: ['doctor-active-prescriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id') as { data: any; error: any };
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Fetch lab results for this doctor's patients
  const { data: labResults, isLoading: loadingLabResults } = useQuery<LabResult[]>({
    queryKey: ['doctor-lab-results', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          id,
          completed_at,
          status,
          priority,
          result_value,
          result_notes,
          patients (first_name, last_name),
          lab_tests (test_name)
        `) as { data: any; error: any };
      if (error) throw error;
      return (data || []).map((lr: any) => ({
        id: lr.id,
        patient_name: lr.patients ? `${lr.patients.first_name} ${lr.patients.last_name}` : 'Unknown',
        test_type: lr.lab_tests?.test_name || 'Unknown',
        result_date: lr.completed_at ? new Date(lr.completed_at).toLocaleDateString() : '',
        status: lr.status,
        priority: lr.priority,
        result_value: lr.result_value,
        result_notes: lr.result_notes,
      }));
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Calculate stats
  const stats = {
    todayAppointments: appointments?.length || 0,
    pendingConfirmation: appointments?.filter(a => a.status === 'scheduled').length || 0,
    activePatients: activePatients?.length || 0,
    activePrescriptions: activePrescriptions?.length || 0,
    labResults: labResults?.length || 0,
    criticalLabResults: labResults?.filter(lr => lr.priority === 'critical').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-700">Doctor Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, <b>Dr. {user?.user_metadata?.full_name || 'Doctor'}</b>! Manage patient care and consultations.
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
      <div className="flex gap-2 mt-4">
        <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold">Appointments</button>
        <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold">Patients</button>
        <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold">Prescriptions</button>
        <button className="px-4 py-2 rounded bg-blue-200 text-blue-800 font-semibold">Lab Results</button>
        <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold">Consultations</button>
      </div>

      {/* Laboratory Results Table */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h2 className="text-xl font-semibold mb-2">Laboratory Results</h2>
        {loadingLabResults ? (
          <div>Loading...</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Patient</th>
                <th className="text-left py-2">Test Type</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Priority</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {labResults && labResults.length > 0 ? labResults.map((lr) => (
                <tr key={lr.id}>
                  <td className="py-2">{lr.patient_name}</td>
                  <td className="py-2">{lr.test_type}</td>
                  <td className="py-2">{lr.result_date}</td>
                  <td className="py-2"><span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">{lr.status}</span></td>
                  <td className="py-2">{lr.priority === 'critical' ? <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs">Critical</span> : ''}</td>
                  <td className="py-2 flex gap-2">
                    <button
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
                      onClick={() => {
                        setSelectedLabResult(lr);
                        setIsResultDialogOpen(true);
                      }}
                    >View Results</button>
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                      onClick={() => alert('Report action (to be implemented)')}
                    >Report</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>No lab results found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Lab Result Details Modal */}
      {isResultDialogOpen && selectedLabResult && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setIsResultDialogOpen(false)}
            >✕</button>
            <h3 className="text-xl font-bold mb-2">Lab Result Details</h3>
            <div className="mb-2"><b>Patient:</b> {selectedLabResult.patient_name}</div>
            <div className="mb-2"><b>Test Type:</b> {selectedLabResult.test_type}</div>
            <div className="mb-2"><b>Date:</b> {selectedLabResult.result_date}</div>
            <div className="mb-2"><b>Status:</b> {selectedLabResult.status}</div>
            <div className="mb-2"><b>Priority:</b> {selectedLabResult.priority}</div>
            <div className="mb-2"><b>Result Value:</b> {selectedLabResult.result_value}</div>
            <div className="mb-2"><b>Result Notes:</b> {selectedLabResult.result_notes}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
