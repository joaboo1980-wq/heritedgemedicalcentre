import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Eye, Pill, Heart, FileText, CheckCircle } from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { PatientDetailsModals } from './PatientDetailsModals';

export const TriageQueue: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'vitals' | 'meds' | 'history' | 'care-plan'>('vitals');

  // Fetch patients in triage queue (checked in but not assigned to a nurse yet)
  const { data: queuePatients = [], isLoading, refetch } = useQuery({
    queryKey: ['triage-queue'],
    queryFn: async () => {
      try {
        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Find patients who are waiting but not assigned to a specific nurse
        // OR patients assigned today but not yet claimed by the current logged-in nurse
        const { data: appointments, error: aptError } = await supabase
          .from('appointments')
          .select('id, patient_id, appointment_date, appointment_time, reason, status')
          .eq('appointment_date', today)
          .eq('status', 'waiting')
          .order('updated_at', { ascending: true });

        if (aptError) throw aptError;

        // Get their patient details
        const patientIds = [...new Set((appointments || []).map((apt: any) => apt.patient_id))];
        let patients: any = {};

        if (patientIds.length > 0) {
          const { data: patientData } = await supabase
            .from('patients')
            .select('id, first_name, last_name, patient_number, date_of_birth')
            .in('id', patientIds);

          patients = (patientData || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }

        // Check which patients are already assigned to a nurse
        const { data: assignments } = await supabase
          .from('patient_assignments')
          .select('patient_id')
          .eq('shift_date', today)
          .in('patient_id', patientIds);

        const assignedPatientIds = new Set((assignments || []).map((a: any) => a.patient_id));

        // Return only unassigned patients in the queue
        return (appointments || [])
          .filter((apt: any) => !assignedPatientIds.has(apt.patient_id))
          .map((apt: any) => {
            const patientInfo = patients[apt.patient_id] || {};
            return {
              appointmentId: apt.id,
              patient_id: apt.patient_id,
              id: apt.patient_id, // Also include id for compatibility
              patient_name: patientInfo.first_name && patientInfo.last_name 
                ? `${patientInfo.first_name} ${patientInfo.last_name}`
                : 'Unknown',
              patient_number: patientInfo.patient_number || 'N/A',
              reason: apt.reason || 'General visit',
              appointment_time: apt.appointment_time,
              arrived_at: apt.updated_at || apt.appointment_date,
              status: apt.status,
            };
          });
      } catch (err) {
        console.error('[TriageQueue] Error fetching queue:', err);
        return [];
      }
    },
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });

  // Claim patient mutation
  const claimPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      if (!user?.id) throw new Error('User not found');

      const today = new Date().toISOString().split('T')[0];

      // Check if assignment already exists
      const { data: existingAssignments, error: checkError } = await supabase
        .from('patient_assignments')
        .select('id')
        .eq('patient_id', patientData.patient_id)
        .eq('shift_date', today)
        .limit(1);

      if (checkError) throw checkError;

      if (existingAssignments && existingAssignments.length > 0) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('patient_assignments')
          .update({
            nurse_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAssignments[0].id);

        if (updateError) throw updateError;
      } else {
        // Create new assignment
        const { error: insertError } = await supabase
          .from('patient_assignments')
          .insert({
            patient_id: patientData.patient_id,
            nurse_id: user.id,
            assigned_by_id: user.id,
            shift_date: today,
            priority: 'normal',
            is_primary_nurse: true,
          });

        if (insertError) throw insertError;
      }

      // Don't change appointment status here - keep as 'waiting' while triaging
      // Status will change to 'in_progress' only when patient is actually called to doctor

      return patientData;
    },
    onSuccess: (patientData) => {
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-patients'] });
      queryClient.invalidateQueries({ queryKey: ['nurse-triage-assignments'] });
      toast.success(`Claimed ${patientData.patient_name} from queue`);
    },
    onError: (error: Error) => {
      console.error('[TriageQueue] Claim error:', error);
      toast.error(`Failed to claim patient: ${error.message}`);
    },
  });

  const getPriorityColor = (reason?: string) => {
    if (!reason) return 'bg-gray-100 text-gray-800';
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('emergency') || lowerReason.includes('critical'))
      return 'bg-red-100 text-red-800';
    if (lowerReason.includes('urgent') || lowerReason.includes('pain'))
      return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  const calculateWaitTime = (arrivedAt: string) => {
    try {
      const minutes = differenceInMinutes(new Date(), parseISO(arrivedAt));
      if (minutes < 1) return 'Just now';
      if (minutes === 1) return '1 min';
      return `${minutes} mins`;
    } catch {
      return '—';
    }
  };

  const avgWaitTime = queuePatients.length > 0
    ? Math.round(
        queuePatients.reduce((sum, p) => {
          return sum + differenceInMinutes(new Date(), parseISO(p.arrived_at || new Date().toISOString()));
        }, 0) / queuePatients.length
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Queue List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Triage Queue
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Patients checked in and ready for triage assignment
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : queuePatients.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-3" />
              <p className="text-gray-600 font-medium">Queue is empty</p>
              <p className="text-sm text-gray-500 mt-1">All patients have been claimed</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-x-hidden w-full">
              {queuePatients.map((patient: any, index: number) => (
                <div
                  key={patient.patient_id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition overflow-hidden w-full"
                >
                  <div className="flex items-start justify-between gap-4 w-full min-w-0">
                    {/* Queue Position & Patient Info */}
                    <div className="flex-1 min-w-0 flex items-start gap-4 w-full">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{patient.patient_name}</h3>
                          <Badge variant="outline">{patient.patient_number}</Badge>
                        </div>

                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Arrived {calculateWaitTime(patient.arrived_at)} ago • {patient.appointment_time}
                        </p>

                        {patient.reason && (
                          <div className="mt-2 min-w-0 w-full" style={{ minWidth: 0 }}>
                            <div 
                              className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-md p-2 word-wrap"
                              style={{
                                overflowWrap: 'break-word',
                                wordWrap: 'break-word',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                minWidth: 0,
                                maxWidth: '100%'
                              }}
                            >
                              {patient.reason}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {/* Quick View Buttons */}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View vitals"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setActiveTab('vitals');
                            setIsModalOpen(true);
                          }}
                        >
                          <Heart size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Medications"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setActiveTab('meds');
                            setIsModalOpen(true);
                          }}
                        >
                          <Pill size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="History"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setActiveTab('history');
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Care plan"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setActiveTab('care-plan');
                            setIsModalOpen(true);
                          }}
                        >
                          <FileText size={16} />
                        </Button>
                      </div>

                      {/* Claim Button */}
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                        size="sm"
                        onClick={() => claimPatientMutation.mutate(patient)}
                        disabled={claimPatientMutation.isPending}
                      >
                        {claimPatientMutation.isPending ? 'Claiming...' : 'Claim Patient'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Details Modal */}
      {selectedPatient && selectedPatient.patient_id && (
        <PatientDetailsModals
          patientId={selectedPatient.patient_id}
          patientName={selectedPatient.patient_name}
          activeTab={activeTab}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPatient(null);
          }}
        />
      )}
    </div>
  );
};
