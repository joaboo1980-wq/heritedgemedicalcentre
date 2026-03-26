import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Search, FlaskConical, Clock, CheckCircle, AlertCircle, Download, MoreHorizontal, Eye, FileText, Printer, Droplet, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import PermissionGuard from '@/components/layout/PermissionGuard';

interface LabOrder {
  id: string;
  order_number: string;
  patient_id: string;
  ordered_by: string;
  test_id: string;
  status: string;
  priority: string;
  result_value: string | null;
  result_notes: string | null;
  is_abnormal: boolean;
  created_at: string;
  patients?: { first_name: string; last_name: string; patient_number: string };
  lab_tests?: { test_name: string; test_code: string; category: string; normal_range: string | null; unit: string | null };
}

interface LabTest {
  id: string;
  test_code: string;
  test_name: string;
  category: string;
  price: number;
  normal_range?: string | null;
  unit?: string | null;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_number: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sample_collected: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityColors: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-800',
  urgent: 'bg-orange-100 text-orange-800',
  stat: 'bg-red-100 text-red-800',
};

const Laboratory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'orders' | 'test-management'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed' | 'sample'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false);
  const [isAddTestDialogOpen, setIsAddTestDialogOpen] = useState(false);
  const [isEditTestDialogOpen, setIsEditTestDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [testSearch, setTestSearch] = useState('');
  const [showTestList, setShowTestList] = useState(false);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [newOrder, setNewOrder] = useState({
    patient_id: '',
    test_ids: [] as string[], // Array for multiple tests
    priority: 'normal',
  });
  const [selectedTestDetails, setSelectedTestDetails] = useState<Array<{ id: string; name: string; code: string; price: number }>>([]);
  const [resultData, setResultData] = useState({
    result_value: '',
    result_notes: '',
    is_abnormal: false,
    result_unit: '',
  });
  const [previousResults, setPreviousResults] = useState<LabOrder[]>([]);
  const [newTest, setNewTest] = useState({
    test_code: '',
    test_name: '',
    category: '',
    price: 0,
    normal_range: '',
    unit: '',
  });
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);

  // Fetch lab orders
  const { data: labOrders, isLoading } = useQuery({
    queryKey: ['lab-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          *,
          patients (first_name, last_name, patient_number),
          lab_tests (test_name, test_code, category, normal_range, unit)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LabOrder[];
    },
  });

  // Fetch lab tests catalog
  const { data: labTests, isLoading: testsLoading, error: testsError } = useQuery({
    queryKey: ['lab-tests'],
    queryFn: async () => {
      try {
        console.log('Fetching lab tests...');
        const { data, error } = await supabase
          .from('lab_tests')
          .select('test_code, test_name, category, price, id')
          .order('test_code');
        
        console.log('Supabase response - Data:', data, 'Error:', error);
        
        if (error) {
          console.error('Lab tests fetch error:', error);
          throw error;
        }
        
        console.log('Lab tests returned:', data?.length || 0, 'tests');
        console.log('First test:', data?.[0]);
        
        return data as any[];
      } catch (err) {
        console.error('Exception:', err);
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

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, patient_number')
        .order('first_name');
      if (error) throw error;
      return data as Patient[];
    },
  });

  // Create lab order
  const createOrderMutation = useMutation({
    mutationFn: async (data: typeof newOrder) => {
      // Validate required fields
      if (!data.patient_id?.trim()) {
        console.warn('[Laboratory] Patient is required');
        throw new Error('Patient is required');
      }
      if (!data.test_ids || data.test_ids.length === 0) {
        console.warn('[Laboratory] At least one test is required');
        throw new Error('At least one test is required');
      }

      try {
        // Create multiple orders, one for each test
        const ordersToCreate = data.test_ids.map((testId) => {
          const today = new Date();
          const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
          const timestamp = Date.now().toString().slice(-4);
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          const orderNumber = `LAB${dateStr}-${timestamp}${random}`;

          return {
            patient_id: data.patient_id,
            test_id: testId,
            priority: data.priority,
            ordered_by: user?.id,
            order_number: orderNumber,
          };
        });

        const { error } = await supabase.from('lab_orders').insert(ordersToCreate);
        if (error) {
          console.error('[Laboratory] Error creating lab orders:', error);
          throw error;
        }
        console.log('[Laboratory] Lab orders created successfully for', ordersToCreate.length, 'tests');
      } catch (err) {
        console.error('[Laboratory] Lab order creation failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
      setIsAddDialogOpen(false);
      setNewOrder({ patient_id: '', test_ids: [], priority: 'normal' });
      setSelectedTestDetails([]);
      setTestSearch('');
      setShowTestList(false);
      toast.success('Lab orders created successfully');
    },
    onError: (error: Error) => {
      console.error('[Laboratory] Mutation error:', error.message);
      toast.error(`Failed to create lab order: ${error.message}`);
    },
  });

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!id?.trim()) {
        console.warn('[Laboratory] Order ID is required');
        throw new Error('Order ID is required');
      }

      try {
        const updateData: Record<string, unknown> = { status };
        if (status === 'sample_collected') {
          updateData.sample_collected_at = new Date().toISOString();
        }
        const { error } = await supabase.from('lab_orders').update(updateData).eq('id', id);
        if (error) {
          console.error('[Laboratory] Error updating order status:', error);
          throw error;
        }
        console.log('[Laboratory] Order status updated successfully');
      } catch (err) {
        console.error('[Laboratory] Order status update failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      console.error('[Laboratory] Status update error:', error.message);
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Check if result is abnormal based on normal range
  const checkAbnormal = (resultValue: string, normalRange: string | null | undefined): boolean => {
    if (!resultValue?.trim() || !normalRange) return false;
    
    const numValue = parseFloat(resultValue);
    if (isNaN(numValue)) return false; // Not a number, can't auto-flag
    
    // Parse normal range (e.g., "70-100" or "<150" or ">60")
    const cleanRange = normalRange.trim();
    
    // Handle ranges like "70-100"
    if (cleanRange.includes('-')) {
      const [min, max] = cleanRange.split('-').map(v => parseFloat(v.trim()));
      if (!isNaN(min) && !isNaN(max)) {
        return numValue < min || numValue > max;
      }
    }
    
    // Handle "<number"
    if (cleanRange.startsWith('<')) {
      const threshold = parseFloat(cleanRange.substring(1));
      if (!isNaN(threshold)) return numValue >= threshold;
    }
    
    // Handle ">number"
    if (cleanRange.startsWith('>')) {
      const threshold = parseFloat(cleanRange.substring(1));
      if (!isNaN(threshold)) return numValue <= threshold;
    }
    
    return false;
  };

  // Submit results
  const submitResultMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof resultData }) => {
      if (!id?.trim()) {
        console.warn('[Laboratory] Order ID is required for results');
        throw new Error('Order ID is required');
      }
      if (!data.result_value?.trim()) {
        console.warn('[Laboratory] Result value is required');
        throw new Error('Result value is required');
      }

      try {
        const { error } = await supabase.from('lab_orders').update({
          result_value: data.result_value,
          result_notes: data.result_notes,
          is_abnormal: data.is_abnormal,
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
        }).eq('id', id);
        if (error) {
          console.error('[Laboratory] Error submitting results:', error);
          throw error;
        }
        console.log('[Laboratory] Results submitted successfully');
      } catch (err) {
        console.error('[Laboratory] Results submission failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
      setIsResultDialogOpen(false);
      setSelectedOrder(null);
      setResultData({ result_value: '', result_notes: '', is_abnormal: false, result_unit: '' });
      setPreviousResults([]);
      toast.success('Results submitted');
    },
    onError: (error: Error) => {
      console.error('[Laboratory] Results submission error:', error.message);
      toast.error(`Failed to submit results: ${error.message}`);
    },
  });

  // Create lab test
  const createTestMutation = useMutation({
    mutationFn: async (data: typeof newTest) => {
      if (!data.test_code?.trim()) throw new Error('Test code is required');
      if (!data.test_name?.trim()) throw new Error('Test name is required');
      if (!data.category?.trim()) throw new Error('Category is required');
      if (data.price <= 0) throw new Error('Price must be greater than 0');

      const { error } = await supabase.from('lab_tests').insert({
        test_code: data.test_code.trim(),
        test_name: data.test_name.trim(),
        category: data.category.trim(),
        price: data.price,
        normal_range: data.normal_range?.trim() || null,
        unit: data.unit?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      setNewTest({ test_code: '', test_name: '', category: '', price: 0, normal_range: '', unit: '' });
      setIsAddTestDialogOpen(false);
      toast.success('Test added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add test: ${error.message}`);
    },
  });

  // Update lab test
  const updateTestMutation = useMutation({
    mutationFn: async (data: LabTest) => {
      if (!data.test_code?.trim()) throw new Error('Test code is required');
      if (!data.test_name?.trim()) throw new Error('Test name is required');
      if (!data.category?.trim()) throw new Error('Category is required');
      if (data.price <= 0) throw new Error('Price must be greater than 0');

      const { error } = await supabase.from('lab_tests').update({
        test_code: data.test_code.trim(),
        test_name: data.test_name.trim(),
        category: data.category.trim(),
        price: data.price,
        normal_range: data.normal_range || null,
        unit: data.unit || null,
      }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      setEditingTest(null);
      setIsEditTestDialogOpen(false);
      toast.success('Test updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update test: ${error.message}`);
    },
  });

  // Delete lab test
  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase.from('lab_tests').delete().eq('id', testId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      toast.success('Test deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete test: ${error.message}`);
    },
  });

  // Delete all lab tests
  const deleteAllTestsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('lab_tests').delete().gt('id', '');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      toast.success('All tests cleared successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear tests: ${error.message}`);
    },
  });

  const filteredOrders = labOrders?.filter((o) => {
    const matchesSearch = 
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.lab_tests?.test_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'pending') return o.status === 'pending';
    if (filterTab === 'completed') return o.status === 'completed';
    if (filterTab === 'sample') return o.status === 'sample_collected';
    return true;
  });

  const pendingCount = labOrders?.filter((o) => o.status === 'pending').length || 0;
  const processingCount = labOrders?.filter((o) => o.status === 'processing' || o.status === 'sample_collected').length || 0;
  const completedCount = labOrders?.filter((o) => o.status === 'completed').length || 0;
  const abnormalCount = labOrders?.filter((o) => o.is_abnormal).length || 0;

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

  const handleExport = () => {
    // Convert filtered orders to CSV
    const headers = ['Test ID', 'Patient', 'Test Name', 'Requested By', 'Date', 'Status'];
    const rows = filteredOrders?.map((o) => [
      o.order_number,
      `${o.patients?.first_name} ${o.patients?.last_name}`,
      o.lab_tests?.test_name || '',
      'N/A',
      format(new Date(o.created_at), 'MMM dd, yyyy'),
      o.status.replace('_', ' '),
    ]) || [];

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-tests-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrintReport = (order: LabOrder) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lab Test Report - ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h1 { margin: 0; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; }
            .value { margin-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .abnormal { color: red; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laboratory Test Report</h1>
            <p>Rural Health Team Uganda</p>
          </div>
          
          <div class="section">
            <div><span class="label">Test ID:</span><span class="value">${order.order_number}</span></div>
            <div><span class="label">Patient:</span><span class="value">${order.patients?.first_name} ${order.patients?.last_name} (${order.patients?.patient_number})</span></div>
            <div><span class="label">Test Name:</span><span class="value">${order.lab_tests?.test_name}</span></div>
            <div><span class="label">Test Code:</span><span class="value">${order.lab_tests?.test_code}</span></div>
            <div><span class="label">Category:</span><span class="value">${order.lab_tests?.category}</span></div>
            <div><span class="label">Date Requested:</span><span class="value">${format(new Date(order.created_at), 'MMM dd, yyyy')}</span></div>
            <div><span class="label">Status:</span><span class="value">${order.status.replace('_', ' ').toUpperCase()}</span></div>
          </div>

          ${order.result_value ? `
            <div class="section">
              <h2>Results</h2>
              <div><span class="label">Result Value:</span><span class="value ${order.is_abnormal ? 'abnormal' : ''}">${order.result_value}</span></div>
              ${order.result_notes ? `<div><span class="label">Notes:</span><span class="value">${order.result_notes}</span></div>` : ''}
              ${order.is_abnormal ? '<div class="abnormal">⚠️ ABNORMAL RESULT</div>' : ''}
            </div>
          ` : '<div class="section"><p>Results pending...</p></div>'}

          <script>window.print();</script>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        <span>RURAL HEALTH TEAM UGANDA</span>
        <span className="mx-2">›</span>
        <span className="text-foreground font-medium">Laboratory</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Laboratory Management</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'orders' | 'test-management')} className="w-full">
        <TabsList>
          <TabsTrigger value="orders">Lab Orders</TabsTrigger>
          <TabsTrigger value="test-management">Test Management</TabsTrigger>
        </TabsList>

        {/* Lab Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <PermissionGuard module="laboratory" action="create">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Lab Test</Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Lab Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  // Add validation before mutation
                  if (!newOrder.patient_id?.trim()) {
                    toast.error('Patient is required');
                    return;
                  }
                  if (!newOrder.test_ids || newOrder.test_ids.length === 0) {
                    toast.error('At least one test is required');
                    return;
                  }
                  createOrderMutation.mutate(newOrder); 
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Patient *</Label>
                    <Select value={newOrder.patient_id} onValueChange={(v) => setNewOrder({ ...newOrder, patient_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>
                        {patients?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tests * {testsLoading && <span className="text-xs text-gray-500">(loading...)</span>} {testsError && <span className="text-xs text-red-500">(error loading tests)</span>}</Label>
                    <div className="relative">
                      <Input
                        placeholder={testsLoading ? "Loading tests..." : "Search tests by name, code, or category..."}
                        value={testSearch}
                        onChange={(e) => {
                          setTestSearch(e.target.value);
                          setShowTestList(true);
                        }}
                        onFocus={() => setShowTestList(true)}
                        className="w-full"
                        disabled={testsLoading}
                      />
                      {showTestList && testSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {filteredTests.length > 0 ? (
                            filteredTests.map((test) => (
                              <button
                                key={test.id}
                                type="button"
                                onClick={() => {
                                  // Check if test is already selected
                                  if (!newOrder.test_ids.includes(test.id)) {
                                    setNewOrder({ ...newOrder, test_ids: [...newOrder.test_ids, test.id] });
                                    setSelectedTestDetails([
                                      ...selectedTestDetails,
                                      {
                                        id: test.id,
                                        name: test.test_name,
                                        code: test.test_code,
                                        price: test.price,
                                      },
                                    ]);
                                    setTestSearch('');
                                  }
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0 transition ${
                                  newOrder.test_ids.includes(test.id) ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="font-medium text-sm">{test.test_name}</div>
                                <div className="text-xs text-gray-500">{test.test_code} • {test.category} • {test.price}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">No tests found</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected Tests */}
                    {selectedTestDetails.length > 0 && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <p className="text-sm font-semibold text-gray-700">Selected Tests ({selectedTestDetails.length}):</p>
                        <div className="space-y-1">
                          {selectedTestDetails.map((test) => (
                            <div
                              key={test.id}
                              className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2"
                            >
                              <div>
                                <div className="font-medium text-sm text-gray-800">{test.name}</div>
                                <div className="text-xs text-gray-600">{test.code} • {test.price}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewOrder({
                                    ...newOrder,
                                    test_ids: newOrder.test_ids.filter((id) => id !== test.id),
                                  });
                                  setSelectedTestDetails(selectedTestDetails.filter((t) => t.id !== test.id));
                                }}
                                className="text-red-500 hover:text-red-700 font-semibold"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newOrder.priority} onValueChange={(v) => setNewOrder({ ...newOrder, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="stat">STAT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createOrderMutation.isPending}>
                    {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </PermissionGuard>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10"><FlaskConical className="h-6 w-6 text-primary" /></div>
                <div><p className="text-2xl font-bold">{labOrders?.length || 0}</p><p className="text-sm text-muted-foreground">Total Orders</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-100"><Clock className="h-6 w-6 text-yellow-600" /></div>
                <div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-sm text-muted-foreground">Pending</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100"><CheckCircle className="h-6 w-6 text-green-600" /></div>
                <div><p className="text-2xl font-bold">{completedCount}</p><p className="text-sm text-muted-foreground">Completed</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-100"><AlertCircle className="h-6 w-6 text-red-600" /></div>
                <div><p className="text-2xl font-bold">{abnormalCount}</p><p className="text-sm text-muted-foreground">Abnormal Results</p></div>
              </CardContent>
            </Card>
          </div>

          {/* Laboratory Tests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle>Laboratory Tests</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manage and track laboratory tests for patients.</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search tests..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterTab === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterTab('all')}
                >
                  All Tests
                </Button>
                <Button
                  variant={filterTab === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterTab('pending')}
                >
                  Pending
                </Button>
                <Button
                  variant={filterTab === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterTab('completed')}
                >
                  Completed
                </Button>
                <Button
                  variant={filterTab === 'sample' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterTab('sample')}
                >
                  Sample Collection
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Orders Count</TableHead>
                      <TableHead>Last Order Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {Array.from(
                  (filteredOrders || []).reduce((acc, order) => {
                    if (!acc.has(order.patient_id)) {
                      acc.set(order.patient_id, []);
                    }
                    acc.get(order.patient_id)!.push(order);
                    return acc;
                  }, new Map<string, LabOrder[]>())
                )
                  .sort((a, b) => {
                    const nameA = `${a[1][0].patients?.first_name} ${a[1][0].patients?.last_name}`;
                    const nameB = `${b[1][0].patients?.first_name} ${b[1][0].patients?.last_name}`;
                    return nameA.localeCompare(nameB);
                  })
                  .map(([patientId, patientOrders]) => {
                    const isExpanded = expandedPatients.has(patientId);
                    const lastOrder = patientOrders[0];
                    const patientName = `${lastOrder.patients?.first_name} ${lastOrder.patients?.last_name}`;
                    return (
                      <>
                        <TableRow
                          key={patientId}
                          className="cursor-pointer hover:bg-blue-50"
                          onClick={() => togglePatientExpansion(patientId)}
                        >
                          <TableCell className="text-center">
                            <span className={`inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">{patientName}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800">{patientOrders.length} orders</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(patientOrders[0].created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePatientExpansion(patientId);
                              }}
                            >
                              {isExpanded ? 'Collapse' : 'View All'}
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded &&
                          patientOrders.map((order) => (
                            <TableRow key={order.id} className="bg-blue-50 hover:bg-blue-100">
                              <TableCell></TableCell>
                              <TableCell className="pl-12 text-sm font-mono">{order.order_number}</TableCell>
                              <TableCell className="text-sm">
                                <div>{order.lab_tests?.test_name}</div>
                                <div className="text-xs text-gray-500">{order.lab_tests?.test_code}</div>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColors[order.status]}>
                                  {order.status === 'pending' && 'Pending'}
                                  {order.status === 'sample_collected' && 'Sample Needed'}
                                  {order.status === 'processing' && 'In Progress'}
                                  {order.status === 'completed' && 'Completed'}
                                  {order.status === 'cancelled' && 'Cancelled'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(order.created_at), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Open menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        setIsDetailsDialogOpen(true);
                                      }}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      <span>View Details</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        setIsResultDialogOpen(true);
                                      }}
                                    >
                                      <FileText className="mr-2 h-4 w-4" />
                                      <span>Update Status</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        handlePrintReport(order);
                                      }}
                                    >
                                      <Printer className="mr-2 h-4 w-4" />
                                      <span>Print Report</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        setIsSampleDialogOpen(true);
                                      }}
                                    >
                                      <Droplet className="mr-2 h-4 w-4" />
                                      <span>Sample Collection</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                      </>
                    );
                  })}
                {filteredOrders?.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No lab tests found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs for Lab Orders Tab */}
      {/* Result Entry Dialog - Enhanced with Reference Ranges and Auto-Abnormal Detection */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Test Results - Enhanced Entry Form</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={(e) => { 
              e.preventDefault();
              // Auto-check abnormal if result falls outside normal range
              const shouldBeFlagged = checkAbnormal(resultData.result_value, selectedOrder.lab_tests?.normal_range);
              const finalData = { ...resultData, is_abnormal: resultData.is_abnormal || shouldBeFlagged };
              submitResultMutation.mutate({ id: selectedOrder.id, data: finalData }); 
            }} className="space-y-4">
              {/* Test Information Card */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Test</p>
                    <p className="font-medium text-lg">{selectedOrder.lab_tests?.test_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Patient</p>
                    <p className="font-medium">{selectedOrder.patients?.first_name} {selectedOrder.patients?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Order #</p>
                    <p className="font-medium">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Category</p>
                    <p className="font-medium">{selectedOrder.lab_tests?.category}</p>
                  </div>
                </div>
              </div>

              {/* Normal Range & Units Reference Box */}
              {(selectedOrder.lab_tests?.normal_range || selectedOrder.lab_tests?.unit) && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-2">Reference Values</p>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.lab_tests?.normal_range && (
                      <div>
                        <span className="font-medium text-gray-700">Normal Range:</span>
                        <span className="ml-2 text-green-700 font-semibold">{selectedOrder.lab_tests.normal_range}</span>
                      </div>
                    )}
                    {selectedOrder.lab_tests?.unit && (
                      <div>
                        <span className="font-medium text-gray-700">Unit:</span>
                        <span className="ml-2 text-gray-700">{selectedOrder.lab_tests.unit}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Result Value Input */}
              <div className="space-y-2">
                <Label className="font-semibold">Result Value *</Label>
                <div className="flex gap-2">
                  <Input 
                    value={resultData.result_value} 
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setResultData(prev => ({ ...prev, result_value: newValue }));
                      // Auto-flag if outside normal range
                      if (checkAbnormal(newValue, selectedOrder.lab_tests?.normal_range) && !resultData.is_abnormal) {
                        setResultData(prev => ({ ...prev, is_abnormal: true }));
                      }
                    }}
                    placeholder="Enter numeric value or text result" 
                    required 
                    className="flex-1"
                  />
                  {selectedOrder.lab_tests?.unit && (
                    <div className="w-32 px-3 py-2 border border-gray-300 rounded bg-gray-50 flex items-center">
                      <span className="text-sm font-medium text-gray-600">{selectedOrder.lab_tests.unit}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Notes */}
              <div className="space-y-2">
                <Label className="font-semibold">Clinical Notes</Label>
                <Textarea 
                  value={resultData.result_notes} 
                  onChange={(e) => setResultData(prev => ({ ...prev, result_notes: e.target.value }))} 
                  placeholder="Additional clinical observations or findings" 
                  rows={3} 
                />
              </div>

              {/* Abnormal Flag with Auto-Detection Alert */}
              <div className="space-y-2">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="is_abnormal" 
                    checked={resultData.is_abnormal} 
                    onChange={(e) => setResultData(prev => ({ ...prev, is_abnormal: e.target.checked }))} 
                    className="w-4 h-4 rounded" 
                  />
                  <Label htmlFor="is_abnormal" className="text-red-700 font-semibold cursor-pointer flex-1 mb-0">
                    ⚠️ Mark as Abnormal Result
                  </Label>
                </div>
                {checkAbnormal(resultData.result_value, selectedOrder.lab_tests?.normal_range) && (
                  <div className="p-3 bg-amber-100 border border-amber-400 rounded-lg text-sm text-amber-800 flex gap-2">
                    <span>ℹ️</span>
                    <span><strong>Auto-flagged:</strong> Result appears to be outside normal range ({selectedOrder.lab_tests?.normal_range})</span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitResultMutation.isPending}>
                {submitResultMutation.isPending ? 'Submitting Results...' : 'Submit Results'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Details - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Test ID</p>
                  <p className="text-lg font-semibold">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Requested</p>
                  <p className="text-lg font-semibold">{format(new Date(selectedOrder.created_at), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient</p>
                  <p className="text-lg font-semibold">{selectedOrder.patients?.first_name} {selectedOrder.patients?.last_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient Number</p>
                  <p className="text-lg font-semibold">{selectedOrder.patients?.patient_number}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Test Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Test Name</p>
                    <p className="text-base">{selectedOrder.lab_tests?.test_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Test Code</p>
                    <p className="text-base">{selectedOrder.lab_tests?.test_code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <p className="text-base">{selectedOrder.lab_tests?.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                    <Badge className={priorityColors[selectedOrder.priority]}>{selectedOrder.priority}</Badge>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Status</h3>
                <Badge className={statusColors[selectedOrder.status]}>
                  {selectedOrder.status === 'pending' && 'Pending'}
                  {selectedOrder.status === 'sample_collected' && 'Sample Needed'}
                  {selectedOrder.status === 'processing' && 'In Progress'}
                  {selectedOrder.status === 'completed' && 'Completed'}
                  {selectedOrder.status === 'cancelled' && 'Cancelled'}
                </Badge>
              </div>

              {selectedOrder.result_value && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Results</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Result Value</p>
                      <p className={`text-base ${selectedOrder.is_abnormal ? 'font-semibold text-red-600' : ''}`}>
                        {selectedOrder.result_value}
                      </p>
                    </div>
                    {selectedOrder.result_notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Notes</p>
                        <p className="text-base whitespace-normal break-words w-full max-h-[300px] overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">{selectedOrder.result_notes}</p>
                      </div>
                    )}
                    {selectedOrder.is_abnormal && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 font-semibold">⚠️ Abnormal Result</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
                <Button onClick={() => {
                  setIsDetailsDialogOpen(false);
                  handlePrintReport(selectedOrder);
                }}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sample Collection Dialog */}
      <Dialog open={isSampleDialogOpen} onOpenChange={setIsSampleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sample Collection - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-900">{selectedOrder.lab_tests?.test_name}</p>
                <p className="text-sm text-blue-700 mt-1">Patient: {selectedOrder.patients?.first_name} {selectedOrder.patients?.last_name}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="font-semibold">Sample Collection Status</Label>
                  <Select 
                    value={selectedOrder.status} 
                    onValueChange={(status) => {
                      updateStatusMutation.mutate({ id: selectedOrder.id, status });
                      setIsSampleDialogOpen(false);
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Collection</SelectItem>
                      <SelectItem value="sample_collected">Sample Collected</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <span className="font-semibold">Note:</span> Mark as "Sample Collected" once the patient has provided their sample.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-2">
                <Button variant="outline" onClick={() => setIsSampleDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Test Management Tab */}
        <TabsContent value="test-management" className="space-y-6">
          {/* Add Test Button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Manage Lab Tests</h2>
            <PermissionGuard module="laboratory" action="create">
              <Dialog open={isAddTestDialogOpen} onOpenChange={setIsAddTestDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add New Test</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Lab Test</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createTestMutation.mutate(newTest);
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Test Code (e.g., CBC-001) *</Label>
                      <Input 
                        value={newTest.test_code}
                        onChange={(e) => setNewTest({...newTest, test_code: e.target.value})}
                        placeholder="Enter test code"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Test Name *</Label>
                      <Input 
                        value={newTest.test_name}
                        onChange={(e) => setNewTest({...newTest, test_name: e.target.value})}
                        placeholder="e.g., Complete Blood Count"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select value={newTest.category} onValueChange={(v) => setNewTest({...newTest, category: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hematology">Hematology</SelectItem>
                          <SelectItem value="biochemistry">Biochemistry</SelectItem>
                          <SelectItem value="microbiology">Microbiology</SelectItem>
                          <SelectItem value="immunology">Immunology</SelectItem>
                          <SelectItem value="urinalysis">Urinalysis</SelectItem>
                          <SelectItem value="imaging">Imaging</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Price (UGX) *</Label>
                      <Input 
                        type="number"
                        value={newTest.price}
                        onChange={(e) => setNewTest({...newTest, price: parseFloat(e.target.value) || 0})}
                        placeholder="Enter price in Uganda Shillings"
                        min="0"
                        step="100"
                        required
                      />
                    </div>

                    {/* Reference Values Section */}
                    <div className="border-t pt-4 space-y-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-2">Reference Values (Optional)</p>
                        <p className="text-xs text-blue-700">Set normal ranges and units for this test. These will help identify abnormal results automatically.</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Normal Range (e.g., 70-100, less than 150, greater than 60)</Label>
                        <Input 
                          value={newTest.normal_range}
                          onChange={(e) => setNewTest({...newTest, normal_range: e.target.value})}
                          placeholder="e.g., 70-100 or 150 or 60"
                        />
                        <p className="text-xs text-gray-500">Format: '70-100' for range, use '&lt;150' for less than, '&gt;60' for greater than in placeholders</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Unit of Measurement (e.g., mg/dL, mmol/L)</Label>
                        <Input 
                          value={newTest.unit}
                          onChange={(e) => setNewTest({...newTest, unit: e.target.value})}
                          placeholder="e.g., mg/dL, mmol/L, g/dL"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createTestMutation.isPending}>
                      {createTestMutation.isPending ? 'Adding...' : 'Add Test'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </PermissionGuard>
          </div>

          {/* Tests Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lab Tests Catalog</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price (UGX)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labTests && labTests.length > 0 ? (
                      labTests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell className="font-mono text-sm">{test.test_code}</TableCell>
                          <TableCell>{test.test_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{test.category}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{test.price.toLocaleString('en-UG', { style: 'currency', currency: 'UGX' })}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Dialog open={isEditTestDialogOpen && editingTest?.id === test.id} onOpenChange={(open) => {
                                if (!open) setEditingTest(null);
                                setIsEditTestDialogOpen(open);
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingTest(test)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Lab Test</DialogTitle>
                                  </DialogHeader>
                                  {editingTest && (
                                    <form onSubmit={(e) => {
                                      e.preventDefault();
                                      updateTestMutation.mutate(editingTest);
                                    }} className="space-y-4">
                                      <div className="space-y-2">
                                        <Label>Test Code *</Label>
                                        <Input 
                                          value={editingTest.test_code}
                                          onChange={(e) => setEditingTest({...editingTest, test_code: e.target.value})}
                                          required
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Test Name *</Label>
                                        <Input 
                                          value={editingTest.test_name}
                                          onChange={(e) => setEditingTest({...editingTest, test_name: e.target.value})}
                                          required
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Category *</Label>
                                        <Select value={editingTest.category} onValueChange={(v) => setEditingTest({...editingTest, category: v})}>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="hematology">Hematology</SelectItem>
                                            <SelectItem value="biochemistry">Biochemistry</SelectItem>
                                            <SelectItem value="microbiology">Microbiology</SelectItem>
                                            <SelectItem value="immunology">Immunology</SelectItem>
                                            <SelectItem value="urinalysis">Urinalysis</SelectItem>
                                            <SelectItem value="imaging">Imaging</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Price (UGX) *</Label>
                                        <Input 
                                          type="number"
                                          value={editingTest.price}
                                          onChange={(e) => setEditingTest({...editingTest, price: parseFloat(e.target.value) || 0})}
                                          min="0"
                                          step="100"
                                          required
                                        />
                                      </div>

                                      {/* Reference Values Section */}
                                      <div className="border-t pt-4 space-y-4">
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                          <p className="text-sm font-semibold text-blue-900 mb-2">Reference Values (Optional)</p>
                                          <p className="text-xs text-blue-700">Update normal ranges and units for this test.</p>
                                        </div>

                                        <div className="space-y-2">
                          <Label>Normal Range (e.g., 70-100, less than 150, greater than 60)</Label>
                          <Input 
                            value={editingTest.normal_range || ''}
                            onChange={(e) => setEditingTest({...editingTest, normal_range: e.target.value})}
                            placeholder="e.g., 70-100 or 150 or 60"
                          />
                          <p className="text-xs text-gray-500">Format: '70-100' for range, use '&lt;150' for less than, '&gt;60' for greater than in placeholders</p>
                                        </div>

                                        <div className="space-y-2">
                                          <Label>Unit of Measurement (e.g., mg/dL, mmol/L)</Label>
                                          <Input 
                                            value={editingTest.unit || ''}
                                            onChange={(e) => setEditingTest({...editingTest, unit: e.target.value})}
                                            placeholder="e.g., mg/dL, mmol/L, g/dL"
                                          />
                                        </div>
                                      </div>
                                      <Button type="submit" className="w-full" disabled={updateTestMutation.isPending}>
                                        {updateTestMutation.isPending ? 'Updating...' : 'Update Test'}
                                      </Button>
                                    </form>
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm(`Delete test "${test.test_name}"? This cannot be undone.`)) {
                                    deleteTestMutation.mutate(test.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No lab tests found. Add your first test to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Clear All Tests Button */}
          {labTests && labTests.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-900">Clear All Tests</h3>
                    <p className="text-sm text-red-700 mt-1">Delete all tests from the catalog. This action cannot be undone.</p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete ALL tests? This cannot be undone and will affect all lab orders using these tests.')) {
                        deleteAllTestsMutation.mutate();
                      }
                    }}
                    disabled={deleteAllTestsMutation.isPending}
                  >
                    {deleteAllTestsMutation.isPending ? 'Clearing...' : 'Clear All Tests'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Laboratory;