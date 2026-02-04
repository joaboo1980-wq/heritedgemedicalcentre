import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calendar, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import PermissionGuard from '@/components/layout/PermissionGuard';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DutyRoster {
  id: string;
  staff_id: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_type: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface StaffAvailability {
  id: string;
  staff_id: string;
  availability_date: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  updated_at: string;
  profiles?: {
    full_name: string;
  };
}

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  unavailable: 'bg-red-100 text-red-800',
  lunch: 'bg-yellow-100 text-yellow-800',
  break: 'bg-blue-100 text-blue-800',
  sick_leave: 'bg-orange-100 text-orange-800',
  off_duty: 'bg-gray-100 text-gray-800',
  out: 'bg-purple-100 text-purple-800',
};

const shiftTypes = ['morning', 'afternoon', 'night', 'on-call'];

const StaffSchedule = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isCreateRosterDialogOpen, setIsCreateRosterDialogOpen] = useState(false);
  const [isUpdateAvailabilityDialogOpen, setIsUpdateAvailabilityDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [viewMode, setViewMode] = useState<'roster' | 'availability'>('roster');

  const [newRoster, setNewRoster] = useState({
    staff_id: '',
    shift_date: selectedDate,
    shift_start_time: '08:00',
    shift_end_time: '17:00',
    shift_type: 'morning',
    location: '',
    notes: '',
  });

  const [availabilityUpdate, setAvailabilityUpdate] = useState({
    staff_id: '',
    availability_date: selectedDate,
    status: 'available',
    start_time: '',
    end_time: '',
    reason: '',
  });

  // Fetch staff for selection
  const { data: staffList } = useQuery({
    queryKey: ['staff-for-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch duty rosters for selected date
  const { data: rosters, isLoading: rostersLoading } = useQuery({
    queryKey: ['duty-rosters', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_rosters' as any)
        .select('*, profiles(full_name, email)')
        .eq('shift_date', selectedDate)
        .order('shift_start_time');
      if (error) throw error;
      return (data || []) as unknown as DutyRoster[];
    },
  });

  // Fetch staff availability for selected date
  const { data: availability } = useQuery({
    queryKey: ['staff-availability', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_availability' as any)
        .select('*, profiles(full_name)')
        .eq('availability_date', selectedDate)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StaffAvailability[];
    },
  });

  // Create roster mutation
  const createRosterMutation = useMutation({
    mutationFn: async (data: typeof newRoster) => {
      const { error } = await supabase
        .from('duty_rosters' as any)
        .insert({
          staff_id: data.staff_id,
          shift_date: data.shift_date,
          shift_start_time: data.shift_start_time,
          shift_end_time: data.shift_end_time,
          shift_type: data.shift_type,
          location: data.location || null,
          notes: data.notes || null,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duty-rosters'] });
      setIsCreateRosterDialogOpen(false);
      setNewRoster({
        staff_id: '',
        shift_date: selectedDate,
        shift_start_time: '08:00',
        shift_end_time: '17:00',
        shift_type: 'morning',
        location: '',
        notes: '',
      });
      toast.success('Duty roster created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: typeof availabilityUpdate) => {
      const { error } = await supabase
        .from('staff_availability' as any)
        .upsert({
          staff_id: data.staff_id,
          availability_date: data.availability_date,
          status: data.status,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          reason: data.reason || null,
          updated_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability'] });
      setIsUpdateAvailabilityDialogOpen(false);
      setAvailabilityUpdate({
        staff_id: '',
        availability_date: selectedDate,
        status: 'available',
        start_time: '',
        end_time: '',
        reason: '',
      });
      toast.success('Availability updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDateChange = (days: number) => {
    const newDate = addDays(new Date(selectedDate), days);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Staff Schedule</h1>
        <p className="text-muted-foreground mt-1">
          Manage duty rosters and staff availability
        </p>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange(-1)}
          >
            ← Previous Day
          </Button>
          <div className="text-center">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40 text-center"
            />
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange(1)}
          >
            Next Day →
          </Button>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'roster' ? 'default' : 'outline'}
          onClick={() => setViewMode('roster')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Duty Rosters
        </Button>
        <Button
          variant={viewMode === 'availability' ? 'default' : 'outline'}
          onClick={() => setViewMode('availability')}
        >
          <Clock className="mr-2 h-4 w-4" />
          Staff Availability
        </Button>
      </div>

      {/* Duty Rosters View */}
      {viewMode === 'roster' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Duty Rosters - {format(new Date(selectedDate), 'MMM d, yyyy')}</CardTitle>
            <PermissionGuard module="staff" action="create">
              <Button
                onClick={() => setIsCreateRosterDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Duty
              </Button>
            </PermissionGuard>
          </CardHeader>
          <CardContent>
            {rostersLoading ? (
              <div className="text-center py-8">Loading rosters...</div>
            ) : rosters && rosters.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Shift Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosters.map((roster) => (
                      <TableRow key={roster.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{roster.profiles?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{roster.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{roster.shift_start_time} - {roster.shift_end_time}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {roster.shift_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {roster.location ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {roster.location}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {roster.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No duty rosters for this date
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staff Availability View */}
      {viewMode === 'availability' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Staff Availability - {format(new Date(selectedDate), 'MMM d, yyyy')}</CardTitle>
            <Button
              onClick={() => setIsUpdateAvailabilityDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Update Status
            </Button>
          </CardHeader>
          <CardContent>
            {availability && availability.length > 0 ? (
              <div className="space-y-3">
                {availability.map((avail) => (
                  <div
                    key={avail.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{avail.profiles?.full_name}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {avail.start_time && avail.end_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {avail.start_time} - {avail.end_time}
                          </div>
                        )}
                        {avail.reason && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {avail.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={`${statusColors[avail.status]} capitalize`}>
                      {avail.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No availability updates for this date
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Duty Roster Dialog */}
      <Dialog open={isCreateRosterDialogOpen} onOpenChange={setIsCreateRosterDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Duty Roster</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createRosterMutation.mutate(newRoster);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="staff">Staff Member *</Label>
              <Select
                value={newRoster.staff_id}
                onValueChange={(value) =>
                  setNewRoster({ ...newRoster, staff_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList?.map((staff: any) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={newRoster.shift_date}
                  onChange={(e) =>
                    setNewRoster({ ...newRoster, shift_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift_type">Shift Type</Label>
                <Select
                  value={newRoster.shift_type}
                  onValueChange={(value) =>
                    setNewRoster({ ...newRoster, shift_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('-', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={newRoster.shift_start_time}
                  onChange={(e) =>
                    setNewRoster({ ...newRoster, shift_start_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={newRoster.shift_end_time}
                  onChange={(e) =>
                    setNewRoster({ ...newRoster, shift_end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newRoster.location}
                onChange={(e) =>
                  setNewRoster({ ...newRoster, location: e.target.value })
                }
                placeholder="e.g., Emergency Ward, Surgery"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newRoster.notes}
                onChange={(e) =>
                  setNewRoster({ ...newRoster, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateRosterDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRosterMutation.isPending}>
                {createRosterMutation.isPending ? 'Creating...' : 'Create Roster'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Availability Dialog */}
      <Dialog open={isUpdateAvailabilityDialogOpen} onOpenChange={setIsUpdateAvailabilityDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Availability Status</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateAvailabilityMutation.mutate(availabilityUpdate);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="staff_avail">Staff Member *</Label>
              <Select
                value={availabilityUpdate.staff_id}
                onValueChange={(value) =>
                  setAvailabilityUpdate({ ...availabilityUpdate, staff_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList?.map((staff: any) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avail_date">Date</Label>
                <Input
                  id="avail_date"
                  type="date"
                  value={availabilityUpdate.availability_date}
                  onChange={(e) =>
                    setAvailabilityUpdate({
                      ...availabilityUpdate,
                      availability_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={availabilityUpdate.status}
                  onValueChange={(value) =>
                    setAvailabilityUpdate({ ...availabilityUpdate, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                    <SelectItem value="lunch">Lunch Break</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                    <SelectItem value="sick_leave">Sick Leave</SelectItem>
                    <SelectItem value="off_duty">Off Duty</SelectItem>
                    <SelectItem value="out">Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time_avail">Start Time (optional)</Label>
                <Input
                  id="start_time_avail"
                  type="time"
                  value={availabilityUpdate.start_time}
                  onChange={(e) =>
                    setAvailabilityUpdate({
                      ...availabilityUpdate,
                      start_time: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time_avail">End Time (optional)</Label>
                <Input
                  id="end_time_avail"
                  type="time"
                  value={availabilityUpdate.end_time}
                  onChange={(e) =>
                    setAvailabilityUpdate({
                      ...availabilityUpdate,
                      end_time: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={availabilityUpdate.reason}
                onChange={(e) =>
                  setAvailabilityUpdate({ ...availabilityUpdate, reason: e.target.value })
                }
                placeholder="e.g., Attending meeting, Doctor's appointment, etc."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateAvailabilityDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateAvailabilityMutation.isPending}>
                {updateAvailabilityMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffSchedule;