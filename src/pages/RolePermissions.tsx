import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Save, RotateCcw } from 'lucide-react';
import { useState, useMemo } from 'react';

interface RolePermission {
  id: string;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface PermissionChange {
  id: string;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const roles = ['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist'];

const modules = [
  'dashboard',
  'patients',
  'appointments',
  'laboratory',
  'pharmacy',
  'billing',
  'reports',
  'generate_reports',
  'accounts',
  'staff',
  'staff_schedule',
  'user_management',
];

const RolePermissions = () => {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all role permissions
  const { data: fetchedPermissions, isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role')
        .order('module');

      if (error) {
        console.error('Error fetching permissions:', error);
        throw error;
      }

      return data as RolePermission[];
    },
    onSuccess: (data) => {
      setPermissions(data || []);
      setHasChanges(false);
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async (updatedPermissions: PermissionChange[]) => {
      if (!updatedPermissions || updatedPermissions.length === 0) {
        console.warn('[RolePermissions] No permissions to update');
        throw new Error('No permissions to update');
      }

      try {
        // Update each permission that changed
        for (const perm of updatedPermissions) {
          if (!perm.id?.trim()) {
            console.warn('[RolePermissions] Permission ID is missing');
            throw new Error('Permission ID is missing');
          }

          const { error } = await supabase
            .from('role_permissions')
            .update({
              can_view: perm.can_view,
              can_create: perm.can_create,
              can_edit: perm.can_edit,
              can_delete: perm.can_delete,
            })
            .eq('id', perm.id);

          if (error) {
            console.error('[RolePermissions] Error updating permission:', perm.id, error);
            throw error;
          }
        }
        console.log('[RolePermissions] Permissions updated successfully');
      } catch (err) {
        console.error('[RolePermissions] Permission update failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setHasChanges(false);
      toast.success('Permissions updated successfully');
    },
    onError: (error: Error) => {
      console.error('[RolePermissions] Mutation error:', error.message);
      toast.error(`Failed to update permissions: ${error.message}`);
    },
  });

  // Handle permission toggle
  const handlePermissionChange = (
    permId: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setPermissions((prev) =>
      prev.map((perm) =>
        perm.id === permId ? { ...perm, [field]: value } : perm
      )
    );
    setHasChanges(true);
  };

  // Save changes
  const handleSave = () => {
    const changedPermissions = permissions.filter(
      (perm) =>
        fetchedPermissions?.some(
          (original) =>
            original.id === perm.id &&
            (original.can_view !== perm.can_view ||
              original.can_create !== perm.can_create ||
              original.can_edit !== perm.can_edit ||
              original.can_delete !== perm.can_delete)
        )
    );

    if (changedPermissions.length === 0) {
      toast.info('No changes to save');
      return;
    }

    updatePermissionMutation.mutate(changedPermissions);
  };

  // Reset changes
  const handleReset = () => {
    if (fetchedPermissions) {
      setPermissions(fetchedPermissions);
      setHasChanges(false);
      toast.info('Changes discarded');
    }
  };

  // Get permission for a specific role and module
  const getPermission = (role: string, module: string) => {
    return permissions.find((p) => p.role === role && p.module === module);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Role Permissions</h1>
        <p className="text-muted-foreground mt-1">Configure what each role can see and do in the system</p>
      </div>

      {/* Actions Bar */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updatePermissionMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updatePermissionMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          onClick={handleReset}
          disabled={!hasChanges}
          variant="outline"
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Discard Changes
        </Button>
        {hasChanges && <div className="text-sm text-yellow-600 flex items-center">● Unsaved changes</div>}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Module Access & Actions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold bg-muted">Module</th>
                {roles.map((role) => (
                  <th
                    key={role}
                    colSpan={4}
                    className="text-center py-3 px-4 font-semibold bg-primary text-primary-foreground"
                  >
                    {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                <th className="text-left py-2 px-4 text-xs font-medium">.</th>
                {roles.map((role) => (
                  <th key={`${role}-view`} className="text-center py-2 px-2 text-xs font-medium">
                    View
                  </th>
                ))}
                {roles.map((role) => (
                  <th key={`${role}-create`} className="text-center py-2 px-2 text-xs font-medium">
                    Create
                  </th>
                ))}
                {roles.map((role) => (
                  <th key={`${role}-edit`} className="text-center py-2 px-2 text-xs font-medium">
                    Edit
                  </th>
                ))}
                {roles.map((role) => (
                  <th key={`${role}-delete`} className="text-center py-2 px-2 text-xs font-medium">
                    Delete
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module} className="border-b hover:bg-muted/50 transition">
                  <td className="py-3 px-4 font-medium text-sm bg-muted/30 sticky left-0">
                    {module.replace('_', ' ').charAt(0).toUpperCase() + module.replace('_', ' ').slice(1)}
                  </td>

                  {/* View Permissions */}
                  {roles.map((role) => {
                    const perm = getPermission(role, module);
                    return (
                      <td key={`${role}-${module}-view`} className="text-center py-3 px-2">
                        <Checkbox
                          checked={perm?.can_view || false}
                          onCheckedChange={(checked) =>
                            perm && handlePermissionChange(perm.id, 'can_view', checked as boolean)
                          }
                          className="mx-auto"
                        />
                      </td>
                    );
                  })}

                  {/* Create Permissions */}
                  {roles.map((role) => {
                    const perm = getPermission(role, module);
                    return (
                      <td key={`${role}-${module}-create`} className="text-center py-3 px-2">
                        <Checkbox
                          checked={perm?.can_create || false}
                          onCheckedChange={(checked) =>
                            perm && handlePermissionChange(perm.id, 'can_create', checked as boolean)
                          }
                          disabled={!perm?.can_view}
                          className="mx-auto"
                        />
                      </td>
                    );
                  })}

                  {/* Edit Permissions */}
                  {roles.map((role) => {
                    const perm = getPermission(role, module);
                    return (
                      <td key={`${role}-${module}-edit`} className="text-center py-3 px-2">
                        <Checkbox
                          checked={perm?.can_edit || false}
                          onCheckedChange={(checked) =>
                            perm && handlePermissionChange(perm.id, 'can_edit', checked as boolean)
                          }
                          disabled={!perm?.can_view}
                          className="mx-auto"
                        />
                      </td>
                    );
                  })}

                  {/* Delete Permissions */}
                  {roles.map((role) => {
                    const perm = getPermission(role, module);
                    return (
                      <td key={`${role}-${module}-delete`} className="text-center py-3 px-2">
                        <Checkbox
                          checked={perm?.can_delete || false}
                          onCheckedChange={(checked) =>
                            perm && handlePermissionChange(perm.id, 'can_delete', checked as boolean)
                          }
                          disabled={!perm?.can_view}
                          className="mx-auto"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Legend:</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">View:</span> Can see the module/page
              </div>
              <div>
                <span className="font-medium">Create:</span> Can create new records
              </div>
              <div>
                <span className="font-medium">Edit:</span> Can modify existing records
              </div>
              <div>
                <span className="font-medium">Delete:</span> Can remove records
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Note: Create, Edit, and Delete permissions are disabled until View is enabled for that module.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissions;
