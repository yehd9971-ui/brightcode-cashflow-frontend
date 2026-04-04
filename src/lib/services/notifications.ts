import api from '@/lib/api';
import { NotificationDto, NotificationList } from '@/types/api';

export async function getNotifications(query?: { page?: number; limit?: number }): Promise<NotificationList> {
  const response = await api.get<NotificationList>('/notifications', { params: query });
  return response.data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const response = await api.get<{ count: number }>('/notifications/unread-count');
  return response.data;
}

export async function markAsRead(id: string): Promise<NotificationDto> {
  const response = await api.patch<NotificationDto>(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllAsRead(): Promise<{ updated: number }> {
  const response = await api.post<{ updated: number }>('/notifications/mark-all-read');
  return response.data;
}
