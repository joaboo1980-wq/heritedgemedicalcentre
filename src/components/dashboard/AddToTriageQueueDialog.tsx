import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useAddToTriageQueue } from '@/hooks/useTriageQueue';
import { AlertCircle } from 'lucide-react';

interface AddToTriageQueueDialogProps {
  patientId: string;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddToTriageQueueDialog = ({
  patientId,
  patientName,
  isOpen,
  onClose,
  onSuccess,
}: AddToTriageQueueDialogProps) => {
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes] = useState('');
  const addToQueueMutation = useAddToTriageQueue();

  const handleAddToQueue = async () => {
    addToQueueMutation.mutate(
      {
        patient_id: patientId,
        priority,
        chief_complaint: chiefComplaint,
        notes,
      },
      {
        onSuccess: () => {
          setPriority('normal');
          setChiefComplaint('');
          setNotes('');
          onClose();
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Patient to Triage Queue</DialogTitle>
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
                <SelectItem value="critical">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Critical
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label htmlFor="complaint">Chief Complaint</Label>
            <Textarea
              id="complaint"
              placeholder="What is the patient's main complaint?"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="min-h-24"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information for the nurse..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={addToQueueMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleAddToQueue}
            disabled={addToQueueMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {addToQueueMutation.isPending ? 'Adding...' : 'Add to Queue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AddToTriageQueueButtonProps {
  patientId: string;
  patientName: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
}

export const AddToTriageQueueButton = ({
  patientId,
  patientName,
  onSuccess,
  variant = 'default',
  className,
}: AddToTriageQueueButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className={className}
      >
        📋 Add to Triage Queue
      </Button>
      <AddToTriageQueueDialog
        patientId={patientId}
        patientName={patientName}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
};
