import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  UserCog, 
  FlaskConical, 
  Pill, 
  BarChart3,
  Heart,
  ChevronDown,
  Settings,
  Receipt,
  FileText,
  Shield,
  LucideIcon,
  Menu,
  X,
  DollarSign,
  Stethoscope,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import usePermissions, { ModuleName } from '@/hooks/usePermissions';

type AppRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  module: ModuleName;
}

const roleDashboardMap: Record<AppRole, string> = {
  receptionist: "/reception-dashboard",
  doctor: "/doctor-dashboard",
  lab_technician: "/laboratory-dashboard",
  nurse: "/nursing-dashboard",
  pharmacist: "/pharmacy-dashboard",
  admin: "/admin-dashboard",
};

const navItems: NavItem[] = [
  { icon: Users, label: 'Patients', href: '/patients', module: 'patients' },
  { icon: Stethoscope, label: 'Doctor Examination', href: '/doctor-examination', module: 'patients' },
  { icon: Calendar, label: 'Appointments', href: '/appointments', module: 'appointments' },
  { icon: UserCog, label: 'Staff', href: '/staff', module: 'staff' },
  { icon: Clock, label: 'Staff Schedule', href: '/staff-schedule', module: 'staff' },
  { icon: FlaskConical, label: 'Laboratory', href: '/laboratory', module: 'laboratory' },
  { icon: Pill, label: 'Pharmacy', href: '/pharmacy', module: 'pharmacy' },
  { icon: Receipt, label: 'Billing', href: '/billing', module: 'billing' },
  { icon: FileText, label: 'Invoices', href: '/invoices', module: 'billing' },
  { icon: DollarSign, label: 'Accounts', href: '/accounts', module: 'accounts' },
  { icon: BarChart3, label: 'Reports', href: '/reports', module: 'reports' },
];

const adminItems = [
  { icon: Settings, label: 'User Management', href: '/admin/users' },
];

const Sidebar = () => {
  const location = useLocation();
  const { profile, roles, isAdmin } = useAuth();
  const { canAccessModule } = usePermissions();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleLabel = () => {
    if (roles.length === 0) return 'Staff';
    return roles[0].charAt(0).toUpperCase() + roles[0].slice(1).replace('_', ' ');
  };

  // Get the dashboard href based on user's primary role
  const getDashboardHref = () => {
    const primaryRole = (roles && roles.length > 0 ? roles[0] : 'admin') as AppRole;
    return roleDashboardMap[primaryRole] || '/dashboard';
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-primary text-primary-foreground flex flex-col transition-all duration-300 ease-in-out z-40",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Logo and Toggle */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-white/10 rounded-lg">
              <Heart className="h-6 w-6" />
            </div>
            <span className="font-semibold text-lg">Heritage Medical</span>
          </div>
        )}
        {isCollapsed && (
          <div className="p-2 bg-white/10 rounded-lg">
            <Heart className="h-6 w-6" />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm"
          className="hover:bg-white/10"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Role indicator */}
      {!isCollapsed && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <span>{getRoleLabel()}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-xs font-medium text-primary-foreground/50 uppercase tracking-wider mb-3 px-3">
            Navigation
          </p>
        )}
        <ul className="space-y-1">
          {/* Dashboard Link - Routes to role-specific dashboard */}
          <li title={isCollapsed ? 'Dashboard' : undefined}>
            <Link
              to={getDashboardHref()}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors justify-center lg:justify-start',
                (location.pathname === getDashboardHref() || 
                 location.pathname === '/reception-dashboard' || 
                 location.pathname === '/doctor-dashboard' ||
                 location.pathname === '/laboratory-dashboard' ||
                 location.pathname === '/nursing-dashboard' ||
                 location.pathname === '/pharmacy-dashboard' ||
                 location.pathname === '/admin-dashboard' ||
                 location.pathname === '/dashboard')
                  ? 'bg-white text-primary font-medium' 
                  : 'hover:bg-white/10 text-primary-foreground'
              )}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
          </li>
          
          {navItems
            .filter((item) => canAccessModule(item.module))
            .map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.href} title={isCollapsed ? item.label : undefined}>
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors justify-center lg:justify-start',
                      isActive 
                        ? 'bg-white text-primary font-medium' 
                        : 'hover:bg-white/10 text-primary-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
        </ul>

        {/* Admin Section */}
        {isAdmin && (
          <>
            {!isCollapsed && (
              <p className="text-xs font-medium text-primary-foreground/50 uppercase tracking-wider mb-3 px-3 mt-6">
                Administration
              </p>
            )}
            <ul className="space-y-1">
              {adminItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href} title={isCollapsed ? item.label : undefined}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors justify-center lg:justify-start',
                        isActive 
                          ? 'bg-white text-primary font-medium' 
                          : 'hover:bg-white/10 text-primary-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <ThemeToggle />
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-primary-foreground hover:bg-white/10"
              onClick={() => {/* Add logout functionality */}}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white/20 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-white/20 text-primary-foreground text-sm">
              {profile?.full_name ? getInitials(profile.full_name) : 'U'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-primary-foreground/60 truncate">
                {getRoleLabel()}
              </p>
            </div>
          )}
          {!isCollapsed && <ChevronDown className="h-4 w-4 text-primary-foreground/60 flex-shrink-0" />}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;