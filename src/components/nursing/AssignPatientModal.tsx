import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAssignPatient } from '@/hooks/useNursingAssignments';
import type { AssignPatientFormData, AssignmentPriority } from '@/types/nursing';
import { format } from 'date-fns';

interface AssignPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  onSuccess?: () => void;
}

export const AssignPatientModal = ({
  isOpen,
  onClose,
  patientId,
  onSuccess,
}: AssignPatientModalProps) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState<AssignPatientFormData>({
    patient_id: patientId || '',
    nurse_id: '',
    shift_date: today,
    priority: 'normal',
    is_primary_nurse: true,
  });

  const assignPatientMutation = useAssignPatient();

  interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    patient_number?: string;
  }

  interface Nurse {
    user_id: string;
    full_name: string;
    email: string;
  }

  // Fetch list of patients
  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ['patients-for-assignment'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number')
          .order('first_name');
        if (error) {
          console.error('Error fetching patients:', error);
          throw error;
        }
        return data as Patient[] || [];
      } catch (err) {
        console.error('Patient fetch error:', err);
        return [];
      }
    },
  });

  // Fetch list of nurses (users with nurse or admin role)
  const { data: nurses, isLoading: nursesLoading } = useQuery<Nurse[]>({
    queryKey: ['nurses-for-assignment'],
    queryFn: async () => {
      try {
        // First, get all users with nurse or admin role
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['nurse', 'admin']);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          throw rolesError;
        }

        if (!userRoles || userRoles.length === 0) {
          console.log('No nurses or admins found');
          return [];
        }

        const nurseUserIds = userRoles.map((ur: { user_id: string }) => ur.user_id);

        // Then fetch their profile information
        const { data: nursesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', nurseUserIds)
          .order('full_name');

        if (profilesError) {
          console.error('Error fetching nurse profiles:', profilesError);
          throw profilesError;
        }

        console.log('Nurses fetched:', nursesData);
        return (nursesData as unknown as Nurse[]) || [];
      } catch (err) {
        console.error('Nurse fetch error:', err);
        return [];
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id || !formData.nurse_id) {
      alert('Please select a patient and nurse');
      return;
    }

    assignPatientMutation.mutate(formData, {
      onSuccess: () => {
        setFormData({
          patient_id: patientId || '',
          nurse_id: '',
          shift_date: today,
          priority: 'normal',
          is_primary_nurse: true,
        });
        onClose();
        onSuccess?.();
      },
    });
  };

  const handleClose = () => {
    setFormData({
      patient_id: patientId || '',
      nurse_id: '',
      shift_date: today,
      priority: 'normal',
      is_primary_nurse: true,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Patient to Nurse</DialogTitle>
          <DialogDescription>
            Assign a patient to a nurse for this shift.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">
              Patient <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.patient_id} onValueChange={(value) =>
              setFormData({ ...formData, patient_id: value })
            }>
              <SelectTrigger>
                <SelectValue placeholder={patientsLoading ? 'Loading patients...' : 'Select patient'} />
              </SelectTrigger>
              <SelectContent>
                {patientsLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading patients...</div>
                ) : patients && patients.length > 0 ? (
                  patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No patients found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Nurse Selection */}
          <div className="space-y-2">
            <Label htmlFor="nurse">
              Nurse <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.nurse_id} onValueChange={(value) =>
              setFormData({ ...formData, nurse_id: value })
            }>
              <SelectTrigger>
                <SelectValue placeholder={nursesLoading ? 'Loading nurses...' : 'Select nurse'} />
              </SelectTrigger>
              <SelectContent>
                {nursesLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading nurses...</div>
                ) : nurses && nurses.length > 0 ? (
                  nurses.map((nurse) => (
                    <SelectItem key={nurse.user_id} value={nurse.user_id}>
                      {nurse.full_name} ({nurse.email})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No nurses found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) =>
              setFormData({ ...formData, priority: value as AssignmentPriority })
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Nurse Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="primary_nurse"
              checked={formData.is_primary_nurse}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_primary_nurse: checked as boolean })
              }
            />
            <Label htmlFor="primary_nurse" className="cursor-pointer">
              This is the patient's primary nurse
            </Label>
          </div>

          {/* Shift Date */}
          <div className="space-y-2">
            <Label htmlFor="shift_date">Shift Date</Label>
            <input
              id="shift_date"
              type="date"
              value={formData.shift_date}
              onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={assignPatientMutation.isPending}>
              {assignPatientMutation.isPending ? 'Assigning...' : 'Assign Patient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
