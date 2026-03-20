import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useReassignPatient } from '@/hooks/useTriageQueue';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface PatientReassignmentDialogProps {
  patientAssignmentId: string;
  patientName: string;
  currentNurseName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const PatientReassignmentDialog: React.FC<PatientReassignmentDialogProps> = ({
  patientAssignmentId,
  patientName,
  currentNurseName,
  trigger,
  onSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [reason, setReason] = useState('');
  const reassignMutation = useReassignPatient();

  // Fetch available nurses
  const { data: nurses, isLoading: nursesLoading } = useQuery({
    queryKey: ['available-nurses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, user:auth.users(id, full_name, email)')
        .eq('role', 'nurse');

      if (error) {
        console.error('[PatientReassignmentDialog] Error fetching nurses:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.user_id,
        full_name: item.user?.full_name || 'Unknown',
        email: item.user?.email,
      }));
    },
  });

  const handleReassign = async () => {
    if (!selectedNurseId) {
      return;
    }

    try {
      await reassignMutation.mutateAsync({
        patientAssignmentId,
        newNurseId: selectedNurseId,
        reason: reason || undefined,
      });

      setIsOpen(false);
      setSelectedNurseId('');
      setReason('');
      onSuccess?.();
    } catch (error) {
      console.error('[PatientReassignmentDialog] Reassignment failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Reassign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Patient</DialogTitle>
          <DialogDescription>
            Transfer {patientName} to a different nurse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="text-blue-600" size={18} />
            <p className="text-sm text-blue-800">
              Currently assigned to: <span className="font-semibold">{currentNurseName}</span>
            </p>
          </div>

          {/* New Nurse Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-nurse">Reassign To</Label>
            <Select value={selectedNurseId} onValueChange={setSelectedNurseId}>
              <SelectTrigger id="new-nurse">
                <SelectValue placeholder="Select a nurse..." />
              </SelectTrigger>
              <SelectContent>
                {nursesLoading ? (
                  <SelectItem disabled value="">
                    Loading nurses...
                  </SelectItem>
                ) : (
                  (nurses || []).map((nurse: any) => (
                    <SelectItem key={nurse.id} value={nurse.id}>
                      {nurse.full_name} {nurse.email ? `(${nurse.email})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Reassignment (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Workload balancing, Specialized care needed, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-24"
            />
          </div>

          {/* Confirmation Warning */}
          {selectedNurseId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{currentNurseName}</span>
                {' '}
                <ArrowRight className="inline mx-1" size={16} />
                <span className="font-semibold">
                  {nurses?.find((n: any) => n.id === selectedNurseId)?.full_name}
                </span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={reassignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!selectedNurseId || reassignMutation.isPending}
              variant="default"
            >
              {reassignMutation.isPending ? 'Reassigning...' : 'Confirm Reassignment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Convenient button-only version for integration into existing components
 */
export const PatientReassignmentButton: React.FC<{
  patientAssignmentId: string;
  patientName: string;
  currentNurseName: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
  className?: string;
  onSuccess?: () => void;
}> = ({
  patientAssignmentId,
  patientName,
  currentNurseName,
  variant = 'outline',
  className,
  onSuccess,
}) => {
  return (
    <PatientReassignmentDialog
      patientAssignmentId={patientAssignmentId}
      patientName={patientName}
      currentNurseName={currentNurseName}
      onSuccess={onSuccess}
      trigger={
        <Button variant={variant} size="sm" className={className}>
          Reassign
        </Button>
      }
    />
  );
};
