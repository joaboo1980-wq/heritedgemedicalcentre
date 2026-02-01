import React, { useState } from 'react';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */

const usePrescriptionQueue = () => {
  return useQuery({
    queryKey: ['prescription-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`id, prescription_number, status, patient_id, patients (first_name, last_name), prescription_items (medication_id, medications (name))`)
        .in('status', ['pending', 'ready'])
        .order('created_at', { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data || []).map((rx: any) => ({
        id: rx.id,
        prescription_number: rx.prescription_number,
        patient_name: rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : 'Unknown',
        medications: rx.prescription_items?.map((item: any) => item.medications?.name).filter(Boolean).join(', '),
        status: rx.status,
      }));
    },
  });
};

const PharmacyDashboard = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: prescriptionQueue, isLoading: queueLoading, error: queueError, refetch } = usePrescriptionQueue();
  const [selectedRx, setSelectedRx] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Action handlers
  const handleDispense = async (rxId: string) => {
    setProcessing(true);
    // Example: update prescription status to 'dispensed'
    await supabase.from('prescriptions').update({ status: 'dispensed' }).eq('id', rxId);
    setProcessing(false);
    refetch();
  };

  const handleViewDetails = (rx: any) => {
    setSelectedRx(rx);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedRx(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-pink-700">Pharmacy Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, <b>Samuel Lee</b>! Manage prescriptions and medication inventory.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-pink-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Pending Prescriptions</div>
          <div className="text-3xl font-bold">{queueLoading ? '...' : prescriptionQueue?.length ?? 0}</div>
          <div className="text-sm">To dispense</div>
        </div>
        <div className="bg-green-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Medications Dispensed</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : 12 /* TODO: Wire up real data */}</div>
          <div className="text-sm">Today</div>
        </div>
        <div className="bg-blue-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Low Stock</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : stats?.lowStockMedications ?? 0}</div>
          <div className="text-sm">Critical</div>
        </div>
        <div className="bg-purple-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Alerts</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : 1 /* TODO: Wire up real data */}</div>
          <div className="text-sm">Urgent</div>
        </div>
      </div>

      {/* Prescription Queue Table */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h2 className="text-xl font-semibold mb-2">Prescription Queue</h2>
        {queueLoading ? (
          <div>Loading...</div>
        ) : queueError ? (
          <div className="text-red-500">Error loading prescription queue.</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Prescription</th>
                <th className="text-left py-2">Patient</th>
                <th className="text-left py-2">Medications</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptionQueue && prescriptionQueue.length > 0 ? (
                prescriptionQueue.map((rx) => (
                  <tr key={rx.id}>
                    <td className="py-2">{rx.prescription_number}</td>
                    <td className="py-2">{rx.patient_name}</td>
                    <td className="py-2">{rx.medications}</td>
                    <td className="py-2"><span className="bg-pink-200 text-pink-800 px-2 py-1 rounded text-xs">{rx.status}</span></td>
                    <td className="py-2 flex gap-2">
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded"
                        disabled={processing}
                        onClick={() => handleDispense(rx.id)}
                      >Dispense</button>
                      <button
                        className="bg-purple-200 text-purple-800 px-3 py-1 rounded"
                        onClick={() => handleViewDetails(rx)}
                      >View Details</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-2 text-center text-muted-foreground">No prescriptions in queue.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    {/* Modal for View Details */}
    {showDetails && selectedRx && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-2">Prescription Details</h3>
          <div className="mb-2"><b>Prescription:</b> {selectedRx.prescription_number}</div>
          <div className="mb-2"><b>Patient:</b> {selectedRx.patient_name}</div>
          <div className="mb-2"><b>Medications:</b> {selectedRx.medications}</div>
          <div className="mb-2"><b>Status:</b> {selectedRx.status}</div>
          <button className="mt-4 bg-purple-500 text-white px-4 py-2 rounded" onClick={closeDetails}>Close</button>
        </div>
      </div>
    )}
  </div>
  );
};

export default PharmacyDashboard;
