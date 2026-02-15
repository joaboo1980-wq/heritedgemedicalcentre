import { Users, Calendar, DollarSign, FlaskConical, PackageX, Clock, TrendingUp, Activity, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useDashboardStats,
  usePatientTrend,
  useDepartmentDistribution,
  useRecentAppointments,
  usePendingLabOrders,
  useWeeklyAppointments,
  useActivityLog,
} from '@/hooks/useDashboard';

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `UGX ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `UGX ${(value / 1000).toFixed(0)}K`;
  }
  return `UGX ${value.toLocaleString()}`;
};

interface ActivityItem {
  id: string;
  description: string;
  timeAgo: string;
  icon: string;
  type: string;
  created_at?: string;
  user_role?: string;
  user_id?: string;
  [key: string]: any;
}

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: patientTrend, isLoading: trendLoading } = usePatientTrend();
  const { data: departmentData, isLoading: deptLoading } = useDepartmentDistribution();
  const { data: recentAppointments, isLoading: apptLoading } = useRecentAppointments();
  const { data: pendingLabOrders, isLoading: labLoading } = usePendingLabOrders();
  const { data: weeklyAppointments, isLoading: weeklyLoading } = useWeeklyAppointments();
  const { data: activityLog, isLoading: activityLoading } = useActivityLog();
  
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [visibleActivities, setVisibleActivities] = useState<Set<string>>(new Set());
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);

  // Hide activity if older than 24 hours
  useEffect(() => {
    if (!activityLog) return;
    
    const activeActivities = new Set<string>();
    const now = new Date().getTime();
    
    activityLog.forEach((activity: ActivityItem) => {
      const activityTime = activity.created_at ? new Date(activity.created_at).getTime() : now;
      const hoursDiff = (now - activityTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        activeActivities.add(activity.id);
      }
    });
    
    setVisibleActivities(activeActivities);
  }, [activityLog]);

  const getChangeString = (change: number, prefix = '') => {
    if (change === 0) return 'No change from last month';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}%${prefix} from last month`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'pending':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening at your clinic today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Total Patients"
          value={stats?.totalPatients?.toLocaleString() || '0'}
          change={getChangeString(stats?.patientChange || 0)}
          changeType={stats?.patientChange && stats.patientChange > 0 ? 'positive' : stats?.patientChange && stats.patientChange < 0 ? 'negative' : 'neutral'}
          icon={Users}
          gradient="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Today's Appointments"
          value={stats?.todayAppointments?.toString() || '0'}
          change={getChangeString(stats?.appointmentChange || 0)}
          changeType={stats?.appointmentChange && stats.appointmentChange > 0 ? 'positive' : stats?.appointmentChange && stats.appointmentChange < 0 ? 'negative' : 'neutral'}
          icon={Calendar}
          gradient="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Revenue (Month)"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          change={getChangeString(stats?.revenueChange || 0)}
          changeType={stats?.revenueChange && stats.revenueChange > 0 ? 'positive' : stats?.revenueChange && stats.revenueChange < 0 ? 'negative' : 'neutral'}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-green-600 via-emerald-500 to-teal-500"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Pending Lab Orders"
          value={stats?.pendingLabOrders?.toString() || '0'}
          change="Awaiting results"
          changeType="neutral"
          icon={FlaskConical}
          gradient="bg-gradient-to-br from-orange-600 via-orange-500 to-red-500"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Low Stock Items"
          value={stats?.lowStockMedications?.toString() || '0'}
          change="Need reorder"
          changeType={stats?.lowStockMedications && stats.lowStockMedications > 0 ? 'negative' : 'neutral'}
          icon={PackageX}
          gradient="bg-gradient-to-br from-red-600 via-pink-500 to-rose-500"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Active Today"
          value={stats?.todayAppointments?.toString() || '0'}
          change="In progress"
          changeType="neutral"
          icon={Clock}
          gradient="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500"
          isLoading={statsLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Registration Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Patient Registration Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Monthly patient registration over the last 7 months
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {trendLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={patientTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="patients" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white pb-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : activityLog && activityLog.length > 0 ? (
              <div className="space-y-3">
                {activityLog.filter(activity => visibleActivities.has(activity.id)).slice(0, 5).map((activity: ActivityItem) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-xl mt-0.5 flex-shrink-0">{activity.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm line-clamp-2">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                        {activity.user_role && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {activity.user_role}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedActivity(activity)}
                      className="flex-shrink-0 h-8 px-2"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      <div className="grid grid-cols-1 gap-6">
        {/* Alerts & Notifications */}
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Alerts & Notifications
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Important updates requiring attention
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-red-900 dark:text-red-200">Low Inventory Alert</p>
                    <p className="text-xs text-red-700 dark:text-red-300">Paracetamol stock is running low (17 units remaining)</p>
                  </div>
                  <Badge variant="secondary" className="bg-red-500 text-white ml-2">warning</Badge>
                </div>
              </div>
              <div className="p-3 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-pink-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-pink-900 dark:text-pink-200">Equipment Maintenance</p>
                    <p className="text-xs text-pink-700 dark:text-pink-300">Mill Machine #2 scheduled for maintenance tomorrow</p>
                  </div>
                  <Badge variant="secondary" className="bg-pink-500 text-white ml-2">info</Badge>
                </div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-purple-900 dark:text-purple-200">Staff Schedule</p>
                    <p className="text-xs text-purple-700 dark:text-purple-300">Dr. Johnson requested schedule change for next week</p>
                  </div>
                  <Badge variant="secondary" className="bg-purple-500 text-white ml-2">info</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Upcoming Appointments
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Next scheduled appointments
            </p>
          </CardHeader>
          <CardContent>
            {apptLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentAppointments && recentAppointments.length > 0 ? (
              <div className="space-y-3">
                {recentAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{apt.patient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(apt.appointment_date), 'MMM d, yyyy')} at {apt.appointment_time}
                      </p>
                      {apt.department && (
                        <p className="text-xs text-muted-foreground">{apt.department}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(apt.status)}>
                      {apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming appointments</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Lab Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Pending Lab Orders
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Lab tests awaiting results
            </p>
          </CardHeader>
          <CardContent>
            {labLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingLabOrders && pendingLabOrders.length > 0 ? (
              <div className="space-y-3">
                {pendingLabOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{order.patient_name}</p>
                      <p className="text-sm text-muted-foreground">{order.test_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      {order.priority !== 'normal' && (
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending lab orders</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Appointments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Appointments */}
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {weeklyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : weeklyAppointments && weeklyAppointments.length > 0 ? (
              <div className="space-y-3">
                {weeklyAppointments.slice(0, 6).map((apt, index) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        apt.daysFromNow === 0 ? 'bg-gradient-to-br from-red-500 to-pink-500' :
                        apt.daysFromNow === 1 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                        apt.daysFromNow <= 3 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                        'bg-gradient-to-br from-green-500 to-blue-500'
                      }`}>
                        {apt.daysFromNow}d
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{apt.patient_name}</p>
                        <p className="text-sm text-muted-foreground">{apt.displayDay} at {apt.appointment_time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.department && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          {apt.department}
                        </span>
                      )}
                      <Badge className={getStatusColor(apt.status)}>
                        {apt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No appointments this week</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white pb-4">
            <CardTitle className="text-base">Department Distribution (Staff)</CardTitle>
            {selectedDepartment && (
              <p className="text-sm text-white/80 mt-2">
                Showing {selectedDepartment.value} staff member{selectedDepartment.value !== 1 ? 's' : ''} ({selectedDepartment.percentage}%)
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {deptLoading ? (
              <Skeleton className="h-64" />
            ) : departmentData && departmentData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(entry) => setSelectedDepartment(entry)}
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => {
                      if (name === 'value') {
                        const dept = departmentData.find(d => d.value === value);
                        return `${value} staff (${dept?.percentage}%)`;
                      }
                      return value;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center">Click on a sector to view staff details</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No department data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Staff Modal */}
      {selectedDepartment && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl animate-in fade-in duration-200 max-h-[80vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b sticky top-0 bg-white dark:bg-slate-950">
              <div>
                <CardTitle className="text-lg">{selectedDepartment.name} Department</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDepartment.value} staff member{selectedDepartment.value !== 1 ? 's' : ''} ({selectedDepartment.percentage}% of total)
                </p>
              </div>
              <button
                onClick={() => setSelectedDepartment(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedDepartment.staffMembers && selectedDepartment.staffMembers.length > 0 ? (
                <div className="space-y-4">
                  {selectedDepartment.staffMembers.map((staff: any) => (
                    <div
                      key={staff.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {staff.first_name} {staff.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {staff.role.replace('_', ' ')}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {staff.role.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>📧 {staff.email}</p>
                        <p>📱 {staff.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No staff members in this department</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md animate-in fade-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{selectedActivity.icon}</span>
                Activity Details
              </CardTitle>
              <button
                onClick={() => setSelectedActivity(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Activity</p>
                <p className="text-foreground font-medium">{selectedActivity.description}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Time</p>
                <p className="text-foreground">{selectedActivity.timeAgo}</p>
                {selectedActivity.created_at && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedActivity.created_at), 'PPpp')}
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
                <Badge variant="outline" className="capitalize">
                  {selectedActivity.type.replace('_', ' ')}
                </Badge>
              </div>

              {selectedActivity.user_role && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Performed By</p>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {selectedActivity.user_role}
                  </Badge>
                </div>
              )}

              {selectedActivity.patient_name && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Patient</p>
                  <p className="text-foreground">{selectedActivity.patient_name}</p>
                </div>
              )}

              {selectedActivity.department && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Department</p>
                  <p className="text-foreground">{selectedActivity.department}</p>
                </div>
              )}

              {selectedActivity.status && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge className={getStatusColor(selectedActivity.status)}>
                    {selectedActivity.status}
                  </Badge>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  This activity will auto-hide after 24 hours
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
