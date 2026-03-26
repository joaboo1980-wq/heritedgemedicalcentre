import React, { useState } from 'react';
import {
  useDashboardStats,
  usePendingLabOrders,
} from '@/hooks/useDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

/* eslint-disable @typescript-eslint/no-explicit-any */


const LaboratoryDashboard = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: pendingLabOrders, isLoading: labLoading, error: labError, refetch } = usePendingLabOrders();
  const { toast } = useToast();

  // Modal state for View Details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [sampleCollectionStatus, setSampleCollectionStatus] = useState('pending_collection');
  const [processing, setProcessing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'sample_collected' | 'in_progress' | 'completed' | 'verified' | 'verified_pending' | 'rejected'>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch all lab orders for filtering by status
  const { data: allLabOrders = [], isLoading: allOrdersLoading, refetch: refetchAllOrders } = useQuery({
    queryKey: ['all-lab-orders'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('lab_orders')
          .select(`
            id,
            order_number,
            status,
            priority,
            created_at,
            rejection_reason,
            rejected_at,
            verified_at,
            patients (
              first_name,
              last_name
            ),
            lab_tests (
              test_name
            )
          `)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[LaboratoryDashboard] Error fetching all lab orders:', error);
          return [];
        }

        return (data || []).map((order: any) => ({
          id: order.id,
          order_number: order.order_number,
          patient_name: order.patients ? `${order.patients.first_name} ${order.patients.last_name}` : 'Unknown',
          test_name: order.lab_tests?.test_name || 'Unknown',
          status: order.status,
          priority: order.priority,
          created_at: order.created_at,
          rejection_reason: order.rejection_reason,
          rejected_at: order.rejected_at,
          verified_at: order.verified_at,
        }));
      } catch (err) {
        console.error('[LaboratoryDashboard] Failed to fetch all lab orders:', err);
        return [];
      }
    },
    refetchInterval: 15000,
  });

  // Fetch completed tests today
  const { data: completedTodayCount = 0 } = useQuery({
    queryKey: ['completed-lab-tests-today'],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00`;
        const endOfDay = `${today}T23:59:59`;
        
        const { count, error } = await supabase
          .from('lab_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('updated_at', startOfDay)
          .lte('updated_at', endOfDay);
        
        if (error) {
          console.error('[LaboratoryDashboard] Error fetching completed tests:', error);
          return 0;
        }
        return count || 0;
      } catch (err) {
        console.error('[LaboratoryDashboard] Completed tests query failed:', err);
        return 0;
      }
    },
    refetchInterval: 60000,
  });

  // Fetch abnormal results count
  const { data: abnormalResultsCount = 0 } = useQuery({
    queryKey: ['abnormal-lab-results'],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('lab_orders')
          .select('*', { count: 'exact', head: true })
          .eq('is_abnormal', true)
          .eq('status', 'completed');
        
        if (error) {
          console.error('[LaboratoryDashboard] Error fetching abnormal results:', error);
          return 0;
        }
        return count || 0;
      } catch (err) {
        console.error('[LaboratoryDashboard] Abnormal results query failed:', err);
        return 0;
      }
    },
    refetchInterval: 60000,
  });

  // Filter urgent tests from pendingLabOrders
  const urgentTests = (pendingLabOrders || []).filter(order => order.priority === 'urgent');
  const inProgressTests = (pendingLabOrders || []).filter(order => order.status === 'in_progress');

  // Action handlers
  const handleProcess = (order: any) => {
    setSelectedOrder(order);
    setSampleCollectionStatus('pending_collection');
    setShowSampleModal(true);
  };

  const handleSampleCollection = async () => {
    if (!selectedOrder) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('lab_orders')
        .update({ status: 'sample_collected' })
        .eq('id', selectedOrder.id);
      
      if (error) {
        console.error('[LaboratoryDashboard] Sample collection error:', error);
        toast({ title: 'Error', description: 'Failed to mark sample as collected.', variant: 'destructive' });
      } else {
        toast({ title: 'Sample marked as collected.' });
        setShowSampleModal(false);
        setSampleCollectionStatus('pending_collection');
        refetch();
        refetchAllOrders();
      }
    } catch (err) {
      console.error('[LaboratoryDashboard] Sample collection failed:', err);
      toast({ title: 'Error', description: 'Failed to mark sample as collected.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (orderId: string) => {
    setSelectedOrder(allLabOrders.find(o => o.id === orderId));
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedOrder || !rejectionReason.trim()) {
      toast({ title: 'Error', description: 'Please provide a rejection reason.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('lab_orders')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          rejected_by: user?.id,
          rejected_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);
      
      if (error) {
        console.error('[LaboratoryDashboard] Reject error:', error);
        toast({ title: 'Error', description: 'Failed to reject sample.', variant: 'destructive' });
      } else {
        toast({ title: 'Sample rejected.', description: `Reason: ${rejectionReason}` });
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedOrder(null);
        refetch();
        refetchAllOrders();
      }
    } catch (err) {
      console.error('[LaboratoryDashboard] Reject failed:', err);
      toast({ title: 'Error', description: 'Failed to reject sample.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify = async (orderId: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('lab_orders')
        .update({ 
          status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) {
        console.error('[LaboratoryDashboard] Verify error:', error);
        toast({ title: 'Error', description: 'Failed to verify results.', variant: 'destructive' });
      } else {
        toast({ title: 'Results verified and approved.' });
        refetch();
        refetchAllOrders();
      }
    } catch (err) {
      console.error('[LaboratoryDashboard] Verify failed:', err);
      toast({ title: 'Error', description: 'Failed to verify results.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReport = async (orderId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('lab_orders')
        .update({ 
          status: 'reported'
        })
        .eq('id', orderId);
      
      if (error) {
        console.error('[LaboratoryDashboard] Report error:', error);
        toast({ title: 'Error', description: 'Failed to report results.', variant: 'destructive' });
      } else {
        toast({ title: 'Results reported to doctor.' });
        refetch();
        refetchAllOrders();
      }
    } catch (err) {
      console.error('[LaboratoryDashboard] Report failed:', err);
      toast({ title: 'Error', description: 'Failed to report results.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleStartTesting = async (orderId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('lab_orders')
        .update({ 
          status: 'in_progress'
        })
        .eq('id', orderId);
      
      if (error) {
        console.error('[LaboratoryDashboard] Start testing error:', error);
        toast({ title: 'Error', description: 'Failed to start testing.', variant: 'destructive' });
      } else {
        toast({ title: 'Testing started.' });
        refetch();
        refetchAllOrders();
      }
    } catch (err) {
      console.error('[LaboratoryDashboard] Start testing failed:', err);
      toast({ title: 'Error', description: 'Failed to start testing.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleted = async (orderId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('lab_orders')
        .update({ 
          status: 'completed'
        })
        .eq('id', orderId);
      
      if (error) {
        console.error('[LaboratoryDashboard] Complete error:', error);
        toast({ title: 'Error', description: 'Failed to mark as completed.', variant: 'destructive' });
      } else {
        toast({ title: 'Test completed.' });
        refetch();
        refetchAllOrders();
      }
    } catch (err) {
      console.error('[LaboratoryDashboard] Complete failed:', err);
      toast({ title: 'Error', description: 'Failed to mark as completed.', variant: 'destructive' });
    } finally {
      setProcessing(false);
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
      refetchAllOrders();
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
          <div className="text-3xl font-bold">{completedTodayCount}</div>
          <div className="text-sm">Tests finished</div>
        </div>
        <div className="bg-red-500 text-white rounded-lg p-4 shadow">
          <div className="text-lg font-semibold">Abnormal Results</div>
          <div className="text-3xl font-bold">{abnormalResultsCount}</div>
          <div className="text-sm">Requiring review</div>
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
                  onClick={() => handleProcess(test)}
                >Process Now</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs - ISO 15189 Compliant Workflow */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button 
          onClick={() => setActiveFilter('pending')}
          className={`px-4 py-2 rounded font-semibold text-sm ${activeFilter === 'pending' ? 'bg-purple-500 text-white' : 'bg-purple-200 text-purple-800'}`}
        >📋 Pending</button>
        <button 
          onClick={() => setActiveFilter('sample_collected')}
          className={`px-4 py-2 rounded font-semibold text-sm ${activeFilter === 'sample_collected' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'}`}
        >🧪 Samples Rcvd</button>
        <button 
          onClick={() => setActiveFilter('in_progress')}
          className={`px-4 py-2 rounded font-semibold text-sm ${activeFilter === 'in_progress' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800'}`}
        >⚙️ In Progress</button>
        <button 
          onClick={() => setActiveFilter('completed')}
          className={`px-4 py-2 rounded font-semibold text-sm ${activeFilter === 'completed' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-800'}`}
        >✓ Completed</button>
        <button 
          onClick={() => setActiveFilter('verified_pending')}
          className={`px-4 py-2 rounded font-semibold text-sm ${activeFilter === 'verified_pending' ? 'bg-cyan-500 text-white' : 'bg-cyan-100 text-cyan-800'}`}
        >🔍 Needs Verify</button>
        <button 
          onClick={() => setActiveFilter('verified')}
          className={`px-4 py-2 rounded font-semibold text-sm ${activeFilter === 'verified' ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-800'}`}
        >✅ Verified</button>
        <button 
          onClick={() => setActiveFilter('rejected')}
          className={`px-4 py-2 rounded font-semibold text-sm ${activeFilter === 'rejected' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800'}`}
        >❌ Rejected</button>
      </div>

      {/* Lab Tests Table - Filtered by Status */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h2 className="text-xl font-semibold mb-2">
          {activeFilter === 'pending' ? 'Pending Lab Tests (Awaiting Sample)' : 
           activeFilter === 'sample_collected' ? 'Samples Received (Ready for QC)' :
           activeFilter === 'in_progress' ? 'Tests In Progress' : 
           activeFilter === 'completed' ? 'Tests Completed (Awaiting Verification)' :
           activeFilter === 'verified_pending' ? 'Tests Needing Verification' :
           activeFilter === 'verified' ? 'Verified Results (Ready to Report)' :
           'Rejected Samples'}
        </h2>
        {allOrdersLoading ? (
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
              {allLabOrders && allLabOrders.length > 0 ? (
                allLabOrders
                  .filter(order => {
                    // Handle verified_pending as completed tests not yet verified
                    if (activeFilter === 'verified_pending') {
                      return order.status === 'completed' && !order.verified_at;
                    }
                    return order.status === activeFilter;
                  })
                  .map(order => (
                    <tr key={order.id}>
                      <td className="py-2">{order.order_number}</td>
                      <td className="py-2">{order.patient_name}</td>
                      <td className="py-2">{order.test_name}</td>
                      <td className="py-2"><span className={`px-2 py-1 rounded text-xs ${order.priority === 'urgent' ? 'bg-red-200 text-red-800' : 'bg-purple-200 text-purple-800'}`}>{order.priority}</span></td>
                      <td className="py-2">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="py-2 flex flex-col gap-2">
                        {/* Pending - awaiting sample collection */}
                        {activeFilter === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                              disabled={processing}
                              onClick={() => handleProcess(order)}
                            >Process</button>
                            <button
                              className="bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                              disabled={processing}
                              onClick={() => handleReject(order.id)}
                            >Reject</button>
                            <button
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                              onClick={() => handleViewDetails(order)}
                            >Details</button>
                          </div>
                        )}
                        
                        {/* Sample Collected - awaiting processing */}
                        {activeFilter === 'sample_collected' && (
                          <div className="flex gap-2">
                            <button
                              className="bg-orange-500 text-white px-3 py-1 rounded text-sm"
                              disabled={processing}
                              onClick={() => handleStartTesting(order.id)}
                            >Start Testing</button>
                            <button
                              className="bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                              disabled={processing}
                              onClick={() => handleReject(order.id)}
                            >Reject</button>
                            <button
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                              onClick={() => handleViewDetails(order)}
                            >Details</button>
                          </div>
                        )}
                        
                        {/* In Progress - tests being run */}
                        {activeFilter === 'in_progress' && (
                          <div className="flex gap-2">
                            <button
                              className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                              disabled={processing}
                              onClick={() => handleCompleted(order.id)}
                            >Mark as Completed</button>
                            <button
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                              disabled={processing}
                              onClick={() => handleCancel(order.id)}
                            >Cancel</button>
                            <button
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                              onClick={() => handleViewDetails(order)}
                            >Details</button>
                          </div>
                        )}
                        
                        {/* Completed - results ready, awaiting verification */}
                        {activeFilter === 'completed' && (
                          <div className="flex gap-2">
                            <button
                              className="bg-cyan-500 text-white px-3 py-1 rounded text-sm"
                              onClick={() => handleViewDetails(order)}
                            >Review Results</button>
                            <button
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                              onClick={() => handleViewDetails(order)}
                            >Details</button>
                          </div>
                        )}
                        
                        {/* Needs Verification - ISO 15189 requirement */}
                        {activeFilter === 'verified_pending' && (
                          <div className="flex gap-2">
                            <button
                              className="bg-teal-500 text-white px-3 py-1 rounded text-sm"
                              disabled={processing}
                              onClick={() => handleVerify(order.id)}
                            >Verify Results</button>
                            <button
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                              onClick={() => handleViewDetails(order)}
                            >Details</button>
                          </div>
                        )}
                        
                        {/* Verified - results approved, ready to report */}
                        {activeFilter === 'verified' && (
                          <div className="flex gap-2">
                            <button
                              className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                              disabled={processing}
                              onClick={() => handleReport(order.id)}
                            >Report Results</button>
                            <button
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                              onClick={() => handleViewDetails(order)}
                            >Details</button>
                          </div>
                        )}
                        
                        {/* Rejected - with reason */}
                        {activeFilter === 'rejected' && (
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-semibold text-red-700">Reason: {order.rejection_reason || 'N/A'}</div>
                            <button
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
                              onClick={() => handleViewDetails(order)}
                            >Details</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-2 text-center text-muted-foreground">
                    {activeFilter === 'pending' ? 'No pending lab tests.' : 
                     activeFilter === 'sample_collected' ? 'No samples received.' :
                     activeFilter === 'in_progress' ? 'No tests in progress.' : 
                     activeFilter === 'completed' ? 'No completed tests.' :
                     activeFilter === 'verified_pending' ? 'All tests verified!' :
                     activeFilter === 'verified' ? 'No verified results.' :
                     'No rejected tests.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

    {/* Modal for Rejecting Sample with Reason */}
    {showRejectModal && selectedOrder && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4">Reject Sample/Test</h3>
          
          {/* Test Details */}
          <div className="bg-red-50 p-3 rounded mb-4 border border-red-200">
            <div className="font-semibold text-gray-800">{selectedOrder.test_name}</div>
            <div className="text-sm text-gray-600">Patient: {selectedOrder.patient_name}</div>
            <div className="text-sm text-gray-600">Order: {selectedOrder.order_number}</div>
          </div>

          {/* Rejection Reason */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Reason for Rejection *</label>
            <select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">-- Select a reason --</option>
              <option value="Insufficient sample volume">Insufficient sample volume</option>
              <option value="Hemolyzed sample">Hemolyzed sample</option>
              <option value="Clotted sample">Clotted sample</option>
              <option value="Wrong sample type">Wrong sample type</option>
              <option value="Contaminated sample">Contaminated sample</option>
              <option value="Mislabeled specimen">Mislabeled specimen</option>
              <option value="Sample integrity compromised">Sample integrity compromised</option>
              <option value="QC failed">QC failed</option>
              <option value="Equipment malfunction">Equipment malfunction</option>
            </select>
            
            {/* Custom reason input */}
            <textarea
              placeholder="Or enter custom rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
            />
          </div>

          {/* Warning Note */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-6">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">⚠️ Note:</span> This action will reject the sample and require the patient to provide a new sample. The reason will be recorded for audit purposes (ISO 15189).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
                setSelectedOrder(null);
              }}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              disabled={processing || !rejectionReason.trim()}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </div>
    )}

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
          {selectedOrder.rejection_reason && (
            <div className="mb-2 p-3 bg-red-50 rounded border border-red-200">
              <div><b className="text-red-700">Rejection Reason:</b></div>
              <div className="text-red-600">{selectedOrder.rejection_reason}</div>
              {selectedOrder.rejected_at && (
                <div className="text-sm text-red-500 mt-1">Rejected: {new Date(selectedOrder.rejected_at).toLocaleString()}</div>
              )}
            </div>
          )}
          <button className="mt-4 bg-purple-500 text-white px-4 py-2 rounded" onClick={closeDetails}>Close</button>
        </div>
      </div>
    )}

      {/* Sample Collection Modal */}
      {showSampleModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-lg font-bold mb-4">Sample Collection</h3>
            
            {/* Test Details */}
            <div className="bg-blue-50 p-3 rounded mb-4">
              <div className="font-semibold text-gray-800">{selectedOrder.test_name}</div>
              <div className="text-sm text-gray-600">Order: {selectedOrder.order_number}</div>
              <div className="text-sm text-gray-600">Patient: {selectedOrder.patient_name}</div>
            </div>

            {/* Status Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Sample Collection Status</label>
              <select
                value={sampleCollectionStatus}
                onChange={(e) => setSampleCollectionStatus(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending_collection">Pending Collection</option>
                <option value="sample_collected">Sample Collected</option>
                <option value="processing">Processing</option>
              </select>
            </div>

            {/* Information Note */}
            <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-6">
              <p className="text-sm text-orange-800">
                <span className="font-semibold">Note:</span> Mark as "Sample Collected" once the patient has provided their sample.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSampleModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSampleCollection}
                disabled={processing}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
};

export default LaboratoryDashboard;
