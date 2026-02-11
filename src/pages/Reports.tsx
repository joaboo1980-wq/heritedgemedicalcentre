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
} from 'lucide-react';
import {
  useIncomeStatement,
  useBudgetVsActual,
  useAccountsReceivableAging,
  useExpenseAnalysis,
} from '@/hooks/useAccounts';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const Reports = () => {
  const { toast } = useToast();
  const [activeReport, setActiveReport] = useState('dashboard');
  const [dateRange, setDateRange] = useState('this-month');
  const [exportFormat, setExportFormat] = useState('csv');

  // Fetch all reporting data
  const { data: incomeStatement, isLoading: incomeLoading } = useIncomeStatement();
  const { data: budgetVsActual, isLoading: budgetLoading } = useBudgetVsActual();
  const { data: arAging, isLoading: arLoading } = useAccountsReceivableAging();
  const { data: expenseAnalysis, isLoading: expenseLoading } = useExpenseAnalysis();

  const handleExport = (reportName: string) => {
    try {
      let csvContent = '';
      let filename = '';

      switch (reportName) {
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

      const element = document.createElement('a');
      element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: 'Success',
        description: `${reportName} exported as ${exportFormat.toUpperCase()}`,
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
      <div className="border-b border-border">
        <div className="flex gap-8 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'income-statement', label: 'Income Statement', icon: '📈' },
            { id: 'budget-vs-actual', label: 'Budget vs Actual', icon: '📊' },
            { id: 'ar-aging', label: 'AR Aging', icon: '📋' },
            { id: 'expense-analysis', label: 'Expense Analysis', icon: '💰' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
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
                <Button onClick={() => handleExport('income-statement')} size="sm">
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
    </div>
  );
};

export default Reports;