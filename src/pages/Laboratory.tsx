import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { toast } from 'sonner';
import { Plus, Search, FlaskConical, Clock, CheckCircle, AlertCircle, Download, MoreHorizontal, Eye, FileText, Printer, Droplet } from 'lucide-react';
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
  lab_tests?: { test_name: string; test_code: string; category: string };
}

interface LabTest {
  id: string;
  test_code: string;
  test_name: string;
  category: string;
  price: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed' | 'sample'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [testSearch, setTestSearch] = useState('');
  const [showTestList, setShowTestList] = useState(false);
  const [newOrder, setNewOrder] = useState({
    patient_id: '',
    test_id: '',
    priority: 'normal',
  });
  const [resultData, setResultData] = useState({
    result_value: '',
    result_notes: '',
    is_abnormal: false,
  });

  // Fetch lab orders
  const { data: labOrders, isLoading } = useQuery({
    queryKey: ['lab-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          *,
          patients (first_name, last_name, patient_number),
          lab_tests (test_name, test_code, category)
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
      const { error } = await supabase.from('lab_orders').insert({
        patient_id: data.patient_id,
        test_id: data.test_id,
        priority: data.priority,
        ordered_by: user?.id,
        order_number: '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      setIsAddDialogOpen(false);
      setNewOrder({ patient_id: '', test_id: '', priority: 'normal' });
      setTestSearch('');
      setShowTestList(false);
      toast.success('Lab order created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'sample_collected') {
        updateData.sample_collected_at = new Date().toISOString();
      }
      const { error } = await supabase.from('lab_orders').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      toast.success('Status updated');
    },
  });

  // Submit results
  const submitResultMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof resultData }) => {
      const { error } = await supabase.from('lab_orders').update({
        result_value: data.result_value,
        result_notes: data.result_notes,
        is_abnormal: data.is_abnormal,
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user?.id,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      setIsResultDialogOpen(false);
      setSelectedOrder(null);
      setResultData({ result_value: '', result_notes: '', is_abnormal: false });
      toast.success('Results submitted');
    },
    onError: (error: Error) => toast.error(error.message),
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
                <form onSubmit={(e) => { e.preventDefault(); createOrderMutation.mutate(newOrder); }} className="space-y-4">
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
                    <Label>Test * {testsLoading && <span className="text-xs text-gray-500">(loading...)</span>} {testsError && <span className="text-xs text-red-500">(error loading tests)</span>}</Label>
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
                                  setNewOrder({ ...newOrder, test_id: test.id });
                                  setTestSearch(`${test.test_name} (${test.test_code})`);
                                  setShowTestList(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0 transition"
                              >
                                <div className="font-medium text-sm">{test.test_name}</div>
                                <div className="text-xs text-gray-500">{test.test_code} • {test.category} • ${test.price}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">No tests found</div>
                          )}
                        </div>
                      )}
                      {newOrder.test_id && !testSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-blue-50 border border-blue-200 rounded-lg p-3 z-50">
                          <div className="text-sm font-medium text-blue-900">Selected:</div>
                          <div className="text-sm text-blue-700">
                            {labTests?.find(t => t.id === newOrder.test_id)?.test_name}
                          </div>
                        </div>
                      )}
                    </div>
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
                  <TableHead>Test ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm font-mono">{order.order_number}</TableCell>
                    <TableCell className="text-sm">{order.patients?.first_name} {order.patients?.last_name}</TableCell>
                    <TableCell className="text-sm">{order.lab_tests?.test_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">N/A</TableCell>
                    <TableCell className="text-sm">{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {order.status === 'pending' && 'Pending'}
                        {order.status === 'sample_collected' && 'Sample Needed'}
                        {order.status === 'processing' && 'In Progress'}
                        {order.status === 'completed' && 'Completed'}
                        {order.status === 'cancelled' && 'Cancelled'}
                      </Badge>
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
                {filteredOrders?.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No lab tests found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Result Entry Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Test Results</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={(e) => { e.preventDefault(); submitResultMutation.mutate({ id: selectedOrder.id, data: resultData }); }} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedOrder.lab_tests?.test_name}</p>
                <p className="text-sm text-muted-foreground">Patient: {selectedOrder.patients?.first_name} {selectedOrder.patients?.last_name}</p>
              </div>
              <div className="space-y-2">
                <Label>Result Value *</Label>
                <Input value={resultData.result_value} onChange={(e) => setResultData({ ...resultData, result_value: e.target.value })} placeholder="Enter result value" required />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={resultData.result_notes} onChange={(e) => setResultData({ ...resultData, result_notes: e.target.value })} placeholder="Additional notes" rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_abnormal" checked={resultData.is_abnormal} onChange={(e) => setResultData({ ...resultData, is_abnormal: e.target.checked })} className="rounded" />
                <Label htmlFor="is_abnormal" className="text-red-600 font-medium">Mark as Abnormal Result</Label>
              </div>
              <Button type="submit" className="w-full" disabled={submitResultMutation.isPending}>
                {submitResultMutation.isPending ? 'Submitting...' : 'Submit Results'}
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
                        <p className="text-base">{selectedOrder.result_notes}</p>
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
    </div>
  );
};

export default Laboratory;