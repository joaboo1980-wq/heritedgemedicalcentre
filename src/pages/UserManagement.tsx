import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Search, Shield, UserCog, Settings } from 'lucide-react';
import RolePermissionsManager from '@/components/user-management/RolePermissionsManager';

type AppRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  roles: AppRole[];
}

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800',
  doctor: 'bg-blue-100 text-blue-800',
  nurse: 'bg-green-100 text-green-800',
  receptionist: 'bg-purple-100 text-purple-800',
  lab_technician: 'bg-orange-100 text-orange-800',
  pharmacist: 'bg-teal-100 text-teal-800',
};

const UserManagement = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'doctor' as AppRole,
  });

  // Fetch staff with their roles
  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-management'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, department')
        .order('full_name');

      if (error) throw error;

      // Get roles for each profile
      const staffWithRoles: StaffMember[] = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          return {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            department: profile.department,
            roles: (roles?.map((r) => r.role as AppRole) || []),
          } as StaffMember;
        })
      );

      return staffWithRoles;
    },
    enabled: isAdmin,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      // Validate inputs
      if (!userData.email || !userData.password || !userData.full_name) {
        throw new Error('Email, password, and full name are required');
      }

      if (userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      try {
        // Get the current admin's session before creating the new user
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        
        if (!adminSession) {
          throw new Error('Admin session not found');
        }

        // Create auth user via signUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email.trim().toLowerCase(),
          password: userData.password,
          options: {
            data: {
              full_name: userData.full_name,
            },
          },
        });

        if (authError) {
          console.error('Auth error details:', authError);
          throw authError;
        }

        if (!authData.user) {
          throw new Error('User creation failed - no user returned');
        }

        const newUserId = authData.user.id;

        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: newUserId,
          full_name: userData.full_name.trim(),
          email: userData.email.trim().toLowerCase(),
        });

        if (profileError) {
          console.error('Profile error:', profileError);
          throw profileError;
        }

        // Assign role
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: newUserId,
          role: userData.role,
        });

        if (roleError) {
          console.error('Role error:', roleError);
          throw roleError;
        }

        // Restore the admin's session to prevent auto-login of new user
        const { error: restoreError } = await supabase.auth.setSession(adminSession);
        if (restoreError) {
          console.error('Error restoring admin session:', restoreError);
          // Continue anyway, the user was created successfully
        }

        return authData.user;
      } catch (error) {
        console.error('User creation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-management'] });
      setIsAddDialogOpen(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'doctor',
      });
      toast.success('Staff member created successfully');
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      const errorMessage = error.message || 'Failed to create staff member';
      toast.error(errorMessage);
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-management'] });
      toast.success('Role added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-management'] });
      toast.success('Role removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredStaff = staff?.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You need administrator privileges to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage staff accounts, roles, and permissions
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" title="Add New Staff Member">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff member account and assign roles.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                
                // Client-side validation
                if (!newUser.email.includes('@')) {
                  toast.error('Please enter a valid email address');
                  return;
                }
                if (newUser.password.length < 6) {
                  toast.error('Password must be at least 6 characters');
                  return;
                }
                if (!newUser.full_name.trim()) {
                  toast.error('Full name is required');
                  return;
                }
                
                createUserMutation.mutate(newUser);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: AppRole) =>
                    setNewUser({ ...newUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="lab_technician">Lab Technician</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create Staff Member'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff" className="gap-2">
            <UserCog className="h-4 w-4" />
            Staff Management
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Settings className="h-4 w-4" />
            Role Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Staff Directory
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
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
                        <TableCell className="font-medium">
                          {member.full_name}
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.department || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {member.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                                className={`${roleColors[role]} cursor-pointer hover:opacity-80`}
                                onClick={() =>
                                  removeRoleMutation.mutate({
                                    userId: member.user_id,
                                    role,
                                  })
                                }
                              >
                                {role.replace('_', ' ')} ×
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            onValueChange={(role: AppRole) =>
                              addRoleMutation.mutate({ userId: member.user_id, role })
                            }
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Add role" />
                            </SelectTrigger>
                            <SelectContent>
                              {(['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist'] as AppRole[])
                                .filter((r) => !member.roles.includes(r))
                                .map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role.replace('_', ' ')}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <RolePermissionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;