import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Clock, 
  CheckCircle, 
  Phone, 
  User, 
  Stethoscope,
  ArrowRight,
  RefreshCw 
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface WaitingPatient {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  patient_name: string;
  doctor_name: string;
  checked_in_at?: string;
  arrival_time?: string;
}

const WaitingRoom = () => {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<WaitingPatient | null>(null);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch appointments scheduled for today (not yet checked in)
  const { data: scheduledPatients = [] } = useQuery({
    queryKey: ['scheduled-today', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, appointment_date, appointment_time, status, reason, created_at')
        .eq('appointment_date', today)
        .in('status', ['scheduled', 'confirmed'])
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      // Fetch patient and doctor details
      const appointmentData = data || [];
      const patientIds = [...new Set(appointmentData.map(a => a.patient_id))] as string[];
      const doctorIds = [...new Set(appointmentData.map(a => a.doctor_id))] as string[];

      let patients: any = {};
      let doctors: any = {};

      if (patientIds.length > 0) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .in('id', patientIds);
        patients = (patientData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      if (doctorIds.length > 0) {
        const { data: doctorData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', doctorIds);
        doctors = (doctorData || []).reduce((acc: any, d: any) => {
          acc[d.user_id] = d;
          return acc;
        }, {});
      }

      return appointmentData.map((apt: any) => ({
        id: apt.id,
        patient_id: apt.patient_id,
        doctor_id: apt.doctor_id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        reason: apt.reason,
        patient_name: patients[apt.patient_id]
          ? `${patients[apt.patient_id].first_name} ${patients[apt.patient_id].last_name}`
          : 'Unknown',
        doctor_name: doctors[apt.doctor_id]?.full_name || 'Unknown',
      }));
    },
    refetchInterval: 30000,
  });

  // Fetch waiting patients
  const { data: waitingPatients = [] } = useQuery({
    queryKey: ['waiting-patients', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, appointment_date, appointment_time, status, reason, created_at, updated_at')
        .eq('appointment_date', today)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const appointmentData = data || [];
      const patientIds = [...new Set(appointmentData.map(a => a.patient_id))] as string[];
      const doctorIds = [...new Set(appointmentData.map(a => a.doctor_id))] as string[];

      let patients: any = {};
      let doctors: any = {};

      if (patientIds.length > 0) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .in('id', patientIds);
        patients = (patientData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      if (doctorIds.length > 0) {
        const { data: doctorData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', doctorIds);
        doctors = (doctorData || []).reduce((acc: any, d: any) => {
          acc[d.user_id] = d;
          return acc;
        }, {});
      }

      return appointmentData.map((apt: any) => ({
        id: apt.id,
        patient_id: apt.patient_id,
        doctor_id: apt.doctor_id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        reason: apt.reason,
        patient_name: patients[apt.patient_id]
          ? `${patients[apt.patient_id].first_name} ${patients[apt.patient_id].last_name}`
          : 'Unknown',
        doctor_name: doctors[apt.doctor_id]?.full_name || 'Unknown',
        arrival_time: apt.updated_at || apt.created_at,
      }));
    },
    refetchInterval: 20000,
  });

  // Check in patient mutation
  const checkInMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'waiting' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-today', today] });
      queryClient.invalidateQueries({ queryKey: ['waiting-patients', today] });
      setShowCheckInDialog(false);
      setSelectedPatient(null);
      toast.success('Patient checked in to waiting room');
    },
    onError: (error: Error) => {
      toast.error(`Failed to check in: ${error.message}`);
    },
  });

  // Call next patient mutation
  const callPatientMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiting-patients', today] });
      setShowCallDialog(false);
      setSelectedPatient(null);
      toast.success('Patient called to doctor');
    },
    onError: (error: Error) => {
      toast.error(`Failed to call patient: ${error.message}`);
    },
  });

  const calculateWaitTime = (arrivalTime: string) => {
    const minutes = differenceInMinutes(new Date(), new Date(arrivalTime));
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  const avgWaitTime = waitingPatients.length > 0
    ? Math.round(
        waitingPatients.reduce((sum, p) => {
          return sum + differenceInMinutes(new Date(), new Date(p.arrival_time || p.created_at));
        }, 0) / waitingPatients.length
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Waiting Now</p>
              <p className="text-3xl font-bold mt-2">{waitingPatients.length}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500/40" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Avg Wait Time</p>
              <p className="text-3xl font-bold mt-2">{avgWaitTime} min</p>
            </div>
            <Stethoscope className="h-8 w-8 text-purple-500/40" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Ready to Check In</p>
              <p className="text-3xl font-bold mt-2">{scheduledPatients.length}</p>
            </div>
            <User className="h-8 w-8 text-green-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Waiting Patients Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Patients in Waiting Room
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['waiting-patients'] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {waitingPatients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No patients in waiting room</p>
          ) : (
            <div className="space-y-3">
              {waitingPatients.map((patient, index) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{patient.patient_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.reason || 'General visit'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        {calculateWaitTime(patient.arrival_time || '')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dr. {patient.doctor_name}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-4"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setShowCallDialog(true);
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check In Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Ready to Check In
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['scheduled-today'] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scheduledPatients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No patients scheduled for today
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Appointment Time</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-semibold">{patient.patient_name}</TableCell>
                    <TableCell>{patient.appointment_time}</TableCell>
                    <TableCell>{patient.doctor_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {patient.reason || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowCheckInDialog(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check In
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Check In Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In Patient</DialogTitle>
            <DialogDescription>
              Move {selectedPatient?.patient_name} to the waiting room
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Patient</p>
              <p className="text-lg font-bold">{selectedPatient?.patient_name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Appointment Time</p>
              <p className="text-lg">{selectedPatient?.appointment_time}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Doctor</p>
              <p className="text-lg">{selectedPatient?.doctor_name}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCheckInDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPatient) {
                  checkInMutation.mutate(selectedPatient.id);
                }
              }}
              disabled={checkInMutation.isPending}
            >
              {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Patient Dialog */}
      <AlertDialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Call Patient to Doctor?</AlertDialogTitle>
          <AlertDialogDescription>
            Call <span className="font-semibold">{selectedPatient?.patient_name}</span> to see{' '}
            <span className="font-semibold">Dr. {selectedPatient?.doctor_name}</span>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedPatient) {
                  callPatientMutation.mutate(selectedPatient.id);
                }
              }}
            >
              Call Patient
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WaitingRoom;
