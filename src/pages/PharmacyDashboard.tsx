import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { AlertTriangle, Pill, ShoppingCart, Clock, RefreshCw } from 'lucide-react';
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
        .lt('stock_quantity', 'reorder_level');

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
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, stock_quantity, reorder_level')
        .lt('stock_quantity', 'reorder_level')
        .order('stock_quantity', { ascending: true })
        .limit(10);

      if (error) throw error;
      return (data || []) as LowStockMedication[];
    },
    refetchInterval: 60000,
  });
};

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

const PharmacyDashboard = () => {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = usePharmacyStats();
  const { data: lowStockMeds, isLoading: lowStockLoading } = useLowStockMedications();
  const { data: expiredMeds, isLoading: expiredLoading } = useExpiredMedications();
  const { data: prescriptions, isLoading: prescriptionsLoading, refetch: refetchPrescriptions } = usePrescriptions();
  const [activeTab, setActiveTab] = useState('prescriptions');

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
              <p className="text-muted-foreground">Inventory management coming soon...</p>
            </TabsContent>

            <TabsContent value="dispensing">
              <p className="text-muted-foreground">Dispensing records coming soon...</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PharmacyDashboard;
