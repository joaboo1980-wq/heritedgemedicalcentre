import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Pill, ShoppingCart, Clock, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Prescription {
  id: string;
  prescription_number: string;
  patient_name: string;
  medication: string;
  quantity: string;
  doctor: string;
  date: string;
  status: 'pending' | 'dispensed' | 'ready';
}

interface LowStockMedication {
  id: string;
  name: string;
  stock_quantity: number;
  reorder_level: number;
}

interface ExpiredMedication {
  id: string;
  name: string;
  expiry_date: string;
  stock_quantity: number;
}

interface InventoryMedication {
  id: string;
  medication_code: string;
  name: string;
  generic_name: string | null;
  category: string;
  form: string;
  strength: string | null;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  expiry_date: string | null;
  requires_prescription: boolean;
}

interface DispensingRecord {
  id: string;
  prescription_number: string;
  patient_name: string;
  medication: string;
  quantity: string;
  doctor: string;
  dispensed_date: string;
  status: string;
}

const usePharmacyStats = () => {
  return useQuery({
    queryKey: ['pharmacy-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Pending prescriptions
      const { count: pendingPrescriptions } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'ready']);

      // Dispensed today
      const { count: dispensedToday } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'dispensed')
        .gte('updated_at', `${today}T00:00:00`)
        .lte('updated_at', `${today}T23:59:59`);

      // Low stock medications
      const { count: lowStockCount } = await supabase
        .from('medications')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 50); // Use a fixed threshold instead of comparing to column

      // Total patients served (count of unique patients with dispensed prescriptions today)
      const { data: patientsData } = await supabase
        .from('prescriptions')
        .select('patient_id')
        .eq('status', 'dispensed')
        .gte('updated_at', `${today}T00:00:00`)
        .lte('updated_at', `${today}T23:59:59`);

      const uniquePatients = new Set(patientsData?.map(p => p.patient_id) || []).size;

      console.log('[Pharmacy Stats] Pending:', pendingPrescriptions, 'Dispensed today:', dispensedToday, 'Low stock:', lowStockCount, 'Patients:', uniquePatients);

      return {
        pendingPrescriptions: pendingPrescriptions || 0,
        dispensedToday: dispensedToday || 0,
        lowStockMedications: lowStockCount || 0,
        patientsServed: uniquePatients || 0,
      };
    },
    refetchInterval: 60000,
  });
};

const useLowStockMedications = () => {
  return useQuery({
    queryKey: ['low-stock-medications'],
    queryFn: async () => {
      try {
        // Fetch medications with stock quantities
        const { data, error } = await supabase
          .from('medications')
          .select('id, name, stock_quantity, reorder_level')
          .order('stock_quantity', { ascending: true })
          .limit(10);

        if (error) throw error;

        // Filter client-side: medications where stock < reorder level
        const lowStock = (data || []).filter(m => m.stock_quantity < m.reorder_level);
        
        return lowStock as LowStockMedication[];
      } catch (error) {
        console.error('[Pharmacy] Low stock medications error:', error);
        return [];
      }
    },
    refetchInterval: 60000,
  });
};

// OLD BROKEN CODE REMOVED - was using .lt('stock_quantity', 'reorder_level') which doesn't work

const useExpiredMedications = () => {
  return useQuery({
    queryKey: ['expired-medications'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, expiry_date, stock_quantity')
        .lte('expiry_date', today)
        .gt('stock_quantity', 0)
        .order('expiry_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return (data || []) as ExpiredMedication[];
    },
    refetchInterval: 60000,
  });
};

const usePrescriptions = () => {
  return useQuery({
    queryKey: ['pharmacy-prescriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_number,
          status,
          created_at,
          patients (first_name, last_name),
          doctors (first_name, last_name),
          prescription_items (medication_id, quantity, medications (name))
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((rx: any) => ({
        id: rx.id,
        prescription_number: rx.prescription_number,
        patient_name: rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : 'Unknown',
        medication: rx.prescription_items?.map((item: any) => item.medications?.name).filter(Boolean).join(', ') || 'N/A',
        quantity: rx.prescription_items?.map((item: any) => item.quantity).join(', ') || 'N/A',
        doctor: rx.doctors ? `Dr. ${rx.doctors.first_name} ${rx.doctors.last_name}` : 'Unknown',
        date: format(new Date(rx.created_at), 'MMM dd, yyyy'),
        status: rx.status,
      })) as Prescription[];
    },
    refetchInterval: 60000,
  });
};

const useInventoryMedications = () => {
  return useQuery({
    queryKey: ['inventory-medications'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        return (data || []) as InventoryMedication[];
      } catch (err) {
        console.error('[Pharmacy] Inventory medications error:', err);
        return [];
      }
    },
    refetchInterval: 60000,
  });
};

const useDispensingRecords = () => {
  return useQuery({
    queryKey: ['dispensing-records'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            id,
            prescription_number,
            status,
            updated_at,
            patients (first_name, last_name),
            doctors (first_name, last_name),
            prescription_items (medication_id, quantity, medications (name))
          `)
          .eq('status', 'dispensed')
          .order('updated_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        return (data || []).map((rx: any) => ({
          id: rx.id,
          prescription_number: rx.prescription_number,
          patient_name: rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : 'Unknown',
          medication: rx.prescription_items?.map((item: any) => item.medications?.name).filter(Boolean).join(', ') || 'N/A',
          quantity: rx.prescription_items?.map((item: any) => item.quantity).join(', ') || 'N/A',
          doctor: rx.doctors ? `Dr. ${rx.doctors.first_name} ${rx.doctors.last_name}` : 'Unknown',
          dispensed_date: format(new Date(rx.updated_at), 'MMM dd, yyyy hh:mm a'),
          status: rx.status,
        })) as DispensingRecord[];
      } catch (err) {
        console.error('[Pharmacy] Dispensing records error:', err);
        return [];
      }
    },
    refetchInterval: 60000,
  });
};

const PharmacyDashboard = () => {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = usePharmacyStats();
  const { data: lowStockMeds, isLoading: lowStockLoading } = useLowStockMedications();
  const { data: expiredMeds, isLoading: expiredLoading } = useExpiredMedications();
  const { data: prescriptions, isLoading: prescriptionsLoading, refetch: refetchPrescriptions } = usePrescriptions();
  const { data: inventoryMeds, isLoading: inventoryLoading } = useInventoryMedications();
  const { data: dispensingRecords, isLoading: dispensingLoading } = useDispensingRecords();
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [inventorySearch, setInventorySearch] = useState('');
  const [dispensingSearch, setDispensingSearch] = useState('');

  // Dispense mutation
  const dispenseMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'dispensed', updated_at: new Date().toISOString() })
        .eq('id', prescriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      refetchPrescriptions();
      toast.success('Prescription dispensed successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to dispense prescription: ' + error.message);
    },
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async (params: { medicationId: string; newStock: number }) => {
      const { error } = await supabase
        .from('medications')
        .update({ stock_quantity: params.newStock })
        .eq('id', params.medicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-medications'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      toast.success('Stock updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update stock: ' + error.message);
    },
  });

  // Remove expired mutation
  const removeExpiredMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      const { error } = await supabase
        .from('medications')
        .update({ stock_quantity: 0 })
        .eq('id', medicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired-medications'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      toast.success('Expired medication removed from stock');
    },
    onError: (error: any) => {
      toast.error('Failed to remove medication: ' + error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
      case 'ready':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'dispensed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Pharmacy Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage prescriptions and inventory.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">Pending Prescriptions</p>
                <p className="text-4xl font-bold mt-2">{statsLoading ? '...' : stats?.pendingPrescriptions || 0}</p>
                <p className="text-xs text-white/70 mt-2">Awaiting dispensing</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
                <Pill className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-orange-600 via-orange-500 to-red-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">Low Stock Items</p>
                <p className="text-4xl font-bold mt-2">{statsLoading ? '...' : stats?.lowStockMedications || 0}</p>
                <p className="text-xs text-white/70 mt-2">Needs reordering</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">Dispensed Today</p>
                <p className="text-4xl font-bold mt-2">{statsLoading ? '...' : stats?.dispensedToday || 0}</p>
                <p className="text-xs text-white/70 mt-2">Medications dispensed</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">Patients Served</p>
                <p className="text-4xl font-bold mt-2">{statsLoading ? '...' : stats?.patientsServed || 0}</p>
                <p className="text-xs text-white/70 mt-2">Total patients</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card className="overflow-hidden shadow-lg border-l-4 border-orange-500">
          <CardHeader className="bg-orange-50 dark:bg-orange-950 pb-4">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {lowStockLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : lowStockMeds && lowStockMeds.length > 0 ? (
              <div className="space-y-3">
                {lowStockMeds.map((med) => (
                  <div key={med.id} className="flex items-center justify-between p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div>
                      <p className="font-medium text-foreground">{med.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {med.stock_quantity} | Reorder Level: {med.reorder_level}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={() => updateStockMutation.mutate({ medicationId: med.id, newStock: med.reorder_level * 2 })}
                      disabled={updateStockMutation.isPending}
                    >
                      Update Stock
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">No low stock items</p>
            )}
          </CardContent>
        </Card>

        {/* Expired Medications Alert */}
        <Card className="overflow-hidden shadow-lg border-l-4 border-red-500">
          <CardHeader className="bg-red-50 dark:bg-red-950 pb-4">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Expired Medications Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {expiredLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : expiredMeds && expiredMeds.length > 0 ? (
              <div className="space-y-3">
                {expiredMeds.map((med) => (
                  <div key={med.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <div>
                      <p className="font-medium text-foreground">{med.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Expired: {format(new Date(med.expiry_date), 'MMM dd, yyyy')} | Stock: {med.stock_quantity} units
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600"
                      onClick={() => removeExpiredMutation.mutate(med.id)}
                      disabled={removeExpiredMutation.isPending}
                    >
                      Remove from Stock
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">No expired medications</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prescription Management */}
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white pb-4">
          <CardTitle>Prescription Management</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="dispensing">Dispensing Records</TabsTrigger>
            </TabsList>

            <TabsContent value="prescriptions" className="space-y-4">
              {prescriptionsLoading ? (
                <p className="text-muted-foreground">Loading prescriptions...</p>
              ) : prescriptions && prescriptions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Medication</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions.map((rx) => (
                        <TableRow key={rx.id}>
                          <TableCell className="font-medium">{rx.patient_name}</TableCell>
                          <TableCell>{rx.medication}</TableCell>
                          <TableCell>{rx.quantity}</TableCell>
                          <TableCell>{rx.doctor}</TableCell>
                          <TableCell>{rx.date}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(rx.status)}>
                              {rx.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {rx.status !== 'dispensed' && (
                                <Button
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600"
                                  onClick={() => dispenseMutation.mutate(rx.id)}
                                  disabled={dispenseMutation.isPending}
                                >
                                  Dispense
                                </Button>
                              )}
                              <Button size="sm" variant="outline">
                                Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">No prescriptions</p>
              )}
            </TabsContent>

            <TabsContent value="inventory">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search medications..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value.toLowerCase())}
                      className="pl-8"
                    />
                  </div>
                </div>

                {inventoryLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : inventoryMeds && inventoryMeds.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Medication Name</TableHead>
                          <TableHead>Generic Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Form/Strength</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Reorder Level</TableHead>
                          <TableHead>Unit Price (UGX)</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryMeds
                          .filter(
                            (med) =>
                              med.name.toLowerCase().includes(inventorySearch) ||
                              med.generic_name?.toLowerCase().includes(inventorySearch) ||
                              med.medication_code.toLowerCase().includes(inventorySearch)
                          )
                          .map((med) => {
                            const isLowStock = med.stock_quantity < med.reorder_level;
                            const isExpired = med.expiry_date && new Date(med.expiry_date) < new Date();
                            const isExpiringSoon = med.expiry_date && 
                              new Date(med.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) &&
                              new Date(med.expiry_date) > new Date();

                            return (
                              <TableRow key={med.id}>
                                <TableCell className="font-mono text-sm">{med.medication_code}</TableCell>
                                <TableCell className="font-medium">{med.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{med.generic_name || '-'}</TableCell>
                                <TableCell>{med.category}</TableCell>
                                <TableCell>{med.form}{med.strength ? ` / ${med.strength}` : ''}</TableCell>
                                <TableCell className="font-semibold">{med.stock_quantity} units</TableCell>
                                <TableCell className="text-orange-600">{med.reorder_level} units</TableCell>
                                <TableCell>{(med.unit_price || 0).toLocaleString()}</TableCell>
                                <TableCell>
                                  {med.expiry_date ? format(new Date(med.expiry_date), 'MMM dd, yyyy') : '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2 flex-wrap">
                                    {isExpired && (
                                      <Badge className="bg-red-500 text-white">Expired</Badge>
                                    )}
                                    {isExpiringSoon && !isExpired && (
                                      <Badge className="bg-yellow-500 text-white">Expiring Soon</Badge>
                                    )}
                                    {isLowStock && (
                                      <Badge className="bg-orange-500 text-white">Low Stock</Badge>
                                    )}
                                    {!isExpired && !isExpiringSoon && !isLowStock && (
                                      <Badge className="bg-green-500 text-white">In Stock</Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No medications found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="dispensing">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by patient, medication, or prescription #..."
                      value={dispensingSearch}
                      onChange={(e) => setDispensingSearch(e.target.value.toLowerCase())}
                      className="pl-8"
                    />
                  </div>
                </div>

                {dispensingLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : dispensingRecords && dispensingRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Prescription #</TableHead>
                          <TableHead>Patient Name</TableHead>
                          <TableHead>Medication(s)</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Prescribed By</TableHead>
                          <TableHead>Dispensed Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dispensingRecords
                          .filter(
                            (record) =>
                              record.patient_name.toLowerCase().includes(dispensingSearch) ||
                              record.medication.toLowerCase().includes(dispensingSearch) ||
                              record.prescription_number.toLowerCase().includes(dispensingSearch)
                          )
                          .map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-sm font-semibold">
                                <Badge variant="outline">{record.prescription_number}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{record.patient_name}</TableCell>
                              <TableCell className="max-w-xs">{record.medication}</TableCell>
                              <TableCell>{record.quantity}</TableCell>
                              <TableCell>{record.doctor}</TableCell>
                              <TableCell className="text-sm">{record.dispensed_date}</TableCell>
                              <TableCell>
                                <Badge className="bg-green-500 text-white">
                                  {record.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No dispensing records found</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PharmacyDashboard;
