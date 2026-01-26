import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns';

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
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);

        // Get total patients
        const { count: totalPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true });

        // Get patients registered this month
        const { count: currentMonthPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfCurrentMonth.toISOString())
          .lte('created_at', endOfCurrentMonth.toISOString());

        // Get patients registered last month
        const { count: lastMonthPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString());

        // Get today's appointments - handle potential query errors
        const todayDate = format(now, 'yyyy-MM-dd');
        let todayAppointments = 0;
        try {
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', todayDate);
          todayAppointments = count || 0;
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
        } catch (err) {
          console.warn('Error fetching last month appointments:', err);
        }

        // Get monthly revenue (sum of paid invoices)
        const { data: currentRevenueData } = await supabase
          .from('invoices')
          .select('total_amount')
          .gte('created_at', startOfCurrentMonth.toISOString())
          .lte('created_at', endOfCurrentMonth.toISOString())
          .in('status', ['paid', 'partially_paid']);

        const monthlyRevenue = currentRevenueData?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

        // Get last month revenue
        const { data: lastRevenueData } = await supabase
          .from('invoices')
          .select('total_amount')
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString())
          .in('status', ['paid', 'partially_paid']);

        const lastMonthRevenue = lastRevenueData?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

        // Get pending lab orders
        const { count: pendingLabOrders } = await supabase
          .from('lab_orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'in_progress']);

        // Get low stock medications
        const { count: lowStockMedications } = await supabase
          .from('medications')
          .select('*', { count: 'exact', head: true })
          .lt('stock_quantity', 50); // Less than reorder level

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

        return {
          totalPatients: totalPatients || 0,
          todayAppointments: todayAppointments || 0,
          monthlyRevenue,
          pendingLabOrders: pendingLabOrders || 0,
          lowStockMedications: lowStockMedications || 0,
          patientChange,
          appointmentChange,
          revenueChange,
        };
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
  });
};

export const usePatientTrend = () => {
  return useQuery({
    queryKey: ['patient-trend'],
    queryFn: async (): Promise<PatientTrendData[]> => {
      const trends: PatientTrendData[] = [];
      const now = new Date();

      // Get patient count for the last 7 months
      for (let i = 6; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const { count } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        trends.push({
          month: format(monthDate, 'MMM'),
          patients: count || 0,
        });
      }

      return trends;
    },
  });
};

export const useDepartmentDistribution = () => {
  return useQuery({
    queryKey: ['department-distribution'],
    queryFn: async (): Promise<DepartmentData[]> => {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('department')
        .neq('department', null);

      if (error || !appointments || appointments.length === 0) {
        return [{ name: 'No Data', value: 1, color: '#6B7280' }];
      }

      // Count appointments by department
      const departmentCounts: Record<string, number> = {};
      appointments.forEach((apt) => {
        const dept = apt.department || 'Others';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      });

      // Convert to array and sort by value
      const result = Object.entries(departmentCounts)
        .map(([name, value]) => ({
          name,
          value,
          color: departmentColors[name] || departmentColors['Others'],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 departments

      return result;
    },
  });
};

export const useRecentAppointments = () => {
  return useQuery({
    queryKey: ['recent-appointments'],
    queryFn: async (): Promise<RecentAppointment[]> => {
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

      if (error) throw error;

      // Filter for today and future appointments client-side
      const filteredData = (data || []).filter(apt => apt.appointment_date >= todayString);

      return filteredData.slice(0, 5).map((apt: any) => ({
        id: apt.id,
        patient_name: apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Unknown',
        doctor_id: apt.doctor_id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        department: apt.department,
      }));
    },
  });
};

export const usePendingLabOrders = () => {
  return useQuery({
    queryKey: ['pending-lab-orders'],
    queryFn: async () => {
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

      if (error) throw error;

      return (data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        patient_name: order.patients ? `${order.patients.first_name} ${order.patients.last_name}` : 'Unknown',
        test_name: order.lab_tests?.test_name || 'Unknown',
        status: order.status,
        priority: order.priority,
        created_at: order.created_at,
      }));
    },
  });
};
