import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Bell,
  Check,
  Trash2,
  FlaskConical,
  Calendar,
  PackageX,
  Receipt,
  Pill,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: string) => {
  if (type.includes('appointment')) {
    if (type === 'appointment_reminder') return <Clock className="h-4 w-4" />;
    if (type === 'appointment_cancelled' || type === 'appointment') return <AlertCircle className="h-4 w-4" />;
    if (type === 'appointment_completed') return <CheckCircle className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  }

  if (type.includes('lab') || type === 'lab_result') {
    if (type === 'lab_results_abnormal') return <AlertTriangle className="h-4 w-4" />;
    if (type === 'lab_result' || type === 'lab_results_ready') return <CheckCircle className="h-4 w-4" />;
    return <FlaskConical className="h-4 w-4" />;
  }

  if (type.includes('prescription') || type.includes('stock')) {
    if (type === 'prescription_ready') return <CheckCircle className="h-4 w-4" />;
    if (type === 'inventory_critical' || type === 'low_stock_alert' || type === 'low_stock') return <AlertTriangle className="h-4 w-4" />;
    return <Pill className="h-4 w-4" />;
  }

  if (type.includes('invoice') || type === 'billing') {
    if (type === 'invoice_payment_overdue') return <AlertTriangle className="h-4 w-4" />;
    if (type === 'invoice_payment_received') return <CheckCircle className="h-4 w-4" />;
    return <Receipt className="h-4 w-4" />;
  }

  if (type.includes('schedule')) {
    if (type === 'staff_schedule_changed') return <AlertCircle className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  }

  if (type === 'medical_record_updated' || type === 'examination_result_ready') {
    return <FileText className="h-4 w-4" />;
  }

  if (type === 'patient_check_in' || type === 'patient_follow_up_needed') {
    return <User className="h-4 w-4" />;
  }

  return <Bell className="h-4 w-4" />;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'normal':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'low':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;

    return matchesSearch && matchesType && matchesPriority;
  });

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    toast.success('Marked as read');
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    toast.success('Notification deleted');
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    toast.success('All notifications marked as read');
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    if (!window.confirm('Delete all notifications? This cannot be undone.')) return;
    
    notifications.forEach(notification => {
      deleteNotification(notification.id);
    });
    toast.success('All notifications cleared');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-8 text-center">Loading notifications...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleClearAll}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="appointment">Appointments</SelectItem>
                <SelectItem value="lab_result">Lab Results</SelectItem>
                <SelectItem value="prescription">Prescriptions</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredNotifications.length} Notification{filteredNotifications.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No notifications found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {notifications.length === 0
                  ? 'You have no notifications yet'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                    notification.is_read
                      ? 'bg-muted/30 border-border'
                      : 'bg-muted/60 border-border hover:bg-muted/80'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 p-2 rounded-full mt-0.5 ${getPriorityColor(
                      notification.priority
                    )}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p
                          className={cn(
                            'font-medium',
                            notification.is_read
                              ? 'text-muted-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          <Badge
                            className={`text-xs capitalize ${getPriorityColor(
                              notification.priority
                            )}`}
                          >
                            {notification.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(notification.id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
