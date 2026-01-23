import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ModuleName = 
  | 'dashboard' 
  | 'patients' 
  | 'appointments' 
  | 'laboratory' 
  | 'pharmacy' 
  | 'billing' 
  | 'reports' 
  | 'staff' 
  | 'user_management';

export interface RolePermission {
  id: string;
  role: string;
  module: ModuleName;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface ModulePermission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const usePermissions = () => {
  const { user, roles, isAdmin } = useAuth();

  // Fetch all permissions for current user's roles
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id, roles],
    queryFn: async () => {
      if (!user || roles.length === 0) return [];
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .in('role', roles);

      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!user && roles.length > 0,
  });

  // Check if user has permission for a specific module and action
  const hasPermission = (module: ModuleName, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    // Admins always have full access
    if (isAdmin) return true;
    
    if (!permissions) return false;
    
    const modulePermissions = permissions.filter(p => p.module === module);
    
    return modulePermissions.some(p => {
      switch (action) {
        case 'view': return p.can_view;
        case 'create': return p.can_create;
        case 'edit': return p.can_edit;
        case 'delete': return p.can_delete;
        default: return false;
      }
    });
  };

  // Get aggregated permissions for a module (OR of all role permissions)
  const getModulePermissions = (module: ModuleName): ModulePermission => {
    if (isAdmin) {
      return { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }

    if (!permissions) {
      return { canView: false, canCreate: false, canEdit: false, canDelete: false };
    }

    const modulePermissions = permissions.filter(p => p.module === module);
    
    return {
      canView: modulePermissions.some(p => p.can_view),
      canCreate: modulePermissions.some(p => p.can_create),
      canEdit: modulePermissions.some(p => p.can_edit),
      canDelete: modulePermissions.some(p => p.can_delete),
    };
  };

  // Check if user can access a module at all
  const canAccessModule = (module: ModuleName): boolean => {
    return hasPermission(module, 'view');
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    getModulePermissions,
    canAccessModule,
  };
};

export default usePermissions;
