'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/services/notifications';
import type { NotificationDto } from '@/types/api';
import { formatEgyptDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';

function notificationTypeLabel(type: string) {
  return type.replace(/_/g, ' ');
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useNotificationWebSocket({ userId: user?.id, enabled: !!user });

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: getUnreadCount,
    refetchInterval: 60000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => getNotifications({ page: 1, limit: 10 }),
    enabled: open,
  });

  const readMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast.error('Failed to mark notification as read'),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast.error('Failed to mark all as read'),
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="notification-bell"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread && unread.count > 0 && (
          <span
            data-testid="notification-count"
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
          >
            {unread.count > 9 ? '9+' : unread.count}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-menu"
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto"
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <span className="font-medium text-sm">Notifications</span>
            {unread && unread.count > 0 && (
              <button onClick={() => readAllMutation.mutate()} className="text-xs text-indigo-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {notifications?.data.map((n: NotificationDto) => (
              <button
                key={n.id}
                data-testid="notification-item"
                data-type={n.type}
                onClick={() => { if (!n.read) readMutation.mutate(n.id); }}
                className={`w-full text-left p-3 hover:bg-gray-50 ${!n.read ? 'bg-indigo-50/50' : ''}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <span data-testid="notification-type" className="shrink-0">
                    <Badge variant="info" size="sm">
                      {notificationTypeLabel(n.type)}
                    </Badge>
                  </span>
                </div>
                <p className="text-xs text-gray-500">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatEgyptDateTime(n.createdAt)}</p>
              </button>
            ))}
            {(!notifications?.data || notifications.data.length === 0) && (
              <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
