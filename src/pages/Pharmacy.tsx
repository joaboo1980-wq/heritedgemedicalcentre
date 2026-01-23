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
import { toast } from 'sonner';
import { Plus, Search, Pill, Package, AlertTriangle, TrendingDown, Edit } from 'lucide-react';
import { format } from 'date-fns';

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

const formOptions = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'other'];

const Pharmacy = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  // Fetch medications
  const { data: medications, isLoading } = useQuery({
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
          <h1 className="text-3xl font-bold text-primary">Pharmacy</h1>
          <p className="text-muted-foreground mt-1">Manage medications and inventory</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Medication</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMedicationMutation.mutate(newMedication); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Medication Code *</Label>
                  <Input value={newMedication.medication_code} onChange={(e) => setNewMedication({ ...newMedication, medication_code: e.target.value })} placeholder="e.g., MED001" required />
                </div>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={newMedication.name} onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Generic Name</Label>
                  <Input value={newMedication.generic_name} onChange={(e) => setNewMedication({ ...newMedication, generic_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Input value={newMedication.category} onChange={(e) => setNewMedication({ ...newMedication, category: e.target.value })} placeholder="e.g., Antibiotics" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Form *</Label>
                  <Select value={newMedication.form} onValueChange={(v) => setNewMedication({ ...newMedication, form: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {formOptions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Strength</Label>
                  <Input value={newMedication.strength} onChange={(e) => setNewMedication({ ...newMedication, strength: e.target.value })} placeholder="e.g., 500mg" />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input value={newMedication.manufacturer} onChange={(e) => setNewMedication({ ...newMedication, manufacturer: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Unit Price (UGX) *</Label>
                  <Input type="number" value={newMedication.unit_price} onChange={(e) => setNewMedication({ ...newMedication, unit_price: parseFloat(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Stock Quantity *</Label>
                  <Input type="number" value={newMedication.stock_quantity} onChange={(e) => setNewMedication({ ...newMedication, stock_quantity: parseInt(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input type="number" value={newMedication.reorder_level} onChange={(e) => setNewMedication({ ...newMedication, reorder_level: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={newMedication.expiry_date} onChange={(e) => setNewMedication({ ...newMedication, expiry_date: e.target.value })} />
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="requires_prescription" checked={newMedication.requires_prescription} onChange={(e) => setNewMedication({ ...newMedication, requires_prescription: e.target.checked })} className="rounded" />
                    <Label htmlFor="requires_prescription">Requires Prescription</Label>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMedicationMutation.isPending}>
                {createMedicationMutation.isPending ? 'Adding...' : 'Add Medication'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><Pill className="h-6 w-6 text-primary" /></div>
            <div><p className="text-2xl font-bold">{totalMeds}</p><p className="text-sm text-muted-foreground">Total Medications</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100"><Package className="h-6 w-6 text-green-600" /></div>
            <div><p className="text-2xl font-bold">{inStock}</p><p className="text-sm text-muted-foreground">In Stock</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100"><TrendingDown className="h-6 w-6 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold">{lowStock}</p><p className="text-sm text-muted-foreground">Low Stock</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
            <div><p className="text-2xl font-bold">{expiringSoon}</p><p className="text-sm text-muted-foreground">Expiring Soon</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Medication Inventory</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search medications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
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
                  const isExpiringSoon = med.expiry_date && new Date(med.expiry_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                  return (
                    <TableRow key={med.id}>
                      <TableCell><Badge variant="outline" className="font-mono">{med.medication_code}</Badge></TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{med.name}</p>
                          {med.strength && <p className="text-xs text-muted-foreground">{med.strength}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{med.category}</TableCell>
                      <TableCell className="capitalize">{med.form}</TableCell>
                      <TableCell>
                        <Badge className={isLowStock ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                          {med.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>UGX {med.unit_price.toLocaleString()}</TableCell>
                      <TableCell>
                        {med.expiry_date ? (
                          <span className={isExpiringSoon ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(med.expiry_date), 'MMM yyyy')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingMedication(med)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            className="w-20 h-8 text-xs"
                            placeholder="Qty"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const value = parseInt((e.target as HTMLInputElement).value);
                                if (!isNaN(value)) {
                                  updateStockMutation.mutate({ id: med.id, quantity: med.stock_quantity + value });
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMedications?.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No medications found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Pharmacy;