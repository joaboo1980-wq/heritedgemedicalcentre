import { formatDistanceToNow } from 'date-fns';
import { 
  FlaskConical, 
  Calendar, 
  PackageX, 
  Receipt, 
  Bell,
  X,
  Check,
  Pill,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  // Appointment notifications
  if (type.includes('appointment')) {
    if (type === 'appointment_reminder') return <Clock className="h-4 w-4" />;
    if (type === 'appointment_cancelled' || type === 'appointment_no_show') return <AlertCircle className="h-4 w-4" />;
    if (type === 'appointment_completed') return <CheckCircle className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  }
  
  // Lab notifications
  if (type.includes('lab')) {
    if (type === 'lab_results_abnormal') return <AlertTriangle className="h-4 w-4" />;
    if (type === 'lab_results_ready') return <CheckCircle className="h-4 w-4" />;
    return <FlaskConical className="h-4 w-4" />;
  }
  
  // Prescription/Pharmacy notifications
  if (type.includes('prescription') || type.includes('stock')) {
    if (type === 'prescription_ready') return <CheckCircle className="h-4 w-4" />;
    if (type === 'inventory_critical' || type === 'low_stock_alert') return <AlertTriangle className="h-4 w-4" />;
    return <Pill className="h-4 w-4" />;
  }
  
  // Invoice/Billing notifications
  if (type.includes('invoice') || type === 'billing') {
    if (type === 'invoice_payment_overdue') return <AlertTriangle className="h-4 w-4" />;
    if (type === 'invoice_payment_received') return <CheckCircle className="h-4 w-4" />;
    return <Receipt className="h-4 w-4" />;
  }
  
  // Staff schedule notifications
  if (type.includes('schedule')) {
    if (type === 'staff_schedule_changed') return <AlertCircle className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  }
  
  // Medical/Examination notifications
  if (type === 'medical_record_updated' || type === 'examination_result_ready') {
    return <FileText className="h-4 w-4" />;
  }
  
  // Patient notifications
  if (type === 'patient_check_in' || type === 'patient_follow_up_needed') {
    return <User className="h-4 w-4" />;
  }
  
  // Fallback
  return <Bell className="h-4 w-4" />;
};

const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
  // Priority-based coloring (overrides type-based coloring)
  if (priority === 'urgent') return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  if (priority === 'high') return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
  
  // Type-based coloring for normal/low priority
  if (type.includes('appointment')) {
    return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
  }
  
  if (type.includes('lab')) {
    return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
  }
  
  if (type.includes('prescription') || type.includes('stock')) {
    return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
  }
  
  if (type.includes('invoice') || type === 'billing') {
    return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
  }
  
  if (type.includes('schedule')) {
    return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
  
  if (type === 'medical_record_updated' || type === 'examination_result_ready') {
    return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400';
  }
  
  return 'bg-muted text-muted-foreground';
};

const NotificationItem = ({ notification, onMarkAsRead, onDelete }: NotificationItemProps) => {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        notification.is_read ? 'bg-muted/30' : 'bg-muted/60'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 p-2 rounded-full',
          getNotificationColor(notification.type, notification.priority)
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn(
              'text-sm',
              notification.is_read ? 'text-muted-foreground' : 'font-medium text-foreground'
            )}>
              {notification.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onMarkAsRead(notification.id)}
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(notification.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
