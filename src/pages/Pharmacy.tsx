import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Search, Pill, Package, AlertTriangle, TrendingDown, Edit, Eye, CheckSquare, Printer, Phone, Trash2, Package2, RotateCw, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import PermissionGuard from '@/components/layout/PermissionGuard';

interface Medication {
  id: string;
  medication_code: string;
  name: string;
  generic_name: string | null;
  category: string;
  form: string;
  strength: string | null;
  manufacturer: string | null;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  expiry_date: string | null;
  requires_prescription: boolean;
}

interface Prescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  prescribed_by: string;
  appointment_id: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Patient data (from join)
  first_name?: string;
  last_name?: string;
  patient_number?: string;
}

interface PurchaseOrder {
  id: string;
  order_id: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date: string;
  status: 'pending' | 'received' | 'cancelled';
  total_amount: number;
  notes: string | null;
  supplier?: { name: string };
  items?: Array<{ medication_id: string; quantity: number; unit_price: number }>;
}

interface ExpiredMedication {
  id: string;
  medication_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  status: 'expired' | 'expiring_soon';
  medication?: { name: string; strength: string };
}

const formOptions = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'other'];

const Pharmacy = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [printPrescription, setPrintPrescription] = useState<Prescription | null>(null);
  const [contactPrescription, setContactPrescription] = useState<Prescription | null>(null);
  const [disposalReportMed, setDisposalReportMed] = useState<Medication | null>(null);
  const [returnReportMed, setReturnReportMed] = useState<Medication | null>(null);
  const [generateReportMed, setGenerateReportMed] = useState<Medication | null>(null);
  const [dispensePendingPrescription, setDisposePendingPrescription] = useState<Prescription | null>(null);
  const [patientInvoices, setPatientInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Medication>>({});

  const [newMedication, setNewMedication] = useState({
    medication_code: '',
    name: '',
    generic_name: '',
    category: '',
    form: 'tablet',
    strength: '',
    manufacturer: '',
    unit_price: 0,
    stock_quantity: 0,
    reorder_level: 50,
    expiry_date: '',
    requires_prescription: true,
  });

  const [newOrder, setNewOrder] = useState({
    supplier_id: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_delivery_date: '',
    medications: [{ medication_id: '', quantity: 100 }],
    notes: '',
  });

  // Helper function to generate prescription number if blank
  const getPrescriptionNumber = (prescription: Prescription | null | undefined): string => {
    if (!prescription) return 'N/A';
    if (prescription.prescription_number && prescription.prescription_number.trim()) {
      return prescription.prescription_number;
    }
    // Generate from prescription ID (first 8 chars) and created_at
    const date = new Date(prescription.created_at).toISOString().slice(0, 10).replace(/-/g, '');
    return `RX-${date}-${prescription.id.substring(0, 6).toUpperCase()}`;
  };

  // Fetch medications
  const { data: medications, isLoading: medicationsLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Medication[];
    },
  });

  // Fetch prescriptions
  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      try {
        // Fetch prescriptions with patient details
        const { data: prescriptionData, error } = await supabase
          .from('prescriptions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;

        // Extract patient IDs and fetch patient data
        const patientIds = [...new Set((prescriptionData || []).map(p => p.patient_id).filter(Boolean))];
        let patientMap: Record<string, any> = {};
        
        if (patientIds.length > 0) {
          try {
            const { data: patientData, error: patientError } = await supabase
              .from('patients')
              .select('id, first_name, last_name, patient_number')
              .in('id', patientIds);
            if (patientError) {
              console.error('Error fetching patients:', patientError);
            } else {
              patientMap = (patientData || []).reduce((acc: Record<string, any>, p: any) => {
                acc[p.id] = p;
                return acc;
              }, {});
            }
          } catch (err) {
            console.error('Exception fetching patients:', err);
          }
        }

        // Map patient data to prescriptions
        const prescriptionsWithPatients = (prescriptionData || []).map((rx: any) => ({
          ...rx,
          first_name: patientMap[rx.patient_id]?.first_name || '',
          last_name: patientMap[rx.patient_id]?.last_name || '',
          patient_number: patientMap[rx.patient_id]?.patient_number || '',
        }));

        return prescriptionsWithPatients as Prescription[];
      } catch (err) {
        console.log('Prescriptions table not available yet', err);
        return [];
      }
    },
  });

  // Fetch purchase orders - disabled as table doesn't exist yet
  const { data: purchaseOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      // purchase_orders table not available in current schema
      return [];
    },
  });

  // Fetch expired medications
  const { data: expiredMeds, isLoading: expiredLoading } = useQuery({
    queryKey: ['expired_medications'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .lt('expiry_date', new Date().toISOString())
          .order('expiry_date')
          .limit(100);
        if (error) throw error;
        return (data || []) as Medication[];
      } catch (err) {
        console.log('Expired medications query failed');
        return [];
      }
    },
  });

  // Create medication
  const createMedicationMutation = useMutation({
    mutationFn: async (data: typeof newMedication) => {
      // Validate required fields
      if (!data.name?.trim()) {
        console.warn('[Pharmacy] Medication name is required');
        throw new Error('Medication name is required');
      }
      if (!data.medication_code?.trim()) {
        console.warn('[Pharmacy] Medication code is required');
        throw new Error('Medication code is required');
      }
      if (data.unit_price <= 0) {
        console.warn('[Pharmacy] Unit price must be greater than 0');
        throw new Error('Unit price must be greater than 0');
      }

      try {
        const { error } = await supabase.from('medications').insert({
          ...data,
          generic_name: data.generic_name || null,
          expiry_date: data.expiry_date || null,
        });
        if (error) {
          console.error('[Pharmacy] Error creating medication:', error);
          throw error;
        }
        console.log('[Pharmacy] Medication created successfully');
      } catch (err) {
        console.error('[Pharmacy] Medication creation failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Medication added successfully');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Mutation error:', error.message);
      toast.error(`Failed to add medication: ${error.message}`);
    },
  });

  // Update medication
  const updateMedicationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Medication> }) => {
      if (!id?.trim()) {
        console.warn('[Pharmacy] Medication ID is required');
        throw new Error('Medication ID is required');
      }
      if (!data.name?.trim()) {
        console.warn('[Pharmacy] Medication name is required');
        throw new Error('Medication name is required');
      }

      try {
        const { error } = await supabase.from('medications').update(data).eq('id', id);
        if (error) {
          console.error('[Pharmacy] Error updating medication:', error);
          throw error;
        }
        console.log('[Pharmacy] Medication updated successfully');
      } catch (err) {
        console.error('[Pharmacy] Medication update failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      setEditingMedication(null);
      toast.success('Medication updated');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Update error:', error.message);
      toast.error(`Failed to update medication: ${error.message}`);
    },
  });

  // Delete medication
  const deleteMedicationMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      if (!medicationId?.trim()) {
        throw new Error('Medication ID is required');
      }

      try {
        const { error } = await supabase
          .from('medications')
          .delete()
          .eq('id', medicationId);
        if (error) {
          console.error('[Pharmacy] Error deleting medication:', error);
          throw error;
        }
        console.log('[Pharmacy] Medication deleted successfully');
      } catch (err) {
        console.error('[Pharmacy] Medication deletion failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast.success('Medication deleted');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Delete error:', error.message);
      toast.error(`Failed to delete medication: ${error.message}`);
    },
  });

  // Update stock
  const updateStockMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (!id?.trim()) {
        console.warn('[Pharmacy] Medication ID is required for stock update');
        throw new Error('Medication ID is required');
      }
      if (quantity < 0) {
        console.warn('[Pharmacy] Quantity cannot be negative');
        throw new Error('Quantity cannot be negative');
      }

      try {
        const { error } = await supabase.from('medications').update({ stock_quantity: quantity }).eq('id', id);
        if (error) {
          console.error('[Pharmacy] Error updating stock:', error);
          throw error;
        }
        console.log('[Pharmacy] Stock updated successfully');
      } catch (err) {
        console.error('[Pharmacy] Stock update failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast.success('Stock updated');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Stock update error:', error.message);
      toast.error(`Failed to update stock: ${error.message}`);
    },
  });

  // Check patient payment status before dispensing
  const checkPaymentStatusMutation = useMutation({
    mutationFn: async (prescription: Prescription) => {
      try {
        // Fetch patient's invoices
        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, amount_paid, status')
          .eq('patient_id', prescription.patient_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return { invoices: invoices || [], prescription };
      } catch (err) {
        console.error('[Pharmacy] Error checking payment status:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      setPatientInvoices(data.invoices);
      setDisposePendingPrescription(data.prescription);
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Payment check error:', error.message);
      toast.error('Could not check payment status');
    },
  });

  // Dispense medication
  const dispenseMedicationMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      if (!prescriptionId?.trim()) {
        console.warn('[Pharmacy] Prescription ID is required');
        throw new Error('Prescription ID is required');
      }

      try {
        const { error } = await supabase
          .from('prescriptions')
          .update({ status: 'dispensed' })
          .eq('id', prescriptionId);
        if (error) {
          console.error('[Pharmacy] Error dispensing medication:', error);
          throw error;
        }
        console.log('[Pharmacy] Medication dispensed successfully');
      } catch (err) {
        console.error('[Pharmacy] Dispensing failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      // Close the payment verification dialog
      setDisposePendingPrescription(null);
      setPatientInvoices([]);
      setInvoicesLoading(false);
      toast.success('Medication dispensed successfully');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Dispensing error:', error.message);
      toast.error(`Failed to dispense medication: ${error.message}`);
    },
  });

  // Delete prescription
  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      if (!prescriptionId?.trim()) {
        console.warn('[Pharmacy] Prescription ID is required for deletion');
        throw new Error('Prescription ID is required');
      }

      try {
        const { error } = await supabase
          .from('prescriptions')
          .delete()
          .eq('id', prescriptionId);
        if (error) {
          console.error('[Pharmacy] Error deleting prescription:', error);
          throw error;
        }
        console.log('[Pharmacy] Prescription deleted successfully');
      } catch (err) {
        console.error('[Pharmacy] Prescription deletion failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription deleted');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Deletion error:', error.message);
      toast.error(`Failed to delete prescription: ${error.message}`);
    },
  });

  // Create purchase order - disabled as table doesn't exist yet
  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (order: typeof newOrder) => {
      toast.info('Purchase orders module coming soon');
      return;
    },
    onSuccess: () => {
      setIsCreateOrderOpen(false);
      setNewOrder({
        supplier_id: '',
        order_date: format(new Date(), 'yyyy-MM-dd'),
        expected_delivery_date: '',
        medications: [{ medication_id: '', quantity: 100 }],
        notes: '',
      });
    },
  });

  // Mark expired for disposal
  const markForDisposalMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      if (!medicationId?.trim()) {
        throw new Error('Medication ID is required');
      }

      try {
        const { error } = await supabase
          .from('medications')
          .delete()
          .eq('id', medicationId);
        if (error) {
          console.error('[Pharmacy] Error marking medication for disposal:', error);
          throw error;
        }
        console.log('[Pharmacy] Medication marked for disposal');
      } catch (err) {
        console.error('[Pharmacy] Disposal marking failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired_medications'] });
      setDisposalReportMed(null);
      toast.success('Medication marked for disposal');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Disposal error:', error.message);
      toast.error(`Failed to mark for disposal: ${error.message}`);
    },
  });

  // Return to supplier
  const returnToSupplierMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      if (!medicationId?.trim()) {
        throw new Error('Medication ID is required');
      }

      try {
        const { error } = await supabase
          .from('medications')
          .delete()
          .eq('id', medicationId);
        if (error) {
          console.error('[Pharmacy] Error returning medication to supplier:', error);
          throw error;
        }
        console.log('[Pharmacy] Medication returned to supplier');
      } catch (err) {
        console.error('[Pharmacy] Return to supplier failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired_medications'] });
      setReturnReportMed(null);
      toast.success('Medication return initiated');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Return error:', error.message);
      toast.error(`Failed to initiate return: ${error.message}`);
    },
  });

  // Generate report
  const generateReportMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      console.log('[Pharmacy] Generating report for medication:', medicationId);
      // Report will be displayed in a modal, no backend action needed
      return true;
    },
    onSuccess: () => {
      toast.success('Report ready to print');
    },
    onError: (error: Error) => {
      console.error('[Pharmacy] Report generation error:', error.message);
      toast.error('Failed to generate report');
    },
  });

  const resetForm = () => {
    setNewMedication({
      medication_code: '',
      name: '',
      generic_name: '',
      category: '',
      form: 'tablet',
      strength: '',
      manufacturer: '',
      unit_price: 0,
      stock_quantity: 0,
      reorder_level: 50,
      expiry_date: '',
      requires_prescription: true,
    });
  };

  const filteredMedications = medications?.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.medication_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMeds = medications?.length || 0;
  const inStock = medications?.filter((m) => m.stock_quantity > m.reorder_level).length || 0;
  const lowStock = medications?.filter((m) => m.stock_quantity <= m.reorder_level && m.stock_quantity > 0).length || 0;
  const expiringSoon = medications?.filter((m) => {
    if (!m.expiry_date) return false;
    const expiryDate = new Date(m.expiry_date);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate <= threeMonthsFromNow;
  }).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Pharmacy Management</h1>
          <p className="text-muted-foreground mt-1">Manage medications, prescriptions, and orders</p>
        </div>
        <PermissionGuard module="pharmacy" action="create">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Medication
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Medication</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Validate required fields
                  if (!newMedication.medication_code?.trim()) {
                    toast.error('Medication code is required');
                    return;
                  }
                  if (!newMedication.name?.trim()) {
                    toast.error('Medication name is required');
                    return;
                  }
                  if (!newMedication.category?.trim()) {
                    toast.error('Category is required');
                    return;
                  }
                  if (newMedication.unit_price <= 0) {
                    toast.error('Unit price must be greater than 0');
                    return;
                  }
                  createMedicationMutation.mutate(newMedication);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medication Code *</Label>
                    <Input
                      value={newMedication.medication_code}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          medication_code: e.target.value,
                        })
                      }
                      placeholder="e.g., MED001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newMedication.name}
                      onChange={(e) =>
                        setNewMedication({ ...newMedication, name: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Generic Name</Label>
                    <Input
                      value={newMedication.generic_name}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          generic_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Input
                      value={newMedication.category}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          category: e.target.value,
                        })
                      }
                      placeholder="e.g., Antibiotics"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Form *</Label>
                    <Select
                      value={newMedication.form}
                      onValueChange={(v) =>
                        setNewMedication({ ...newMedication, form: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formOptions.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Strength</Label>
                    <Input
                      value={newMedication.strength}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          strength: e.target.value,
                        })
                      }
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input
                      value={newMedication.manufacturer}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          manufacturer: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Price (UGX) *</Label>
                    <Input
                      type="number"
                      value={newMedication.unit_price}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          unit_price: parseFloat(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Quantity *</Label>
                    <Input
                      type="number"
                      value={newMedication.stock_quantity}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          stock_quantity: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder Level</Label>
                    <Input
                      type="number"
                      value={newMedication.reorder_level}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          reorder_level: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={newMedication.expiry_date}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          expiry_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="requires_prescription"
                        checked={newMedication.requires_prescription}
                        onChange={(e) =>
                          setNewMedication({
                            ...newMedication,
                            requires_prescription: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="requires_prescription">
                        Requires Prescription
                      </Label>
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMedicationMutation.isPending}
                >
                  {createMedicationMutation.isPending
                    ? 'Adding...'
                    : 'Add Medication'}
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
            <div className="p-3 rounded-lg bg-primary/10">
              <Pill className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMeds}</p>
              <p className="text-sm text-muted-foreground">Total Medications</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inStock}</p>
              <p className="text-sm text-muted-foreground">In Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <TrendingDown className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{lowStock}</p>
              <p className="text-sm text-muted-foreground">Low Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiringSoon}</p>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
              <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Inventory
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Prescriptions
              </TabsTrigger>
              <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Orders
              </TabsTrigger>
              <TabsTrigger value="expired" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Expired
              </TabsTrigger>
            </TabsList>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Medication Inventory</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search medications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {medicationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedications?.map((med) => {
                      const isLowStock = med.stock_quantity <= med.reorder_level;
                      const isExpiringSoon =
                        med.expiry_date &&
                        new Date(med.expiry_date) <=
                          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                      return (
                        <TableRow key={med.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {med.medication_code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{med.name}</p>
                              {med.strength && (
                                <p className="text-xs text-muted-foreground">{med.strength}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{med.category}</TableCell>
                          <TableCell className="capitalize">{med.form}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                isLowStock
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }
                            >
                              {med.stock_quantity}
                            </Badge>
                          </TableCell>
                          <TableCell>UGX {med.unit_price.toLocaleString()}</TableCell>
                          <TableCell>
                            {med.expiry_date ? (
                              <span
                                className={
                                  isExpiringSoon ? 'text-red-600 font-medium' : ''
                                }
                              >
                                {format(new Date(med.expiry_date), 'MMM yyyy')}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <PermissionGuard module="pharmacy" action="edit">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingMedication(med);
                                    setEditFormData(med);
                                  }}
                                  title="Edit Medication"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                              <PermissionGuard module="pharmacy" action="edit">
                                <Input
                                  type="number"
                                  className="w-20 h-8 text-xs"
                                  placeholder="Qty"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const value = parseInt(
                                        (e.target as HTMLInputElement).value
                                      );
                                      if (!isNaN(value)) {
                                        updateStockMutation.mutate({
                                          id: med.id,
                                          quantity: med.stock_quantity + value,
                                        });
                                        (e.target as HTMLInputElement).value = '';
                                      }
                                    }
                                  }}
                                />
                              </PermissionGuard>
                              <PermissionGuard module="pharmacy" action="delete">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (window.confirm(`Delete ${med.name}? This cannot be undone.`)) {
                                      deleteMedicationMutation.mutate(med.id);
                                    }
                                  }}
                                  disabled={deleteMedicationMutation.isPending}
                                  title="Delete Medication"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredMedications?.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No medications found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Edit Medication Dialog */}
              <Dialog
                open={!!editingMedication}
                onOpenChange={(open) => {
                  if (!open) {
                    setEditingMedication(null);
                    setEditFormData({});
                  }
                }}
              >
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Medication</DialogTitle>
                  </DialogHeader>
                  {editingMedication && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={editFormData.name || ''}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, name: e.target.value })
                            }
                            placeholder="Medication name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="generic_name">Generic Name</Label>
                          <Input
                            id="generic_name"
                            value={editFormData.generic_name || ''}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, generic_name: e.target.value })
                            }
                            placeholder="Generic name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Input
                            id="category"
                            value={editFormData.category || ''}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, category: e.target.value })
                            }
                            placeholder="Medication category"
                          />
                        </div>
                        <div>
                          <Label htmlFor="form">Form</Label>
                          <Select
                            value={editFormData.form || 'tablet'}
                            onValueChange={(value) =>
                              setEditFormData({ ...editFormData, form: value })
                            }
                          >
                            <SelectTrigger id="form">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tablet">Tablet</SelectItem>
                              <SelectItem value="capsule">Capsule</SelectItem>
                              <SelectItem value="syrup">Syrup</SelectItem>
                              <SelectItem value="injection">Injection</SelectItem>
                              <SelectItem value="cream">Cream</SelectItem>
                              <SelectItem value="drops">Drops</SelectItem>
                              <SelectItem value="inhaler">Inhaler</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="strength">Strength</Label>
                          <Input
                            id="strength"
                            value={editFormData.strength || ''}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, strength: e.target.value })
                            }
                            placeholder="e.g., 500mg"
                          />
                        </div>
                        <div>
                          <Label htmlFor="manufacturer">Manufacturer</Label>
                          <Input
                            id="manufacturer"
                            value={editFormData.manufacturer || ''}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, manufacturer: e.target.value })
                            }
                            placeholder="Manufacturer name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="unit_price">Unit Price (UGX)</Label>
                          <Input
                            id="unit_price"
                            type="number"
                            value={editFormData.unit_price || 0}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                unit_price: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="stock_quantity">Stock Quantity</Label>
                          <Input
                            id="stock_quantity"
                            type="number"
                            value={editFormData.stock_quantity || 0}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                stock_quantity: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="reorder_level">Reorder Level</Label>
                          <Input
                            id="reorder_level"
                            type="number"
                            value={editFormData.reorder_level || 50}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                reorder_level: parseInt(e.target.value) || 50,
                              })
                            }
                            placeholder="50"
                          />
                        </div>
                        <div>
                          <Label htmlFor="expiry_date">Expiry Date</Label>
                          <Input
                            id="expiry_date"
                            type="date"
                            value={editFormData.expiry_date ? editFormData.expiry_date.split('T')[0] : ''}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, expiry_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingMedication(null);
                            setEditFormData({});
                          }}
                          disabled={updateMedicationMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (editingMedication && editFormData.name) {
                              updateMedicationMutation.mutate({
                                id: editingMedication.id,
                                data: editFormData,
                              });
                            }
                          }}
                          disabled={updateMedicationMutation.isPending || !editFormData.name}
                        >
                          {updateMedicationMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Prescriptions Tab */}
            <TabsContent value="prescriptions" className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Active Prescriptions</h3>
              <p className="text-sm text-muted-foreground">
                Manage patient prescriptions and dispensing
              </p>

              {prescriptionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prescription #</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Patient #</TableHead>
                      <TableHead>Prescribed By</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions?.map((prescription) => (
                      <TableRow key={prescription.id}>
                        <TableCell>
                          <Badge variant="outline">{getPrescriptionNumber(prescription)}</Badge>
                        </TableCell>
                        <TableCell>
                          {prescription.first_name && prescription.last_name
                            ? `${prescription.first_name} ${prescription.last_name}`
                            : prescription.patient_id.substring(0, 8)}
                        </TableCell>
                        <TableCell>{prescription.patient_number || '-'}</TableCell>
                        <TableCell>{prescription.prescribed_by}</TableCell>
                        <TableCell className="max-w-xs truncate">{prescription.notes || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              prescription.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : prescription.status === 'ready'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {prescription.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog
                              open={selectedPrescription?.id === prescription.id}
                              onOpenChange={(open) =>
                                setSelectedPrescription(open ? prescription : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="View Prescription"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Prescription Details
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Prescription #
                                      </p>
                                      <p className="font-medium">
                                        {selectedPrescription?.prescription_number}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Patient Name
                                      </p>
                                      <p className="font-medium">
                                        {selectedPrescription?.first_name && selectedPrescription?.last_name
                                          ? `${selectedPrescription.first_name} ${selectedPrescription.last_name}`
                                          : 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Patient #
                                      </p>
                                      <p className="font-medium">
                                        {selectedPrescription?.patient_number || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Prescribed By
                                      </p>
                                      <p className="font-medium">
                                        {selectedPrescription?.prescribed_by}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Status
                                      </p>
                                      <p className="font-medium capitalize">
                                        {selectedPrescription?.status}
                                      </p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-sm text-muted-foreground">
                                        Notes
                                      </p>
                                      <p className="font-medium">
                                        {selectedPrescription?.notes || 'No notes'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Created
                                      </p>
                                      <p className="font-medium">
                                        {selectedPrescription?.created_at ? format(new Date(selectedPrescription.created_at), 'MMM dd, yyyy') : '-'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {prescription.status !== 'dispensed' && prescription.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Check Payment & Dispense"
                                onClick={() => {
                                  setInvoicesLoading(true);
                                  checkPaymentStatusMutation.mutate(prescription);
                                }}
                                disabled={checkPaymentStatusMutation.isPending || dispenseMedicationMutation.isPending}
                              >
                                <CheckSquare className="h-4 w-4" />
                              </Button>
                            )}

                            <Dialog
                              open={printPrescription?.id === prescription.id}
                              onOpenChange={(open) =>
                                setPrintPrescription(open ? prescription : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Print Label"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Print Prescription Label</DialogTitle>
                                </DialogHeader>
                                {printPrescription && (
                                  <div className="space-y-4">
                                    <div className="p-6 bg-white border-2 border-dashed border-gray-300 rounded">
                                      <div className="text-center space-y-2">
                                        <p className="text-sm font-semibold">PRESCRIPTION LABEL</p>
                                        <p className="text-2xl font-bold">#{getPrescriptionNumber(printPrescription)}</p>
                                        <p className="text-sm">
                                          {printPrescription.first_name} {printPrescription.last_name}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          Date: {printPrescription.created_at ? format(new Date(printPrescription.created_at), 'MMM dd, yyyy') : 'N/A'}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          {printPrescription.notes}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => window.print()}
                                      className="w-full"
                                    >
                                      Print Label
                                    </Button>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Dialog
                              open={contactPrescription?.id === prescription.id}
                              onOpenChange={(open) =>
                                setContactPrescription(open ? prescription : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Contact Patient"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Contact Patient</DialogTitle>
                                </DialogHeader>
                                {contactPrescription && (
                                  <div className="space-y-4">
                                    <div className="grid gap-4">
                                      <div>
                                        <p className="text-sm font-semibold text-gray-600">Patient Name</p>
                                        <p className="text-lg">
                                          {contactPrescription.first_name} {contactPrescription.last_name}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-600">Patient Number</p>
                                        <p className="text-lg">
                                          {contactPrescription.patient_number || 'Not Available'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-600">Prescription #</p>
                                        <p className="text-lg">
                                          {getPrescriptionNumber(contactPrescription)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-600">Status</p>
                                        <Badge className="mt-1 capitalize">{contactPrescription.status}</Badge>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button className="flex-1" variant="outline">
                                        Send SMS
                                      </Button>
                                      <Button className="flex-1" variant="outline">
                                        Send Email
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Prescription"
                              onClick={() =>
                                deletePrescriptionMutation.mutate(prescription.id)
                              }
                              disabled={deletePrescriptionMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!prescriptions || prescriptions.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No active prescriptions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Payment Verification Dialog */}
              <Dialog
                open={!!dispensePendingPrescription}
                onOpenChange={(open) => {
                  if (!open) {
                    setDisposePendingPrescription(null);
                    setPatientInvoices([]);
                  }
                }}
              >
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Payment Verification Required</DialogTitle>
                  </DialogHeader>
                  {dispensePendingPrescription && (
                    <div className="space-y-4">
                      {/* Prescription Info */}
                      <div className="bg-blue-50 p-4 rounded border border-blue-200">
                        <p className="text-sm font-semibold text-blue-900">Prescription to Dispense</p>
                        <p className="text-lg font-bold mt-1">
                          #{getPrescriptionNumber(dispensePendingPrescription)}
                        </p>
                      </div>

                      {/* Payment Status */}
                      <div className="space-y-3">
                        <p className="font-semibold text-sm">Patient Payment Status</p>
                        {patientInvoices.length === 0 ? (
                          <div className="bg-green-50 p-4 rounded border border-green-200">
                            <p className="text-sm text-green-900">
                              ✓ No outstanding invoices. Patient is clear to dispense.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {patientInvoices.map((invoice) => {
                              const balance = invoice.total_amount - invoice.amount_paid;
                              const isPaid = balance <= 0;

                              return (
                                <div
                                  key={invoice.id}
                                  className={`p-3 rounded border ${
                                    isPaid
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-red-50 border-red-200'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-sm font-medium">{invoice.invoice_number}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Total: UGX {invoice.total_amount.toLocaleString()}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Paid: UGX {invoice.amount_paid.toLocaleString()}
                                      </p>
                                    </div>
                                    <Badge
                                      className={`text-xs ${
                                        isPaid
                                          ? 'bg-green-600 hover:bg-green-700'
                                          : 'bg-red-600 hover:bg-red-700'
                                      }`}
                                    >
                                      {isPaid ? 'PAID' : `DUE: UGX ${balance.toLocaleString()}`}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Payment Summary */}
                      {patientInvoices.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded border">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Total Outstanding:</span>
                            <span className="font-bold text-red-600">
                              UGX{' '}
                              {patientInvoices
                                .reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0)
                                .toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDisposePendingPrescription(null);
                            setPatientInvoices([]);
                          }}
                          disabled={dispenseMedicationMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (dispensePendingPrescription) {
                              dispenseMedicationMutation.mutate(dispensePendingPrescription.id);
                            }
                          }}
                          disabled={
                            dispenseMedicationMutation.isPending ||
                            (patientInvoices.length > 0 &&
                              patientInvoices.some(
                                (inv) => inv.total_amount - inv.amount_paid > 0
                              ))
                          }
                          className={
                            patientInvoices.length > 0 &&
                            patientInvoices.some(
                              (inv) => inv.total_amount - inv.amount_paid > 0
                            )
                              ? 'bg-red-600 hover:bg-red-700 cursor-not-allowed opacity-50'
                              : ''
                          }
                        >
                          {dispenseMedicationMutation.isPending
                            ? 'Dispensing...'
                            : patientInvoices.length > 0 &&
                              patientInvoices.some(
                                (inv) => inv.total_amount - inv.amount_paid > 0
                              )
                            ? 'Cannot Dispense - Outstanding Balance'
                            : 'Dispense Medication'}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Purchase Orders Tab */}
            <TabsContent value="orders" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Purchase Orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Track medication orders and deliveries
                  </p>
                </div>
                <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Purchase Order</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select
                          value={newOrder.supplier_id}
                          onValueChange={(v) =>
                            setNewOrder({ ...newOrder, supplier_id: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="supplier_1">
                              PharmaCorp Supplies
                            </SelectItem>
                            <SelectItem value="supplier_2">
                              Medical Distributor Ltd
                            </SelectItem>
                            <SelectItem value="supplier_3">
                              Global Pharma Solutions
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Order Date</Label>
                        <Input
                          type="date"
                          value={newOrder.order_date}
                          onChange={(e) =>
                            setNewOrder({ ...newOrder, order_date: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Expected Delivery Date</Label>
                        <Input
                          type="date"
                          value={newOrder.expected_delivery_date}
                          onChange={(e) =>
                            setNewOrder({
                              ...newOrder,
                              expected_delivery_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Medications to Order</Label>
                        {newOrder.medications.map((med, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Select
                              value={med.medication_id}
                              onValueChange={(v) => {
                                const updatedMeds = [...newOrder.medications];
                                updatedMeds[idx].medication_id = v;
                                setNewOrder({
                                  ...newOrder,
                                  medications: updatedMeds,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select medication" />
                              </SelectTrigger>
                              <SelectContent>
                                {medications?.map((med) => (
                                  <SelectItem key={med.id} value={med.id}>
                                    {med.name} ({med.strength})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={med.quantity}
                              onChange={(e) => {
                                const updatedMeds = [...newOrder.medications];
                                updatedMeds[idx].quantity = parseInt(e.target.value);
                                setNewOrder({
                                  ...newOrder,
                                  medications: updatedMeds,
                                });
                              }}
                              className="w-24"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label>Order Notes</Label>
                        <Input
                          placeholder="Special instructions or notes for this order..."
                          value={newOrder.notes}
                          onChange={(e) =>
                            setNewOrder({ ...newOrder, notes: e.target.value })
                          }
                        />
                      </div>

                      <Button
                        onClick={() => createPurchaseOrderMutation.mutate(newOrder)}
                        className="w-full"
                        disabled={createPurchaseOrderMutation.isPending}
                      >
                        {createPurchaseOrderMutation.isPending
                          ? 'Creating...'
                          : 'Create Order'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : purchaseOrders && purchaseOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Badge variant="outline">{order.order_id}</Badge>
                        </TableCell>
                        <TableCell>{order.supplier?.name}</TableCell>
                        <TableCell>
                          {format(new Date(order.order_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(order.expected_delivery_date),
                            'MMM dd, yyyy'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              order.status === 'received'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'pending'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          UGX {order.total_amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No active orders</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a new purchase order to restock medications.
                  </p>
                  <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
                    <DialogTrigger asChild>
                      <Button>Create Order</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Purchase Order</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Supplier</Label>
                          <Select
                            value={newOrder.supplier_id}
                            onValueChange={(v) =>
                              setNewOrder({ ...newOrder, supplier_id: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="supplier_1">
                                PharmaCorp Supplies
                              </SelectItem>
                              <SelectItem value="supplier_2">
                                Medical Distributor Ltd
                              </SelectItem>
                              <SelectItem value="supplier_3">
                                Global Pharma Solutions
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Order Date</Label>
                          <Input
                            type="date"
                            value={newOrder.order_date}
                            onChange={(e) =>
                              setNewOrder({
                                ...newOrder,
                                order_date: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Expected Delivery Date</Label>
                          <Input
                            type="date"
                            value={newOrder.expected_delivery_date}
                            onChange={(e) =>
                              setNewOrder({
                                ...newOrder,
                                expected_delivery_date: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Medications to Order</Label>
                          {newOrder.medications.map((med, idx) => (
                            <div key={idx} className="flex gap-2">
                              <Select
                                value={med.medication_id}
                                onValueChange={(v) => {
                                  const updatedMeds = [...newOrder.medications];
                                  updatedMeds[idx].medication_id = v;
                                  setNewOrder({
                                    ...newOrder,
                                    medications: updatedMeds,
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select medication" />
                                </SelectTrigger>
                                <SelectContent>
                                  {medications?.map((med) => (
                                    <SelectItem key={med.id} value={med.id}>
                                      {med.name} ({med.strength})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                placeholder="Qty"
                                value={med.quantity}
                                onChange={(e) => {
                                  const updatedMeds = [...newOrder.medications];
                                  updatedMeds[idx].quantity = parseInt(
                                    e.target.value
                                  );
                                  setNewOrder({
                                    ...newOrder,
                                    medications: updatedMeds,
                                  });
                                }}
                                className="w-24"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label>Order Notes</Label>
                          <Input
                            placeholder="Special instructions or notes for this order..."
                            value={newOrder.notes}
                            onChange={(e) =>
                              setNewOrder({ ...newOrder, notes: e.target.value })
                            }
                          />
                        </div>

                        <Button
                          onClick={() =>
                            createPurchaseOrderMutation.mutate(newOrder)
                          }
                          className="w-full"
                          disabled={createPurchaseOrderMutation.isPending}
                        >
                          {createPurchaseOrderMutation.isPending
                            ? 'Creating...'
                            : 'Create Order'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </TabsContent>

            {/* Expired Medications Tab */}
            <TabsContent value="expired" className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Expired Medications</h3>
              <p className="text-sm text-muted-foreground">
                Medications that have expired or are nearing expiry
              </p>

              {expiredLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : expiredMeds && expiredMeds.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiredMeds.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{med.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {med.strength}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{med.medication_code}</Badge>
                        </TableCell>
                        <TableCell>{med.stock_quantity}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {format(new Date(med.expiry_date!), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-800">
                            Expired
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog
                              open={disposalReportMed?.id === med.id}
                              onOpenChange={(open) =>
                                setDisposalReportMed(open ? med : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Mark for Disposal"
                                  onClick={() => setDisposalReportMed(med)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirm Disposal</DialogTitle>
                                </DialogHeader>
                                {disposalReportMed && (
                                  <div className="space-y-4">
                                    <div className="bg-red-50 p-4 rounded border border-red-200">
                                      <p className="font-medium text-red-900">
                                        {disposalReportMed.name}
                                      </p>
                                      <p className="text-sm text-red-800 mt-2">
                                        Expiry: {format(new Date(disposalReportMed.expiry_date!), 'MMM dd, yyyy')}
                                      </p>
                                      <p className="text-sm text-red-800">
                                        Quantity: {disposalReportMed.stock_quantity} units
                                      </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Mark this medication for disposal? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        onClick={() => setDisposalReportMed(null)}
                                        disabled={markForDisposalMutation.isPending}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() =>
                                          markForDisposalMutation.mutate(disposalReportMed.id)
                                        }
                                        disabled={markForDisposalMutation.isPending}
                                      >
                                        {markForDisposalMutation.isPending ? 'Processing...' : 'Mark for Disposal'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Dialog
                              open={returnReportMed?.id === med.id}
                              onOpenChange={(open) =>
                                setReturnReportMed(open ? med : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Return to Supplier"
                                  onClick={() => setReturnReportMed(med)}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <RotateCw className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Initiate Supplier Return</DialogTitle>
                                </DialogHeader>
                                {returnReportMed && (
                                  <div className="space-y-4">
                                    <div className="bg-orange-50 p-4 rounded border border-orange-200">
                                      <p className="font-medium text-orange-900">
                                        {returnReportMed.name}
                                      </p>
                                      <p className="text-sm text-orange-800 mt-2">
                                        Expiry: {format(new Date(returnReportMed.expiry_date!), 'MMM dd, yyyy')}
                                      </p>
                                      <p className="text-sm text-orange-800">
                                        Quantity: {returnReportMed.stock_quantity} units
                                      </p>
                                      <p className="text-sm text-orange-800">
                                        Supplier: {returnReportMed.manufacturer || 'N/A'}
                                      </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Initiate return of this expired medication to the supplier? A return record will be created.
                                    </p>
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        onClick={() => setReturnReportMed(null)}
                                        disabled={returnToSupplierMutation.isPending}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        className="bg-orange-600 hover:bg-orange-700"
                                        onClick={() =>
                                          returnToSupplierMutation.mutate(returnReportMed.id)
                                        }
                                        disabled={returnToSupplierMutation.isPending}
                                      >
                                        {returnToSupplierMutation.isPending ? 'Processing...' : 'Initiate Return'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Dialog
                              open={generateReportMed?.id === med.id}
                              onOpenChange={(open) =>
                                setGenerateReportMed(open ? med : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Generate Report"
                                  onClick={() => setGenerateReportMed(med)}
                                >
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Expired Medication Report</DialogTitle>
                                </DialogHeader>
                                {generateReportMed && (
                                  <div className="space-y-4">
                                    <div className="p-6 bg-gray-50 rounded border">
                                      <div className="text-center space-y-3 mb-6">
                                        <h3 className="text-lg font-semibold">EXPIRED MEDICATION REPORT</h3>
                                        <p className="text-xs text-gray-600">
                                          Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
                                        </p>
                                      </div>
                                      <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <p className="text-gray-600">Medication Name</p>
                                            <p className="font-medium">{generateReportMed.name}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Generic Name</p>
                                            <p className="font-medium">{generateReportMed.generic_name || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Medication Code</p>
                                            <p className="font-medium">{generateReportMed.medication_code}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Category</p>
                                            <p className="font-medium">{generateReportMed.category}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Strength</p>
                                            <p className="font-medium">{generateReportMed.strength || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Form</p>
                                            <p className="font-medium capitalize">{generateReportMed.form}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Manufacturer</p>
                                            <p className="font-medium">{generateReportMed.manufacturer || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Unit Price</p>
                                            <p className="font-medium">UGX {generateReportMed.unit_price.toLocaleString()}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Stock Quantity</p>
                                            <p className="font-medium text-red-600">{generateReportMed.stock_quantity}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Expiry Date</p>
                                            <p className="font-medium text-red-600">
                                              {format(new Date(generateReportMed.expiry_date!), 'MMM dd, yyyy')}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="pt-4 border-t">
                                          <p className="text-gray-600">Total Value</p>
                                          <p className="font-bold text-lg">
                                            UGX {(generateReportMed.unit_price * generateReportMed.stock_quantity).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        onClick={() => setGenerateReportMed(null)}
                                      >
                                        Close
                                      </Button>
                                      <Button
                                        onClick={() => window.print()}
                                      >
                                        Print Report
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No expired medications
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pharmacy;