import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ModuleName = 
  | 'dashboard' 
  | 'patients' 
  | 'appointments' 
  | 'laboratory' 
  | 'pharmacy' 
  | 'billing' 
  | 'reports' 
  | 'accounts'
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

  console.log('[usePermissions] user:', !!user, 'roles:', roles, 'isAdmin:', isAdmin);

  // Fetch all permissions for current user's roles
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id, roles],
    queryFn: async () => {
      console.log('[usePermissions] Query running with roles:', roles);
      // If admin, grant all permissions without querying
      if (isAdmin) {
        console.log('[usePermissions] User is admin, returning all permissions');
        return [
          { role: 'admin', module: 'dashboard', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'patients', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'appointments', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'laboratory', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'pharmacy', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'billing', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'accounts', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'staff', can_view: true, can_create: true, can_edit: true, can_delete: true },
          { role: 'admin', module: 'user_management', can_view: true, can_create: true, can_edit: true, can_delete: true },
        ] as RolePermission[];
      }
      
      if (!user || !roles || roles.length === 0) {
        console.log('[usePermissions] No user or roles, returning empty');
        return [];
      }
      
      console.log('[usePermissions] Fetching permissions for roles:', roles);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .in('role', roles);

      if (error) {
        console.error('Permission fetch error:', error);
        return [];
      }
      console.log('[usePermissions] Permissions fetched:', data?.length);
      return data as RolePermission[];
    },
    // Only enable query when user is authenticated AND roles are loaded and not empty
    enabled: !!user && !!roles && roles.length > 0,
  });

  console.log('[usePermissions] isLoading:', isLoading, 'permissions:', permissions?.length || 0);

  // Check if user has permission for a specific module and action
  const hasPermission = (module: ModuleName, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    console.log(`[hasPermission] Checking ${module}.${action} | isAdmin: ${isAdmin}, permissions available: ${permissions?.length || 0}`);
    
    // Admins always have full access
    if (isAdmin) {
      console.log(`[hasPermission] ALLOW - User is admin`);
      return true;
    }
    
    // Special handling for dashboard - any user should have access to dashboard module
    // as they'll be routed to their role-specific dashboard
    if (module === 'dashboard') {
      console.log(`[hasPermission] ALLOW - Dashboard module has special access for all users`);
      return true;
    }
    
    if (!permissions || permissions.length === 0) {
      console.log(`[hasPermission] DENY - No permissions data available`);
      return false;
    }
    
    const modulePermissions = permissions.filter(p => p.module === module);
    console.log(`[hasPermission] Found ${modulePermissions.length} permissions for module ${module}:`, modulePermissions);
    
    const result = modulePermissions.some(p => {
      const canPerform = (() => {
        switch (action) {
          case 'view': return p.can_view;
          case 'create': return p.can_create;
          case 'edit': return p.can_edit;
          case 'delete': return p.can_delete;
          default: return false;
        }
      })();
      console.log(`  - Role '${p.role}' can_${action}: ${canPerform}`);
      return canPerform;
    });
    
    console.log(`[hasPermission] ${result ? 'ALLOW' : 'DENY'} - ${module}.${action}`);
    return result;
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
