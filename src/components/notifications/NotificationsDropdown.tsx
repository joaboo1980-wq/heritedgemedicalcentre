import { Bell, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/types/notifications';
import { useNavigate } from 'react-router-dom';

export const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  const getNotificationIcon = (type: string) => {
    const iconClass = 'h-4 w-4';
    switch (type) {
      case 'task_assigned':
        return <div className={`${iconClass} bg-blue-500 rounded-full`} />;
      case 'patient_update':
        return <div className={`${iconClass} bg-green-500 rounded-full`} />;
      case 'appointment_upcoming':
        return <div className={`${iconClass} bg-purple-500 rounded-full`} />;
      case 'lab_result_ready':
        return <div className={`${iconClass} bg-orange-500 rounded-full`} />;
      case 'document_status':
        return <div className={`${iconClass} bg-indigo-500 rounded-full`} />;
      case 'system_alert':
        return <div className={`${iconClass} bg-red-500 rounded-full`} />;
      default:
        return <div className={`${iconClass} bg-gray-500 rounded-full`} />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on related_type
    if (notification.related_type === 'appointment' && notification.related_id) {
      navigate(`/appointments?id=${notification.related_id}`);
    } else if (notification.related_type === 'lab_order' && notification.related_id) {
      navigate(`/laboratory?id=${notification.related_id}`);
    } else if (notification.related_type === 'task' && notification.related_id) {
      navigate(`/nursing-tasks?id=${notification.related_id}`);
    } else if (notification.related_type === 'document' && notification.related_id) {
      navigate(`/documents?id=${notification.related_id}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsRead()}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                }`}
              >
                <div onClick={() => handleNotificationClick(notification)}>
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>

                <div className="flex gap-1 mt-2 justify-end">
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => deleteAllNotifications()}
              className="text-red-600 dark:text-red-400 cursor-pointer"
            >
              <X className="h-4 w-4 mr-2" />
              Clear all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
