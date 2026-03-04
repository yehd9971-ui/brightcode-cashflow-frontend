import api from '@/lib/api';
import {
  CreateCallTaskDto,
  CallTaskQueryDto,
  CallTaskResponseDto,
  CallTaskList,
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

export async function rejectCallTask(
  id: string,
  data: { reason: string }
): Promise<CallTaskResponseDto> {
  const response = await api.post<CallTaskResponseDto>(`/call-tasks/${id}/reject`, data);
  return response.data;
}
