import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Receipt, Eye, Download, Trash2, MoreVertical, FileText, Mail, Printer } from 'lucide-react';
import { format } from 'date-fns';
import PermissionGuard from '@/components/layout/PermissionGuard';
import { InvoiceTemplate } from '@/components/invoices/InvoiceTemplate';
import { generatePDF, printInvoice, generateInvoiceFilename } from '@/lib/invoiceUtils';

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

const Invoices = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    patient_id: '',
    due_date: '',
    items: [{ description: '', item_type: 'consultation', quantity: 1, unit_price: 0 }],
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
      if (!data.patient_id) {
        console.warn('[Invoices] Patient is required');
        throw new Error('Patient is required');
      }

      if (data.items.length === 0) {
        console.warn('[Invoices] At least one item is required');
        throw new Error('At least one item is required');
      }

      const invalidItems = data.items.filter(
        (item) => !item.description || item.quantity <= 0 || item.unit_price <= 0
      );
      if (invalidItems.length > 0) {
        console.warn('[Invoices] Invalid invoice items found');
        throw new Error('All items must have description, quantity > 0, and unit price > 0');
      }

      try {
        const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const totalAmount = subtotal;

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            patient_id: data.patient_id,
            due_date: data.due_date && data.due_date.trim() ? data.due_date : null,
            subtotal: subtotal,
            total_amount: totalAmount,
            tax_amount: 0,
            discount_amount: 0,
            amount_paid: 0,
            invoice_number: `INV-${Date.now()}`,
            status: 'draft',
          })
          .select()
          .single();

        if (invoiceError) {
          console.error('[Invoices] Invoice creation error:', invoiceError);
          throw new Error(`Failed to create invoice: ${invoiceError.message}`);
        }

        const items = data.items.map((item) => ({
          invoice_id: invoice.id,
          description: item.description.trim(),
          item_type: item.item_type,
          quantity: parseInt(item.quantity.toString()),
          unit_price: parseFloat(item.unit_price.toString()),
          total_price: parseFloat((item.quantity * item.unit_price).toString()),
        }));

        const { error: itemsError } = await supabase.from('invoice_items').insert(items);
        if (itemsError) {
          console.error('[Invoices] Invoice items creation error:', itemsError);
          throw new Error(`Failed to create invoice items: ${itemsError.message}`);
        }

        console.log('[Invoices] Invoice created successfully, ID:', invoice.id);
        return invoice;
      } catch (err) {
        console.error('[Invoices] Invoice creation failed:', err);
        throw err;
      }
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
    onError: (error: Error) => {
      console.error('[Invoices] Mutation error:', error.message);
      toast.error(`Failed to create invoice: ${error.message}`);
    },
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

  // Mark invoice as sent
  const markAsSentMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'pending' })
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice marked as sent');
    },
    onError: (error: Error) => {
      toast.error('Failed to send invoice: ' + error.message);
    },
  });

  // Record payment
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount }: { invoiceId: string; amount: number }) => {
      const invoice = invoices?.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      
      const newAmountPaid = invoice.amount_paid + amount;
      const newStatus = newAmountPaid >= invoice.total_amount ? 'paid' : 'partially_paid';
      
      const { error } = await supabase
        .from('invoices')
        .update({ 
          amount_paid: newAmountPaid,
          status: newStatus
        })
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to record payment: ' + error.message);
    },
  });

  // Delete invoice
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);
      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete invoice: ' + error.message);
    },
  });

  const filteredInvoices = invoices?.filter((inv) => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && inv.status === filterStatus;
  });

  const draftCount = invoices?.filter((inv) => inv.status === 'draft').length || 0;
  const pendingCount = invoices?.filter((inv) => inv.status === 'pending' || inv.status === 'partially_paid').length || 0;
  const paidCount = invoices?.filter((inv) => inv.status === 'paid').length || 0;
  const overdueCount = invoices?.filter((inv) => inv.status === 'overdue').length || 0;
  const totalOutstanding = invoices?.reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage and track patient invoices</p>
        </div>
        <PermissionGuard module="billing" action="create">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>Create a new invoice for patient billing.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (!newInvoice.patient_id) {
                  toast.error('Please select a patient');
                  return;
                }
                if (newInvoice.items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
                  toast.error('Please fill in all item details (description, quantity > 0, price > 0)');
                  return;
                }
                createInvoiceMutation.mutate(newInvoice); 
              }} className="space-y-4">
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
                        <Input type="number" placeholder="Qty" value={item.quantity || 1} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} min={1} required />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" placeholder="Price" value={item.unit_price || 0} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} required />
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
        </PermissionGuard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{draftCount}</p>
              </div>
              <Receipt className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <FileText className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">{paidCount}</p>
              </div>
              <Receipt className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">UGX {(totalOutstanding / 1000000).toFixed(1)}M</p>
              </div>
              <Receipt className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { label: 'All Invoices', value: 'all' },
          { label: 'Pending', value: 'pending' },
          { label: 'Paid', value: 'paid' },
          { label: 'Overdue', value: 'overdue' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value as any)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filterStatus === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search invoices..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-9" 
        />
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setIsViewDialogOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          
                          {invoice.status === 'draft' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => markAsSentMutation.mutate(invoice.id)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {(invoice.status === 'pending' || invoice.status === 'partially_paid') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                const amount = prompt('Enter payment amount:');
                                if (amount) {
                                  recordPaymentMutation.mutate({ 
                                    invoiceId: invoice.id, 
                                    amount: parseFloat(amount) 
                                  });
                                }
                              }}>
                                <FileText className="h-4 w-4 mr-2" />
                                Record Payment
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          
                          {invoice.status === 'draft' && (
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              Edit Invoice
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('Delete this invoice?')) {
                                deleteInvoiceMutation.mutate(invoice.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>View complete invoice information.</DialogDescription>
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

export default Invoices;
