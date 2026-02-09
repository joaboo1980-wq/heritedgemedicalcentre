import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react';

interface AppointmentWithDetails {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string | null;
  department: string | null;
  patient_name: string;
  doctor_name: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
};

const AdminAppointments = () => {
  const [filterTab, setFilterTab] = useState<'upcoming' | 'today' | 'pending'>('today');

  // Fetch all appointments from all users
  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['admin-appointments'],
    queryFn: async () => {
      try {
        console.log('[AdminAppointments] Fetching all appointments...');
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('appointment_date', { ascending: false })
          .order('appointment_time', { ascending: false });

        if (error) {
          console.error('[AdminAppointments] Error fetching appointments:', error);
          throw error;
        }

        const appointmentData = data || [];
        console.log('[AdminAppointments] All appointments fetched:', appointmentData.length);
        console.log('[AdminAppointments] Appointments data:', appointmentData);

        // Fetch patient details
        const patientIds = [...new Set(appointmentData.map((apt: any) => apt.patient_id).filter(Boolean))] as string[];
        let patients: Record<string, any> = {};

        if (patientIds.length > 0) {
          const { data: patientData } = await supabase
            .from('patients')
            .select('id, first_name, last_name')
            .in('id', patientIds);
          patients = (patientData || []).reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = `${p.first_name} ${p.last_name}`;
            return acc;
          }, {});
        }

        // Fetch doctor/staff details
        const doctorIds = [...new Set(appointmentData.map((apt: any) => apt.doctor_id).filter(Boolean))] as string[];
        let doctors: Record<string, any> = {};

        if (doctorIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', doctorIds);
          doctors = (profileData || []).reduce((acc: Record<string, any>, d: any) => {
            acc[d.user_id] = d.full_name;
            return acc;
          }, {});
        }

        // Map data with patient and doctor names
        const appointmentsWithDetails: AppointmentWithDetails[] = appointmentData.map((apt: any) => ({
          ...apt,
          patient_name: patients[apt.patient_id] || 'Unknown Patient',
          doctor_name: doctors[apt.doctor_id] || 'Unknown Doctor',
        }));

        return appointmentsWithDetails;
      } catch (err) {
        console.error('Error in admin appointments query:', err);
        throw err;
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds for faster updates
    staleTime: 0, // Consider data stale immediately
  });

  // Filter appointments based on tab
  const filteredAppointments = appointments?.filter((apt) => {
    const aptDate = new Date(apt.appointment_date);
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    if (filterTab === 'today') {
      return isSameDay(aptDate, today) && ['scheduled', 'confirmed', 'in_progress'].includes(apt.status);
    } else if (filterTab === 'upcoming') {
      return aptDate > todayEnd && ['scheduled', 'confirmed'].includes(apt.status);
    } else if (filterTab === 'pending') {
      return ['scheduled', 'confirmed', 'in_progress'].includes(apt.status);
    }
    return true;
  }) || [];

  // Calculate stats
  const stats = {
    today: appointments?.filter((apt) => {
      const aptDate = new Date(apt.appointment_date);
      return isSameDay(aptDate, new Date()) && ['scheduled', 'confirmed', 'in_progress'].includes(apt.status);
    }).length || 0,
    upcoming: appointments?.filter((apt) => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate > endOfDay(new Date()) && ['scheduled', 'confirmed'].includes(apt.status);
    }).length || 0,
    pending: appointments?.filter((apt) => ['scheduled', 'confirmed', 'in_progress'].includes(apt.status)).length || 0,
  };

  // Set up real-time subscription for appointments changes
  useEffect(() => {
    console.log('[AdminAppointments] Setting up real-time subscription...');
    
    const subscription = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('[AdminAppointments] Received real-time update:', payload);
          // Refetch the data when appointments change
          refetch();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [refetch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">All Appointments</h1>
          <p className="text-muted-foreground mt-1">Aggregate view of all appointments across all user roles</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">future appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">awaiting confirmation/completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="pending">All Pending</TabsTrigger>
            </TabsList>

            <TabsContent value={filterTab} className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No appointments found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell className="font-medium">{apt.patient_name}</TableCell>
                          <TableCell>{apt.doctor_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground">{apt.appointment_time}</div>
                          </TableCell>
                          <TableCell>{apt.department || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{apt.reason || '-'}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[apt.status] || 'bg-gray-100 text-gray-800'}>
                              {apt.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAppointments;
