import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Search, Receipt, CreditCard, CheckCircle, Clock, DollarSign, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  due_date: string | null;
  created_at: string;
  patients?: { first_name: string; last_name: string; patient_number: string };
}

interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_number: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  overdue: 'bg-red-100 text-red-800',
};

const itemTypes = ['consultation', 'lab_test', 'medication', 'procedure', 'room', 'other'];

const Billing = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    patient_id: '',
    due_date: '',
    items: [{ description: '', item_type: 'consultation', quantity: 1, unit_price: 0 }],
  });
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
  });

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`*, patients (first_name, last_name, patient_number)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  // Fetch invoice items
  const { data: invoiceItems } = useQuery({
    queryKey: ['invoice-items', selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice) return [];
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', selectedInvoice.id);
      if (error) throw error;
      return data as InvoiceItem[];
    },
    enabled: !!selectedInvoice,
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

  // Create invoice
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof newInvoice) => {
      const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const totalAmount = subtotal;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          patient_id: data.patient_id,
          due_date: data.due_date || null,
          subtotal,
          total_amount: totalAmount,
          created_by: user?.id,
          invoice_number: '',
          status: 'pending',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const items = data.items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(items);
      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsAddDialogOpen(false);
      setNewInvoice({
        patient_id: '',
        due_date: '',
        items: [{ description: '', item_type: 'consultation', quantity: 1, unit_price: 0 }],
      });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Record payment
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: string; data: typeof paymentData }) => {
      // Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        invoice_id: invoiceId,
        amount: data.amount,
        payment_method: data.payment_method,
        reference_number: data.reference_number || null,
        received_by: user?.id,
        payment_number: '',
      });

      if (paymentError) throw paymentError;

      // Update invoice
      const invoice = invoices?.find((i) => i.id === invoiceId);
      if (invoice) {
        const newAmountPaid = invoice.amount_paid + data.amount;
        const newStatus = newAmountPaid >= invoice.total_amount ? 'paid' : 'partially_paid';

        const { error: updateError } = await supabase
          .from('invoices')
          .update({ amount_paid: newAmountPaid, status: newStatus })
          .eq('id', invoiceId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentData({ amount: 0, payment_method: 'cash', reference_number: '' });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', item_type: 'consultation', quantity: 1, unit_price: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const items = [...newInvoice.items];
    items[index] = { ...items[index], [field]: value };
    setNewInvoice({ ...newInvoice, items });
  };

  const filteredInvoices = invoices?.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.amount_paid, 0) || 0;
  const pendingAmount = invoices?.reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0) || 0;
  const paidCount = invoices?.filter((inv) => inv.status === 'paid').length || 0;
  const pendingCount = invoices?.filter((inv) => inv.status === 'pending' || inv.status === 'partially_paid').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage invoices and payments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createInvoiceMutation.mutate(newInvoice); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={newInvoice.patient_id} onValueChange={(v) => setNewInvoice({ ...newInvoice, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={newInvoice.due_date} onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />Add Item
                  </Button>
                </div>
                {newInvoice.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} required />
                    </div>
                    <div className="col-span-2">
                      <Select value={item.item_type} onValueChange={(v) => updateItem(index, 'item_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {itemTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))} min={1} required />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))} required />
                    </div>
                    <div className="col-span-1">
                      {newInvoice.items.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>×</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>UGX {newInvoice.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0).toLocaleString()}</span>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100"><DollarSign className="h-6 w-6 text-green-600" /></div>
            <div><p className="text-2xl font-bold">UGX {totalRevenue.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Collected</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100"><Clock className="h-6 w-6 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold">UGX {pendingAmount.toLocaleString()}</p><p className="text-sm text-muted-foreground">Pending</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100"><CheckCircle className="h-6 w-6 text-green-600" /></div>
            <div><p className="text-2xl font-bold">{paidCount}</p><p className="text-sm text-muted-foreground">Paid Invoices</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><Receipt className="h-6 w-6 text-primary" /></div>
            <div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-sm text-muted-foreground">Pending Invoices</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell><Badge variant="outline" className="font-mono">{invoice.invoice_number}</Badge></TableCell>
                    <TableCell>{invoice.patients?.first_name} {invoice.patients?.last_name}</TableCell>
                    <TableCell>UGX {invoice.total_amount.toLocaleString()}</TableCell>
                    <TableCell>UGX {invoice.amount_paid.toLocaleString()}</TableCell>
                    <TableCell className={invoice.total_amount - invoice.amount_paid > 0 ? 'text-red-600 font-medium' : ''}>
                      UGX {(invoice.total_amount - invoice.amount_paid).toLocaleString()}
                    </TableCell>
                    <TableCell><Badge className={statusColors[invoice.status]}>{invoice.status.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>{format(new Date(invoice.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedInvoice(invoice); setIsViewDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(invoice); setPaymentData({ ...paymentData, amount: invoice.total_amount - invoice.amount_paid }); setIsPaymentDialogOpen(true); }}>
                            <CreditCard className="h-4 w-4 mr-1" />Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices?.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <form onSubmit={(e) => { e.preventDefault(); recordPaymentMutation.mutate({ invoiceId: selectedInvoice.id, data: paymentData }); }} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">Invoice: {selectedInvoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">Balance: UGX {(selectedInvoice.total_amount - selectedInvoice.amount_paid).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })} max={selectedInvoice.total_amount - selectedInvoice.amount_paid} required />
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={paymentData.payment_method} onValueChange={(v) => setPaymentData({ ...paymentData, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input value={paymentData.reference_number} onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })} placeholder="Transaction ID or reference" />
              </div>
              <Button type="submit" className="w-full" disabled={recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-lg font-bold">{selectedInvoice.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.patients?.first_name} {selectedInvoice.patients?.last_name}</p>
                </div>
                <Badge className={statusColors[selectedInvoice.status]}>{selectedInvoice.status}</Badge>
              </div>
              <div className="border-t pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>UGX {item.unit_price.toLocaleString()}</TableCell>
                        <TableCell>UGX {item.total_price.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span>Subtotal:</span><span>UGX {selectedInvoice.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>UGX {selectedInvoice.total_amount.toLocaleString()}</span></div>
                <div className="flex justify-between text-green-600"><span>Paid:</span><span>UGX {selectedInvoice.amount_paid.toLocaleString()}</span></div>
                <div className="flex justify-between text-red-600 font-medium"><span>Balance:</span><span>UGX {(selectedInvoice.total_amount - selectedInvoice.amount_paid).toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;