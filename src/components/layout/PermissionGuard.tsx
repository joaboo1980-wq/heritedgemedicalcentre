import { ReactNode } from 'react';
import usePermissions, { ModuleName } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  children: ReactNode;
  module: ModuleName;
  action: 'view' | 'create' | 'edit' | 'delete';
  fallback?: ReactNode;
}

/**
 * A component that conditionally renders children based on user permissions.
 * Use this to wrap buttons, forms, or sections that require specific permissions.
 * 
 * @example
 * <PermissionGuard module="patients" action="create">
 *   <Button>Add Patient</Button>
 * </PermissionGuard>
 */
const PermissionGuard = ({ 
  children, 
  module, 
  action,
  fallback = null 
}: PermissionGuardProps) => {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
