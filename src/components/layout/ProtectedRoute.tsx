import { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import usePermissions, { ModuleName } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  module: ModuleName;
  action?: 'view' | 'create' | 'edit' | 'delete';
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
  fallback 
}: ProtectedRouteProps) => {
  const { loading } = useAuth();
  const { hasPermission, isLoading } = usePermissions();

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission(module, action)) {
    return fallback ? <>{fallback}</> : <DefaultFallback />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
