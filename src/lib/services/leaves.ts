import api from '@/lib/api';
import {
  LeaveRequestDto,
  CreateLeaveDto,
  LeaveQueryDto,
  LeaveList,
} from '@/types/api';

export async function requestLeave(data: CreateLeaveDto): Promise<LeaveRequestDto> {
  const response = await api.post<LeaveRequestDto>('/leaves', data);
  return response.data;
}

export async function getMyLeaves(query?: LeaveQueryDto): Promise<LeaveList> {
  const response = await api.get<LeaveList>('/leaves/my', { params: query });
  return response.data;
}

export async function getPendingLeaves(query?: { page?: number; limit?: number }): Promise<LeaveList> {
  const response = await api.get<LeaveList>('/leaves/pending', { params: query });
  return response.data;
}

export async function approveLeave(id: string, type: 'PAID' | 'UNPAID'): Promise<LeaveRequestDto> {
  const response = await api.post<LeaveRequestDto>(`/leaves/${id}/approve`, { type });
  return response.data;
}

export async function rejectLeave(id: string, reason: string): Promise<LeaveRequestDto> {
  const response = await api.post<LeaveRequestDto>(`/leaves/${id}/reject`, { reason });
  return response.data;
}

export async function getAllLeaves(query?: LeaveQueryDto): Promise<LeaveList> {
  const response = await api.get<LeaveList>('/leaves/all', { params: query });
  return response.data;
}

export async function cancelLeave(id: string): Promise<void> {
  await api.delete(`/leaves/${id}`);
}
