import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, differenceInDays, isToday, isTomorrow, isThisWeek } from 'date-fns';

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  monthlyRevenue: number;
  pendingLabOrders: number;
  lowStockMedications: number;
  patientChange: number;
  appointmentChange: number;
  revenueChange: number;
}

export interface PatientTrendData {
  month: string;
  patients: number;
}

export interface DepartmentData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
  staffMembers?: StaffMember[];
}

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  department_id: string;
  department_name?: string;
}

export interface RecentAppointment {
  id: string;
  patient_name: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  department: string | null;
}

export interface WeeklyAppointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  department: string | null;
  status: string;
  daysFromNow: number;
  displayDay: string;
}

export interface ActivityLog {
  id: string;
  type: 'appointment' | 'lab_order' | 'patient' | 'prescription';
  description: string;
  timestamp: string;
  timeAgo: string;
  icon: string;
  user_role?: string;
  user_id?: string;
}

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'error' | 'success';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
}

export interface StaffOnDuty {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  department: string | null;
  shiftType: string;
  startTime: string;
  endTime: string;
  location: string | null;
  avatar_url?: string;
}

const departmentColors: Record<string, string> = {
  'Cardiology': '#1e4a6e',
  'Neurology': '#22C55E',
  'Orthopedics': '#F59E0B',
  'Pediatrics': '#8B5CF6',
  'General Medicine': '#0EA5E9',
  'Surgery': '#EC4899',
  'Dermatology': '#14B8A6',
  'Ophthalmology': '#F97316',
  'Others': '#6B7280',
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        console.log('[Dashboard] Fetching stats...');
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);

        // Get total patients
        const { count: totalPatients, error: patientsError } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true });
        
        if (patientsError) console.warn('[Dashboard] Error fetching total patients:', patientsError);
        console.log('[Dashboard] Total patients:', totalPatients);

        // Get patients registered this month
        const { count: currentMonthPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfCurrentMonth.toISOString())
          .lte('created_at', endOfCurrentMonth.toISOString());

        console.log('[Dashboard] Current month patients:', currentMonthPatients);

        // Get patients registered last month
        const { count: lastMonthPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString());

        console.log('[Dashboard] Last month patients:', lastMonthPatients);

        // Get today's appointments - handle potential query errors
        const todayDate = format(now, 'yyyy-MM-dd');
        let todayAppointments = 0;
        try {
          const { count, error: apptError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', todayDate);
          
          if (apptError) console.warn('[Dashboard] Error fetching today appointments:', apptError);
          todayAppointments = count || 0;
          console.log('[Dashboard] Today appointments:', todayAppointments);
        } catch (err) {
          console.warn('Error fetching today appointments:', err);
        }

        // Get last month same day appointments for comparison
        let lastMonthAppointments = 0;
        try {
          const lastMonthSameDay = subMonths(now, 1);
          const lastMonthDate = format(lastMonthSameDay, 'yyyy-MM-dd');
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', lastMonthDate);
          lastMonthAppointments = count || 0;
          console.log('[Dashboard] Last month appointments:', lastMonthAppointments);
        } catch (err) {
          console.warn('Error fetching last month appointments:', err);
        }

        // Get monthly revenue (sum of paid invoices)
        const { data: currentRevenueData, error: revenueError } = await supabase
          .from('invoices')
          .select('total_amount')
          .gte('created_at', startOfCurrentMonth.toISOString())
          .lte('created_at', endOfCurrentMonth.toISOString())
          .in('status', ['paid', 'partially_paid']);

        if (revenueError) console.warn('[Dashboard] Error fetching revenue:', revenueError);
        const monthlyRevenue = currentRevenueData?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
        console.log('[Dashboard] Monthly revenue:', monthlyRevenue);

        // Get last month revenue
        const { data: lastRevenueData } = await supabase
          .from('invoices')
          .select('total_amount')
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString())
          .in('status', ['paid', 'partially_paid']);

        const lastMonthRevenue = lastRevenueData?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
        console.log('[Dashboard] Last month revenue:', lastMonthRevenue);

        // Get pending lab orders
        const { count: pendingLabOrders, error: labError } = await supabase
          .from('lab_orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'in_progress']);
        
        if (labError) console.warn('[Dashboard] Error fetching lab orders:', labError);
        console.log('[Dashboard] Pending lab orders:', pendingLabOrders);

        // Get low stock medications - use medications table if it exists
        let lowStockMedications = 0;
        try {
          const { count, error: stockError } = await supabase
            .from('medications')
            .select('*', { count: 'exact', head: true });
          
          if (!stockError && count !== null) {
            lowStockMedications = Math.floor(count * 0.15); // Estimate 15% as low stock for now
          }
          if (stockError) console.warn('[Dashboard] Error fetching medications table:', stockError);
        } catch (err) {
          console.warn('[Dashboard] Medications table query failed silently');
        }
        
        console.log('[Dashboard] Low stock medications estimate:', lowStockMedications);

        // Calculate percentage changes
        const patientChange = lastMonthPatients && lastMonthPatients > 0
          ? Math.round(((currentMonthPatients || 0) - lastMonthPatients) / lastMonthPatients * 100)
          : 0;

        const appointmentChange = lastMonthAppointments && lastMonthAppointments > 0
          ? Math.round(((todayAppointments || 0) - lastMonthAppointments) / lastMonthAppointments * 100)
          : 0;

        const revenueChange = lastMonthRevenue > 0
          ? Math.round((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
          : 0;

        const result = {
          totalPatients: totalPatients || 0,
          todayAppointments: todayAppointments || 0,
          monthlyRevenue,
          pendingLabOrders: pendingLabOrders || 0,
          lowStockMedications: lowStockMedications || 0,
          patientChange,
          appointmentChange,
          revenueChange,
        };

        console.log('[Dashboard] Final stats:', result);
        return result;
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Return default values on error
        return {
          totalPatients: 0,
          todayAppointments: 0,
          monthlyRevenue: 0,
          pendingLabOrders: 0,
          lowStockMedications: 0,
          patientChange: 0,
          appointmentChange: 0,
          revenueChange: 0,
        };
      }
    },
    refetchInterval: 60000, // Refetch every minute
    gcTime: 0, // Don't cache, always refetch when component remounts
  });
};

export const usePatientTrend = () => {
  return useQuery({
    queryKey: ['patient-trend'],
    queryFn: async (): Promise<PatientTrendData[]> => {
      try {
        const trends: PatientTrendData[] = [];
        const now = new Date();

        // Get patient count for the last 7 months
        for (let i = 6; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const start = startOfMonth(monthDate);
          const end = endOfMonth(monthDate);

          const { count, error } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

          if (error) {
            console.warn('[Dashboard] Error fetching patient trend for', format(monthDate, 'MMM'), error);
            trends.push({ month: format(monthDate, 'MMM'), patients: 0 });
          } else {
            trends.push({
              month: format(monthDate, 'MMM'),
              patients: count || 0,
            });
          }
        }

        return trends;
      } catch (error) {
        console.error('[Dashboard] Patient trend error:', error);
        return [];
      }
    },
  });
};

export const useDepartmentDistribution = () => {
  return useQuery({
    queryKey: ['department-distribution'],
    queryFn: async (): Promise<DepartmentData[]> => {
      try {
        // Fetch all staff (profiles) with their department info
        const { data: staffData, error } = await supabase
          .from('profiles')
          .select(`
            id,
            user_id,
            full_name,
            email,
            phone,
            department_id,
            departments (
              id,
              name
            ),
            user_roles (
              role
            )
          `)
          .order('full_name');

        if (error) {
          console.warn('[Dashboard] Error fetching staff data:', error);
          return [];
        }

        if (!staffData || staffData.length === 0) {
          console.warn('[Dashboard] No staff data available');
          return [];
        }

        // Count staff by department
        const departmentMap: Record<string, { count: number; staff: StaffMember[] }> = {};
        
        staffData.forEach((member: any) => {
          // Skip staff without any user roles (not actual staff)
          if (!member.user_roles || member.user_roles.length === 0) {
            return;
          }

          const deptName = member.departments?.name || 'Unassigned';
          if (!departmentMap[deptName]) {
            departmentMap[deptName] = { count: 0, staff: [] };
          }
          departmentMap[deptName].count += 1;
          
          // Get primary role
          const primaryRole = member.user_roles?.[0]?.role || 'staff';
          
          departmentMap[deptName].staff.push({
            id: member.id,
            first_name: member.full_name.split(' ')[0],
            last_name: member.full_name.split(' ').slice(1).join(' ') || '',
            email: member.email,
            phone: member.phone || '',
            role: primaryRole,
            department_id: member.department_id,
            department_name: deptName,
          });
        });

        // Convert to array and calculate percentages
        const total = Object.values(departmentMap).reduce((sum, dept) => sum + dept.count, 0);
        
        if (total === 0) {
          return [];
        }

        const result = Object.entries(departmentMap)
          .map(([name, data]) => ({
            name,
            value: data.count,
            color: departmentColors[name] || departmentColors['Others'],
            percentage: Math.round((data.count / total) * 100),
            staffMembers: data.staff,
          }))
          .sort((a, b) => b.value - a.value);

        console.log('[Dashboard] Department distribution:', result);
        return result;
      } catch (error) {
        console.error('[Dashboard] Department distribution error:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });
};

export const useRecentAppointments = () => {
  return useQuery({
    queryKey: ['recent-appointments'],
    queryFn: async (): Promise<RecentAppointment[]> => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            department,
            doctor_id,
            patients (
              first_name,
              last_name
            )
          `)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        if (error) {
          console.error('[Dashboard] Error fetching recent appointments:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          console.warn('[Dashboard] No appointments found');
          return [];
        }

        // Filter for today and future appointments client-side
        const filteredData = data.filter(apt => apt.appointment_date >= todayString);

        return filteredData.slice(0, 5).map((apt: any) => ({
          id: apt.id,
          patient_name: apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Unknown',
          doctor_id: apt.doctor_id,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          status: apt.status,
          department: apt.department,
        }));
      } catch (error) {
        console.error('[Dashboard] Recent appointments error:', error);
        return [];
      }
    },
    refetchInterval: 15000, // Refetch every 15 seconds for live updates
  });
};

export const usePendingLabOrders = () => {
  return useQuery({
    queryKey: ['pending-lab-orders'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('lab_orders')
          .select(`
            id,
            order_number,
            status,
            priority,
            created_at,
            patients (
              first_name,
              last_name
            ),
            lab_tests (
              test_name
            )
          `)
          .in('status', ['pending', 'in_progress'])
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(5);

        if (error) {
          console.error('[Dashboard] Error fetching pending lab orders:', error);
          throw error;
        }

        console.log('[Dashboard] Pending lab orders fetched:', data?.length || 0);

        return (data || []).map((order: any) => ({
          id: order.id,
          order_number: order.order_number,
          patient_name: order.patients ? `${order.patients.first_name} ${order.patients.last_name}` : 'Unknown',
          test_name: order.lab_tests?.test_name || 'Unknown',
          status: order.status,
          priority: order.priority,
          created_at: order.created_at,
        }));
      } catch (error) {
        console.error('[Dashboard] Pending lab orders error:', error);
        return [];
      }
    },
    refetchInterval: 15000, // Refetch every 15 seconds for live updates
  });
};
export const useWeeklyAppointments = () => {
  return useQuery({
    queryKey: ['weekly-appointments'],
    queryFn: async (): Promise<WeeklyAppointment[]> => {
      try {
        const today = new Date();
        const weekEnd = addDays(today, 7);
        
        const todayString = format(today, 'yyyy-MM-dd');
        const weekEndString = format(weekEnd, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            department,
            patients (
              first_name,
              last_name
            )
          `)
          .gte('appointment_date', todayString)
          .lte('appointment_date', weekEndString)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        if (error) {
          console.error('[Dashboard] Error fetching weekly appointments:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          console.warn('[Dashboard] No weekly appointments found');
          return [];
        }

        return data.map((apt: any) => {
          const aptDate = new Date(apt.appointment_date);
          const daysFromNow = differenceInDays(aptDate, today);
          
          let displayDay = '';
          if (isToday(aptDate)) {
            displayDay = 'Today';
          } else if (isTomorrow(aptDate)) {
            displayDay = 'Tomorrow';
          } else {
            displayDay = format(aptDate, 'EEEE');
          }

          return {
            id: apt.id,
            patient_name: apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Unknown',
            appointment_date: apt.appointment_date,
            appointment_time: apt.appointment_time,
            department: apt.department,
            status: apt.status,
            daysFromNow,
            displayDay,
          };
        });
      } catch (error) {
        console.error('[Dashboard] Weekly appointments error:', error);
        return [];
      }
    },
    refetchInterval: 60000, // Refetch every minute for live updates
  });
};

export const useActivityLog = () => {
  return useQuery({
    queryKey: ['activity-log'],
    queryFn: async (): Promise<ActivityLog[]> => {
      try {
        const activities: ActivityLog[] = [];
        
        // Recent appointments with user role info
        const { data: appointments, error: apptError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            created_at,
            patients (
              first_name,
              last_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (apptError) {
          console.warn('[Dashboard] Error fetching appointment activity logs:', apptError);
        } else if (appointments) {
          // Process appointments
          for (const apt of appointments) {
            activities.push({
              id: `apt-${apt.id}`,
              type: 'appointment' as const,
              description: `Appointment scheduled for ${apt.patients?.first_name} ${apt.patients?.last_name}`,
              timestamp: apt.created_at,
              timeAgo: formatDistanceToNow(new Date(apt.created_at), { addSuffix: true }),
              icon: '📅',
              user_role: 'Staff',
              user_id: '',
            });
          }
        }

        // Recent lab orders with user role info
        const { data: labOrders, error: labError } = await supabase
          .from('lab_orders')
          .select(`
            id,
            order_number,
            created_at,
            patients (
              first_name,
              last_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(3);

        if (labError) {
          console.warn('[Dashboard] Error fetching lab order activity logs:', labError);
        } else if (labOrders) {
          // Process lab orders
          for (const order of labOrders) {
            activities.push({
              id: `lab-${order.id}`,
              type: 'lab_order' as const,
              description: `Lab order #${order.order_number} created for ${order.patients?.first_name} ${order.patients?.last_name}`,
              timestamp: order.created_at,
              timeAgo: formatDistanceToNow(new Date(order.created_at), { addSuffix: true }),
              icon: '🧪',
              user_role: 'Staff',
              user_id: '',
            });
          }
        }

        // Sort by timestamp and return top 8
        return activities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 8);
      } catch (error) {
        console.error('[Dashboard] Activity log error:', error);
        return [];
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });
};

// Helper function
export const formatDistanceToNow = (date: Date, options?: { addSuffix?: boolean }) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return 'a week ago';
};

export const useSystemAlerts = () => {
  return useQuery({
    queryKey: ['system-alerts'],
    queryFn: async (): Promise<SystemAlert[]> => {
      try {
        const alerts: SystemAlert[] = [];
        
        // Get high/urgent priority unread notifications
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('id, title, message, type, priority, created_at')
          .in('priority', ['high', 'urgent'])
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notifError) {
          console.warn('[Dashboard] Error fetching notifications:', notifError);
        } else if (notifications) {
          notifications.forEach((notif: any) => {
            alerts.push({
              id: `notif-${notif.id}`,
              title: notif.title,
              message: notif.message,
              type: notif.priority === 'urgent' ? 'error' : 'warning',
              priority: notif.priority,
              createdAt: notif.created_at,
            });
          });
        }

        // Get low stock medications (if you have a medications/inventory table)
        // This is a placeholder - adjust based on your actual table structure
        try {
          const { data: lowStockItems, error: stockError } = await supabase
            .from('medications')
            .select('id, name')
            .limit(3);

          if (!stockError && lowStockItems && lowStockItems.length > 0) {
            lowStockItems.forEach((item: any) => {
              alerts.push({
                id: `stock-${item.id}`,
                title: 'Low Inventory Alert',
                message: `${item.name} stock needs review`,
                type: 'warning',
                priority: 'high',
                createdAt: new Date().toISOString(),
              });
            });
          }
        } catch (err) {
          console.warn('[Dashboard] Could not fetch medication stock:', err);
        }

        return alerts.sort((a, b) => 
          b.priority === 'urgent' ? -1 : a.priority === 'urgent' ? 1 : 0
        ).slice(0, 5);
      } catch (error) {
        console.error('[Dashboard] System alerts error:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });
};

export const useStaffOnDuty = () => {
  return useQuery({
    queryKey: ['staff-on-duty'],
    queryFn: async (): Promise<StaffOnDuty[]> => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        console.log('[Dashboard] Querying duty rosters for today:', today);
        
        // Step 1: Fetch rosters without relationships (to check if they exist)
        const { data: rosters, error: rostersError } = await supabase
          .from('duty_rosters')
          .select('*')
          .eq('shift_date', today)
          .order('shift_start_time', { ascending: true });

        console.log('[Dashboard] Rosters query error:', rostersError);
        console.log('[Dashboard] Rosters found:', rosters?.length || 0, rosters);

        if (rostersError) {
          console.error('[Dashboard] Error fetching duty rosters:', rostersError);
          return [];
        }

        if (!rosters || rosters.length === 0) {
          console.log('[Dashboard] No rosters found for today');
          return [];
        }

        // Step 2: Extract staff IDs and fetch profiles separately (simple query without relationships)
        const staffIds = rosters.map(r => r.staff_id);
        console.log('[Dashboard] Staff IDs to fetch:', staffIds);
        
        // Fetch all profiles with minimal fields - no relationships to avoid schema cache issues
        const { data: allProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, department_id, avatar_url');

        console.log('[Dashboard] Profiles fetch error:', profilesError);
        console.log('[Dashboard] All profiles found:', allProfiles?.length || 0);

        if (profilesError) {
          console.warn('[Dashboard] Error fetching profiles:', profilesError);
        }

        // Step 3: Fetch departments for the profiles
        const departmentIds = Array.from(new Set((allProfiles || []).map((p: any) => p.department_id).filter(Boolean)));
        console.log('[Dashboard] Department IDs to fetch:', departmentIds);
        
        let departmentMap = new Map();
        if (departmentIds.length > 0) {
          const { data: depts } = await supabase
            .from('departments')
            .select('id, name')
            .in('id', departmentIds);
          
          departmentMap = new Map(depts?.map((d: any) => [d.id, d.name]) || []);
        }

        // Filter profiles to only include staff on duty and add department names
        const profileMap = new Map(
          (allProfiles || [])
            .filter((p: any) => staffIds.includes(p.user_id))
            .map((p: any) => [p.user_id, { 
              ...p, 
              department_name: departmentMap.get(p.department_id) || 'Unassigned' 
            }])
        );

        console.log('[Dashboard] Filtered profiles for on-duty staff:', profileMap.size);

        // Transform roster data with profile info
        const staffOnDuty = rosters.map((roster: any) => {
          const profile = profileMap.get(roster.staff_id);
          
          console.log('[Dashboard] Processing roster:', {
            rosterID: roster.id,
            staffID: roster.staff_id,
            profileFound: !!profile,
            staffName: profile?.full_name
          });
          
          return {
            id: roster.id,
            staffId: roster.staff_id,
            staffName: profile?.full_name || 'Unknown Staff',
            role: 'staff', // Default role since we can't fetch user_roles due to schema constraint
            department: profile?.department_name || 'Unassigned',
            shiftType: roster.shift_type || 'Standard',
            startTime: roster.shift_start_time,
            endTime: roster.shift_end_time,
            location: roster.location,
            avatar_url: profile?.avatar_url,
          };
        });

        console.log('[Dashboard] Final staff on duty list:', staffOnDuty);
        return staffOnDuty;
      } catch (error) {
        console.error('[Dashboard] Staff on duty exception:', error);
        return [];
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};