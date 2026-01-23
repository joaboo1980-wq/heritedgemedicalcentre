import { formatDistanceToNow } from 'date-fns';
import { 
  FlaskConical, 
  Calendar, 
  PackageX, 
  Receipt, 
  Bell,
  X,
  Check
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
  switch (type) {
    case 'lab_result':
      return <FlaskConical className="h-4 w-4" />;
    case 'appointment':
      return <Calendar className="h-4 w-4" />;
    case 'low_stock':
      return <PackageX className="h-4 w-4" />;
    case 'billing':
      return <Receipt className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
  if (priority === 'urgent') return 'bg-destructive/10 text-destructive';
  if (priority === 'high') return 'bg-warning/10 text-warning';
  
  switch (type) {
    case 'lab_result':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'appointment':
      return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    case 'low_stock':
      return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
    case 'billing':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
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
