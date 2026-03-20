import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNurseTriageAssignments, useCompleteTriage } from '@/hooks/useNurseTriageAssignment';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Stethoscope, RefreshCw, Activity, FileText, Trash2, Eye, Edit2 } from 'lucide-react';
import type { TriageAssignment } from '@/hooks/useNurseTriageAssignment';

interface MedicalExamination {
  id: string;
  assessment_diagnosis: string;
  plan_treatment: string | null;
  medications_prescribed: string | null;
  examination_date: string;
  examined_by: string;
}

export const NurseTriageAssignments = () => {
  const { user } = useAuth();
  const { data: assignments = [], refetch, isLoading } = useNurseTriageAssignments(user?.id);
  const completeMutation = useCompleteTriage();

  const [selectedAssignment, setSelectedAssignment] = useState<TriageAssignment | null>(null);
  const [showVitalsDialog, setShowVitalsDialog] = useState(false);
  const [showMedicalHistoryDialog, setShowMedicalHistoryDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vitals, setVitals] = useState({
    temperature: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
  });
  const [assessmentNotes, setAssessmentNotes] = useState('');

  // Fetch medical examinations for the selected patient
  const { data: medicalExaminations } = useQuery({
    queryKey: ['patient-medical-exams', selectedAssignment?.patient_id],
    enabled: !!selectedAssignment?.patient_id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('medical_examinations')
        .select('*')
        .eq('patient_id', selectedAssignment?.patient_id)
        .order('examination_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as MedicalExamination[];
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
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

  const getPriorityIcon = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'normal':
        return '🔵';
      case 'low':
        return '⚪';
      default:
        return '⚪';
    }
  };

  const handleViewVitals = (assignment: TriageAssignment) => {
    setSelectedAssignment(assignment);
    setVitals({
      temperature: '',
      systolic_bp: '',
      diastolic_bp: '',
      heart_rate: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      weight: '',
      height: '',
    });
    setAssessmentNotes('');
    setShowVitalsDialog(true);
  };

  const handleViewMedicalHistory = (assignment: TriageAssignment) => {
    setSelectedAssignment(assignment);
    setShowMedicalHistoryDialog(true);
  };

  const handleViewDetails = (assignment: TriageAssignment) => {
    setSelectedAssignment(assignment);
    setShowDetailsDialog(true);
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      const { error } = await supabase
        .from('patient_assignments')
        .delete()
        .eq('id', selectedAssignment.id);

      if (error) throw error;
      toast.success('Assignment deleted successfully');
      setShowDeleteConfirm(false);
      refetch();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const handleCompleteVitals = async () => {
    if (!selectedAssignment || !user?.id) return;

    const vitalSigns = {
      temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
      systolic_bp: vitals.systolic_bp ? parseInt(vitals.systolic_bp) : null,
      diastolic_bp: vitals.diastolic_bp ? parseInt(vitals.diastolic_bp) : null,
      heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
      respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : null,
      oxygen_saturation: vitals.oxygen_saturation ? parseFloat(vitals.oxygen_saturation) : null,
      weight: vitals.weight ? parseFloat(vitals.weight) : null,
      height: vitals.height ? parseFloat(vitals.height) : null,
      recorded_at: new Date().toISOString(),
    };

    completeMutation.mutate(
      {
        assignmentId: selectedAssignment.id,
        patientId: selectedAssignment.patient_id,
        vital_signs: vitalSigns,
        assessment_notes: assessmentNotes,
      },
      {
        onSuccess: () => {
          setShowVitalsDialog(false);
          setSelectedAssignment(null);
          refetch();
        },
      }
    );
  };

  const stats = {
    total: assignments.length,
    critical: assignments.filter(a => a.priority === 'critical').length,
    high: assignments.filter(a => a.priority === 'high').length,
  };

  return (
    <div className="space-y-6">
      {/* Triage Queue Table - Full Width at Top */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Your Triage Queue
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
              <p className="text-muted-foreground font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No patients waiting for triage</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="hidden md:table-cell">Chief Complaint</TableHead>
                    <TableHead className="hidden sm:table-cell">Checked In</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment, index) => (
                    <TableRow
                      key={assignment.id}
                      className={assignment.priority === 'critical' ? 'bg-red-50' : assignment.priority === 'high' ? 'bg-orange-50' : ''}
                    >
                      <TableCell className="text-sm font-bold">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {assignment.patient?.first_name} {assignment.patient?.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{assignment.patient?.patient_number}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getPriorityColor(assignment.priority)} border`}
                          variant="outline"
                        >
                          <span className="mr-1">{getPriorityIcon(assignment.priority)}</span>
                          {assignment.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {assignment.chief_complaint || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {format(new Date(assignment.created_at), 'HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="View Details"
                            onClick={() => handleViewDetails(assignment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="View Medical History"
                            onClick={() => handleViewMedicalHistory(assignment)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            title="Record Vitals"
                            onClick={() => handleViewVitals(assignment)}
                            disabled={completeMutation.isPending}
                          >
                            Record Vitals
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowDeleteConfirm(true);
                            }}
                            disabled={completeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards - Below Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Patients waiting for triage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertCircle className={`h-4 w-4 ${stats.critical > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.critical > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {stats.critical}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <Activity className={`h-4 w-4 ${stats.high > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.high > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
              {stats.high}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Important to address soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Vitals Recording Dialog */}
      {selectedAssignment && (
        <Dialog open={showVitalsDialog} onOpenChange={setShowVitalsDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Triage Assessment</DialogTitle>
              <DialogDescription>
                {selectedAssignment.patient?.first_name} {selectedAssignment.patient?.last_name}{' '}
                {selectedAssignment.patient?.patient_number && `(${selectedAssignment.patient.patient_number})`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Vital Signs */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Vital Signs
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temp">Temperature (°C)</Label>
                    <Input
                      id="temp"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 37.5"
                      value={vitals.temperature}
                      onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hr">Heart Rate (bpm)</Label>
                    <Input
                      id="hr"
                      type="number"
                      placeholder="e.g., 72"
                      value={vitals.heart_rate}
                      onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sys">Systolic BP (mmHg)</Label>
                    <Input
                      id="sys"
                      type="number"
                      placeholder="e.g., 120"
                      value={vitals.systolic_bp}
                      onChange={(e) => setVitals({ ...vitals, systolic_bp: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dias">Diastolic BP (mmHg)</Label>
                    <Input
                      id="dias"
                      type="number"
                      placeholder="e.g., 80"
                      value={vitals.diastolic_bp}
                      onChange={(e) => setVitals({ ...vitals, diastolic_bp: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rr">Respiratory Rate (breaths/min)</Label>
                    <Input
                      id="rr"
                      type="number"
                      placeholder="e.g., 16"
                      value={vitals.respiratory_rate}
                      onChange={(e) => setVitals({ ...vitals, respiratory_rate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="o2">O₂ Saturation (%)</Label>
                    <Input
                      id="o2"
                      type="number"
                      placeholder="e.g., 98"
                      value={vitals.oxygen_saturation}
                      onChange={(e) => setVitals({ ...vitals, oxygen_saturation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 75.5"
                      value={vitals.weight}
                      onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 180"
                      value={vitals.height}
                      onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Assessment Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Assessment Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Record your observations, initial assessment, and any concerns..."
                  value={assessmentNotes}
                  onChange={(e) => setAssessmentNotes(e.target.value)}
                  rows={5}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowVitalsDialog(false)}
                  disabled={completeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteVitals}
                  disabled={completeMutation.isPending}
                  className="flex-1"
                >
                  {completeMutation.isPending ? 'Saving...' : 'Complete Assessment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Medical History Dialog */}
      {selectedAssignment && (
        <Dialog open={showMedicalHistoryDialog} onOpenChange={setShowMedicalHistoryDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Medical History & Diagnosis</DialogTitle>
              <DialogDescription>
                {selectedAssignment.patient?.first_name} {selectedAssignment.patient?.last_name}{' '}
                {selectedAssignment.patient?.patient_number && `(${selectedAssignment.patient.patient_number})`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {medicalExaminations && medicalExaminations.length > 0 ? (
                medicalExaminations.map((exam) => (
                  <div key={exam.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">Examination</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(exam.examination_date), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>

                    {exam.assessment_diagnosis && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Diagnosis/Assessment</h5>
                        <p className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                          {exam.assessment_diagnosis}
                        </p>
                      </div>
                    )}

                    {exam.plan_treatment && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Course of Action/Treatment Plan</h5>
                        <p className="text-sm bg-green-50 p-3 rounded border border-green-200">
                          {exam.plan_treatment}
                        </p>
                      </div>
                    )}

                    {exam.medications_prescribed && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Medications Prescribed</h5>
                        <p className="text-sm bg-amber-50 p-3 rounded border border-amber-200 whitespace-pre-wrap">
                          {exam.medications_prescribed}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No medical history found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Assignment Details Dialog */}
      {selectedAssignment && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assignment Details</DialogTitle>
              <DialogDescription>
                {selectedAssignment.patient?.first_name} {selectedAssignment.patient?.last_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Patient Number</Label>
                  <p className="font-medium">{selectedAssignment.patient?.patient_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Badge className={`${getPriorityColor(selectedAssignment.priority)} border mt-1`}>
                    <span className="mr-1">{getPriorityIcon(selectedAssignment.priority)}</span>
                    {selectedAssignment.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned On</Label>
                  <p className="text-sm">
                    {format(new Date(selectedAssignment.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="text-sm">{selectedAssignment.status || 'Active'}</p>
                </div>
              </div>

              {selectedAssignment.chief_complaint && (
                <div>
                  <Label className="text-xs text-muted-foreground">Chief Complaint</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded mt-1">
                    {selectedAssignment.chief_complaint}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {selectedAssignment && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Assignment</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this assignment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              Patient: {selectedAssignment.patient?.first_name} {selectedAssignment.patient?.last_name}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAssignment}
              >
                Delete Assignment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
