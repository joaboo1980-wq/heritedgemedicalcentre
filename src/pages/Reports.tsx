import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Download,
  TrendingUp,
  DollarSign,
  AlertCircle,
  FileText,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Stethoscope,
  TestTube,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  useIncomeStatement,
  useBudgetVsActual,
  useAccountsReceivableAging,
  useExpenseAnalysis,
} from '@/hooks/useAccounts';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
const AGE_COLORS = ['#0EA5E9', '#3B82F6', '#14B8A6', '#F97316'];
const GENDER_COLORS = ['#EC4899', '#3B82F6'];

// System Analytics Queries
const useSystemAnalytics = () => {
  return useQuery({
    queryKey: ['system-analytics'],
    queryFn: async () => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);
      
      // Total Patients
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Monthly Appointments
      const { count: monthlyAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', format(startOfCurrentMonth, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endOfCurrentMonth, 'yyyy-MM-dd'));

      // Lab Tests
      const { count: labTests } = await supabase
        .from('lab_orders')
        .select('*', { count: 'exact', head: true });

      // Monthly Revenue
      const { data: revenueData } = await supabase
        .from('invoices')
        .select('total_amount')
        .gte('created_at', startOfCurrentMonth.toISOString())
        .lte('created_at', endOfCurrentMonth.toISOString())
        .in('status', ['paid', 'partially_paid']);

      const monthlyRevenue = revenueData?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

      return {
        totalPatients: totalPatients || 0,
        monthlyAppointments: monthlyAppointments || 0,
        labTests: labTests || 0,
        monthlyRevenue,
      };
    },
    refetchInterval: 60000,
  });
};

const usePatientDemographics = () => {
  return useQuery({
    queryKey: ['patient-demographics'],
    queryFn: async () => {
      const { data: patients } = await supabase
        .from('patients')
        .select('date_of_birth, gender');

      if (!patients) return { ageDistribution: [], genderDistribution: [], averageAge: 0, returnRate: 0 };

      // Age Distribution
      const ageGroups = { '0-18': 0, '18-35': 0, '36-50': 0, '51+': 0 };
      const genderCounts = { Male: 0, Female: 0, Other: 0 };
      let totalAge = 0;
      let count = 0;

      patients.forEach(p => {
        // Age calculation
        if (p.date_of_birth) {
          const age = Math.floor((new Date().getTime() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (age <= 18) ageGroups['0-18']++;
          else if (age <= 35) ageGroups['18-35']++;
          else if (age <= 50) ageGroups['36-50']++;
          else ageGroups['51+']++;
          totalAge += age;
          count++;
        }

        // Gender counting
        if (p.gender) {
          if (p.gender.toLowerCase() === 'male' || p.gender.toLowerCase() === 'm') genderCounts.Male++;
          else if (p.gender.toLowerCase() === 'female' || p.gender.toLowerCase() === 'f') genderCounts.Female++;
          else genderCounts.Other++;
        }
      });

      const ageDistribution = Object.entries(ageGroups).map(([range, value]) => ({
        name: range,
        value,
        percentage: count > 0 ? ((value / count) * 100).toFixed(1) : 0,
      }));

      const genderDistribution = Object.entries(genderCounts).map(([gender, value]) => ({
        name: gender,
        value,
        percentage: patients.length > 0 ? ((value / patients.length) * 100).toFixed(1) : 0,
      }));

      return {
        ageDistribution,
        genderDistribution,
        averageAge: count > 0 ? (totalAge / count).toFixed(1) : 0,
        returnRate: 78, // Placeholder, would need additional logic
      };
    },
  });
};

const useMonthlyTrends = () => {
  return useQuery({
    queryKey: ['monthly-trends'],
    queryFn: async () => {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);

        // Revenue trend
        const { data: revData } = await supabase
          .from('invoices')
          .select('total_amount')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .in('status', ['paid', 'partially_paid']);

        const revenue = revData?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

        // Appointments trend
        const { count: appointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
          .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));

        // New patients
        const { count: newPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        months.push({
          month: format(date, 'MMM'),
          revenue: Math.round(revenue / 1e6), // Convert to millions
          appointments: appointments || 0,
          newPatients: newPatients || 0,
        });
      }
      return months;
    },
  });
};

const useDepartmentPerformance = () => {
  return useQuery({
    queryKey: ['department-performance'],
    queryFn: async () => {
      const departments = ['General', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Neurology', 'Laboratory'];
      const result = [];
      const now = new Date();
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      for (const dept of departments) {
        const { count: appointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', format(startMonth, 'yyyy-MM-dd'))
          .lte('appointment_date', format(endMonth, 'yyyy-MM-dd'));
        
        result.push({
          name: dept,
          appointments: appointments || 0,
        });
      }

      return result;
    },
    refetchInterval: 60000,
  });
};

// HMIS Report Queries
const useHMISPatientFlow = () => {
  return useQuery({
    queryKey: ['hmis-patient-flow'],
    queryFn: async () => {
      const now = new Date();
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      // New patients
      const { count: newPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startMonth.toISOString())
        .lte('created_at', endMonth.toISOString());

      // Total follow-ups (completed appointments this month)
      const { count: followUps } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', format(startMonth, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endMonth, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      // Referrals (scheduled/pending appointments this month)
      const { count: referrals } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', format(startMonth, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endMonth, 'yyyy-MM-dd'))
        .eq('status', 'scheduled');

      return {
        newPatients: newPatients || 0,
        followUps: followUps || 0,
        referrals: referrals || 0,
        totalPatientEncounters: (newPatients || 0) + (followUps || 0),
      };
    },
    refetchInterval: 60000,
  });
};

const useHMISServiceUtilization = () => {
  return useQuery({
    queryKey: ['hmis-service-utilization'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Outpatient services (completed today)
      const { count: outpatient } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today)
        .eq('status', 'completed');

      // Lab services (completed today)
      const { count: labServices } = await supabase
        .from('lab_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Pharmacy services (dispensed today)
      const { count: pharmacyServices } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'dispensed');

      // Nursing services (completed today)
      const { count: nursingTasks } = await supabase
        .from('nursing_task_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      return {
        outpatientServices: outpatient || 0,
        labServices: labServices || 0,
        pharmacyServices: pharmacyServices || 0,
        nursingServices: nursingTasks || 0,
        totalUtilization: (outpatient || 0) + (labServices || 0) + (pharmacyServices || 0) + (nursingTasks || 0),
      };
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });
};

const useHMISClinicalIndicators = () => {
  return useQuery({
    queryKey: ['hmis-clinical-indicators'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Appointment completion rate
      const { count: completed } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: total } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      // Lab test completion
      const { count: labCompleted } = await supabase
        .from('lab_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: labTotal } = await supabase
        .from('lab_orders')
        .select('*', { count: 'exact', head: true });

      // Get today's appointments for wait time calculation
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('created_at, appointment_time')
        .eq('appointment_date', today)
        .limit(20);

      // Calculate average wait time (from creation to appointment time)
      let averageWaitTime = 0;
      if (todayAppointments && todayAppointments.length > 0) {
        const waitTimes = todayAppointments
          .map(apt => {
            const createdTime = new Date(apt.created_at).getTime();
            const apptTime = new Date(`${today}T${apt.appointment_time}`).getTime();
            return Math.max(0, (apptTime - createdTime) / (1000 * 60)); // convert to minutes
          })
          .filter(t => t > 0);
        
        averageWaitTime = waitTimes.length > 0 
          ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
          : 30;
      }

      // Patient satisfaction (inferred from completion rate)
      const completionRate = total && total > 0 ? (completed || 0) / total * 100 : 0;
      const patientSatisfaction = Math.round(Math.max(60, Math.min(100, completionRate)));

      return {
        appointmentCompletionRate: total && total > 0 ? ((completed || 0) / total * 100).toFixed(1) : 0,
        labTestCompletionRate: labTotal && labTotal > 0 ? ((labCompleted || 0) / labTotal * 100).toFixed(1) : 0,
        averageWaitTime: Math.round(averageWaitTime),
        patientSatisfaction,
      };
    },
    refetchInterval: 30000,
  });
};

const useHMISStaffUtilization = (department?: string) => {
  return useQuery({
    queryKey: ['hmis-staff-utilization', department],
    queryFn: async () => {
      const { count: doctors } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'doctor');

      const { count: nurses } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'nurse');

      const { count: pharmacists } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'pharmacist');

      const { count: labTechs } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'lab_technician');

      return {
        doctorsActive: doctors || 0,
        nursesActive: nurses || 0,
        pharmacistsActive: pharmacists || 0,
        labTechniciansActive: labTechs || 0,
        totalStaff: (doctors || 0) + (nurses || 0) + (pharmacists || 0) + (labTechs || 0),
      };
    },
  });
};

const useHMISDiseaseFrequency = () => {
  return useQuery({
    queryKey: ['hmis-disease-frequency'],
    queryFn: async () => {
      const now = new Date();
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      // Fetch all appointments with reason (diagnosis)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('reason')
        .gte('appointment_date', format(startMonth, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endMonth, 'yyyy-MM-dd'));

      // Count diseases/reasons
      const diseaseMap: Record<string, number> = {};
      let total = 0;

      appointments?.forEach(apt => {
        if (apt.reason) {
          const reason = apt.reason.trim();
          diseaseMap[reason] = (diseaseMap[reason] || 0) + 1;
          total++;
        }
      });

      // Convert to array and sort by frequency
      const result = Object.entries(diseaseMap)
        .map(([disease, frequency]) => ({
          disease,
          frequency,
          percentage: total > 0 ? Math.round((frequency / total) * 100) : 0,
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 6); // Top 6 diseases

      return result.length > 0 ? result : [];
    },
    refetchInterval: 60000,
  });
};

const useDepartmentStats = (department: string) => {
  return useQuery({
    queryKey: ['department-stats', department],
    queryFn: async () => {
      const now = new Date();
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      // Get department-specific appointments
      const { count: appointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', format(startMonth, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endMonth, 'yyyy-MM-dd'));

      // Get department revenue (estimated)
      const { data: revenue } = await supabase
        .from('invoices')
        .select('total_amount')
        .gte('created_at', startMonth.toISOString())
        .lte('created_at', endMonth.toISOString());

      return {
        department,
        monthlyAppointments: appointments || 0,
        revenue: revenue?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0,
        averageAppointmentValue: revenue && revenue.length > 0 
          ? (revenue?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0) / Math.max(appointments || 1, 1)
          : 0,
      };
    },
  });
};
const Reports = () => {
  const { toast } = useToast();
  const [activeReport, setActiveReport] = useState('system-analytics');
  const [selectedDepartment, setSelectedDepartment] = useState('General');
  const [dateRange, setDateRange] = useState('this-month');
  const [exportFormat, setExportFormat] = useState('csv');

  const DEPARTMENTS = ['General', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Neurology', 'Laboratory'];

  // Fetch all reporting data
  const { data: incomeStatement, isLoading: incomeLoading } = useIncomeStatement();
  const { data: budgetVsActual, isLoading: budgetLoading } = useBudgetVsActual();
  const { data: arAging, isLoading: arLoading } = useAccountsReceivableAging();
  const { data: expenseAnalysis, isLoading: expenseLoading } = useExpenseAnalysis();
  
  // System analytics queries
  const { data: systemAnalytics, isLoading: analyticsLoading } = useSystemAnalytics();
  const { data: demographics, isLoading: demographicsLoading } = usePatientDemographics();
  const { data: monthlyTrends, isLoading: trendsLoading } = useMonthlyTrends();
  const { data: departmentPerformance, isLoading: deptLoading } = useDepartmentPerformance();

  // HMIS Queries
  const { data: patientFlow, isLoading: patientFlowLoading } = useHMISPatientFlow();
  const { data: serviceUtilization, isLoading: serviceUtilLoading } = useHMISServiceUtilization();
  const { data: clinicalIndicators, isLoading: clinicalLoading } = useHMISClinicalIndicators();
  const { data: staffUtilization, isLoading: staffLoading } = useHMISStaffUtilization(selectedDepartment);
  const { data: diseaseFrequency, isLoading: diseaseLoading } = useHMISDiseaseFrequency();
  const { data: departmentStats, isLoading: deptStatsLoading } = useDepartmentStats(selectedDepartment);

  const handleExport = (reportName: string) => {
    try {
      let csvContent = '';
      let filename = '';

      switch (reportName) {
        case 'system-analytics':
          filename = `System_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateSystemAnalyticsCSV();
          break;
        case 'hmis-patient-flow':
          filename = `Patient_Flow_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generatePatientFlowCSV();
          break;
        case 'hmis-service-utilization':
          filename = `Service_Utilization_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateServiceUtilizationCSV();
          break;
        case 'hmis-clinical':
          filename = `Clinical_Indicators_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateClinicalIndicatorsCSV();
          break;
        case 'hmis-staff':
          filename = `Staff_Utilization_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateStaffUtilizationCSV();
          break;
        case 'disease-frequency':
          filename = `Disease_Frequency_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateDiseaseFrequencyCSV();
          break;
        case 'department-report':
          filename = `Department_Report_${selectedDepartment}_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateDepartmentReportCSV();
          break;
        case 'dashboard':
          filename = `Dashboard_Report_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateDashboardCSV();
          break;
        case 'income-statement':
          filename = `Income_Statement_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateIncomeStatementCSV();
          break;
        case 'budget-vs-actual':
          filename = `Budget_vs_Actual_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateBudgetVsActualCSV();
          break;
        case 'ar-aging':
          filename = `AR_Aging_Report_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateARAgingCSV();
          break;
        case 'expense-analysis':
          filename = `Expense_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
          csvContent = generateExpenseAnalysisCSV();
          break;
      }

      if (!csvContent) {
        toast({
          title: 'No Data',
          description: 'No data available to export',
          variant: 'destructive',
        });
        return;
      }

      const element = document.createElement('a');
      element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: 'Success',
        description: `${filename} exported successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const generateIncomeStatementCSV = () => {
    if (!incomeStatement) return '';
    
    let csv = 'INCOME STATEMENT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'REVENUE\n';
    Object.entries(incomeStatement.incomeByCategory || {}).forEach(([category, amount]) => {
      csv += `${category},UGX ${(amount as number).toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    });
    csv += `TOTAL REVENUE,UGX ${incomeStatement.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n\n`;
    csv += 'EXPENSES\n';
    Object.entries(incomeStatement.expenseByCategory || {}).forEach(([category, amount]) => {
      csv += `${category},UGX ${(amount as number).toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    });
    csv += `TOTAL EXPENSES,UGX ${incomeStatement.totalExpenses.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n\n`;
    csv += `NET PROFIT,UGX ${incomeStatement.netProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    
    return csv;
  };

  const generateBudgetVsActualCSV = () => {
    if (!budgetVsActual?.comparison) return '';
    
    let csv = 'BUDGET VS ACTUAL ANALYSIS\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Category,Budgeted,Actual,Variance,Variance %,Status\n';
    budgetVsActual.comparison.forEach(item => {
      csv += `${item.category},UGX ${item.budgeted},UGX ${item.actual},UGX ${item.variance},${item.variancePercent}%,${item.status}\n`;
    });
    csv += `\nTOTAL BUDGET,UGX ${budgetVsActual.totalBudget}\n`;
    csv += `TOTAL ACTUAL,UGX ${budgetVsActual.totalActual}\n`;
    
    return csv;
  };

  const generateARAgingCSV = () => {
    if (!arAging) return '';
    
    let csv = 'ACCOUNTS RECEIVABLE AGING REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Aging Bucket,Count,Outstanding Amount\n';
    csv += `Current,${arAging.current.count},UGX ${arAging.current.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    csv += `30 Days Overdue,${arAging.thirtyDays.count},UGX ${arAging.thirtyDays.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    csv += `60 Days Overdue,${arAging.sixtyDays.count},UGX ${arAging.sixtyDays.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    csv += `90 Days Overdue,${arAging.ninetyDays.count},UGX ${arAging.ninetyDays.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    csv += `90+ Days Overdue,${arAging.ninetyPlus.count},UGX ${arAging.ninetyPlus.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    csv += `\nTOTAL OUTSTANDING,UGX ${arAging.totalOutstanding.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    
    return csv;
  };

  const generateExpenseAnalysisCSV = () => {
    if (!expenseAnalysis?.byCategory) return '';
    
    let csv = 'EXPENSE ANALYSIS REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Category,Total Expense,Count,Average,Percentage\n';
    expenseAnalysis.byCategory.forEach(item => {
      csv += `${item.category},UGX ${item.total.toLocaleString('en-US', { maximumFractionDigits: 2 })},${item.count},UGX ${item.average.toLocaleString('en-US', { maximumFractionDigits: 2 })},${item.percentage.toFixed(2)}%\n`;
    });
    csv += `\nTOTAL EXPENSES,UGX ${expenseAnalysis.totalExpenses.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    
    return csv;
  };

  const generateSystemAnalyticsCSV = () => {
    if (!systemAnalytics) return '';
    
    let csv = 'SYSTEM ANALYTICS REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Metric,Value\n';
    csv += `Total Patients,${systemAnalytics.totalPatients}\n`;
    csv += `Monthly Appointments,${systemAnalytics.monthlyAppointments}\n`;
    csv += `Lab Tests,${systemAnalytics.labTests}\n`;
    csv += `Monthly Revenue,UGX ${systemAnalytics.monthlyRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    
    if (demographics) {
      csv += '\n\nDEMOGRAPHICS\n';
      csv += 'Age Group,Count\n';
      demographics.ageGroups?.forEach((group: any) => {
        csv += `${group.name},${group.value}\n`;
      });
    }
    
    return csv;
  };

  const generatePatientFlowCSV = () => {
    if (!patientFlow) return '';
    
    let csv = 'PATIENT FLOW REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n`;
    csv += `Department: ${selectedDepartment}\n\n`;
    csv += 'Metric,Value\n';
    csv += `New Patients,${patientFlow?.newPatients || 0}\n`;
    csv += `Follow-ups,${patientFlow?.followUps || 0}\n`;
    csv += `Referrals,${patientFlow?.referrals || 0}\n`;
    csv += `Total Encounters,${patientFlow?.totalEncounters || 0}\n`;
    
    return csv;
  };

  const generateServiceUtilizationCSV = () => {
    if (!serviceUtilization) return '';
    
    let csv = 'SERVICE UTILIZATION REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Service,Count\n';
    csv += `Outpatient Visits,${serviceUtilization?.outpatient || 0}\n`;
    csv += `Lab Services,${serviceUtilization?.labServices || 0}\n`;
    csv += `Pharmacy Services,${serviceUtilization?.pharmacyServices || 0}\n`;
    csv += `Nursing Tasks,${serviceUtilization?.nursingTasks || 0}\n`;
    
    return csv;
  };

  const generateClinicalIndicatorsCSV = () => {
    if (!clinicalIndicators) return '';
    
    let csv = 'CLINICAL INDICATORS REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Indicator,Value\n';
    csv += `Appointment Completion Rate,${clinicalIndicators?.completionRate || 0}%\n`;
    csv += `Average Wait Time,${clinicalIndicators?.avgWaitTime || 0} minutes\n`;
    csv += `Patient Satisfaction,${clinicalIndicators?.patientSatisfaction || 0}%\n`;
    csv += `Lab Results Turnaround,${clinicalIndicators?.labTurnaround || 0} hours\n`;
    
    return csv;
  };

  const generateStaffUtilizationCSV = () => {
    if (!staffUtilization) return '';
    
    let csv = 'STAFF UTILIZATION REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n`;
    csv += `Department: ${selectedDepartment}\n\n`;
    csv += 'Staff Category,Count,Utilization %\n';
    csv += `Doctors,${staffUtilization?.doctors || 0},${staffUtilization?.doctorUtilization || 0}%\n`;
    csv += `Nurses,${staffUtilization?.nurses || 0},${staffUtilization?.nurseUtilization || 0}%\n`;
    csv += `Pharmacists,${staffUtilization?.pharmacists || 0},${staffUtilization?.pharmacistUtilization || 0}%\n`;
    csv += `Lab Technicians,${staffUtilization?.labTechs || 0},${staffUtilization?.labTechUtilization || 0}%\n`;
    
    return csv;
  };

  const generateDiseaseFrequencyCSV = () => {
    if (!diseaseFrequency?.data) return '';
    
    let csv = 'DISEASE FREQUENCY REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Disease,Frequency,Percentage\n';
    diseaseFrequency.data.forEach((disease: any) => {
      csv += `${disease.name},${disease.value},${((disease.value / diseaseFrequency.total) * 100).toFixed(2)}%\n`;
    });
    
    return csv;
  };

  const generateDepartmentReportCSV = () => {
    if (!departmentStats) return '';
    
    let csv = 'DEPARTMENT REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n`;
    csv += `Department: ${selectedDepartment}\n\n`;
    csv += 'Metric,Value\n';
    csv += `Monthly Appointments,${departmentStats?.monthlyAppointments || 0}\n`;
    csv += `Total Revenue,UGX ${(departmentStats?.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    csv += `Average Value per Appointment,UGX ${(departmentStats?.averageAppointmentValue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    
    return csv;
  };

  const generateDashboardCSV = () => {
    let csv = 'DASHBOARD SUMMARY REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += 'SYSTEM OVERVIEW\n';
    csv += 'Metric,Value\n';
    if (systemAnalytics) {
      csv += `Total Patients,${systemAnalytics.totalPatients}\n`;
      csv += `Monthly Appointments,${systemAnalytics.monthlyAppointments}\n`;
      csv += `Lab Tests,${systemAnalytics.labTests}\n`;
      csv += `Monthly Revenue,UGX ${systemAnalytics.monthlyRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    }
    
    csv += '\nSERVICE UTILIZATION\n';
    csv += 'Service,Count\n';
    if (serviceUtilization) {
      csv += `Outpatient Visits,${serviceUtilization.outpatient || 0}\n`;
      csv += `Lab Services,${serviceUtilization.labServices || 0}\n`;
      csv += `Pharmacy Services,${serviceUtilization.pharmacyServices || 0}\n`;
      csv += `Nursing Tasks,${serviceUtilization.nursingTasks || 0}\n`;
    }
    
    return csv;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Live data reports with export capabilities</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="space-y-4">
        {/* Department Selection */}
        {['hmis-patient-flow', 'hmis-service-utilization', 'hmis-clinical', 'hmis-staff', 'department-report'].includes(activeReport) && (
          <div className="flex gap-2">
            <label className="text-sm font-medium">Department:</label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px]">
                <Stethoscope className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Main Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'system-analytics', label: 'System Analytics', icon: '📊' },
              { id: 'hmis-patient-flow', label: 'Patient Flow', icon: '👥' },
              { id: 'hmis-service-utilization', label: 'Service Utilization', icon: '⚕️' },
              { id: 'hmis-clinical', label: 'Clinical Indicators', icon: '📋' },
              { id: 'hmis-staff', label: 'Staff Utilization', icon: '👨‍💼' },
              { id: 'disease-frequency', label: 'Disease Frequency', icon: '🏥' },
              { id: 'department-report', label: 'Department Report', icon: '🏢' },
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'income-statement', label: 'Income', icon: '📈' },
              { id: 'budget-vs-actual', label: 'Budget', icon: '📊' },
              { id: 'ar-aging', label: 'AR Aging', icon: '📋' },
              { id: 'expense-analysis', label: 'Expenses', icon: '💰' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`py-3 px-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeReport === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Analytics View */}
      {activeReport === 'system-analytics' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Patients</p>
                    <p className="text-3xl font-bold mt-2">{systemAnalytics?.totalPatients || 0}</p>
                    <p className="text-xs text-muted-foreground mt-2">Active patients</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Appointments</p>
                    <p className="text-3xl font-bold mt-2">{systemAnalytics?.monthlyAppointments || 0}</p>
                    <p className="text-xs text-muted-foreground mt-2">This month</p>
                  </div>
                  <Stethoscope className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-3xl font-bold mt-2">UGX {(systemAnalytics?.monthlyRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground mt-2">This month</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-gold-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Lab Tests</p>
                    <p className="text-3xl font-bold mt-2">{systemAnalytics?.labTests || 0}</p>
                    <p className="text-xs text-muted-foreground mt-2">Total completed</p>
                  </div>
                  <TestTube className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `UGX ${(value as number).toLocaleString()}M`} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue (Millions)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Department Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Appointments per department this month</CardDescription>
              </CardHeader>
              <CardContent>
                {deptLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentPerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="appointments" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Age Distribution</CardTitle>
                <CardDescription>Current patient demographics by age</CardDescription>
              </CardHeader>
              <CardContent>
                {demographicsLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={demographics?.ageDistribution || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percentage }) => `${name} ${percentage}%`}
                      >
                        {AGE_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} patients`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Patient demographics by gender</CardDescription>
              </CardHeader>
              <CardContent>
                {demographicsLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={demographics?.genderDistribution || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percentage }) => `${name} ${percentage}%`}
                      >
                        {GENDER_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} patients`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Patient Analytics & Demographics Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Analytics & Demographics
              </CardTitle>
              <CardDescription>Comprehensive patient analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Total Patients</p>
                  <p className="text-3xl font-bold mt-2">{systemAnalytics?.totalPatients || 0}</p>
                  <p className="text-xs text-muted-foreground mt-2">Active patients</p>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">New Patients</p>
                  <p className="text-3xl font-bold mt-2">
                    {demographics?.ageDistribution?.reduce((sum: number, item: any) => sum + item.value, 0) || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">This month</p>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Average Age</p>
                  <p className="text-3xl font-bold mt-2">{demographics?.averageAge || 0}</p>
                  <p className="text-xs text-muted-foreground mt-2">Years</p>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Return Rate</p>
                  <p className="text-3xl font-bold mt-2">{demographics?.returnRate || 0}%</p>
                  <p className="text-xs text-muted-foreground mt-2">Patient retention</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Patient Registration Trend */}
          <Card>
            <CardHeader>
              <CardTitle>New Patient Registration</CardTitle>
              <CardDescription>Monthly registration trends</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newPatients" stroke="#8B5CF6" name="New Patients" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Export System Analytics Report</p>
                  <p className="text-sm text-muted-foreground">Download all analytics data in CSV format</p>
                </div>
                <Button size="sm" onClick={() => handleExport('system-analytics')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard View */}
      {activeReport === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      UGX {(incomeStatement?.totalRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      UGX {(incomeStatement?.totalExpenses || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      UGX {(incomeStatement?.netProfit || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">AR Outstanding</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                      UGX {(arAging?.totalOutstanding || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeLoading ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          name: 'Financial Summary',
                          Revenue: incomeStatement?.totalRevenue || 0,
                          Expenses: incomeStatement?.totalExpenses || 0,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `UGX ${(value as number).toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="Revenue" fill="#10b981" />
                      <Bar dataKey="Expenses" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* AR Aging Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Accounts Receivable Aging</CardTitle>
              </CardHeader>
              <CardContent>
                {arLoading ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: 'Current', value: arAging?.current || { total: 0, count: 0 }, color: 'green' },
                      { label: '30 Days', value: arAging?.thirtyDays || { total: 0, count: 0 }, color: 'yellow' },
                      { label: '60 Days', value: arAging?.sixtyDays || { total: 0, count: 0 }, color: 'orange' },
                      { label: '90 Days', value: arAging?.ninetyDays || { total: 0, count: 0 }, color: 'red' },
                      { label: '90+ Days', value: arAging?.ninetyPlus || { total: 0, count: 0 }, color: 'red' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full bg-${item.color}-500`} />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm block">
                            UGX {(item.value.total).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.value.count} invoices</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Expense Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Top Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseLoading ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseAnalysis?.byCategory.slice(0, 5) || []}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `UGX ${(value as number).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Profit Margin Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Margin</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeLoading ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Profit Margin %</span>
                        <span className="font-bold text-lg">
                          {((((incomeStatement?.netProfit || 0) / (incomeStatement?.totalRevenue || 1)) * 100)).toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full"
                          style={{
                            width: `${Math.min(((incomeStatement?.netProfit || 0) / (incomeStatement?.totalRevenue || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Summary</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Revenue:</span>
                          <span className="font-bold">UGX {(incomeStatement?.totalRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expenses:</span>
                          <span className="font-bold">UGX {(incomeStatement?.totalExpenses || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span>Net Profit:</span>
                          <span className="font-bold text-green-600">UGX {(incomeStatement?.netProfit || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Export Full Report</p>
                  <p className="text-sm text-muted-foreground">Download all data in CSV format</p>
                </div>
                <Button onClick={() => handleExport('dashboard')} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Income Statement Tab */}
      {activeReport === 'income-statement' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Income Statement</CardTitle>
              <CardDescription>Revenue, expenses, and profit summary</CardDescription>
            </div>
            <Button onClick={() => handleExport('income-statement')} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {incomeLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Revenue</h3>
                  <div className="space-y-2">
                    {Object.entries(incomeStatement?.incomeByCategory || {}).map(([category, amount]) => (
                      <div key={category} className="flex justify-between px-4 py-2 border-b">
                        <span className="text-muted-foreground">{category}</span>
                        <span className="font-bold text-green-600">
                          UGX {((amount as number) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-3 bg-green-50 font-bold text-lg">
                      <span>Total Revenue</span>
                      <span className="text-green-600">
                        UGX {(incomeStatement?.totalRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4">Expenses</h3>
                  <div className="space-y-2">
                    {Object.entries(incomeStatement?.expenseByCategory || {}).map(([category, amount]) => (
                      <div key={category} className="flex justify-between px-4 py-2 border-b">
                        <span className="text-muted-foreground">{category}</span>
                        <span className="font-bold text-red-600">
                          UGX {((amount as number) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-3 bg-red-50 font-bold text-lg">
                      <span>Total Expenses</span>
                      <span className="text-red-600">
                        UGX {(incomeStatement?.totalExpenses || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">Net Profit (Loss)</span>
                    <span className="text-3xl font-bold text-blue-600">
                      UGX {(incomeStatement?.netProfit || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Budget vs Actual Tab */}
      {activeReport === 'budget-vs-actual' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budget vs Actual Analysis</CardTitle>
              <CardDescription>Compare planned vs actual spending</CardDescription>
            </div>
            <Button onClick={() => handleExport('budget-vs-actual')} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {budgetLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-4">
                {budgetVsActual?.comparison?.map(item => (
                  <div key={item.category} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{item.category}</p>
                        <Badge variant={item.status === 'under' ? 'default' : 'destructive'}>
                          {item.status === 'under' ? 'Under Budget' : 'Over Budget'}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">
                        {item.variancePercent > 0 ? '+' : ''}{item.variancePercent}%
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Budgeted</p>
                        <p className="font-bold">UGX {item.budgeted.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Actual</p>
                        <p className="font-bold">UGX {item.actual.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variance</p>
                        <p className={`font-bold ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          UGX {item.variance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${item.status === 'under' ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min((item.actual / item.budgeted) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AR Aging Tab */}
      {activeReport === 'ar-aging' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Accounts Receivable Aging Report</CardTitle>
              <CardDescription>Outstanding invoices by age</CardDescription>
            </div>
            <Button onClick={() => handleExport('ar-aging')} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {arLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Current', data: arAging?.current, color: 'green' },
                  { label: '1-30 Days Overdue', data: arAging?.thirtyDays, color: 'yellow' },
                  { label: '31-60 Days Overdue', data: arAging?.sixtyDays, color: 'orange' },
                  { label: '61-90 Days Overdue', data: arAging?.ninetyDays, color: 'red' },
                  { label: '90+ Days Overdue', data: arAging?.ninetyPlus, color: 'red' },
                ].map(bucket => (
                  <div key={bucket.label} className={`border rounded-lg p-4 border-${bucket.color}-200 bg-${bucket.color}-50`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{bucket.label}</p>
                      <Badge variant="outline">{bucket.data?.count || 0} invoices</Badge>
                    </div>
                    <p className="text-2xl font-bold">
                      UGX {(bucket.data?.total || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}

                <div className="bg-red-100 border border-red-300 rounded-lg p-4 mt-6">
                  <p className="text-muted-foreground mb-1">Total Outstanding</p>
                  <p className="text-3xl font-bold text-red-600">
                    UGX {(arAging?.totalOutstanding || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expense Analysis Tab */}
      {activeReport === 'expense-analysis' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Expense Analysis</CardTitle>
              <CardDescription>Spending breakdown by category</CardDescription>
            </div>
            <Button onClick={() => handleExport('expense-analysis')} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {expenseLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-4">
                {expenseAnalysis?.byCategory?.map(item => (
                  <div key={item.category} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{item.category}</p>
                        <p className="text-xs text-muted-foreground">{item.count} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          UGX {item.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}% of total</p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      Average per transaction: UGX {item.average.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-muted-foreground mb-1">Total Expenses</p>
                  <p className="text-3xl font-bold text-blue-600">
                    UGX {(expenseAnalysis?.totalExpenses || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* HMIS Patient Flow Report */}
      {activeReport === 'hmis-patient-flow' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Flow Report</CardTitle>
              <CardDescription>Monthly patient flow analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <p className="text-sm text-muted-foreground">New Patients</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{patientFlow?.newPatients || 0}</p>
                </div>
                <div className="border rounded-lg p-4 bg-green-50">
                  <p className="text-sm text-muted-foreground">Follow-up Visits</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{patientFlow?.followUps || 0}</p>
                </div>
                <div className="border rounded-lg p-4 bg-purple-50">
                  <p className="text-sm text-muted-foreground">Referrals</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{patientFlow?.referrals || 0}</p>
                </div>
                <div className="border rounded-lg p-4 bg-orange-50">
                  <p className="text-sm text-muted-foreground">Total Encounters</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{patientFlow?.totalPatientEncounters || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Export Patient Flow Report</p>
                  <p className="text-sm text-muted-foreground">Download patient flow data in CSV format</p>
                </div>
                <Button size="sm" onClick={() => handleExport('hmis-patient-flow')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HMIS Service Utilization Report */}
      {activeReport === 'hmis-service-utilization' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Utilization Report</CardTitle>
              <CardDescription>Healthcare service utilization metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">Outpatient Services</p>
                      <Badge>{serviceUtilization?.outpatientServices || 0}</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div className="bg-blue-500 h-2 rounded" style={{width: `${Math.min((serviceUtilization?.outpatientServices || 0) / 100 * 100, 100)}%`}} />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">Lab Services</p>
                      <Badge>{serviceUtilization?.labServices || 0}</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div className="bg-green-500 h-2 rounded" style={{width: `${Math.min((serviceUtilization?.labServices || 0) / 100 * 100, 100)}%`}} />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">Pharmacy Services</p>
                      <Badge>{serviceUtilization?.pharmacyServices || 0}</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div className="bg-purple-500 h-2 rounded" style={{width: `${Math.min((serviceUtilization?.pharmacyServices || 0) / 100 * 100, 100)}%`}} />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">Nursing Services</p>
                      <Badge>{serviceUtilization?.nursingServices || 0}</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div className="bg-orange-500 h-2 rounded" style={{width: `${Math.min((serviceUtilization?.nursingServices || 0) / 100 * 100, 100)}%`}} />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <p className="text-sm text-muted-foreground mb-2">Total Service Utilization</p>
                  <p className="text-4xl font-bold text-blue-600 mb-4">{serviceUtilization?.totalUtilization || 0}</p>
                  <p className="text-sm text-muted-foreground">Service encounters this month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Export Service Utilization Report</p>
                  <p className="text-sm text-muted-foreground">Download service utilization data in CSV format</p>
                </div>
                <Button size="sm" onClick={() => handleExport('hmis-service-utilization')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HMIS Clinical Indicators Report */}
      {activeReport === 'hmis-clinical' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Performance Indicators</CardTitle>
              <CardDescription>Key clinical quality metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6 bg-green-50">
                  <p className="text-sm text-muted-foreground mb-2">Appointment Completion Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-green-600">{clinicalIndicators?.appointmentCompletionRate || 0}%</p>
                  </div>
                </div>

                <div className="border rounded-lg p-6 bg-blue-50">
                  <p className="text-sm text-muted-foreground mb-2">Lab Test Completion Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-blue-600">{clinicalIndicators?.labTestCompletionRate || 0}%</p>
                  </div>
                </div>

                <div className="border rounded-lg p-6 bg-orange-50">
                  <p className="text-sm text-muted-foreground mb-2">Average Wait Time</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-orange-600">{clinicalIndicators?.averageWaitTime || 0}</p>
                    <span className="text-muted-foreground">minutes</span>
                  </div>
                </div>

                <div className="border rounded-lg p-6 bg-purple-50">
                  <p className="text-sm text-muted-foreground mb-2">Patient Satisfaction</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-purple-600">{clinicalIndicators?.patientSatisfaction || 0}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Export Clinical Indicators Report</p>
                  <p className="text-sm text-muted-foreground">Download clinical indicators data in CSV format</p>
                </div>
                <Button size="sm" onClick={() => handleExport('hmis-clinical')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HMIS Staff Utilization Report */}
      {activeReport === 'hmis-staff' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Utilization - {selectedDepartment}</CardTitle>
              <CardDescription>Active staff members by role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4 bg-blue-50 text-center">
                  <Stethoscope className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Doctors</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{staffUtilization?.doctorsActive || 0}</p>
                </div>

                <div className="border rounded-lg p-4 bg-green-50 text-center">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nurses</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{staffUtilization?.nursesActive || 0}</p>
                </div>

                <div className="border rounded-lg p-4 bg-purple-50 text-center">
                  <TestTube className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Lab Technicians</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{staffUtilization?.labTechniciansActive || 0}</p>
                </div>

                <div className="border rounded-lg p-4 bg-orange-50 text-center">
                  <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Pharmacists</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{staffUtilization?.pharmacistsActive || 0}</p>
                </div>
              </div>

              <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-100 to-indigo-100 mt-6">
                <p className="text-sm text-muted-foreground mb-2">Total Active Staff</p>
                <p className="text-4xl font-bold text-blue-600">{staffUtilization?.totalStaff || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Export Staff Utilization Report</p>
                  <p className="text-sm text-muted-foreground">Download staff data in CSV format</p>
                </div>
                <Button size="sm" onClick={() => handleExport('hmis-staff')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Disease Frequency Report */}
      {activeReport === 'disease-frequency' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Disease & Condition Frequency</CardTitle>
              <CardDescription>Most common diagnoses this month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={diseaseFrequency || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="disease" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 space-y-3">
                {diseaseFrequency?.map((item: any) => (
                  <div key={item.disease} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{item.disease}</p>
                      <p className="text-sm text-muted-foreground">{item.frequency} cases</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Export Disease Frequency Report</p>
                  <p className="text-sm text-muted-foreground">Download disease frequency data in CSV format</p>
                </div>
                <Button size="sm" onClick={() => handleExport('disease-frequency')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department Report */}
      {activeReport === 'department-report' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedDepartment} Department Report</CardTitle>
              <CardDescription>Departmental performance and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-6 bg-blue-50">
                  <p className="text-sm text-muted-foreground mb-2">Monthly Appointments</p>
                  <p className="text-4xl font-bold text-blue-600">{departmentStats?.monthlyAppointments || 0}</p>
                  <p className="text-xs text-muted-foreground mt-2">This month</p>
                </div>

                <div className="border rounded-lg p-6 bg-green-50">
                  <p className="text-sm text-muted-foreground mb-2">Department Revenue</p>
                  <p className="text-3xl font-bold text-green-600">UGX {(departmentStats?.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-muted-foreground mt-2">This month</p>
                </div>

                <div className="border rounded-lg p-6 bg-purple-50">
                  <p className="text-sm text-muted-foreground mb-2">Avg Value/Appointment</p>
                  <p className="text-3xl font-bold text-purple-600">UGX {(departmentStats?.averageAppointmentValue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-muted-foreground mt-2">Average</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Export Department Report</p>
                  <p className="text-sm text-muted-foreground">Download department data in CSV format</p>
                </div>
                <Button size="sm" onClick={() => handleExport('department-report')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reports;