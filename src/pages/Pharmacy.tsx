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
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
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
        const { data, error } = await supabase
          .from('prescriptions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return (data || []) as Prescription[];
      } catch (err) {
        console.log('Prescriptions table not available yet');
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
      const { error } = await supabase.from('medications').insert({
        ...data,
        generic_name: data.generic_name || null,
        expiry_date: data.expiry_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Medication added successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update medication
  const updateMedicationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Medication> }) => {
      const { error } = await supabase.from('medications').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      setEditingMedication(null);
      toast.success('Medication updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update stock
  const updateStockMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase.from('medications').update({ stock_quantity: quantity }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast.success('Stock updated');
    },
  });

  // Dispense medication
  const dispenseMedicationMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'dispensed' })
        .eq('id', prescriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Medication dispensed');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete prescription
  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription deleted');
    },
    onError: (error: Error) => toast.error(error.message),
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
      // In a real app, this would create a disposal record
      toast.success('Marked for disposal');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired_medications'] });
    },
  });

  // Return to supplier
  const returnToSupplierMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      // In a real app, this would create a return record
      toast.success('Return initiated');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired_medications'] });
    },
  });

  // Generate report
  const generateReportMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      toast.success('Report generated');
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
                                  onClick={() => setEditingMedication(med)}
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
                      <TableHead>Patient ID</TableHead>
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
                          <Badge variant="outline">{prescription.prescription_number}</Badge>
                        </TableCell>
                        <TableCell>{prescription.patient_id}</TableCell>
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
                                        Patient ID
                                      </p>
                                      <p className="font-medium">
                                        {selectedPrescription?.patient_id}
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

                            {prescription.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Mark as Completed"
                                onClick={() =>
                                  dispenseMedicationMutation.mutate(prescription.id)
                                }
                                disabled={dispenseMedicationMutation.isPending}
                              >
                                <CheckSquare className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              title="Print Label"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              title="Contact Patient"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>

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
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Mark for Disposal"
                              onClick={() =>
                                markForDisposalMutation.mutate(med.id)
                              }
                              disabled={markForDisposalMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              title="Return to Supplier"
                              onClick={() =>
                                returnToSupplierMutation.mutate(med.id)
                              }
                              disabled={returnToSupplierMutation.isPending}
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              title="Generate Report"
                              onClick={() =>
                                generateReportMutation.mutate(med.id)
                              }
                              disabled={generateReportMutation.isPending}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
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