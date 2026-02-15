import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import type { ModuleName, RolePermission } from '@/hooks/usePermissions';

type AppRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';

const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'doctor', label: 'Doctor', color: 'bg-blue-100 text-blue-800' },
  { value: 'nurse', label: 'Nurse', color: 'bg-green-100 text-green-800' },
  { value: 'receptionist', label: 'Receptionist', color: 'bg-purple-100 text-purple-800' },
  { value: 'lab_technician', label: 'Lab Technician', color: 'bg-orange-100 text-orange-800' },
  { value: 'pharmacist', label: 'Pharmacist', color: 'bg-teal-100 text-teal-800' },
];

const MODULES: { value: ModuleName; label: string; description: string }[] = [
  { value: 'dashboard', label: 'Dashboard', description: 'Main overview and statistics' },
  { value: 'patients', label: 'Patients', description: 'Patient records and management' },
  { value: 'appointments', label: 'Appointments', description: 'Scheduling and bookings' },
  { value: 'laboratory', label: 'Laboratory', description: 'Lab tests and results' },
  { value: 'pharmacy', label: 'Pharmacy', description: 'Medications and inventory' },
  { value: 'billing', label: 'Billing', description: 'Invoices and payments' },
  { value: 'reports', label: 'Reports', description: 'Analytics and reports' },
  { value: 'generate_reports', label: 'Generate Reports', description: 'Staff report generation' },
  { value: 'accounts', label: 'Accounts', description: 'Financial accounts and transactions' },
  { value: 'staff', label: 'Staff', description: 'Staff directory' },
  { value: 'staff_schedule', label: 'Staff Schedule', description: 'Work schedules and assignments' },
  { value: 'user_management', label: 'User Management', description: 'User accounts and roles' },
];

const RolePermissionsManager = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<AppRole>('doctor');

  // Fetch permissions for selected role
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['role-permissions', selectedRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', selectedRole);

      if (error) throw error;
      return data as RolePermission[];
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      permissionId,
      field,
      value,
    }: {
      permissionId: string;
      field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
      value: boolean;
    }) => {
      const { error } = await supabase
        .from('role_permissions')
        .update({ [field]: value })
        .eq('id', permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedRole] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permission updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getPermissionForModule = (module: ModuleName): RolePermission | undefined => {
    return permissions?.find(p => p.module === module);
  };

  const handleToggle = (
    permissionId: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    currentValue: boolean
  ) => {
    // Prevent disabling admin permissions
    if (selectedRole === 'admin') {
      toast.error('Admin permissions cannot be modified');
      return;
    }

    updatePermissionMutation.mutate({
      permissionId,
      field,
      value: !currentValue,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
          <Shield className="h-5 w-5" />
          Role Permissions
        </CardTitle>
        <CardDescription>
          Configure what each role can see and do in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
          {/* Role Tabs - Responsive Grid */}
          <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6 w-full">
            {ROLES.map((role) => (
              <TabsTrigger 
                key={role.value} 
                value={role.value}
                className="text-xs md:text-sm"
              >
                <span className="hidden sm:inline">{role.label}</span>
                <span className="sm:hidden">{role.label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map((role) => (
            <TabsContent key={role.value} value={role.value}>
              {selectedRole === 'admin' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs md:text-sm">
                  Admin role has full access to all modules and cannot be restricted.
                </div>
              )}

              {selectedRole !== 'admin' && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs md:text-sm">
                  <strong>Dashboard Access:</strong> Each role automatically has access to their specific role dashboard:
                  <ul className="mt-2 ml-4 list-disc text-xs">
                    <li><strong>Receptionist</strong> → Reception Dashboard</li>
                    <li><strong>Doctor</strong> → Doctor Dashboard</li>
                    <li><strong>Nurse</strong> → Nursing Dashboard</li>
                    <li><strong>Lab Technician</strong> → Laboratory Dashboard</li>
                    <li><strong>Pharmacist</strong> → Pharmacy Dashboard</li>
                  </ul>
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {MODULES.map((module) => {
                    const permission = getPermissionForModule(module.value);
                    if (!permission) return null;

                    return (
                      <div
                        key={module.value}
                        className="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3 md:gap-0"
                      >
                        {/* Module Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm md:text-base">{module.label}</h4>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">{module.description}</p>
                        </div>

                        {/* Permissions Grid - Responsive */}
                        <div className="grid grid-cols-2 md:flex md:items-center md:gap-6 gap-3 w-full md:w-auto">
                          {/* View Permission */}
                          <div className="flex items-center gap-2 bg-slate-50 md:bg-transparent p-2 md:p-0 rounded">
                            <Eye className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                            <Label htmlFor={`${module.value}-view`} className="text-xs md:text-xs text-muted-foreground hidden md:inline">
                              View
                            </Label>
                            <Switch
                              id={`${module.value}-view`}
                              checked={permission.can_view}
                              onCheckedChange={() =>
                                handleToggle(permission.id, 'can_view', permission.can_view)
                              }
                              disabled={selectedRole === 'admin' || updatePermissionMutation.isPending}
                            />
                          </div>

                          {/* Create Permission */}
                          <div className="flex items-center gap-2 bg-slate-50 md:bg-transparent p-2 md:p-0 rounded">
                            <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                            <Label htmlFor={`${module.value}-create`} className="text-xs md:text-xs text-muted-foreground hidden md:inline">
                              Create
                            </Label>
                            <Switch
                              id={`${module.value}-create`}
                              checked={permission.can_create}
                              onCheckedChange={() =>
                                handleToggle(permission.id, 'can_create', permission.can_create)
                              }
                              disabled={selectedRole === 'admin' || updatePermissionMutation.isPending}
                            />
                          </div>

                          {/* Edit Permission */}
                          <div className="flex items-center gap-2 bg-slate-50 md:bg-transparent p-2 md:p-0 rounded">
                            <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                            <Label htmlFor={`${module.value}-edit`} className="text-xs md:text-xs text-muted-foreground hidden md:inline">
                              Edit
                            </Label>
                            <Switch
                              id={`${module.value}-edit`}
                              checked={permission.can_edit}
                              onCheckedChange={() =>
                                handleToggle(permission.id, 'can_edit', permission.can_edit)
                              }
                              disabled={selectedRole === 'admin' || updatePermissionMutation.isPending}
                            />
                          </div>

                          {/* Delete Permission */}
                          <div className="flex items-center gap-2 bg-slate-50 md:bg-transparent p-2 md:p-0 rounded">
                            <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                            <Label htmlFor={`${module.value}-delete`} className="text-xs md:text-xs text-muted-foreground hidden md:inline">
                              Delete
                            </Label>
                            <Switch
                              id={`${module.value}-delete`}
                              checked={permission.can_delete}
                              onCheckedChange={() =>
                                handleToggle(permission.id, 'can_delete', permission.can_delete)
                              }
                              disabled={selectedRole === 'admin' || updatePermissionMutation.isPending}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RolePermissionsManager;
