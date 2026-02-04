import { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import usePermissions, { ModuleName } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';

type AppRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';

interface ProtectedRouteProps {
  children: ReactNode;
  module: ModuleName;
  action?: 'view' | 'create' | 'edit' | 'delete';
  requiredRole?: AppRole;
  fallback?: ReactNode;
}

const DefaultFallback = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <Shield className="h-16 w-16 text-muted-foreground mb-4" />
    <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
    <p className="text-muted-foreground">
      You don't have permission to access this page.
    </p>
  </div>
);

const ProtectedRoute = ({ 
  children, 
  module, 
  action = 'view',
  requiredRole,
  fallback 
}: ProtectedRouteProps) => {
  const { loading, roles } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  console.log(`[ProtectedRoute] module: ${module}, action: ${action}, requiredRole: ${requiredRole}`);
  console.log(`[ProtectedRoute] loading: ${loading}, permissionsLoading: ${permissionsLoading}, roles: ${roles?.length || 0}`);

  // Wait for both auth loading and permissions loading
  // Also wait if roles haven't been loaded yet (empty array means not loaded)
  if (loading || permissionsLoading || !roles || roles.length === 0) {
    console.log(`[ProtectedRoute] Showing loading spinner - loading: ${loading}, permissionsLoading: ${permissionsLoading}, roles: ${roles?.length || 0}`);
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Allow admins to access all role-based dashboards (for testing/management)
  const isAdmin = roles.includes('admin');
  
  // Check if user has the required role for this dashboard
  if (requiredRole) {
    const hasRequiredRole = roles.includes(requiredRole);
    console.log(`[ProtectedRoute] Role check - requiredRole: ${requiredRole}, hasRequiredRole: ${hasRequiredRole}, isAdmin: ${isAdmin}`);
    if (!hasRequiredRole && !isAdmin) {
      console.log(`[ProtectedRoute] DENY - Required role ${requiredRole} not found`);
      return fallback ? <>{fallback}</> : <DefaultFallback />;
    }
  }

  const hasPerms = hasPermission(module, action);
  console.log(`[ProtectedRoute] Permission check - module: ${module}, action: ${action}, result: ${hasPerms}`);
  
  if (!hasPerms) {
    console.log(`[ProtectedRoute] DENY - Permission check failed for ${module}.${action}`);
    return fallback ? <>{fallback}</> : <DefaultFallback />;
  }

  console.log(`[ProtectedRoute] ALLOW - ${module}.${action}`);
  return <>{children}</>;
};

export default ProtectedRoute;
