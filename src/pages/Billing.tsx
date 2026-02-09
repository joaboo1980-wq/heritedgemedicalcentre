import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, Plus, Eye, Edit2, Download, Trash2, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  status: string;
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
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  partially_paid: 'bg-blue-100 text-blue-800',
};

const Billing = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    due_date: '',
    items: [{ description: '', quantity: 1, unit_price: 0, item_type: 'other' }],
  });

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, patient_number')
        .order('first_name');
      if (error) {
        console.error('Error fetching patients:', error);
        throw error;
      }
      return data;
    },
  });

  // Fetch invoices
  const { data: invoices, isLoading: isLoadingInvoices, error: invoicesError } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select(`*, patients (first_name, last_name, patient_number)`)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('[Billing] Error fetching invoices:', error);
          throw error;
        }
        return data as Invoice[];
      } catch (err) {
        console.error('[Billing] Invoices query failed:', err);
        return [];
      }
    },
  });

  // Create invoice
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      try {
        if (!data.patient_id) throw new Error('Patient is required');
        if (data.items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
          throw new Error('All items must be filled with valid data');
        }

        const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            patient_id: data.patient_id,
            invoice_number: `INV-${Date.now()}`,
            status: 'draft',
            total_amount: totalAmount,
            amount_paid: 0,
            due_date: data.due_date || null,
          })
          .select()
          .single();

        if (invoiceError) {
          console.error('[Billing] Invoice creation error:', invoiceError);
          throw invoiceError;
        }

        // Insert line items
        const items = data.items.map(item => ({
          invoice_id: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          item_type: item.item_type || 'other',
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(items);

        if (itemsError) {
          console.error('[Billing] Invoice items creation error:', itemsError);
          throw itemsError;
        }

        return newInvoice;
      } catch (err) {
        console.error('[Billing] Create invoice mutation failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsCreateDialogOpen(false);
      setFormData({ patient_id: '', due_date: '', items: [{ description: '', quantity: 1, unit_price: 0, item_type: 'other' }] });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error) => {
      console.error('[Billing] Create invoice failed:', error);
      toast.error(error.message || 'Failed to create invoice');
    },
  });

  // Delete invoice
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      try {
        if (!invoiceId) throw new Error('Invoice ID is required');
        
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);

        if (itemsError) {
          console.error('[Billing] Delete items error:', itemsError);
          throw itemsError;
        }

        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoiceId);

        if (error) {
          console.error('[Billing] Delete invoice error:', error);
          throw error;
        }
      } catch (err) {
        console.error('[Billing] Delete invoice mutation failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsViewDialogOpen(false);
      toast.success('Invoice deleted successfully');
    },
    onError: (error: Error) => {
      console.error('[Billing] Delete invoice failed:', error);
      toast.error(error.message || 'Failed to delete invoice');
    },
  });

  // View invoice details
  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      setSelectedInvoice(invoice);
      const { data: items, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      
      if (error) {
        console.error('[Billing] Error fetching invoice items:', error);
        toast.error('Failed to load invoice items');
        return;
      }
      
      setInvoiceItems(items as InvoiceItem[]);
      setIsViewDialogOpen(true);
    } catch (err) {
      console.error('[Billing] Error viewing invoice:', err);
      toast.error('Failed to load invoice details');
    }
  };

  // Filter invoices
  const filteredInvoices = invoices?.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || inv.status === selectedTab;
    return matchesSearch && matchesTab;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage all patient invoices and payments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>Create a new invoice for a patient</DialogDescription>
            </DialogHeader>
            <form 
              onSubmit={(e) => { 
                e.preventDefault();
                
                // Validate form data
                if (!formData.patient_id) {
                  toast.error('Please select a patient');
                  return;
                }
                if (!formData.items || formData.items.length === 0) {
                  toast.error('Please add at least one invoice item');
                  return;
                }
                if (formData.items.some(item => !item.description?.trim())) {
                  toast.error('All items must have a description');
                  return;
                }
                if (formData.items.some(item => item.quantity <= 0)) {
                  toast.error('All items must have a quantity greater than 0');
                  return;
                }
                if (formData.items.some(item => item.unit_price < 0)) {
                  toast.error('All items must have a valid price');
                  return;
                }
                
                createInvoiceMutation.mutate(formData); 
              }} 
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Patient *</Label>
                <Select value={formData.patient_id} onValueChange={(v) => setFormData({ ...formData, patient_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} ({patient.patient_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  value={formData.due_date} 
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} 
                />
              </div>

              <div className="space-y-3">
                <Label>Invoice Items *</Label>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="space-y-2 p-3 border rounded-md">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Description" 
                        value={item.description} 
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[idx].description = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }} 
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select 
                        value={item.item_type || 'other'} 
                        onValueChange={(value) => {
                          const newItems = [...formData.items];
                          newItems[idx].item_type = value;
                          setFormData({ ...formData, items: newItems });
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="lab_test">Lab Test</SelectItem>
                          <SelectItem value="medication">Medication</SelectItem>
                          <SelectItem value="procedure">Procedure</SelectItem>
                          <SelectItem value="room">Room</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        type="number" 
                        placeholder="Qty" 
                        value={item.quantity} 
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[idx].quantity = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, items: newItems });
                        }} 
                        className="w-20"
                      />
                      <Input 
                        type="number" 
                        placeholder="Price" 
                        value={item.unit_price} 
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, items: newItems });
                        }} 
                        className="w-24"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          const newItems = formData.items.filter((_, i) => i !== idx);
                          setFormData({ ...formData, items: newItems });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setFormData({
                    ...formData, 
                    items: [...formData.items, { description: '', quantity: 1, unit_price: 0, item_type: 'other' }]
                  })}
                  className="w-full"
                >
                  Add Item
                </Button>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Total: UGX {formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInvoiceMutation.isPending}>
                  {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="all">All Invoices</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search invoices..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-9" 
              />
            </div>
          </div>

          {isLoadingInvoices ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-semibold">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {invoice.patients?.first_name} {invoice.patients?.last_name}
                    </TableCell>
                    <TableCell>{format(new Date(invoice.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">UGX {invoice.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this invoice?')) {
                                deleteInvoiceMutation.mutate(invoice.id);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-semibold">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-semibold">{selectedInvoice.patients?.first_name} {selectedInvoice.patients?.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{format(new Date(selectedInvoice.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedInvoice.status]}>
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1).replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">UGX {item.unit_price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">UGX {item.total_price.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-4">
                <div className="flex justify-end mb-2">
                  <div className="w-64">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span>UGX {selectedInvoice.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Tax:</span>
                      <span>UGX 0</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>UGX {selectedInvoice.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mt-2 text-green-600">
                      <span>Paid:</span>
                      <span>UGX {selectedInvoice.amount_paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mt-2 text-red-600 font-semibold">
                      <span>Balance Due:</span>
                      <span>UGX {(selectedInvoice.total_amount - selectedInvoice.amount_paid).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
