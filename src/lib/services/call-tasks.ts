import api from '@/lib/api';
import {
  CreateCallTaskDto,
  CallTaskQueryDto,
  CallTaskResponseDto,
  CallTaskList,
  OpenTasksQueryDto,
  OpenTasksResponseDto,
} from '@/types/api';

export async function getCallTasks(query?: CallTaskQueryDto): Promise<CallTaskList> {
  const response = await api.get<CallTaskList>('/call-tasks', { params: query });
  return response.data;
}

export async function createCallTask(data: CreateCallTaskDto): Promise<CallTaskResponseDto> {
  const response = await api.post<CallTaskResponseDto>('/call-tasks', data);
  return response.data;
}

export async function getCallTaskById(id: string): Promise<CallTaskResponseDto> {
  const response = await api.get<CallTaskResponseDto>(`/call-tasks/${id}`);
  return response.data;
}

export async function getTodayCallTasks(userId?: string): Promise<CallTaskResponseDto[]> {
  const response = await api.get<CallTaskResponseDto[]>('/call-tasks/today', { params: userId ? { userId } : undefined });
  return response.data;
}

export async function getOpenTasks(query?: OpenTasksQueryDto): Promise<OpenTasksResponseDto> {
  const response = await api.get<OpenTasksResponseDto>('/call-tasks/open', { params: query });
  return response.data;
}

export async function rejectCallTask(
  id: string,
  data: { reason: string }
): Promise<CallTaskResponseDto> {
  const response = await api.post<CallTaskResponseDto>(`/call-tasks/${id}/reject`, data);
  return response.data;
}
