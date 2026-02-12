import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateTask } from '@/hooks/useNursingAssignments';
import type { CreateTaskFormData, TaskPriority } from '@/types/nursing';
import { format } from 'date-fns';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  onSuccess?: () => void;
}

export const AssignTaskModal = ({ isOpen, onClose, patientId, onSuccess }: AssignTaskModalProps) => {
  const [formData, setFormData] = useState<CreateTaskFormData>({
    patient_id: patientId || '',
    assigned_nurse_id: '',
    title: '',
    description: '',
    priority: 'normal',
    due_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  const createTaskMutation = useCreateTask();

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
    queryKey: ['patients-for-task-assignment'],
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
        console.log('Patients fetched:', data);
        return (data as unknown as Patient[]) || [];
      } catch (err) {
        console.error('Patient fetch error:', err);
        return [];
      }
    },
  });

  // Fetch list of nurses (users with nurse or admin role)
  const { data: nurses, isLoading: nursesLoading } = useQuery<Nurse[]>({
    queryKey: ['nurses-for-task-assignment'],
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

    if (!formData.patient_id || !formData.assigned_nurse_id || !formData.title) {
      alert('Please fill in all required fields');
      return;
    }

    createTaskMutation.mutate(formData, {
      onSuccess: () => {
        setFormData({
          patient_id: patientId || '',
          assigned_nurse_id: '',
          title: '',
          description: '',
          priority: 'normal',
          due_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        });
        onClose();
        onSuccess?.();
      },
    });
  };

  const handleClose = () => {
    setFormData({
      patient_id: patientId || '',
      assigned_nurse_id: '',
      title: '',
      description: '',
      priority: 'normal',
      due_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Task to Nurse</DialogTitle>
          <DialogDescription>
            Create and assign a new task to a nurse on your team.
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
              Assign to Nurse <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.assigned_nurse_id} onValueChange={(value) =>
              setFormData({ ...formData, assigned_nurse_id: value })
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

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Task <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Record vital signs, Change dressing"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional details..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="h-24"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) =>
              setFormData({ ...formData, priority: value as TaskPriority })
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

          {/* Due Time */}
          <div className="space-y-2">
            <Label htmlFor="due_time">Due Time</Label>
            <Input
              id="due_time"
              type="datetime-local"
              value={formData.due_time || ''}
              onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
