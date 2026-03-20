import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CheckInAndAssignDialogProps {
  patientId: string;
  patientName: string;
  appointmentReason?: string;
  appointmentId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CheckInAndAssignDialog = ({
  patientId,
  patientName,
  appointmentReason,
  appointmentId,
  isOpen,
  onClose,
  onSuccess,
}: CheckInAndAssignDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [chiefComplaint, setChiefComplaint] = useState(appointmentReason || '');

  // Mutation to check in patient directly to triage queue (no nurse assignment)
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');

      try {
        // Update appointment status to 'waiting' to indicate they're checked in and in queue
        // Note: We don't create patient_assignment yet - that happens when nurse claims from queue
        if (appointmentId) {
          const { error: statusError } = await supabase
            .from('appointments')
            .update({ status: 'waiting', updated_at: new Date().toISOString() })
            .eq('id', appointmentId);

          if (statusError) throw statusError;
        }

        // Create nursing task with chief complaint for the triage queue
        if (chiefComplaint) {
          const { error: taskError } = await supabase
            .from('nursing_tasks')
            .insert({
              patient_id: patientId,
              task_type: 'triage',
              description: `Chief Complaint: ${chiefComplaint}`,
              priority,
              status: 'pending',
              created_by_id: user.id,
            });

          if (taskError) console.warn('Task creation warning:', taskError);
        }

        return { patientId, patientName };
      } catch (err) {
        console.error('[CheckInAndAssignDialog] Error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['scheduled-today', today] });
      queryClient.invalidateQueries({ queryKey: ['waiting-patients', today] });
      queryClient.invalidateQueries({ queryKey: ['reception-today-appointments', today] });
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['waiting-patient-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['nursing-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['reception-today-appointments'] });
      setPriority('normal');
      setChiefComplaint(appointmentReason || '');
      onClose();
      onSuccess?.();
      toast.success(`${patientName} checked in to triage queue`);
    },
    onError: (error: Error) => {
      console.error('[CheckInAndAssignDialog] Mutation error:', error);
      toast.error(`Failed to check in patient: ${error.message}`);
    },
  });

  const handleCheckIn = () => {
    checkInMutation.mutate();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check In to Triage Queue</DialogTitle>
          <DialogDescription>
            Patient: <span className="font-semibold">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level *</Label>
            <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
              <SelectTrigger id="priority">
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

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label htmlFor="complaint">Chief Complaint / Reason for Visit</Label>
            <Textarea
              id="complaint"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Patient's main complaint or reason for visit"
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-900">
              Patient will be placed in the triage queue. Available nurses can claim them from the queue.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={checkInMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={checkInMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {checkInMutation.isPending ? 'Checking In...' : 'Check In to Queue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
