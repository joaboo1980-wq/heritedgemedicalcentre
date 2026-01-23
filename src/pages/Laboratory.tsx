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
import { Plus, Search, FlaskConical, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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

  const filteredOrders = labOrders?.filter(
    (o) =>
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.lab_tests?.test_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = labOrders?.filter((o) => o.status === 'pending').length || 0;
  const processingCount = labOrders?.filter((o) => o.status === 'processing' || o.status === 'sample_collected').length || 0;
  const completedCount = labOrders?.filter((o) => o.status === 'completed').length || 0;
  const abnormalCount = labOrders?.filter((o) => o.is_abnormal).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Laboratory</h1>
          <p className="text-muted-foreground mt-1">Manage lab tests and results</p>
        </div>
        <PermissionGuard module="laboratory" action="create">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Lab Order</Button>
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

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lab Orders</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell><Badge variant="outline" className="font-mono">{order.order_number}</Badge></TableCell>
                    <TableCell>{order.patients?.first_name} {order.patients?.last_name}</TableCell>
                    <TableCell>{order.lab_tests?.test_name}</TableCell>
                    <TableCell><Badge className={priorityColors[order.priority]}>{order.priority}</Badge></TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {order.is_abnormal && order.status === 'completed' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <Select value={order.status} onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}>
                            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="sample_collected">Sample Collected</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {order.status === 'processing' && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setIsResultDialogOpen(true); }}>
                            Enter Results
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders?.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No lab orders found</TableCell></TableRow>
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