import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Stethoscope, UserCheck, Grid3x3, List, MoreHorizontal, Shield, Mail, MapPin, Eye, Edit, Calendar, Trash2 } from 'lucide-react';

type AppRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';

interface Department {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  department_id: string | null;
  departments?: Department | null;
  avatar_url: string | null;
  roles: AppRole[];
}

interface DutyRoster {
  id: string;
  staff_id: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_type: string;
  location: string | null;
  notes: string | null;
}

interface StaffAvailability {
  id: string;
  staff_id: string;
  availability_date: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800',
  doctor: 'bg-blue-100 text-blue-800',
  nurse: 'bg-green-100 text-green-800',
  receptionist: 'bg-purple-100 text-purple-800',
  lab_technician: 'bg-orange-100 text-orange-800',
  pharmacist: 'bg-teal-100 text-teal-800',
};

const roleIcons: Record<AppRole, React.ElementType> = {
  admin: UserCheck,
  doctor: Stethoscope,
  nurse: Users,
  receptionist: Users,
  lab_technician: Users,
  pharmacist: Users,
};

const Staff = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<any[]>([]);
  const [isViewProfileDialogOpen, setIsViewProfileDialogOpen] = useState(false);
  const [isEditDetailsDialogOpen, setIsEditDetailsDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch staff with their roles
  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-directory'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          departments!department_id (id, name)
        `)
        .order('full_name');

      if (error) throw error;

      // Get roles for each profile
      const staffWithRoles: StaffMember[] = await Promise.all(
        profiles.map(async (profile: any) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          return {
            ...profile,
            roles: (roles?.map((r) => r.role as AppRole) || []),
          };
        })
      );

      return staffWithRoles;
    },
  });

  // Fetch schedule for selected staff
  const { data: scheduleData } = useQuery({
    queryKey: ['staff-schedule', selectedStaff?.user_id],
    enabled: !!selectedStaff?.user_id && isScheduleDialogOpen,
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch duty rosters
      const { data: rosters } = await supabase
        .from('duty_rosters')
        .select('*')
        .eq('staff_id', selectedStaff!.user_id)
        .eq('shift_date', today);

      // Fetch availability
      const { data: availability } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_id', selectedStaff!.user_id)
        .eq('availability_date', today);

      return {
        rosters: (rosters || []) as DutyRoster[],
        availability: (availability || []) as StaffAvailability[],
      };
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffMember: StaffMember) => {
      try {
        // Call the database function to cascade delete the user
        const { error } = await supabase
          .rpc('delete_user_cascade', {
            p_user_id: staffMember.user_id,
          });
        
        if (error) {
          console.error('Delete cascade error:', error);
          throw new Error(error.message || 'Failed to delete staff member');
        }

        return { success: true };
      } catch (error) {
        console.error('Delete mutation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-directory'] });
      setIsDeleteConfirmDialogOpen(false);
      setStaffToDelete(null);
      toast.success('Staff member deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete staff member');
    },
  });

  const filteredStaff = staff?.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || s.roles.includes(filterRole as AppRole);
    const matchesDepartment = filterDepartment === 'all' || s.department_id === filterDepartment;
    return matchesSearch && matchesRole && matchesDepartment;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const doctorCount = staff?.filter((s) => s.roles.includes('doctor')).length || 0;
  const nurseCount = staff?.filter((s) => s.roles.includes('nurse')).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Staff</h1>
        <p className="text-muted-foreground mt-1">
          View hospital staff directory
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{staff?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Stethoscope className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{doctorCount}</p>
              <p className="text-sm text-muted-foreground">Doctors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{nurseCount}</p>
              <p className="text-sm text-muted-foreground">Nurses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{departments ? departments.length : 0}</p>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Staff Directory</CardTitle>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="lab_technician">Lab Technician</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff?.map((member) => {
                const PrimaryRoleIcon = member.roles[0] ? roleIcons[member.roles[0]] : Users;
                return (
                  <div
                    key={member.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-card"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {member.roles.includes('doctor') && 'Dr. '}
                              {member.full_name}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </p>
                          {member.department && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {member.department}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                                className={`${roleColors[role]} text-xs`}
                              >
                                {role.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaff(member);
                              setIsViewProfileDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View Profile</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaff(member);
                              setIsEditDetailsDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaff(member);
                              setIsScheduleDialogOpen(true);
                            }}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>View Schedule</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaff(member);
                              setIsPermissionsDialogOpen(true);
                            }}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Manage Permissions</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setStaffToDelete(member);
                              setIsDeleteConfirmDialogOpen(true);
                            }}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Staff</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
              {filteredStaff?.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No staff members found
                </div>
              )}
            </div>
          ) : (
            // List View
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {member.roles.includes('doctor') && 'Dr. '}
                            {member.full_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.department || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className={`${roleColors[role]} text-xs`}
                            >
                              {role.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStaff(member);
                                setIsViewProfileDialogOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStaff(member);
                                setIsEditDetailsDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStaff(member);
                                setIsScheduleDialogOpen(true);
                              }}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              <span>View Schedule</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStaff(member);
                                setIsPermissionsDialogOpen(true);
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              <span>Manage Permissions</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setStaffToDelete(member);
                                setIsDeleteConfirmDialogOpen(true);
                              }}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Staff</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStaff?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No staff members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Profile Dialog */}
      <Dialog open={isViewProfileDialogOpen} onOpenChange={setIsViewProfileDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Profile</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-6">
              <div className="flex items-center gap-6 pb-4 border-b">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={selectedStaff.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {getInitials(selectedStaff.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-semibold">
                    {selectedStaff.roles.includes('doctor') && 'Dr. '}
                    {selectedStaff.full_name}
                  </h3>
                  <p className="text-muted-foreground">{selectedStaff.email}</p>
                  {selectedStaff.department && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedStaff.department}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedStaff.roles.map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className={`${roleColors[role]}`}
                      >
                        {role.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedStaff.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedStaff.department || 'Not assigned'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsViewProfileDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={isEditDetailsDialogOpen} onOpenChange={setIsEditDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Details</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input value={selectedStaff.full_name} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={selectedStaff.email} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select value={selectedStaff.department_id || ''} onValueChange={(value) => {
                  // This would be handled by the save logic
                  if (selectedStaff) {
                    selectedStaff.department_id = value;
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist'].map((role) => (
                    <Badge
                      key={role}
                      variant={selectedStaff.roles.includes(role as AppRole) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        // Toggle role logic would go here
                      }}
                    >
                      {role.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDetailsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Save changes logic
                    setIsEditDetailsDialogOpen(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Permissions - {selectedStaff?.roles.includes('doctor') && 'Dr. '}
              {selectedStaff?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-6">
              {/* Staff Info */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedStaff.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(selectedStaff.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedStaff.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStaff.email}</p>
                  {selectedStaff.department && (
                    <p className="text-sm text-muted-foreground">{selectedStaff.department}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedStaff.roles.map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className={`${roleColors[role]} text-xs`}
                      >
                        {role.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Permissions Grid */}
              <div className="space-y-4">
                <h4 className="font-semibold">Module Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['dashboard', 'patients', 'appointments', 'laboratory', 'pharmacy', 'billing', 'reports', 'accounts', 'staff', 'user_management'].map((module) => (
                    <div key={module} className="border rounded-lg p-4 space-y-3">
                      <h5 className="font-medium capitalize">{module.replace('_', ' ')}</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>View</span>
                          <input type="checkbox" defaultChecked className="w-4 h-4" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Create</span>
                          <input type="checkbox" className="w-4 h-4" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Edit</span>
                          <input type="checkbox" className="w-4 h-4" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Delete</span>
                          <input type="checkbox" className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPermissionsDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // Save permissions
                    setIsPermissionsDialogOpen(false);
                  }}
                >
                  Save Permissions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Staff Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStaff?.full_name} - Schedule ({format(new Date(), 'MMMM dd, yyyy')})
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-6">
              {/* Duty Rosters */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Duty Schedule</h4>
                {scheduleData?.rosters && scheduleData.rosters.length > 0 ? (
                  <div className="space-y-2">
                    {scheduleData.rosters.map((roster) => (
                      <div key={roster.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800">
                                {roster.shift_type}
                              </Badge>
                              <span className="font-semibold">
                                {roster.shift_start_time} - {roster.shift_end_time}
                              </span>
                            </div>
                            {roster.location && (
                              <p className="text-sm text-muted-foreground mt-1">
                                📍 {roster.location}
                              </p>
                            )}
                            {roster.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                📝 {roster.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">No duty shifts scheduled for today</p>
                )}
              </div>

              {/* Availability Status */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-semibold text-lg">Availability Status</h4>
                {scheduleData?.availability && scheduleData.availability.length > 0 ? (
                  <div className="space-y-2">
                    {scheduleData.availability.map((avail) => {
                      const statusColors: Record<string, string> = {
                        available: 'bg-green-100 text-green-800',
                        unavailable: 'bg-red-100 text-red-800',
                        lunch: 'bg-yellow-100 text-yellow-800',
                        break: 'bg-orange-100 text-orange-800',
                        sick_leave: 'bg-red-100 text-red-800',
                        off_duty: 'bg-gray-100 text-gray-800',
                        out: 'bg-purple-100 text-purple-800',
                      };

                      return (
                        <div key={avail.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className={statusColors[avail.status] || 'bg-gray-100 text-gray-800'}>
                                  {avail.status.replace('_', ' ')}
                                </Badge>
                                {avail.start_time && avail.end_time && (
                                  <span className="text-sm text-muted-foreground">
                                    {avail.start_time} - {avail.end_time}
                                  </span>
                                )}
                              </div>
                              {avail.reason && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Reason: {avail.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">No availability updates for today</p>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsScheduleDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
          </DialogHeader>
          {staffToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-900 font-semibold">⚠️ Warning</p>
                <p className="text-red-800 text-sm mt-2">
                  This action cannot be undone. All data associated with this staff member will be permanently deleted.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Are you sure you want to delete:</p>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={staffToDelete.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(staffToDelete.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {staffToDelete.roles.includes('doctor') && 'Dr. '}
                      {staffToDelete.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{staffToDelete.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteConfirmDialogOpen(false);
                    setStaffToDelete(null);
                  }}
                  disabled={deleteStaffMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => staffToDelete && deleteStaffMutation.mutate(staffToDelete)}
                  disabled={deleteStaffMutation.isPending}
                >
                  {deleteStaffMutation.isPending ? 'Deleting...' : 'Delete Staff Member'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;