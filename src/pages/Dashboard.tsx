import { Users, Calendar, DollarSign, FlaskConical, PackageX, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: patientTrend, isLoading: trendLoading } = usePatientTrend();
  const { data: departmentData, isLoading: deptLoading } = useDepartmentDistribution();
  const { data: recentAppointments, isLoading: apptLoading } = useRecentAppointments();
  const { data: pendingLabOrders, isLoading: labLoading } = usePendingLabOrders();

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
          isLoading={statsLoading}
        />
        <StatsCard
          title="Today's Appointments"
          value={stats?.todayAppointments?.toString() || '0'}
          change={getChangeString(stats?.appointmentChange || 0)}
          changeType={stats?.appointmentChange && stats.appointmentChange > 0 ? 'positive' : stats?.appointmentChange && stats.appointmentChange < 0 ? 'negative' : 'neutral'}
          icon={Calendar}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Revenue (Month)"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          change={getChangeString(stats?.revenueChange || 0)}
          changeType={stats?.revenueChange && stats.revenueChange > 0 ? 'positive' : stats?.revenueChange && stats.revenueChange < 0 ? 'negative' : 'neutral'}
          icon={DollarSign}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Pending Lab Orders"
          value={stats?.pendingLabOrders?.toString() || '0'}
          change="Awaiting results"
          changeType="neutral"
          icon={FlaskConical}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Low Stock Items"
          value={stats?.lowStockMedications?.toString() || '0'}
          change="Need reorder"
          changeType={stats?.lowStockMedications && stats.lowStockMedications > 0 ? 'negative' : 'neutral'}
          icon={PackageX}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Active Today"
          value={stats?.todayAppointments?.toString() || '0'}
          change="In progress"
          changeType="neutral"
          icon={Clock}
          isLoading={statsLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Registration Trend */}
        <Card className="lg:col-span-2">
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

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Department Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Appointments by department
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {deptLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-full h-full rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(departmentData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => (
                        <span className="text-sm text-muted-foreground">{value}</span>
                      )}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Weekly Appointments
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Appointment bookings for this week
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No valid data available</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Recent Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest updates from your clinic
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments && recentAppointments.length > 0 ? (
                <div className="space-y-3">
                  {recentAppointments.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="flex gap-3 pb-3 border-b last:border-b-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">
                          New appointment scheduled with {apt.patient_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(apt.appointment_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Patient John Doe checked in
                </div>
                <div className="text-xs text-muted-foreground">12 minutes ago</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Lab results ready for Patient ID: 12345
                </div>
                <div className="text-xs text-muted-foreground">25 minutes ago</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Payment received from Insurance Co.
                </div>
                <div className="text-xs text-muted-foreground">1 hour ago</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Emergency patient admitted to ICU
                </div>
                <div className="text-xs text-muted-foreground">5 hours ago</div>
              </div>
            </div>
          </CardContent>
        </Card>

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
    </div>
  );
};

export default Dashboard;
