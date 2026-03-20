import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Play, X, RefreshCw } from 'lucide-react';
import {
  useTriageQueue,
  useClaimTriagePatient,
  useCompleteTriagePatient,
  useCancelTriagePatient,
  type TriageQueueEntry,
} from '@/hooks/useTriageQueue';

export const TriageQueuePanel = () => {
  const { data: triageQueue = [], refetch, isLoading } = useTriageQueue();
  const claimPatientMutation = useClaimTriagePatient();
  const completeTriageMutation = useCompleteTriagePatient();
  const cancelTriageMutation = useCancelTriagePatient();

  const [selectedPatient, setSelectedPatient] = useState<TriageQueueEntry | null>(null);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [triageNotes, setTriageNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const waitingPatients = triageQueue.filter((p) => p.status === 'waiting');
  const inProgressPatients = triageQueue.filter((p) => p.status === 'in_progress');

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge className="bg-yellow-100 text-yellow-800">Waiting</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleClaimPatient = async (entry: TriageQueueEntry) => {
    claimPatientMutation.mutate(entry.id, {
      onSuccess: () => {
        setSelectedPatient(entry);
        setShowTriageModal(true);
        toast.success(`Claimed ${entry.patient?.first_name} for triage`);
      },
    });
  };

  const handleCompleteTriageClick = () => {
    setShowTriageModal(false);
    setShowCompleteModal(true);
  };

  const handleCompleteTriage = async () => {
    if (!selectedPatient) return;

    completeTriageMutation.mutate(selectedPatient.id, {
      onSuccess: () => {
        setShowCompleteModal(false);
        setSelectedPatient(null);
        setTriageNotes('');
        refetch();
        toast.success('Triage completed successfully');
      },
    });
  };

  const handleCancelTriage = async () => {
    if (!selectedPatient) return;

    cancelTriageMutation.mutate(
      { queueEntryId: selectedPatient.id, reason: cancelReason },
      {
        onSuccess: () => {
          setShowTriageModal(false);
          setSelectedPatient(null);
          setCancelReason('');
          refetch();
          toast.success('Triage cancelled');
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Waiting for Triage</p>
                <p className="text-3xl font-bold mt-2">{waitingPatients.length}</p>
                {waitingPatients.filter((p) => p.priority === 'critical').length > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {waitingPatients.filter((p) => p.priority === 'critical').length} critical
                  </p>
                )}
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold mt-2">{inProgressPatients.length}</p>
              </div>
              <Play className="h-8 w-8 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total in Queue</p>
                <p className="text-3xl font-bold mt-2">{triageQueue.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Triage Queue Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Triage Queue
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : triageQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No patients in triage queue</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead>Checked In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triageQueue.map((entry, idx) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-semibold">{entry.queue_position || idx + 1}</TableCell>
                    <TableCell className="font-semibold">
                      {entry.patient?.first_name} {entry.patient?.last_name}
                      {entry.patient?.patient_number && (
                        <p className="text-xs text-muted-foreground">{entry.patient.patient_number}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(entry.priority)}>
                        {entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.chief_complaint || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(entry.checked_in_at), 'HH:mm')}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-right">
                      {entry.status === 'waiting' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleClaimPatient(entry)}
                          disabled={claimPatientMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start Triage
                        </Button>
                      )}
                      {entry.status === 'in_progress' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedPatient(entry);
                            setShowCompleteModal(true);
                          }}
                          disabled={completeTriageMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Triage Modal */}
      <Dialog open={showTriageModal} onOpenChange={setShowTriageModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Triage</DialogTitle>
            <DialogDescription>
              Beginning triage for {selectedPatient?.patient?.first_name}{' '}
              {selectedPatient?.patient?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Patient Information</Label>
              <div className="mt-2 p-3 bg-blue-50 rounded-lg space-y-1">
                <p className="font-semibold text-sm">
                  {selectedPatient?.patient?.first_name} {selectedPatient?.patient?.last_name}
                </p>
                {selectedPatient?.patient?.patient_number && (
                  <p className="text-xs text-muted-foreground">ID: {selectedPatient.patient.patient_number}</p>
                )}
                {selectedPatient?.chief_complaint && (
                  <p className="text-sm">
                    <span className="font-semibold">Chief Complaint:</span> {selectedPatient.chief_complaint}
                  </p>
                )}
                {selectedPatient?.notes && (
                  <p className="text-sm">
                    <span className="font-semibold">Notes:</span> {selectedPatient.notes}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold">Triage Assessment Notes</Label>
              <Textarea
                placeholder="Record initial observations, vital signs (temperature, BP, pulse), and any immediate concerns..."
                value={triageNotes}
                onChange={(e) => setTriageNotes(e.target.value)}
                className="mt-2 min-h-24"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be linked to the patient's triage examination record
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowTriageModal(false)}
              disabled={claimPatientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowTriageModal(false);
                setCancelReason('');
              }}
              disabled={claimPatientMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Triage
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCompleteTriageClick}
              disabled={claimPatientMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Continue to Triage
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Triage Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Triage</DialogTitle>
            <DialogDescription>
              Finish triage for {selectedPatient?.patient?.first_name}{' '}
              {selectedPatient?.patient?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Triage Complete Notes</Label>
              <Textarea
                placeholder="Record vital signs, findings, triage priority level, and next steps..."
                value={triageNotes}
                onChange={(e) => setTriageNotes(e.target.value)}
                className="mt-2 min-h-24"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCompleteModal(false)}
              disabled={completeTriageMutation.isPending}
            >
              Back
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCompleteTriage}
              disabled={completeTriageMutation.isPending}
            >
              {completeTriageMutation.isPending ? 'Completing...' : 'Complete Triage'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TriageQueuePanel;
