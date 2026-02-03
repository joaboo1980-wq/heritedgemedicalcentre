import { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import usePermissions, { ModuleName } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

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
  const { hasPermission, isLoading } = usePermissions();

  // Wait for both auth loading and permissions loading
  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Allow admins to access all role-based dashboards (for testing/management)
  const isAdmin = roles && roles.length > 0 && roles.includes('admin');
  
  // Check if user has the required role for this dashboard
  if (requiredRole) {
    const hasRequiredRole = roles && roles.includes(requiredRole);
    if (!hasRequiredRole && !isAdmin) {
      return fallback ? <>{fallback}</> : <DefaultFallback />;
    }
  }

  if (!hasPermission(module, action)) {
    return fallback ? <>{fallback}</> : <DefaultFallback />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
