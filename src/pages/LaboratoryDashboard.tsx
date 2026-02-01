import React, { useState } from 'react';
import {
  useDashboardStats,
  usePendingLabOrders,
} from '@/hooks/useDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/* eslint-disable @typescript-eslint/no-explicit-any */


const LaboratoryDashboard = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: pendingLabOrders, isLoading: labLoading, error: labError, refetch } = usePendingLabOrders();
  const { toast } = useToast();

  // Modal state for View Details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Filter urgent tests from pendingLabOrders
  const urgentTests = (pendingLabOrders || []).filter(order => order.priority === 'urgent');
  const inProgressTests = (pendingLabOrders || []).filter(order => order.status === 'in_progress');
  const completedToday = 1; // TODO: Wire up completed tests count
  const equipmentStatus = 75; // TODO: Wire up equipment status

  // Action handlers
  const handleProcess = async (orderId: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from('lab_orders')
      .update({ status: 'in_progress' })
      .eq('id', orderId);
    setProcessing(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to process lab order.', variant: 'destructive' });
    } else {
      toast({ title: 'Lab order processing started.' });
      refetch();
    }
  };

  const handleReject = async (orderId: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from('lab_orders')
      .update({ status: 'rejected' })
      .eq('id', orderId);
    setProcessing(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to reject sample.', variant: 'destructive' });
    } else {
      toast({ title: 'Sample rejected.' });
      refetch();
    }
  };

  const handleCancel = async (orderId: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from('lab_orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);
    setProcessing(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to cancel lab order.', variant: 'destructive' });
    } else {
      toast({ title: 'Lab order cancelled.' });
      refetch();
    }
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-purple-700">Laboratory Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, <b>Jennifer Wilson</b>! Manage lab tests and sample processing.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-purple-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Pending Tests</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : stats?.pendingLabOrders ?? 0}</div>
          <div className="text-sm">{statsLoading ? '' : `${urgentTests.length} urgent`}</div>
        </div>
        <div className="bg-blue-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">In Progress</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : inProgressTests.length}</div>
          <div className="text-sm">Currently processing</div>
        </div>
        <div className="bg-green-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Completed Today</div>
          <div className="text-3xl font-bold">{statsLoading ? '...' : completedToday}</div>
          <div className="text-sm">Tests finished</div>
        </div>
        <div className="bg-pink-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Equipment Status</div>
          <div className="text-3xl font-bold">{equipmentStatus}%</div>
          <div className="text-sm">Operational</div>
        </div>
      </div>

      {/* Urgent Tests Section */}
      <div className="bg-red-100 border border-red-300 rounded-lg p-4 mt-4">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Urgent Tests</h2>
        {labLoading ? (
          <div>Loading...</div>
        ) : urgentTests.length === 0 ? (
          <div className="text-muted-foreground">No urgent tests.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {urgentTests.map(test => (
              <div key={test.id} className="bg-white rounded shadow p-2 flex items-center justify-between">
                <div>
                  <b>{test.test_name}</b> <span className="text-xs text-muted-foreground">Patient: {test.patient_name} - Ordered: {new Date(test.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded"
                  disabled={processing}
                  onClick={() => handleProcess(test.id)}
                >Process Now</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-4">
        <button className="px-4 py-2 rounded bg-purple-200 text-purple-800 font-semibold">Pending Tests</button>
        <button className="px-4 py-2 rounded bg-blue-100 text-blue-800 font-semibold">In Progress</button>
        <button className="px-4 py-2 rounded bg-green-100 text-green-800 font-semibold">Completed</button>
        <button className="px-4 py-2 rounded bg-pink-100 text-pink-800 font-semibold">Equipment</button>
      </div>

      {/* Pending Lab Tests Table */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h2 className="text-xl font-semibold mb-2">Pending Lab Tests</h2>
        {labLoading ? (
          <div>Loading...</div>
        ) : labError ? (
          <div className="text-red-500">Error loading lab tests.</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Test ID</th>
                <th className="text-left py-2">Patient</th>
                <th className="text-left py-2">Test Type</th>
                <th className="text-left py-2">Priority</th>
                <th className="text-left py-2">Order Date</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingLabOrders && pendingLabOrders.length > 0 ? (
                pendingLabOrders.map(order => (
                  <tr key={order.id}>
                    <td className="py-2">{order.order_number}</td>
                    <td className="py-2">{order.patient_name}</td>
                    <td className="py-2">{order.test_name}</td>
                    <td className="py-2"><span className={`px-2 py-1 rounded text-xs ${order.priority === 'urgent' ? 'bg-red-200 text-red-800' : 'bg-purple-200 text-purple-800'}`}>{order.priority}</span></td>
                    <td className="py-2">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="py-2 flex gap-2">
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded"
                        disabled={processing}
                        onClick={() => handleProcess(order.id)}
                      >Process</button>
                      <button
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
                        onClick={() => handleViewDetails(order)}
                      >View Details</button>
                      <button
                        className="bg-red-200 text-red-800 px-3 py-1 rounded"
                        disabled={processing}
                        onClick={() => handleReject(order.id)}
                      >Reject Sample</button>
                      <button
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
                        disabled={processing}
                        onClick={() => handleCancel(order.id)}
                      >Cancel</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-2 text-center text-muted-foreground">No pending lab tests.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    {/* Modal for View Details */}
    {showDetails && selectedOrder && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-2">Lab Test Details</h3>
          <div className="mb-2"><b>Test:</b> {selectedOrder.test_name}</div>
          <div className="mb-2"><b>Patient:</b> {selectedOrder.patient_name}</div>
          <div className="mb-2"><b>Order Number:</b> {selectedOrder.order_number}</div>
          <div className="mb-2"><b>Priority:</b> {selectedOrder.priority}</div>
          <div className="mb-2"><b>Status:</b> {selectedOrder.status}</div>
          <div className="mb-2"><b>Ordered At:</b> {new Date(selectedOrder.created_at).toLocaleString()}</div>
          <button className="mt-4 bg-purple-500 text-white px-4 py-2 rounded" onClick={closeDetails}>Close</button>
        </div>
      </div>
    )}
  </div>
  );
};

export default LaboratoryDashboard;
