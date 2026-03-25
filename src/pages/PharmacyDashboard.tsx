import { useState, Fragment } from 'react';
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
import { AlertTriangle, Pill, ShoppingCart, Clock, RefreshCw, Search, ChevronDown, ChevronRight, Printer, Trash2, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Prescription {
  id: string;
  prescription_number: string;
  patient_name: string;
  medication: string;
  dosage: string;
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
  dosage: string;
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
      try {
        // Fetch prescriptions that haven't been dispensed yet - EXCLUDE cancelled
        const { data: prescriptionsData, error } = await supabase
          .from('prescriptions')
          .select('*')
          .neq('status', 'cancelled')
          .neq('status', 'dispensed')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (!prescriptionsData || prescriptionsData.length === 0) {
          return [];
        }

        // Extract patient and doctor IDs
        const patientIds = [...new Set(prescriptionsData.map((p: any) => p.patient_id).filter(Boolean))];
        const doctorIds = [...new Set(prescriptionsData.map((p: any) => p.doctor_id).filter(Boolean))];

        let patientMap: Record<string, any> = {};
        let doctorMap: Record<string, any> = {};

        // Fetch patient data
        if (patientIds.length > 0) {
          const { data: patientData } = await supabase
            .from('patients')
            .select('id, first_name, last_name');
          
          if (patientData) {
            patientMap = patientData.reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});
          }
        }

        // Fetch doctor data from profiles table
        if (doctorIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', doctorIds);

          if (profileData) {
            doctorMap = profileData.reduce((acc: any, p: any) => {
              acc[p.user_id] = p;
              return acc;
            }, {});
          }
        }

        // Fetch prescription items
        const presRxIds = prescriptionsData.map((p: any) => p.id);
        let itemsMap: Record<string, any[]> = {};
        if (presRxIds.length > 0) {
          try {
            // First, try without medication join to see if items exist
            const { data: allItems, error: allItemsError } = await supabase
              .from('prescription_items')
              .select('*')
              .in('prescription_id', presRxIds);

            console.log('[PharmacyDashboard] All items fetched:', allItems?.length || 0);
            
            if (!allItemsError && allItems && allItems.length > 0) {
              // Get unique medication IDs
              const medIds = [...new Set(allItems.map((i: any) => i.medication_id).filter(Boolean))];
              console.log('[PharmacyDashboard] Medication IDs:', medIds);

              let medMap: Record<string, any> = {};
              if (medIds.length > 0) {
                const { data: medData } = await supabase
                  .from('medications')
                  .select('id, name')
                  .in('id', medIds);

                if (medData) {
                  medMap = medData.reduce((acc: any, m: any) => {
                    acc[m.id] = m.name;
                    return acc;
                  }, {});
                }
              }

              // Build items map
              itemsMap = allItems.reduce((acc: any, item: any) => {
                if (!acc[item.prescription_id]) acc[item.prescription_id] = [];
                acc[item.prescription_id].push({
                  medication_name: medMap[item.medication_id] || 'Unknown',
                  dosage: item.dosage || '-',
                });
                return acc;
              }, {});
              
              console.log('[PharmacyDashboard] Items map:', Object.keys(itemsMap).length, 'prescriptions with items');
            } else {
              console.warn('[PharmacyDashboard] No items found or error:', allItemsError);
            }
          } catch (err) {
            console.error('[PharmacyDashboard] Exception fetching items:', err);
          }
        }

        // Map data to prescriptions and group by patient to avoid duplicates
        const prescriptionMap = new Map<string, Prescription[]>();
        
        (prescriptionsData || []).forEach((rx: any) => {
          const patient = patientMap[rx.patient_id];
          const doctor = doctorMap[rx.doctor_id];
          const items = itemsMap[rx.id] || [];

          const prescription: Prescription = {
            id: rx.id,
            prescription_number: rx.prescription_number || `RX-${rx.id.substring(0, 8).toUpperCase()}`,
            patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
            medication: items.map((item: any) => item.medication_name).filter(Boolean).join(', ') || 'N/A',
            dosage: items.map((item: any) => item.dosage).join(', ') || 'N/A',
            doctor: doctor?.full_name ? `Dr. ${doctor.full_name}` : 'Unknown',
            date: format(new Date(rx.created_at), 'MMM dd, yyyy'),
            status: rx.status,
          };

          const patientKey = rx.patient_id;
          if (!prescriptionMap.has(patientKey)) {
            prescriptionMap.set(patientKey, []);
          }
          prescriptionMap.get(patientKey)?.push(prescription);
        });
        
        console.log('[PharmacyDashboard] Grouped prescriptions:', prescriptionMap.size, 'patients');
        return Array.from(prescriptionMap.values()).flat() as Prescription[];
      } catch (err) {
        console.error('[PharmacyDashboard] Prescriptions query error:', err);
        return [];
      }
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
        // Fetch dispensed prescriptions
        const { data: dispensedData, error } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('status', 'dispensed')
          .order('updated_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (!dispensedData || dispensedData.length === 0) {
          return [];
        }

        // Extract patient and doctor IDs
        const patientIds = [...new Set(dispensedData.map((p: any) => p.patient_id).filter(Boolean))];
        const doctorIds = [...new Set(dispensedData.map((p: any) => p.doctor_id).filter(Boolean))];

        let patientMap: Record<string, any> = {};
        let doctorMap: Record<string, any> = {};

        // Fetch patient data
        if (patientIds.length > 0) {
          const { data: patientData } = await supabase
            .from('patients')
            .select('id, first_name, last_name');
          
          if (patientData) {
            patientMap = patientData.reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});
          }
        }

        // Fetch doctor data from profiles table
        if (doctorIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', doctorIds);

          if (profileData) {
            doctorMap = profileData.reduce((acc: any, p: any) => {
              acc[p.user_id] = p;
              return acc;
            }, {});
          }
        }

        // Fetch prescription items
        const presRxIds = dispensedData.map((p: any) => p.id);
        let itemsMap: Record<string, any[]> = {};
        if (presRxIds.length > 0) {
          try {
            // First, try without medication join to see if items exist
            const { data: allItems, error: allItemsError } = await supabase
              .from('prescription_items')
              .select('*')
              .in('prescription_id', presRxIds);

            console.log('[PharmacyDashboard] Dispensing items fetched:', allItems?.length || 0);
            
            if (!allItemsError && allItems && allItems.length > 0) {
              // Get unique medication IDs
              const medIds = [...new Set(allItems.map((i: any) => i.medication_id).filter(Boolean))];
              console.log('[PharmacyDashboard] Dispensing medication IDs:', medIds);

              let medMap: Record<string, any> = {};
              if (medIds.length > 0) {
                const { data: medData } = await supabase
                  .from('medications')
                  .select('id, name')
                  .in('id', medIds);

                if (medData) {
                  medMap = medData.reduce((acc: any, m: any) => {
                    acc[m.id] = m.name;
                    return acc;
                  }, {});
                }
              }

              // Build items map
              itemsMap = allItems.reduce((acc: any, item: any) => {
                if (!acc[item.prescription_id]) acc[item.prescription_id] = [];
                acc[item.prescription_id].push({
                  medication_name: medMap[item.medication_id] || 'Unknown',
                  dosage: item.dosage || '-',
                });
                return acc;
              }, {});
              
              console.log('[PharmacyDashboard] Dispensing items map:', Object.keys(itemsMap).length, 'prescriptions with items');
            } else {
              console.warn('[PharmacyDashboard] No dispensing items found or error:', allItemsError);
            }
          } catch (err) {
            console.error('[PharmacyDashboard] Exception fetching dispensing items:', err);
          }
        }

        // Map data to records
        return (dispensedData || []).map((rx: any) => {
          const patient = patientMap[rx.patient_id];
          const doctor = doctorMap[rx.doctor_id];
          const items = itemsMap[rx.id] || [];

          return {
            id: rx.id,
            prescription_number: rx.prescription_number || `RX-${rx.id.substring(0, 8).toUpperCase()}`,
            patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
            medication: items.map((item: any) => item.medication_name).filter(Boolean).join(', ') || 'N/A',
            dosage: items.map((item: any) => item.dosage).join(', ') || 'N/A',
            doctor: doctor?.full_name ? `Dr. ${doctor.full_name}` : 'Unknown',
            dispensed_date: format(new Date(rx.updated_at), 'MMM dd, yyyy hh:mm a'),
            status: rx.status,
          };
        }) as DispensingRecord[];
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
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());

  const togglePatientExpand = (patientName: string) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(patientName)) {
      newExpanded.delete(patientName);
    } else {
      newExpanded.add(patientName);
    }
    setExpandedPatients(newExpanded);
  };

  // Group prescriptions by patient for display
  const groupedPrescriptions = prescriptions ? prescriptions.reduce((acc: Record<string, Prescription[]>, rx) => {
    if (!acc[rx.patient_name]) {
      acc[rx.patient_name] = [];
    }
    acc[rx.patient_name].push(rx);
    return acc;
  }, {}) : {};

  // Check inventory before dispensing
  const checkInventory = async (prescriptionIds: string[]) => {
    try {
      const { data: items, error: itemError } = await supabase
        .from('prescription_items')
        .select('id, prescription_id, medication_id, dosage, frequency, duration')
        .in('prescription_id', prescriptionIds);

      if (itemError) throw itemError;
      if (!items || items.length === 0) {
        toast.error('No medication items found');
        return;
      }

      const medIds = [...new Set((items || []).map(i => i.medication_id))];
      const { data: medications } = await supabase
        .from('medications')
        .select('id, name, stock_quantity, reorder_level')
        .in('id', medIds);

      const medMap: Record<string, any> = {};
      (medications || []).forEach(med => {
        medMap[med.id] = med;
      });

      const itemsWithStock = items.map((item: any) => {
        const med = medMap[item.medication_id];
        return {
          id: item.id,
          prescription_id: item.prescription_id,
          medication_id: item.medication_id,
          medication_name: med?.name || 'Unknown',
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          stock: med?.stock_quantity || 0,
          is_in_stock: (med?.stock_quantity || 0) > 0,
          is_low_stock: (med?.stock_quantity || 0) > 0 && (med?.stock_quantity || 0) <= (med?.reorder_level || 50),
        };
      });

      setSelectedItemsToDispense(new Set(itemsWithStock.filter((i: any) => i.is_in_stock).map((i: any) => i.id)));
      setInventoryCheckData({
        prescriptionIds,
        items: itemsWithStock,
        outOfStock: itemsWithStock.filter((i: any) => !i.is_in_stock),
        lowStock: itemsWithStock.filter((i: any) => i.is_low_stock),
        inStock: itemsWithStock.filter((i: any) => i.is_in_stock),
      });
      setDispenseCheckDialogOpen('inventory');
    } catch (err: any) {
      toast.error('Failed to check inventory: ' + err.message);
    }
  };

  // Dispense selected items with inventory deduction
  const dispenseSelectedItemsMutation = useMutation({
    mutationFn: async (selectedIds: string[]) => {
      if (selectedIds.length === 0) throw new Error('No items selected');

      const { data: itemsToUpdate } = await supabase
        .from('prescription_items')
        .select('id, medication_id, prescription_id')
        .in('id', selectedIds);

      if (!itemsToUpdate || itemsToUpdate.length === 0) throw new Error('Items not found');

      for (const item of itemsToUpdate) {
        const { data: med } = await supabase
          .from('medications')
          .select('stock_quantity')
          .eq('id', item.medication_id)
          .single();

        if (med && med.stock_quantity > 0) {
          await supabase
            .from('medications')
            .update({ stock_quantity: med.stock_quantity - 1 })
            .eq('id', item.medication_id);
        }
      }

      const prescriptionIds = [...new Set(itemsToUpdate.map((i: any) => i.prescription_id))];
      for (const prescId of prescriptionIds) {
        const { data: allItems } = await supabase
          .from('prescription_items')
          .select('id')
          .eq('prescription_id', prescId);

        const selectedForThis = itemsToUpdate.filter((i: any) => i.prescription_id === prescId);
        if (allItems && selectedForThis.length === allItems.length) {
          await supabase
            .from('prescriptions')
            .update({ status: 'dispensed', updated_at: new Date().toISOString() })
            .eq('id', prescId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-medications'] });
      refetchPrescriptions();
      setDispenseCheckDialogOpen(null);
      setInventoryCheckData(null);
      setSelectedItemsToDispense(new Set());
      toast.success('Items dispensed and inventory updated');
    },
    onError: (error: any) => {
      toast.error('Failed to dispense: ' + error.message);
    },
  });

  // Dispense all prescriptions for a patient (group action)
  const dispenseGroupMutation = dispenseSelectedItemsMutation;

  // Cancel prescription mutation
  const cancelPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', prescriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      refetchPrescriptions();
      toast.success('Prescription cancelled');
    },
    onError: (error: any) => {
      toast.error('Failed to cancel prescription: ' + error.message);
    },
  });

  // Delete prescription mutation
  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      refetchPrescriptions();
      toast.success('Prescription deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete prescription: ' + error.message);
    },
  });

  // State for dialogs and inventory checks
  const [printDialogOpen, setPrintDialogOpen] = useState<string | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState<string | null>(null);
  const [dispenseCheckDialogOpen, setDispenseCheckDialogOpen] = useState<string | null>(null);
  const [inventoryCheckData, setInventoryCheckData] = useState<any>(null);
  const [selectedItemsToDispense, setSelectedItemsToDispense] = useState<Set<string>>(new Set());

  // Print labels for prescriptions with detailed format
  const handlePrintLabels = (prescription: Prescription) => {
    const printContent = `
      <html>
        <head>
          <title>Prescription Label</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .label { border: 2px solid #333; padding: 20px; max-width: 600px; margin: 20px auto; background: white; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
            .header p { margin: 5px 0; }
            .title { font-size: 18px; font-weight: bold; }
            .subtitle { font-size: 11px; color: #666; }
            .rx-number { text-align: center; margin: 15px 0; }
            .rx-number-label { font-size: 12px; font-weight: bold; }
            .rx-number-value { font-size: 28px; font-weight: bold; letter-spacing: 2px; }
            .rx-date { text-align: center; font-size: 11px; color: #666; }
            .section { margin: 15px 0; padding: 10px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; }
            .section-label { font-weight: bold; font-size: 11px; color: #333; }
            .section-value { font-size: 12px; margin-top: 5px; }
            .medication-item { border: 1px solid #ccc; padding: 10px; margin: 10px 0; background: #fafafa; }
            .medication-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; }
            .footer { border-top: 2px solid #333; margin-top: 20px; padding-top: 10px; text-align: center; font-size: 10px; color: #666; }
            .notes-box { background: #fffacd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <p class="title">Heritage Medical Centre</p>
              <p class="subtitle">PHARMACY PRESCRIPTION LABEL</p>
            </div>
            
            <div class="rx-number">
              <div class="rx-number-label">PRESCRIPTION #</div>
              <div class="rx-number-value">${prescription.prescription_number}</div>
              <div class="rx-date">Date: ${prescription.date}</div>
            </div>
            
            <div class="section">
              <div class="medication-grid">
                <div>
                  <div class="section-label">MEDICATION(S)</div>
                  <div class="section-value">${prescription.medication}</div>
                </div>
                <div>
                  <div class="section-label">DOSAGE</div>
                  <div class="section-value">${prescription.dosage}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <div class="medication-grid">
                <div>
                  <div class="section-label">PATIENT NAME</div>
                  <div class="section-value">${prescription.patient_name}</div>
                </div>
                <div>
                  <div class="section-label">PRESCRIBED BY</div>
                  <div class="section-value">Dr. ${prescription.doctor}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-label">STATUS</div>
              <div class="section-value" style="color: #0066cc; font-weight: bold;">${prescription.status.toUpperCase()}</div>
            </div>
            
            <div class="footer">
              <p>Valid for 1 year from date of issue</p>
              <p>For Pharmacy Use Only | Dispense as Directed</p>
              <p>Printed: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

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
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Prescription #</TableHead>
                        <TableHead>Medication</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedPrescriptions).map(([patientName, patientRxs]) => {
                        const isExpanded = expandedPatients.has(patientName);
                        const detailedRxs = patientRxs as Prescription[];

                        return (
                          <Fragment key={patientName}>
                            <TableRow className="bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900">
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => togglePatientExpand(patientName)}
                                  className="p-0 h-6 w-6"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-bold text-blue-700 dark:text-blue-300">
                                {patientName}
                              </TableCell>
                              <TableCell colSpan={6} className="text-sm text-muted-foreground">
                                <Badge variant="secondary" className="mr-3">{detailedRxs.length} prescription(s)</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 text-white text-xs"
                                    onClick={() => checkInventory(detailedRxs.map(rx => rx.id))}
                                    disabled={dispenseSelectedItemsMutation.isPending}
                                  >
                                    Dispense All
                                  </Button>

                                  {/* Inventory Check Dialog */}
                                  <Dialog open={dispenseCheckDialogOpen === 'inventory'} onOpenChange={(open) => {
                                    if (!open) {
                                      setDispenseCheckDialogOpen(null);
                                      setInventoryCheckData(null);
                                      setSelectedItemsToDispense(new Set());
                                    }
                                  }}>
                                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>Inventory Check & Selective Dispensing</DialogTitle>
                                      </DialogHeader>
                                      {inventoryCheckData && (
                                        <div className="space-y-6">
                                          <div className="grid grid-cols-3 gap-4">
                                            <div className="p-4 bg-green-50 border border-green-200 rounded">
                                              <p className="text-sm font-semibold text-green-700">In Stock</p>
                                              <p className="text-2xl font-bold text-green-600">{inventoryCheckData.inStock.length}</p>
                                            </div>
                                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                                              <p className="text-sm font-semibold text-yellow-700">Low Stock</p>
                                              <p className="text-2xl font-bold text-yellow-600">{inventoryCheckData.lowStock.length}</p>
                                            </div>
                                            <div className="p-4 bg-red-50 border border-red-200 rounded">
                                              <p className="text-sm font-semibold text-red-700">Out of Stock</p>
                                              <p className="text-2xl font-bold text-red-600">{inventoryCheckData.outOfStock.length}</p>
                                            </div>
                                          </div>

                                          <div className="space-y-3">
                                            <p className="font-semibold text-gray-700">Select items to dispense:</p>
                                            {inventoryCheckData.items.map((item: any) => (
                                              <div key={item.id} className={`p-4 border rounded flex items-start gap-3 ${
                                                item.is_in_stock ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'
                                              }`}>
                                                <input
                                                  type="checkbox"
                                                  checked={selectedItemsToDispense.has(item.id)}
                                                  onChange={(e) => {
                                                    const newSelected = new Set(selectedItemsToDispense);
                                                    if (e.target.checked) {
                                                      newSelected.add(item.id);
                                                    } else {
                                                      newSelected.delete(item.id);
                                                    }
                                                    setSelectedItemsToDispense(newSelected);
                                                  }}
                                                  disabled={!item.is_in_stock}
                                                  className="mt-1"
                                                />
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-800">{item.medication_name}</p>
                                                    {item.is_low_stock && (
                                                      <Badge className="bg-yellow-200 text-yellow-800 text-xs">Low Stock</Badge>
                                                    )}
                                                    {!item.is_in_stock && (
                                                      <Badge className="bg-red-200 text-red-800 text-xs">Out of Stock</Badge>
                                                    )}
                                                  </div>
                                                  <p className="text-sm text-gray-600 mt-1">
                                                    Dosage: {item.dosage} | Frequency: {item.frequency} | Duration: {item.duration}
                                                  </p>
                                                  <p className="text-sm font-semibold text-gray-700 mt-1">
                                                    Stock: <span className={item.is_in_stock ? 'text-green-600' : 'text-red-600'}>{item.stock} units</span>
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>

                                          {inventoryCheckData.outOfStock.length > 0 && (
                                            <div className="p-4 bg-red-50 border border-red-200 rounded">
                                              <p className="text-sm font-semibold text-red-700 mb-2">
                                                ⚠️ {inventoryCheckData.outOfStock.length} medication(s) out of stock
                                              </p>
                                              <p className="text-sm text-red-600">
                                                These cannot be dispensed. Contact supplier or inform patient.
                                              </p>
                                            </div>
                                          )}

                                          <div className="flex gap-3">
                                            <Button
                                              onClick={() => {
                                                if (selectedItemsToDispense.size === 0) {
                                                  toast.error('Select at least one item');
                                                  return;
                                                }
                                                dispenseSelectedItemsMutation.mutate(Array.from(selectedItemsToDispense));
                                              }}
                                              className="flex-1 bg-green-500 hover:bg-green-600"
                                              disabled={selectedItemsToDispense.size === 0 || dispenseSelectedItemsMutation.isPending}
                                            >
                                              Dispense Selected ({selectedItemsToDispense.size})
                                            </Button>
                                            <Button
                                              variant="outline"
                                              onClick={() => {
                                                setDispenseCheckDialogOpen(null);
                                                setInventoryCheckData(null);
                                                setSelectedItemsToDispense(new Set());
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                  <Dialog open={contactDialogOpen === patientName} onOpenChange={(open) => setContactDialogOpen(open ? patientName : null)}>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        title="Contact Patient"
                                      >
                                        <Phone className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Contact Patient - {patientName}</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div className="grid gap-4">
                                          <div>
                                            <p className="text-sm font-semibold text-gray-600">Patient Name</p>
                                            <p className="text-lg">{patientName}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-600">Prescriptions</p>
                                            <p className="text-lg">{detailedRxs.length} prescription(s)</p>
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
                                    </DialogContent>
                                  </Dialog>

                                  <Dialog open={printDialogOpen === patientName} onOpenChange={(open) => setPrintDialogOpen(open ? patientName : null)}>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        title="Print Labels"
                                      >
                                        <Printer className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>Print Prescription Labels</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        {detailedRxs.map((rx) => (
                                          <div key={rx.id} className="p-6 bg-white border-2 border-gray-400 rounded">
                                            <div className="border-b-2 border-gray-400 pb-3 mb-4">
                                              <div className="text-center">
                                                <p className="text-lg font-bold">Heritage Medical Centre</p>
                                                <p className="text-xs text-gray-600">PHARMACY PRESCRIPTION LABEL</p>
                                              </div>
                                            </div>
                                            <div className="text-center mb-4">
                                              <p className="text-xs text-gray-700 font-semibold">PRESCRIPTION #</p>
                                              <p className="text-2xl font-bold tracking-wider">{rx.prescription_number}</p>
                                              <p className="text-xs text-gray-600 mt-1">Date: {rx.date}</p>
                                            </div>
                                            <div className="bg-gray-100 p-3 rounded mb-4 border border-gray-300 grid grid-cols-2 gap-4 text-xs">
                                              <div>
                                                <p className="font-semibold text-gray-700">PATIENT NAME</p>
                                                <p className="font-bold text-sm">{rx.patient_name}</p>
                                              </div>
                                              <div>
                                                <p className="font-semibold text-gray-700">MEDICATION(S)</p>
                                                <p className="font-bold text-sm">{rx.medication}</p>
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-4 text-xs border-b pb-3">
                                              <div>
                                                <p className="font-semibold text-gray-700">DOSAGE</p>
                                                <p className="font-bold text-sm">{rx.dosage}</p>
                                              </div>
                                              <div>
                                                <p className="font-semibold text-gray-700">PRESCRIBED BY</p>
                                                <p className="font-bold text-sm">Dr. {rx.doctor}</p>
                                              </div>
                                            </div>
                                            <div className="border-t-2 border-gray-400 pt-3 mt-4 text-center text-xs text-gray-600">
                                              <p>Valid for 1 year from date of issue</p>
                                              <p className="text-xs mt-1">For Pharmacy Use Only | Dispense as Directed</p>
                                              <p className="text-xs mt-2 text-gray-500">Printed: {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <Button onClick={() => window.print()} className="w-full mt-4">
                                        Print All Labels
                                      </Button>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                                    onClick={() => {
                                      if (confirm('Delete all prescriptions for this patient? This cannot be undone.')) {
                                        detailedRxs.forEach(rx => deletePrescriptionMutation.mutate(rx.id));
                                      }
                                    }}
                                    title="Delete All"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {isExpanded &&
                              detailedRxs.map((rx) => (
                                <TableRow key={rx.id} className="bg-slate-50 dark:bg-slate-900/50">
                                  <TableCell></TableCell>
                                  <TableCell className="text-sm text-muted-foreground">-</TableCell>
                                  <TableCell className="font-mono text-sm">
                                    <Badge variant="outline">{rx.prescription_number}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">{rx.medication}</TableCell>
                                  <TableCell className="text-sm">{rx.dosage}</TableCell>
                                  <TableCell className="text-sm">{rx.doctor}</TableCell>
                                  <TableCell className="text-sm">{rx.date}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(rx.status)}>
                                      {rx.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Dialog open={printDialogOpen === rx.id} onOpenChange={(open) => setPrintDialogOpen(open ? rx.id : null)}>
                                        <DialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-blue-600 hover:text-blue-700"
                                            title="Print Label"
                                          >
                                            <Printer className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                          <DialogHeader>
                                            <DialogTitle>Print Prescription Label</DialogTitle>
                                          </DialogHeader>
                                          <div className="p-6 bg-white border-2 border-gray-400 rounded">
                                            {/* Header */}
                                            <div className="border-b-2 border-gray-400 pb-3 mb-4">
                                              <div className="text-center">
                                                <p className="text-lg font-bold">Heritage Medical Centre</p>
                                                <p className="text-xs text-gray-600">PHARMACY PRESCRIPTION LABEL</p>
                                              </div>
                                            </div>

                                            {/* Prescription Number */}
                                            <div className="text-center mb-4">
                                              <p className="text-xs text-gray-700 font-semibold">PRESCRIPTION #</p>
                                              <p className="text-2xl font-bold tracking-wider">{rx.prescription_number}</p>
                                              <p className="text-xs text-gray-600 mt-1">Date: {rx.date}</p>
                                            </div>

                                            {/* Patient & Medication Info */}
                                            <div className="bg-gray-100 p-3 rounded mb-4 border border-gray-300 grid grid-cols-2 gap-4 text-xs">
                                              <div>
                                                <p className="font-semibold text-gray-700">PATIENT NAME</p>
                                                <p className="font-bold text-sm">{rx.patient_name}</p>
                                              </div>
                                              <div>
                                                <p className="font-semibold text-gray-700">MEDICATION(S)</p>
                                                <p className="font-bold text-sm">{rx.medication}</p>
                                              </div>
                                            </div>

                                            {/* Dosage & Doctor */}
                                            <div className="grid grid-cols-2 gap-4 mb-4 text-xs border-b pb-3">
                                              <div>
                                                <p className="font-semibold text-gray-700">DOSAGE</p>
                                                <p className="font-bold text-sm">{rx.dosage}</p>
                                              </div>
                                              <div>
                                                <p className="font-semibold text-gray-700">PRESCRIBED BY</p>
                                                <p className="font-bold text-sm">Dr. {rx.doctor}</p>
                                              </div>
                                            </div>

                                            {/* Status */}
                                            <div className="mb-4 text-xs">
                                              <p className="font-semibold text-gray-700">STATUS</p>
                                              <p className="font-bold text-blue-600 uppercase">{rx.status}</p>
                                            </div>

                                            {/* Footer */}
                                            <div className="border-t-2 border-gray-400 pt-3 mt-4 text-center text-xs text-gray-600">
                                              <p>Valid for 1 year from date of issue</p>
                                              <p className="text-xs mt-1">For Pharmacy Use Only | Dispense as Directed</p>
                                              <p className="text-xs mt-2 text-gray-500">Printed: {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
                                            </div>
                                          </div>
                                          <Button onClick={() => handlePrintLabels(rx)} className="w-full mt-4">
                                            Print Label
                                          </Button>
                                        </DialogContent>
                                      </Dialog>

                                      <Dialog open={contactDialogOpen === rx.id} onOpenChange={(open) => setContactDialogOpen(open ? rx.id : null)}>
                                        <DialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-green-600 hover:text-green-700"
                                            title="Contact Patient"
                                          >
                                            <Phone className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Contact Patient</DialogTitle>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div className="grid gap-4">
                                              <div>
                                                <p className="text-sm font-semibold text-gray-600">Patient Name</p>
                                                <p className="text-lg">{rx.patient_name}</p>
                                              </div>
                                              <div>
                                                <p className="text-sm font-semibold text-gray-600">Prescription #</p>
                                                <p className="text-lg">{rx.prescription_number}</p>
                                              </div>
                                              <div>
                                                <p className="text-sm font-semibold text-gray-600">Medication(s)</p>
                                                <p className="text-lg">{rx.medication}</p>
                                              </div>
                                              <div>
                                                <p className="text-sm font-semibold text-gray-600">Status</p>
                                                <Badge className="mt-1 capitalize">{rx.status}</Badge>
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
                                        </DialogContent>
                                      </Dialog>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-yellow-600 hover:text-yellow-700"
                                        onClick={() => cancelPrescriptionMutation.mutate(rx.id)}
                                        disabled={cancelPrescriptionMutation.isPending || rx.status === 'cancelled'}
                                        title="Cancel Prescription"
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">No pending prescriptions</p>
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
                          <TableHead>Dosage</TableHead>
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
                              <TableCell className="word-wrap min-w-0">{record.medication}</TableCell>
                              <TableCell>{record.dosage}</TableCell>
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
