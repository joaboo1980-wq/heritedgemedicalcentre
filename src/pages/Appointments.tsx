import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Clock, User, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { format, isSameDay, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import PermissionGuard from '@/components/layout/PermissionGuard';

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string | null;
  notes: string | null;
  department: string | null;
  patients?: {
    first_name: string;
    last_name: string;
    patient_number: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_number: string;
}

interface Doctor {
  doctor_id: string;
  email: string;
  display_name: string;
  department: string | null;
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
};

const statusIcons = {
  scheduled: CalendarIcon,
  confirmed: CheckCircle,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: XCircle,
  no_show: AlertCircle,
};

const Appointments = () => {
  const queryClient = useQueryClient(); // Only declare queryClient once
  // Only declare these state variables once
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterTab, setFilterTab] = useState<'upcoming' | 'today' | 'past'>('today');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    appointment_time: '09:00',
    duration_minutes: 30,
    reason: '',
    department: '',
  });

  // Debug: Log newAppointment state on change
  // (This will log every render, but is useful for debugging form state)
  console.log('newAppointment state:', newAppointment);

  // Helper to validate UUID (simple check for length and dashes)
  const isValidUUID = (uuid: string) => {
    return uuid && uuid.length === 36 && uuid.includes('-');
  };

  // Fetch appointments
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            patients (first_name, last_name, patient_number)
          `)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });
        if (error) {
          console.error('Error fetching appointments:', error);
          throw error;
        }
        // Fetch doctor profiles separately
        const appointmentsWithDoctors = await Promise.all(
          (data || []).map(async (apt) => {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', apt.doctor_id)
              .single();
            if (profileError) {
              console.error('Error fetching doctor profile for', apt.doctor_id, profileError);
            }
            return { ...apt, profiles: profile };
          })
        );
        console.log('Fetched appointments:', appointmentsWithDoctors);
        return appointmentsWithDoctors as Appointment[];
      } catch (err) {
        console.error('Exception in appointments queryFn:', err);
        throw err;
      }
    },
  });

  // Fetch patients for dropdown
  const { data: patients } = useQuery({
    queryKey: ['patients-list'],
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
        console.log('Fetched patients:', data);
        return data as Patient[];
      } catch (err) {
        console.error('Exception in patients queryFn:', err);
        throw err;
      }
    },
  });

  // Fetch departments for dropdown
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('departments' as any)
          .select('id, name')
          .order('name');
        if (error) {
          console.error('Error fetching departments:', error);
          throw error;
        }
        console.log('Fetched departments:', data);
        return data || [];
      } catch (err) {
        console.error('Exception in departments queryFn:', err);
        throw err;
      }
    },
  });

  // Fetch doctors from doctor_directory view
  const { data: doctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('doctor_directory')
          .select('*');
        if (error) {
          console.error('Error fetching doctor_directory:', error);
          throw error;
        }
        return data as Doctor[];
      } catch (err) {
        console.error('Exception in doctors queryFn:', err);
        throw err;
      }
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: typeof newAppointment) => {
      try {
        // Extra validation for doctor_id
        if (!isValidUUID(data.doctor_id)) {
          toast.error('Please select a valid doctor.');
          throw new Error('Invalid doctor_id');
        }
        console.log('Creating appointment with data:', data);
        const { error } = await supabase.from('appointments').insert({
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          duration_minutes: data.duration_minutes,
          reason: data.reason || null,
          department: data.department || null,
          status: 'scheduled',
        });
        if (error) {
          console.error('Error inserting appointment:', error);
          throw error;
        }
      } catch (err) {
        console.error('Exception in createAppointmentMutation:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsAddDialogOpen(false);
      setNewAppointment({
        patient_id: '',
        doctor_id: '',
        appointment_date: format(new Date(), 'yyyy-MM-dd'),
        appointment_time: '09:00',
        duration_minutes: 30,
        reason: '',
        department: '',
      });
      toast.success('Appointment scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      try {
        console.log('Updating appointment status:', { id, status });
        const { error } = await supabase
          .from('appointments')
          .update({ status })
          .eq('id', id);
        if (error) {
          console.error('Error updating appointment status:', error);
          throw error;
        }
      } catch (err) {
        console.error('Exception in updateStatusMutation:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Status updated');
    },
  });

  // Send SMS reminder mutation
  const sendSmsReminderMutation = useMutation({
    mutationFn: async ({ appointmentId, patientId }: { appointmentId: string; patientId: string }) => {
      try {
        console.log('Sending SMS reminder for appointment:', appointmentId, 'patient:', patientId);
        // Get patient phone number
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('phone')
          .eq('id', patientId)
          .single();
        if (patientError) {
          console.error('Error fetching patient phone:', patientError);
          throw patientError;
        }
        if (!patientData?.phone) {
          console.error('Patient phone number not found for', patientId);
          throw new Error('Patient phone number not found');
        }
        // Call Edge Function to send SMS
        const { error } = await supabase.functions.invoke('send-appointment-reminder', {
          body: {
            phone: patientData.phone,
            appointmentId,
          },
        });
        if (error) {
          console.error('Error sending SMS reminder:', error);
          throw error;
        }
      } catch (err) {
        console.error('Exception in sendSmsReminderMutation:', err);
        throw err;
      }
    },
    onSuccess: () => {
      toast.success('Reminder SMS sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredAppointments = appointments?.filter((apt) => {
    const appointmentDate = parseISO(apt.appointment_date);
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    if (filterTab === 'today') {
      return isSameDay(appointmentDate, today);
    } else if (filterTab === 'upcoming') {
      return isAfter(appointmentDate, todayEnd);
    } else if (filterTab === 'past') {
      return isBefore(appointmentDate, todayStart);
    }
    return true;
  });

  const todayAppointments = appointments?.filter((apt) =>
    isSameDay(parseISO(apt.appointment_date), new Date())
  );

  // Get dates with appointments for calendar highlighting
  const appointmentDates = appointments?.map((apt) => parseISO(apt.appointment_date)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage patient appointments
          </p>
        </div>
        <PermissionGuard module="appointments" action="create">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
              <DialogDescription>
                Create a new appointment for a patient with a doctor.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAppointmentMutation.mutate(newAppointment);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Patient *</Label>
                <Select
                  value={newAppointment.patient_id}
                  onValueChange={(value) =>
                    setNewAppointment({ ...newAppointment, patient_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.patient_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Doctor *</Label>
                <Select
                  value={isValidUUID(newAppointment.doctor_id) ? newAppointment.doctor_id : ''}
                  onValueChange={(value) => {
                    if (isValidUUID(value)) {
                      setNewAppointment({ ...newAppointment, doctor_id: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors?.filter(d => isValidUUID(d.doctor_id)).map((d) => (
                      <SelectItem key={d.doctor_id} value={d.doctor_id}>
                        Dr. {d.display_name} {d.department && `(${d.department})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={newAppointment.appointment_date}
                    onChange={(e) =>
                      setNewAppointment({ ...newAppointment, appointment_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={newAppointment.appointment_time}
                    onChange={(e) =>
                      setNewAppointment({ ...newAppointment, appointment_time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Select
                    value={newAppointment.duration_minutes.toString()}
                    onValueChange={(value) =>
                      setNewAppointment({ ...newAppointment, duration_minutes: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={newAppointment.department} onValueChange={(value) =>
                    setNewAppointment({ ...newAppointment, department: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason for Visit</Label>
                <Textarea
                  value={newAppointment.reason}
                  onChange={(e) =>
                    setNewAppointment({ ...newAppointment, reason: e.target.value })
                  }
                  placeholder="Brief description of the visit reason"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? 'Scheduling...' : 'Schedule Appointment'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayAppointments?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Today's Appointments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {appointments?.filter((a) => a.status === 'completed').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {appointments?.filter((a) => a.status === 'scheduled').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {appointments?.filter((a) => a.status === 'cancelled').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiers={{
                hasAppointment: appointmentDates,
              }}
              modifiersStyles={{
                hasAppointment: {
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  fontWeight: 'bold',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Appointments Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Appointments</CardTitle>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant={filterTab === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTab('upcoming')}
              >
                Upcoming
              </Button>
              <Button
                variant={filterTab === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTab('today')}
              >
                Today
              </Button>
              <Button
                variant={filterTab === 'past' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTab('past')}
              >
                Past
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredAppointments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {filterTab} appointments
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments?.map((apt) => {
                    const StatusIcon = statusIcons[apt.status];
                    return (
                      <TableRow key={apt.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(apt.appointment_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {apt.appointment_time.slice(0, 5)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {apt.patients?.first_name} {apt.patients?.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              #{apt.patients?.patient_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">Dr. {apt.profiles?.full_name || 'Unknown'}</span>
                            {apt.department && (
                              <span className="text-xs text-muted-foreground">{apt.department}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          {apt.reason ? (
                            <span className="text-muted-foreground">{apt.reason}</span>
                          ) : (
                            <span className="text-muted-foreground italic">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[apt.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {apt.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              sendSmsReminderMutation.mutate({
                                appointmentId: apt.id,
                                patientId: apt.patient_id,
                              })
                            }
                            disabled={sendSmsReminderMutation.isPending}
                            title="Send SMS reminder"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Select
                            value={apt.status}
                            onValueChange={(status) =>
                              updateStatusMutation.mutate({ id: apt.id, status })
                            }
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Update" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Appointments;