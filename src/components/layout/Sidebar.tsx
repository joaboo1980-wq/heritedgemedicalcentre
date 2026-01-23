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
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Patients', href: '/patients' },
  { icon: Calendar, label: 'Appointments', href: '/appointments' },
  { icon: UserCog, label: 'Staff', href: '/staff' },
  { icon: FlaskConical, label: 'Laboratory', href: '/laboratory' },
  { icon: Pill, label: 'Pharmacy', href: '/pharmacy' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
];

const adminItems = [
  { icon: Settings, label: 'User Management', href: '/admin/users' },
];

const Sidebar = () => {
  const location = useLocation();
  const { profile, roles, isAdmin } = useAuth();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleLabel = () => {
    if (roles.length === 0) return 'Staff';
    return roles[0].charAt(0).toUpperCase() + roles[0].slice(1).replace('_', ' ');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary text-primary-foreground flex flex-col">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg">
          <Heart className="h-6 w-6" />
        </div>
        <span className="font-semibold text-lg">Heritage Medical</span>
      </div>

      {/* Role indicator */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
          <div className="w-2 h-2 rounded-full bg-white/50" />
          <span>{getRoleLabel()}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-xs font-medium text-primary-foreground/50 uppercase tracking-wider mb-3 px-3">
          Navigation
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive 
                      ? 'bg-white text-primary font-medium' 
                      : 'hover:bg-white/10 text-primary-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <p className="text-xs font-medium text-primary-foreground/50 uppercase tracking-wider mb-3 px-3 mt-6">
              Administration
            </p>
            <ul className="space-y-1">
              {adminItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        isActive 
                          ? 'bg-white text-primary font-medium' 
                          : 'hover:bg-white/10 text-primary-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
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
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-white/20 text-primary-foreground text-sm">
              {profile?.full_name ? getInitials(profile.full_name) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-primary-foreground/60 truncate">
              {getRoleLabel()}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-primary-foreground/60" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;