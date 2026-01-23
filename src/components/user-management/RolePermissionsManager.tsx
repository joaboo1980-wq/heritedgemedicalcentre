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
  { value: 'staff', label: 'Staff', description: 'Staff directory' },
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
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role Permissions
        </CardTitle>
        <CardDescription>
          Configure what each role can see and do in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
          <TabsList className="grid grid-cols-6 mb-6">
            {ROLES.map((role) => (
              <TabsTrigger 
                key={role.value} 
                value={role.value}
                className="text-xs"
              >
                {role.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map((role) => (
            <TabsContent key={role.value} value={role.value}>
              {selectedRole === 'admin' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  Admin role has full access to all modules and cannot be restricted.
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {MODULES.map((module) => {
                    const permission = getPermissionForModule(module.value);
                    if (!permission) return null;

                    return (
                      <div
                        key={module.value}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{module.label}</h4>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>

                        <div className="flex items-center gap-6">
                          {/* View Permission */}
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${module.value}-view`} className="text-xs text-muted-foreground">
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
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${module.value}-create`} className="text-xs text-muted-foreground">
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
                          <div className="flex items-center gap-2">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${module.value}-edit`} className="text-xs text-muted-foreground">
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
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${module.value}-delete`} className="text-xs text-muted-foreground">
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
