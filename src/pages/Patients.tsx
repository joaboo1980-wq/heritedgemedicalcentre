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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Search, Eye, Edit, Users, MoreHorizontal, Calendar, History, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import PermissionGuard from '@/components/layout/PermissionGuard';

interface Patient {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  blood_type: string | null;
  allergies: string[] | null;
  insurance_provider: string | null;
  created_at: string;
}

interface MedicalExamination {
  id: string;
  patient_id: string;
  examination_date: string;
  chief_complaint: string;
  assessment_diagnosis: string;
  triage_temperature: number | null;
  triage_blood_pressure: string | null;
  triage_pulse_rate: number | null;
  medications_prescribed: string | null;
  plan_treatment: string | null;
  [key: string]: any;
}

const Patients = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMedicalHistoryDialogOpen, setIsMedicalHistoryDialogOpen] = useState(false);
  const [medicalExaminations, setMedicalExaminations] = useState<MedicalExamination[]>([]);

  // Edit patient mutation
  const editPatientMutation = useMutation({
    mutationFn: async (patient: Patient) => {
      const { id, ...updateFields } = patient;
      const { error } = await supabase
        .from('patients')
        .update(updateFields)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsEditDialogOpen(false);
      toast.success('Patient details updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update patient');
    },
  });
  
  // Log user authentication state
  console.log('[AUTH] Current user:', user?.id, 'Email:', user?.email);
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    phone: '',
    email: '',
    address: '',
    blood_type: '' as string,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    insurance_number: '',
  });

  // Fetch patients
  const { data: patients, isLoading, error: queryError } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      console.log('[QUERY] Fetching patients from database...');
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[QUERY ERROR]', error.message, error.details, error.hint);
        throw error;
      }
      console.log('[QUERY] Fetched patients:', data?.length || 0, 'records');
      if (data && data.length === 0) {
        console.warn('[QUERY] No patients found - check RLS policies and user role');
      }
      return data as Patient[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Fetch medical examinations for selected patient
  const { data: patientExaminations } = useQuery({
    queryKey: ['medical-examinations', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient?.id) return [];
      const { data, error } = await supabase
        .from('medical_examinations' as any)
        .select('*')
        .eq('patient_id', selectedPatient.id)
        .order('examination_date', { ascending: false });
      if (error) throw error;
      return data as MedicalExamination[];
    },
    enabled: isMedicalHistoryDialogOpen && !!selectedPatient?.id,
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: typeof newPatient) => {
      console.log('[MUTATION] Patient creation initiated with data:', patientData);
      
      // Use RPC function for atomic patient_number generation
      const { data, error } = await supabase.rpc('insert_patient', {
        p_first_name: patientData.first_name,
        p_last_name: patientData.last_name,
        p_date_of_birth: patientData.date_of_birth,
        p_gender: patientData.gender,
        p_phone: patientData.phone || null,
        p_email: patientData.email || null,
        p_address: patientData.address || null,
        p_blood_type: patientData.blood_type || null,
        p_emergency_contact_name: patientData.emergency_contact_name || null,
        p_emergency_contact_phone: patientData.emergency_contact_phone || null,
        p_insurance_provider: patientData.insurance_provider || null,
        p_insurance_number: patientData.insurance_number || null,
        p_created_by: user?.id,
      });

      console.log('[MUTATION] RPC response received. Error:', error, 'Data:', data);
      
      if (error) throw error;
      
      const patientArray = Array.isArray(data) ? data : (data ? [data] : []);
      const result = patientArray && patientArray.length > 0 ? patientArray[0] : null;
      console.log('[MUTATION] Returning result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[MUTATION SUCCESS] onSuccess called with data:', data);
      console.log('[INVALIDATION] Invalidating patients query cache...');
      
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      console.log('[INVALIDATION] Cache invalidated for patients and dashboard-stats');
      
      setIsAddDialogOpen(false);
      setNewPatient({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'male',
        phone: '',
        email: '',
        address: '',
        blood_type: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        insurance_provider: '',
        insurance_number: '',
      });
      toast.success('Patient registered successfully');
    },
    onError: (error: Error) => {
      console.error('[MUTATION ERROR]', error.message);
      toast.error(error.message);
    },
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: string) => {
      console.log('[DELETE] Starting patient deletion for ID:', patientId);
      
      const { error, data } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId)
        .select();
      
      if (error) {
        console.error('[DELETE ERROR]', error.message, error.details, error.hint, error.code);
        throw new Error(error.message || 'Failed to delete patient');
      }
      
      console.log('[DELETE SUCCESS] Patient deleted:', data);
      return data;
    },
    onSuccess: () => {
      console.log('[DELETE] Cache invalidation starting...');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsDeleteDialogOpen(false);
      setSelectedPatient(null);
      toast.success('Patient deleted successfully');
    },
    onError: (error: Error) => {
      console.error('[DELETE MUTATION ERROR]', error.message);
      toast.error(`Failed to delete patient: ${error.message}`);
    },
  });

  const filteredPatients = patients?.filter(
    (p) =>
      p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patient_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Patients</h1>
          <p className="text-muted-foreground mt-1">
            Manage patient records and information
          </p>
        </div>
        <PermissionGuard module="patients" action="create">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Register Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Patient</DialogTitle>
              <DialogDescription>Enter the patient's personal and medical information to create a new patient record.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPatientMutation.mutate(newPatient);
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={newPatient.first_name}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={newPatient.last_name}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, last_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newPatient.date_of_birth}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, date_of_birth: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={newPatient.gender}
                    onValueChange={(value: 'male' | 'female' | 'other') =>
                      setNewPatient({ ...newPatient, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newPatient.phone}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newPatient.email}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newPatient.address}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, address: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blood_type">Blood Type</Label>
                  <Select
                    value={newPatient.blood_type}
                    onValueChange={(value) =>
                      setNewPatient({ ...newPatient, blood_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance_provider">Insurance Provider</Label>
                  <Input
                    id="insurance_provider"
                    value={newPatient.insurance_provider}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, insurance_provider: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={newPatient.emergency_contact_name}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, emergency_contact_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={newPatient.emergency_contact_phone}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, emergency_contact_phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? 'Registering...' : 'Register Patient'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{patients?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Patients</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Patient Records</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {queryError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-semibold">Error loading patients</p>
              <p className="text-red-500 text-sm">{queryError.message}</p>
              <p className="text-red-400 text-xs mt-2">Check browser console for details. May be a RLS policy or authentication issue.</p>
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age / Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Blood Type</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients?.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {patient.patient_number}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </TableCell>
                    <TableCell>
                      {calculateAge(patient.date_of_birth)} yrs / {patient.gender}
                    </TableCell>
                    <TableCell>{patient.phone || '-'}</TableCell>
                    <TableCell>
                      {patient.blood_type ? (
                        <Badge variant="secondary">{patient.blood_type}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.created_at ? format(new Date(patient.created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPatient(patient);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </DropdownMenuItem>

                          <PermissionGuard module="patients" action="edit">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPatient(patient);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Patient</span>
                            </DropdownMenuItem>
                          </PermissionGuard>

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPatient(patient);
                              // Navigate to appointments with patient selected
                              window.location.href = `/appointments?patientId=${patient.id}`;
                            }}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Schedule Appointment</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPatient(patient);
                              setIsMedicalHistoryDialogOpen(true);
                            }}
                          >
                            <History className="mr-2 h-4 w-4" />
                            <span>View Medical History</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <PermissionGuard module="patients" action="delete">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPatient(patient);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Patient</span>
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPatients?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No patients found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Patient Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.patient_number}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{selectedPatient.date_of_birth ? format(new Date(selectedPatient.date_of_birth), 'MMMM d, yyyy') : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedPatient.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedPatient.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Blood Type</p>
                  <p className="font-medium">{selectedPatient.blood_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Insurance</p>
                  <p className="font-medium">{selectedPatient.insurance_provider || 'N/A'}</p>
                </div>
              </div>

              {selectedPatient.address && (
                <div>
                  <p className="text-muted-foreground text-sm">Address</p>
                  <p className="font-medium">{selectedPatient.address}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Patient Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPatient?.first_name} {selectedPatient?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedPatient?.id) {
                  deletePatientMutation.mutate(selectedPatient.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deletePatientMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>
              Update patient information. Click save when done.
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={selectedPatient.first_name}
                    onChange={(e) =>
                      setSelectedPatient({
                        ...selectedPatient,
                        first_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={selectedPatient.last_name}
                    onChange={(e) =>
                      setSelectedPatient({
                        ...selectedPatient,
                        last_name: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_dob">Date of Birth</Label>
                  <Input
                    id="edit_dob"
                    type="date"
                    value={selectedPatient.date_of_birth}
                    onChange={(e) =>
                      setSelectedPatient({
                        ...selectedPatient,
                        date_of_birth: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_gender">Gender</Label>
                  <Select
                    value={selectedPatient.gender}
                    onValueChange={(value) =>
                      setSelectedPatient({
                        ...selectedPatient,
                        gender: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input
                    id="edit_phone"
                    value={selectedPatient.phone || ''}
                    onChange={(e) =>
                      setSelectedPatient({
                        ...selectedPatient,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={selectedPatient.email || ''}
                    onChange={(e) =>
                      setSelectedPatient({
                        ...selectedPatient,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_address">Address</Label>
                <Input
                  id="edit_address"
                  value={selectedPatient.address || ''}
                  onChange={(e) =>
                    setSelectedPatient({
                      ...selectedPatient,
                      address: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_blood_type">Blood Type</Label>
                  <Select
                    value={selectedPatient.blood_type || ''}
                    onValueChange={(value) =>
                      setSelectedPatient({
                        ...selectedPatient,
                        blood_type: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_insurance">Insurance Provider</Label>
                  <Input
                    id="edit_insurance"
                    value={selectedPatient.insurance_provider || ''}
                    onChange={(e) =>
                      setSelectedPatient({
                        ...selectedPatient,
                        insurance_provider: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedPatient) {
                      editPatientMutation.mutate(selectedPatient);
                    }
                  }}
                  disabled={editPatientMutation.isPending}
                >
                  {editPatientMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Medical History Dialog */}
      <Dialog open={isMedicalHistoryDialogOpen} onOpenChange={setIsMedicalHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Medical History - {selectedPatient?.first_name} {selectedPatient?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {patientExaminations && patientExaminations.length > 0 ? (
              <>
                {patientExaminations.map((exam) => (
                  <div key={exam.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-semibold">Examination Date</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(exam.examination_date), 'MMMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold text-sm">Chief Complaint</p>
                        <p className="text-sm text-muted-foreground">{exam.chief_complaint}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Diagnosis</p>
                        <p className="text-sm text-muted-foreground">{exam.assessment_diagnosis}</p>
                      </div>
                    </div>

                    {/* Vital Signs */}
                    {(exam.triage_temperature || exam.triage_blood_pressure) && (
                      <div className="bg-slate-50 p-3 rounded">
                        <p className="font-semibold text-sm mb-2">Vital Signs</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {exam.triage_temperature && (
                            <p>Temperature: <span className="font-medium">{exam.triage_temperature}°C</span></p>
                          )}
                          {exam.triage_blood_pressure && (
                            <p>Blood Pressure: <span className="font-medium">{exam.triage_blood_pressure}</span></p>
                          )}
                          {exam.triage_pulse_rate && (
                            <p>Pulse Rate: <span className="font-medium">{exam.triage_pulse_rate} bpm</span></p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Treatment Plan and Medications */}
                    {(exam.plan_treatment || exam.medications_prescribed) && (
                      <div className="space-y-2">
                        {exam.plan_treatment && (
                          <div>
                            <p className="font-semibold text-sm">Treatment Plan</p>
                            <p className="text-sm text-muted-foreground">{exam.plan_treatment}</p>
                          </div>
                        )}
                        {exam.medications_prescribed && (
                          <div>
                            <p className="font-semibold text-sm">Medications Prescribed</p>
                            <p className="text-sm text-muted-foreground">{exam.medications_prescribed}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No medical examination records found for this patient
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Patients;