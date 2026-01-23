import { Users, Calendar, DollarSign, Bed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const patientTrendData = [
  { month: 'Jul', patients: 2500 },
  { month: 'Aug', patients: 2200 },
  { month: 'Sep', patients: 2800 },
  { month: 'Oct', patients: 2100 },
  { month: 'Nov', patients: 2400 },
  { month: 'Dec', patients: 2600 },
  { month: 'Jan', patients: 2900 },
];

const departmentData = [
  { name: 'Cardiology', value: 30, color: '#0EA5E9' },
  { name: 'Neurology', value: 25, color: '#22C55E' },
  { name: 'Orthopedics', value: 20, color: '#F59E0B' },
  { name: 'Pediatrics', value: 15, color: '#8B5CF6' },
  { name: 'Others', value: 10, color: '#6B7280' },
];

const Dashboard = () => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Patients"
          value="2,847"
          change="+12% from last month"
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Today's Appointments"
          value="47"
          change="+3% from last month"
          changeType="positive"
          icon={Calendar}
        />
        <StatsCard
          title="Revenue (Month)"
          value="UGX 89,432,000"
          change="+8% from last month"
          changeType="positive"
          icon={DollarSign}
        />
        <StatsCard
          title="Bed Occupancy"
          value="78%"
          change="-2% from last month"
          changeType="negative"
          icon={Bed}
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={patientTrendData}>
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
              Patient distribution by department
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;