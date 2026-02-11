import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, Plus, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format, isPast } from 'date-fns';

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
  const [selectedTab, setSelectedTab] = useState('outstanding');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Fetch invoices
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
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

  // Record payment
  const recordPaymentMutation = useMutation({
    mutationFn: async (data: { invoiceId: string; amount: number; paymentDate: string }) => {
      const invoice = invoices?.find(inv => inv.id === data.invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      
      const newAmountPaid = Math.min(invoice.amount_paid + data.amount, invoice.total_amount);
      const newStatus = newAmountPaid >= invoice.total_amount ? 'paid' : 'partially_paid';
      
      const { error } = await supabase
        .from('invoices')
        .update({ 
          amount_paid: newAmountPaid,
          status: newStatus
        })
        .eq('id', data.invoiceId);
      
      if (error) throw error;
      
      // Log payment transaction
      const { error: logError } = await supabase
        .from('payments')
        .insert({
          invoice_id: data.invoiceId,
          amount: data.amount,
          payment_date: data.paymentDate,
          payment_method: 'manual',
          reference: `Payment for ${invoice.invoice_number}`,
        });
      
      if (logError) console.error('Payment log error:', logError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setSelectedInvoice(null);
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to record payment: ' + error.message);
    },
  });

  // Calculate metrics
  const totalBilled = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
  const totalCollected = invoices?.reduce((sum, inv) => sum + inv.amount_paid, 0) || 0;
  const totalOutstanding = totalBilled - totalCollected;
  const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0';
  
  const outstandingInvoices = invoices?.filter(inv => inv.total_amount > inv.amount_paid) || [];
  const overdueInvoices = outstandingInvoices.filter(inv => inv.due_date && isPast(new Date(inv.due_date)));
  const partiallyPaidInvoices = outstandingInvoices.filter(inv => inv.amount_paid > 0);
  const unpaidInvoices = outstandingInvoices.filter(inv => inv.amount_paid === 0 && inv.status !== 'draft');

  // Filter invoices by tab
  let displayInvoices = outstandingInvoices;
  if (selectedTab === 'overdue') {
    displayInvoices = overdueInvoices;
  } else if (selectedTab === 'partial') {
    displayInvoices = partiallyPaidInvoices;
  } else if (selectedTab === 'unpaid') {
    displayInvoices = unpaidInvoices;
  }

  // Search filter
  const filteredInvoices = displayInvoices.filter(inv => {
    return (
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Billing & Payments</h1>
        <p className="text-muted-foreground mt-1">Track payments, reconciliation, and cash flow</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Billed</p>
                <p className="text-2xl font-bold mt-1">UGX {(totalBilled / 1000000).toFixed(1)}M</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-green-600 mt-1">UGX {(totalCollected / 1000000).toFixed(1)}M</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-red-600 mt-1">UGX {(totalOutstanding / 1000000).toFixed(1)}M</p>
              </div>
              <Clock className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{collectionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-900">Overdue Invoices</p>
                <p className="text-2xl font-bold text-red-600">{overdueInvoices.length}</p>
                <p className="text-xs text-red-700 mt-1">UGX {(overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0) / 1000000).toFixed(1)}M due</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-900">Partially Paid</p>
                <p className="text-2xl font-bold text-yellow-600">{partiallyPaidInvoices.length}</p>
                <p className="text-xs text-yellow-700 mt-1">UGX {(partiallyPaidInvoices.reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0) / 1000000).toFixed(1)}M pending</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Awaiting First Payment</p>
                <p className="text-2xl font-bold text-gray-600">{unpaidInvoices.length}</p>
                <p className="text-xs text-gray-700 mt-1">UGX {(unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0) / 1000000).toFixed(1)}M unpaid</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Tracking</CardTitle>
          <CardDescription>Outstanding and partially paid invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="outstanding">All Outstanding ({outstandingInvoices.length})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({overdueInvoices.length})</TabsTrigger>
              <TabsTrigger value="partial">Partially Paid ({partiallyPaidInvoices.length})</TabsTrigger>
              <TabsTrigger value="unpaid">Unpaid ({unpaidInvoices.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by invoice number or patient name..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9" 
            />
          </div>

          {/* Table */}
          {isLoadingInvoices ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const daysOverdue = invoice.due_date ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0;
                    const balanceDue = invoice.total_amount - invoice.amount_paid;
                    
                    return (
                      <TableRow key={invoice.id} className={invoice.status === 'overdue' ? 'bg-red-50' : ''}>
                        <TableCell className="font-mono font-semibold">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.patients?.first_name} {invoice.patients?.last_name}</TableCell>
                        <TableCell>{format(new Date(invoice.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '-'}</TableCell>
                        <TableCell className="text-right font-medium">UGX {invoice.total_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">UGX {invoice.amount_paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">UGX {balanceDue.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                            {invoice.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {daysOverdue > 0 ? (
                            <span className="text-red-600 font-bold">{daysOverdue} days</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsPaymentDialogOpen(true);
                            }}
                          >
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No outstanding invoices
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Invoice: {selectedInvoice?.invoice_number} | Patient: {selectedInvoice?.patients?.first_name} {selectedInvoice?.patients?.last_name}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const amount = parseFloat(paymentAmount);
                if (!amount || amount <= 0) {
                  toast.error('Please enter a valid payment amount');
                  return;
                }
                const balanceDue = selectedInvoice.total_amount - selectedInvoice.amount_paid;
                if (amount > balanceDue) {
                  toast.error(`Payment amount cannot exceed balance due (UGX ${balanceDue.toLocaleString()})`);
                  return;
                }
                recordPaymentMutation.mutate({
                  invoiceId: selectedInvoice.id,
                  amount,
                  paymentDate: new Date().toISOString().split('T')[0]
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-bold">UGX {selectedInvoice.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Already Paid</p>
                  <p className="font-bold text-green-600">UGX {selectedInvoice.amount_paid.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Balance Due</p>
                  <p className="text-lg font-bold text-red-600">UGX {(selectedInvoice.total_amount - selectedInvoice.amount_paid).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount *</Label>
                <Input 
                  type="number" 
                  placeholder="Enter payment amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedInvoice.total_amount - selectedInvoice.amount_paid}
                  step="0.01"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={recordPaymentMutation.isPending}>
                  {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
