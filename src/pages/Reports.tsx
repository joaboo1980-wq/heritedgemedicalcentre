import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import PermissionGuard from '@/components/layout/PermissionGuard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Badge } from '@/components/ui/badge';

const monthlyRevenue = [
  { month: 'Jan', revenue: 4800000 },
  { month: 'Feb', revenue: 5200000 },
  { month: 'Mar', revenue: 4900000 },
  { month: 'Apr', revenue: 6100000 },
  { month: 'May', revenue: 5800000 },
  { month: 'Jun', revenue: 7100000 },
  { month: 'Jul', revenue: 7500000 },
  { month: 'Aug', revenue: 8200000 },
  { month: 'Sep', revenue: 7800000 },
  { month: 'Oct', revenue: 9100000 },
  { month: 'Nov', revenue: 8500000 },
  { month: 'Dec', revenue: 8900000 },
];

const newPatientRegistration = [
  { month: 'Jan', patients: 35 },
  { month: 'Feb', patients: 42 },
  { month: 'Mar', patients: 38 },
  { month: 'Apr', patients: 55 },
  { month: 'May', patients: 48 },
  { month: 'Jun', patients: 61 },
];

const departmentPerformance = [
  { name: 'General', appointments: 95 },
  { name: 'Cardiology', appointments: 82 },
  { name: 'Pediatrics', appointments: 76 },
  { name: 'Neurology', appointments: 68 },
  { name: 'Laboratory', appointments: 112 },
];

const patientAgeDistribution = [
  { range: '0-18', value: 156 },
  { range: '19-35', value: 324 },
  { range: '36-55', value: 445 },
  { range: '56+', value: 323 },
];

const genderDistribution = [
  { name: 'Female', value: 648 },
  { name: 'Male', value: 600 },
];

const patientsByDepartment = [
  { name: 'General', value: 156 },
  { name: 'Cardiology', value: 234 },
  { name: 'Pediatrics', value: 189 },
  { name: 'Neurology', value: 145 },
];

const appointmentStats = [
  { day: 'Mon', completed: 45, cancelled: 5 },
  { day: 'Tue', completed: 52, cancelled: 3 },
  { day: 'Wed', completed: 48, cancelled: 7 },
  { day: 'Thu', completed: 55, cancelled: 4 },
  { day: 'Fri', completed: 42, cancelled: 6 },
  { day: 'Sat', completed: 30, cancelled: 2 },
  { day: 'Sun', completed: 15, cancelled: 1 },
];

const COLORS = ['#0EA5E9', '#22C55E', '#F59E0B', '#EF4444'];

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Reports</h1>
          <p className="text-muted-foreground mt-1">
            View analytics and generate reports
          </p>
        </div>
        <div className="flex gap-3">
          <Select defaultValue="month">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <PermissionGuard module="reports" action="create">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">2,847</p>
              <p className="text-sm text-muted-foreground">Total Patients</p>
              <p className="text-xs text-green-600">+12% from last month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">1,423</p>
              <p className="text-sm text-muted-foreground">Appointments</p>
              <p className="text-xs text-green-600">+8% from last month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">UGX 89.4M</p>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-xs text-green-600">+5% from last month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">94%</p>
              <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
              <p className="text-xs text-green-600">+2% from last month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`UGX ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Patient Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patientsByDepartment}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {patientsByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Appointment Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PermissionGuard module="reports" action="create">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Patient Report</p>
                  <p className="text-xs text-muted-foreground">Demographics and visits</p>
                </div>
              </Button>
            </PermissionGuard>
            <PermissionGuard module="reports" action="create">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Financial Report</p>
                  <p className="text-xs text-muted-foreground">Revenue and billing</p>
                </div>
              </Button>
            </PermissionGuard>
            <PermissionGuard module="reports" action="create">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Appointment Report</p>
                  <p className="text-xs text-muted-foreground">Scheduling analytics</p>
                </div>
              </Button>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Tabs defaultValue="patients" className="w-full">
        <TabsList>
          <TabsTrigger value="patients">Patient Analytics</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="lab">Laboratory</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Patients</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">1,248</p>
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4" />
                  +55 this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Patients</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">55</p>
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Return Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">78%</p>
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4" />
                  +3% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patientAgeDistribution.map((dist) => (
                    <div key={dist.range}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{dist.range} years</span>
                        <span className="text-sm font-medium">{dist.value} patients</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${(dist.value / 450) * 100}%`}}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({name, value}) => `${name} ${value}`}
                        labelLine={false}
                      >
                        {genderDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">456</p>
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4" />
                  +8% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">92%</p>
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4" />
                  +1% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No-shows</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">8%</p>
                <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                  <TrendingDown className="h-4 w-4" />
                  +1% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="name" width={80} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="appointments" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `UGX ${(value / 1000000).toFixed(1)}M`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">156</p>
                <p className="text-sm text-muted-foreground mt-1">Active staff members</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">On Duty</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">156</p>
                <p className="text-sm text-muted-foreground mt-1">Currently working</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Labs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">12</p>
                <p className="text-sm text-muted-foreground mt-1">Tests awaiting results</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lab" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">189</p>
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4" />
                  From last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">165</p>
                <p className="text-sm text-muted-foreground mt-1">87% completion rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">24</p>
                <p className="text-sm text-muted-foreground mt-1">13% pending</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;