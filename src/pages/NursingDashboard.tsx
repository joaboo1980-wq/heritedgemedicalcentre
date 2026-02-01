import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useQuery } from '@tanstack/react-query';

/* eslint-disable @typescript-eslint/no-explicit-any */

const usePatientQueue = () => {
  return useQuery({
    queryKey: ['patient-queue'],
    queryFn: async () => {
      // Example: fetch patients with status 'waiting' and their room assignments
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, medical_notes, patient_number')
        .order('created_at', { ascending: true })
        .limit(10);
      if (error) throw error;
      // TODO: Add room and status fields if available in schema
      return (data || []).map((p: any, idx: number) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        room: 100 + idx, // Placeholder for room
        status: 'Waiting', // Placeholder for status
        patient_number: p.patient_number,
      }));
    },
  });
};

const NursingDashboard = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: patientQueue, isLoading: queueLoading, error: queueError, refetch } = usePatientQueue();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [vitals, setVitals] = useState({ temperature: '', bloodPressure: '', heartRate: '' });
  const [medication, setMedication] = useState({ name: '', dose: '', time: '' });

  // Action handlers
  const handleAdministerMedication = (patient: any) => {
    setSelectedPatient(patient);
    setShowMedicationModal(true);
  };

  const handleRecordVitals = (patient: any) => {
    setSelectedPatient(patient);
    setShowVitalsModal(true);
  };

  const handleMarkAttended = async (patientId: string) => {
    setProcessing(true);
    // Example: update patient status to 'Attended' (requires status field in schema)
    // await supabase.from('patients').update({ status: 'Attended' }).eq('id', patientId);
    setProcessing(false);
    refetch();
  };

  const closeVitalsModal = () => {
    setShowVitalsModal(false);
    setSelectedPatient(null);
    setVitals({ temperature: '', bloodPressure: '', heartRate: '' });
  };
  const closeMedicationModal = () => {
    setShowMedicationModal(false);
    setSelectedPatient(null);
    setMedication({ name: '', dose: '', time: '' });
  };

  // Submit handlers
  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    // TODO: Wire up vitals table (currently not in schema)
    // await supabase.from('vitals').insert({
    //   patient_id: selectedPatient.id,
    //   temperature: vitals.temperature,
    //   blood_pressure: vitals.bloodPressure,
    //   heart_rate: vitals.heartRate,
    //   recorded_at: new Date().toISOString(),
    // });
    setProcessing(false);
    closeVitalsModal();
    refetch();
  };

  const handleMedicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    // TODO: Wire up medication_admin table (currently not in schema)
    // await supabase.from('medication_admin').insert({
    //   patient_id: selectedPatient.id,
    //   medication_name: medication.name,
    //   dose: medication.dose,
    //   administered_at: medication.time || new Date().toISOString(),
    // });
    setProcessing(false);
    closeMedicationModal();
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-700">Nursing Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, <b>Mary Johnson</b>! Manage patient queue and medication administration.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Patients Waiting</div>
          <div className="text-3xl font-bold">{queueLoading ? '...' : patientQueue?.length ?? 0}</div>
          <div className="text-sm">In queue</div>
        </div>
        <div className="bg-green-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Medications Due</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : 2 /* TODO: Wire up real data */}</div>
          <div className="text-sm">To administer</div>
        </div>
        <div className="bg-purple-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Vitals Recorded</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : 8 /* TODO: Wire up real data */}</div>
          <div className="text-sm">Today</div>
        </div>
        <div className="bg-pink-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Alerts</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : 1 /* TODO: Wire up real data */}</div>
          <div className="text-sm">Critical</div>
        </div>
      </div>

      {/* Patient Queue Table */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h2 className="text-xl font-semibold mb-2">Patient Queue</h2>
        {queueLoading ? (
          <div>Loading...</div>
        ) : queueError ? (
          <div className="text-red-500">Error loading patient queue.</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Patient</th>
                <th className="text-left py-2">Room</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patientQueue && patientQueue.length > 0 ? (
                patientQueue.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{p.name}</td>
                    <td className="py-2">{p.room}</td>
                    <td className="py-2"><span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">{p.status}</span></td>
                    <td className="py-2 flex gap-2">
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded"
                        disabled={processing}
                        onClick={() => handleAdministerMedication(p)}
                      >Administer Medication</button>
                      <button
                        className="bg-purple-200 text-purple-800 px-3 py-1 rounded"
                        onClick={() => handleRecordVitals(p)}
                      >Record Vitals</button>
                      <button
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
                        disabled={processing}
                        onClick={() => handleMarkAttended(p.id)}
                      >Mark as Attended</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-2 text-center text-muted-foreground">No patients in queue.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    {/* Modal for Record Vitals */}
    {showVitalsModal && selectedPatient && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-2">Record Vitals for {selectedPatient.name}</h3>
          <form onSubmit={handleVitalsSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Temperature (°C)</label>
              <input type="text" className="border rounded px-2 py-1 w-full" value={vitals.temperature} onChange={e => setVitals(v => ({ ...v, temperature: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Blood Pressure</label>
              <input type="text" className="border rounded px-2 py-1 w-full" value={vitals.bloodPressure} onChange={e => setVitals(v => ({ ...v, bloodPressure: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Heart Rate</label>
              <input type="text" className="border rounded px-2 py-1 w-full" value={vitals.heartRate} onChange={e => setVitals(v => ({ ...v, heartRate: e.target.value }))} required />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="bg-purple-500 text-white px-4 py-2 rounded" disabled={processing}>Save</button>
              <button type="button" className="bg-gray-200 text-gray-700 px-4 py-2 rounded" onClick={closeVitalsModal}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    )}
    {/* Modal for Administer Medication */}
    {showMedicationModal && selectedPatient && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-2">Administer Medication to {selectedPatient.name}</h3>
          <form onSubmit={handleMedicationSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Medication Name</label>
              <input type="text" className="border rounded px-2 py-1 w-full" value={medication.name} onChange={e => setMedication(m => ({ ...m, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Dose</label>
              <input type="text" className="border rounded px-2 py-1 w-full" value={medication.dose} onChange={e => setMedication(m => ({ ...m, dose: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Time</label>
              <input type="datetime-local" className="border rounded px-2 py-1 w-full" value={medication.time} onChange={e => setMedication(m => ({ ...m, time: e.target.value }))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded" disabled={processing}>Save</button>
              <button type="button" className="bg-gray-200 text-gray-700 px-4 py-2 rounded" onClick={closeMedicationModal}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
  );
};

export default NursingDashboard;
