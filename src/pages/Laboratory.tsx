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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, FlaskConical, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react';
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
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
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
  const { data: labTests } = useQuery({
    queryKey: ['lab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_tests')
        .select('*')
        .order('test_name');
      if (error) throw error;
      return data as LabTest[];
    },
  });

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
                    <Label>Test *</Label>
                    <Select value={newOrder.test_id} onValueChange={(v) => setNewOrder({ ...newOrder, test_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
                      <SelectContent>
                        {labTests?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.test_name} ({t.test_code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Select value={order.status} onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}>
                        <SelectTrigger className="w-20 h-8 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="sample_collected">Sample Collected</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
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
    </div>
  );
};

export default Laboratory;