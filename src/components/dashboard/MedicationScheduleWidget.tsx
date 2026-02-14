import { useState, useMemo } from 'react';
import {
  useDueMedications,
  useRecordMedicationAdministration,
  useSkipScheduledDose,
} from '@/hooks/useMedicationScheduling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
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
import { Clock, Check, X, AlertCircle, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import type { ScheduledDose } from '@/hooks/useMedicationScheduling';

interface MedicationScheduleWidgetProps {
  patientId?: string;
  showCompact?: boolean;
}

export const MedicationScheduleWidget = ({
  patientId,
  showCompact = false,
}: MedicationScheduleWidgetProps) => {
  const { data: dueMeds = [], isLoading } = useDueMedications(patientId);
  const recordAdminMutation = useRecordMedicationAdministration();
  const skipMutation = useSkipScheduledDose();

  const [selectedDose, setSelectedDose] = useState<ScheduledDose | null>(null);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [adminForm, setAdminForm] = useState({
    dosageGiven: '',
    route: 'oral',
    notes: '',
  });
  const [skipReason, setSkipReason] = useState('');

  const categorizedMeds = useMemo(() => {
    const now = new Date();
    return {
      overdue: dueMeds.filter((d) => new Date(d.scheduled_time) < now),
      upcoming: dueMeds.filter((d) => {
        const schedTime = new Date(d.scheduled_time);
        return schedTime >= now && schedTime <= new Date(now.getTime() + 60 * 60 * 1000);
      }),
    };
  }, [dueMeds]);

  const totalDue = categorizedMeds.overdue.length + categorizedMeds.upcoming.length;

  const handleRecordAdmin = async () => {
    if (!selectedDose) return;

    await recordAdminMutation.mutateAsync({
      scheduledDoseId: selectedDose.id,
      dosageGiven: adminForm.dosageGiven || selectedDose.dosage,
      route: adminForm.route,
      notes: adminForm.notes,
    });

    setShowAdminDialog(false);
    setAdminForm({ dosageGiven: '', route: 'oral', notes: '' });
    setSelectedDose(null);
  };

  const handleSkipDose = async () => {
    if (!selectedDose) return;

    await skipMutation.mutateAsync({
      scheduledDoseId: selectedDose.id,
      reason: skipReason,
    });

    setShowSkipDialog(false);
    setSkipReason('');
    setSelectedDose(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Medication Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading medications...</div>
        </CardContent>
      </Card>
    );
  }

  if (showCompact) {
    return (
      <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="font-medium text-sm">
            {totalDue > 0 ? `${totalDue} medication(s) due` : 'No medications due'}
          </span>
        </div>
        {categorizedMeds.overdue.length > 0 && (
          <Badge variant="destructive">{categorizedMeds.overdue.length} overdue</Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Medication Schedule
            </CardTitle>
            <CardDescription>
              Manage scheduled medication administration
            </CardDescription>
          </div>
          {totalDue > 0 && (
            <Badge variant="outline" className="text-lg px-3 py-1">
              {totalDue} due
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalDue === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No medications currently due or scheduled
          </div>
        ) : (
          <>
            {/* Overdue Medications */}
            {categorizedMeds.overdue.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Overdue ({categorizedMeds.overdue.length})
                </h4>
                <div className="space-y-2">
                  {categorizedMeds.overdue.map((dose) => (
                    <MedicationDoseRow
                      key={dose.id}
                      dose={dose}
                      priority="overdue"
                      onRecordAdmin={() => {
                        setSelectedDose(dose);
                        setAdminForm({
                          dosageGiven: dose.dosage,
                          route: dose.route || 'oral',
                          notes: '',
                        });
                        setShowAdminDialog(true);
                      }}
                      onSkip={() => {
                        setSelectedDose(dose);
                        setShowSkipDialog(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Medications */}
            {categorizedMeds.upcoming.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Due Soon ({categorizedMeds.upcoming.length})
                </h4>
                <div className="space-y-2">
                  {categorizedMeds.upcoming.map((dose) => (
                    <MedicationDoseRow
                      key={dose.id}
                      dose={dose}
                      priority="upcoming"
                      onRecordAdmin={() => {
                        setSelectedDose(dose);
                        setAdminForm({
                          dosageGiven: dose.dosage,
                          route: dose.route || 'oral',
                          notes: '',
                        });
                        setShowAdminDialog(true);
                      }}
                      onSkip={() => {
                        setSelectedDose(dose);
                        setShowSkipDialog(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Record Administration Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Medication Administration</DialogTitle>
            <DialogDescription>
              Confirm the medication has been administered to the patient
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedDose && (
              <>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {(selectedDose as any)?.prescription_items?.medications?.name || 'Medication'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scheduled: {format(new Date(selectedDose.scheduled_time), 'PPpp')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Dosage Given</label>
                  <Input
                    placeholder="e.g., 500mg"
                    value={adminForm.dosageGiven}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, dosageGiven: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Route</label>
                  <Select
                    value={adminForm.route}
                    onValueChange={(value) =>
                      setAdminForm({ ...adminForm, route: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oral">Oral (PO)</SelectItem>
                      <SelectItem value="iv">Intravenous (IV)</SelectItem>
                      <SelectItem value="im">Intramuscular (IM)</SelectItem>
                      <SelectItem value="subcutaneous">Subcutaneous (SC)</SelectItem>
                      <SelectItem value="topical">Topical</SelectItem>
                      <SelectItem value="inhaled">Inhaled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="Any observations or side effects..."
                    value={adminForm.notes}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, notes: e.target.value })
                    }
                    className="h-20"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdminDialog(false)}
              disabled={recordAdminMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordAdmin}
              disabled={recordAdminMutation.isPending}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Record Administration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Dose Dialog */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip Medication Dose?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this dose as skipped? Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Textarea
            placeholder="Reason for skipping (e.g., patient refused, side effects)..."
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            className="h-20"
          />

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleSkipDose}
              disabled={skipMutation.isPending || !skipReason.trim()}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Skip Dose
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

interface MedicationDoseRowProps {
  dose: ScheduledDose;
  priority: 'overdue' | 'upcoming';
  onRecordAdmin: () => void;
  onSkip: () => void;
}

const MedicationDoseRow = ({
  dose,
  priority,
  onRecordAdmin,
  onSkip,
}: MedicationDoseRowProps) => {
  const medicationName = (dose as any)?.prescription_items?.medications?.name || 'Unknown Medication';
  
  return (
    <div
      className={`flex items-center justify-between p-3 border rounded-lg ${
        priority === 'overdue'
          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <div className="flex-1">
        <p className="font-medium text-sm">{medicationName}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {format(new Date(dose.scheduled_time), 'h:mm a')}
          {priority === 'overdue' && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              ({formatDistanceToNow(new Date(dose.scheduled_time), { addSuffix: true })})
            </span>
          )}
        </div>
        <p className="text-xs mt-1">
          <span className="font-medium">Dosage:</span> {dose.dosage}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRecordAdmin} className="gap-2">
              <Check className="w-4 h-4" />
              Record Given
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSkip} className="gap-2 text-yellow-600">
              <X className="w-4 h-4" />
              Skip Dose
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
