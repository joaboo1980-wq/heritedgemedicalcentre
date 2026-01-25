import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
} from 'recharts';
import {
  Download,
  Search,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import PermissionGuard from '@/components/layout/PermissionGuard';

const monthlyRevenueData = [
  { month: 'Jan', revenue: 4800000 },
  { month: 'Feb', revenue: 5200000 },
  { month: 'Mar', revenue: 4900000 },
  { month: 'Apr', revenue: 6100000 },
  { month: 'May', revenue: 5800000 },
  { month: 'Jun', revenue: 7100000 },
];

const transactionsData = [
  {
    id: '1',
    date: 'May 22, 2025',
    description: 'Patient Payment - Emma Thompson',
    category: 'Patient Payments',
    reference: 'PAY-001',
    amount: 150000,
    type: 'income',
  },
  {
    id: '2',
    date: 'May 21, 2025',
    description: 'Medical Supplies Purchase',
    category: 'Supplies',
    reference: 'SUP-045',
    amount: 2400000,
    type: 'expense',
  },
  {
    id: '3',
    date: 'May 20, 2025',
    description: 'Insurance Reimbursement',
    category: 'Insurance',
    reference: 'INS-234',
    amount: 3200000,
    type: 'income',
  },
  {
    id: '4',
    date: 'May 19, 2025',
    description: 'Staff Salary - Dr. Williams',
    category: 'Salaries',
    reference: 'SAL-001',
    amount: 8500000,
    type: 'expense',
  },
  {
    id: '5',
    date: 'May 18, 2025',
    description: 'Equipment Maintenance',
    category: 'Equipment',
    reference: 'EQP-012',
    amount: 750000,
    type: 'expense',
  },
];

const Accounts = () => {
  const totalRevenue = 124780000;
  const totalExpenses = 78450000;
  const netProfit = totalRevenue - totalExpenses;
  const outstanding = 12450000;

  const getTransactionIcon = (type: string) => {
    if (type === 'income') {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  };

  const getTransactionColor = (type: string) => {
    if (type === 'income') {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      'Patient Payments': 'bg-blue-100 text-blue-800',
      'Supplies': 'bg-purple-100 text-purple-800',
      'Insurance': 'bg-green-100 text-green-800',
      'Salaries': 'bg-orange-100 text-orange-800',
      'Equipment': 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Accounts & Finance</h1>
          <p className="text-muted-foreground mt-1">
            Financial overview and transaction management
          </p>
        </div>
        <PermissionGuard module="accounts" action="create">
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </PermissionGuard>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  UGX {(totalRevenue / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">+20% from last month</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  UGX {(totalExpenses / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">+5% from last month</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <ArrowUpRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold text-primary">
                  UGX {(netProfit / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">+35% from last month</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-amber-600">
                  UGX {(outstanding / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">8% of total revenue</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-100">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Monthly Revenue Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Revenue over the last 12 months
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
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
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Revenue vs Expenses
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Monthly comparison
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
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
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Recent Transactions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track all financial transactions and cash flow
              </p>
            </div>
            <div className="flex gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-9"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionsData.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.date}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryBadgeColor(transaction.category)}>
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                  <TableCell className={`font-bold ${getTransactionColor(transaction.type)}`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    UGX {transaction.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getTransactionIcon(transaction.type)}
                      <span className="capitalize text-sm">
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Accounts;
