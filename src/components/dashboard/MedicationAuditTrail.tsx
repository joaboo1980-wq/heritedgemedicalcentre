import { useState, useMemo } from 'react';
import { useMedicationAuditLog } from '@/hooks/useMedicationScheduling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HistoryIcon, Search, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, subDays } from 'date-fns';

interface MedicationAuditTrailProps {
  patientId?: string;
  showCompact?: boolean;
}

export const MedicationAuditTrail = ({
  patientId,
  showCompact = false,
}: MedicationAuditTrailProps) => {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('7');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const dateRangeObj = useMemo(() => {
    const to = new Date();
    let from;
    switch (dateRange) {
      case '7':
        from = subDays(to, 7);
        break;
      case '30':
        from = subDays(to, 30);
        break;
      case '90':
        from = subDays(to, 90);
        break;
      default:
        from = subDays(to, 365);
    }
    return { from, to };
  }, [dateRange]);

  const { data: auditLogs = [], isLoading } = useMedicationAuditLog({
    patientId,
    dateRange: dateRangeObj,
  });

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const medicationName = (log as any)?.prescription_items?.medications?.name || '';
      const logNotes = log.notes || '';
      const skipReason = log.reason_if_skipped || '';
      
      const matchesSearch =
        medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        logNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skipReason.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [auditLogs, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: filteredLogs.length,
      administered: filteredLogs.filter((l) => l.status === 'administered').length,
      skipped: filteredLogs.filter((l) => l.status === 'skipped').length,
      refused: filteredLogs.filter((l) => l.status === 'refused').length,
      delayed: filteredLogs.filter((l) => l.status === 'delayed').length,
    };
  }, [filteredLogs]);

  const statusColors: Record<string, string> = {
    administered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    skipped: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    refused: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    delayed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" />
            Medication History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading audit trail...</div>
        </CardContent>
      </Card>
    );
  }

  if (showCompact) {
    const recentLogs = filteredLogs.slice(0, 3);
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HistoryIcon className="w-4 h-4" />
            Recent Administrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medication history</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => {
                const medicationName = (log as any)?.prescription_items?.medications?.name || 'Unknown';
                return (
                  <div
                    key={log.id}
                    className="flex items-start justify-between text-sm py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{medicationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.administered_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[log.status]}
                    >
                      {log.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5" />
              Medication Administration History
            </CardTitle>
            <CardDescription>
              Audit trail of all medication administrations and status changes
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatCard label="Total" value={stats.total} color="bg-blue-50 dark:bg-blue-900/20" />
          <StatCard
            label="Administered"
            value={stats.administered}
            color="bg-green-50 dark:bg-green-900/20"
          />
          <StatCard
            label="Skipped"
            value={stats.skipped}
            color="bg-yellow-50 dark:bg-yellow-900/20"
          />
          <StatCard
            label="Refused"
            value={stats.refused}
            color="bg-red-50 dark:bg-red-900/20"
          />
          <StatCard
            label="Delayed"
            value={stats.delayed}
            color="bg-orange-50 dark:bg-orange-900/20"
          />
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="administered">Administered</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="refused">Refused</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-32">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audit Log Table */}
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <HistoryIcon className="w-8 h-8 mb-2 opacity-50" />
            <p>No medication administrations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Administered By</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const medicationName = (log as any)?.prescription_items?.medications?.name || 'Unknown';
                  const nurseEmail = (log as any)?.auth_users?.email || '';
                  const nurseName = nurseEmail.split('@')[0] || 'Unknown';
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{medicationName}</TableCell>
                      <TableCell>{log.dosage_given}</TableCell>
                      <TableCell className="capitalize">{log.route}</TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[log.status]}
                          variant="outline"
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{nurseName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(log.administered_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.administered_at), 'h:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        {log.status !== 'administered' && log.reason_if_skipped ? (
                          <div className="text-yellow-700 dark:text-yellow-300">
                            <p className="font-medium text-xs mb-1">Reason:</p>
                            <p>{log.reason_if_skipped}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">{log.notes || '—'}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <div className={`${color} p-3 rounded-lg border`}>
    <p className="text-xs text-muted-foreground font-medium">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);
