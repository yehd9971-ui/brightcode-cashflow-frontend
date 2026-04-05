import api from '@/lib/api';
import {
  ClientNumberDto,
  ClientNumberList,
  AddNumberDto,
  BulkImportDto,
  BulkImportResponseDto,
  UpdateLeadStatusDto,
  NumberQueryDto,
  PoolStatsDto,
  NumberActivityLogDto,
  FollowUpDto,
  NumberDetailDto,
} from '@/types/api';

export async function addNumber(data: AddNumberDto): Promise<ClientNumberDto> {
  const response = await api.post<ClientNumberDto>('/client-numbers', data);
  return response.data;
}

export async function bulkImport(data: BulkImportDto): Promise<BulkImportResponseDto> {
  const response = await api.post<BulkImportResponseDto>('/client-numbers/import', data);
  return response.data;
}

export async function pullFromPool(): Promise<ClientNumberDto> {
  const response = await api.post<ClientNumberDto>('/client-numbers/pull');
  return response.data;
}

export async function getMyNumbers(query?: { page?: number; limit?: number; leadStatus?: string; userId?: string }): Promise<ClientNumberList> {
  const response = await api.get<ClientNumberList>('/client-numbers/my-numbers', { params: query });
  return response.data;
}

export async function getPoolNumbers(query?: NumberQueryDto): Promise<ClientNumberList> {
  const response = await api.get<ClientNumberList>('/client-numbers/pool', { params: query });
  return response.data;
}

export async function getPoolStats(): Promise<PoolStatsDto> {
  const response = await api.get<PoolStatsDto>('/client-numbers/pool/stats');
  return response.data;
}

export async function getNumberHistory(id: string): Promise<NumberActivityLogDto[]> {
  const response = await api.get<NumberActivityLogDto[]>(`/client-numbers/${id}/history`);
  return response.data;
}

export async function updateLeadStatus(id: string, data: UpdateLeadStatusDto): Promise<ClientNumberDto> {
  const response = await api.patch<ClientNumberDto>(`/client-numbers/${id}/status`, data);
  return response.data;
}

export async function returnToPool(id: string): Promise<void> {
  await api.post(`/client-numbers/${id}/return`);
}

export async function scheduleFollowUps(id: string): Promise<FollowUpDto[]> {
  const response = await api.post<FollowUpDto[]>(`/client-numbers/${id}/follow-ups`);
  return response.data;
}

export async function pullForCompletion(numberId: string): Promise<ClientNumberDto> {
  const response = await api.post<ClientNumberDto>(`/client-numbers/${numberId}/complete`);
  return response.data;
}

export async function getPendingCompletions(userId?: string): Promise<any[]> {
  const response = await api.get('/client-numbers/pending-completions', { params: userId ? { userId } : undefined });
  return response.data;
}

export async function approveAttempt(numberId: string): Promise<void> {
  await api.post(`/client-numbers/${numberId}/approve-attempt`);
}

export async function approveFollowUpFailure(followUpId: string): Promise<void> {
  await api.post(`/client-numbers/follow-ups/${followUpId}/approve-failure`);
}

export async function markNotInterested(numberId: string): Promise<ClientNumberDto> {
  const response = await api.post<ClientNumberDto>(`/client-numbers/${numberId}/not-interested`);
  return response.data;
}

export async function getNiPending(): Promise<ClientNumberDto[]> {
  const response = await api.get<{ data: ClientNumberDto[] }>('/client-numbers/ni-pending');
  return response.data.data;
}

export async function approveNi(numberId: string): Promise<ClientNumberDto> {
  const response = await api.post<ClientNumberDto>(`/client-numbers/ni-approve/${numberId}`);
  return response.data;
}

export async function rejectNi(numberId: string, reason?: string): Promise<ClientNumberDto> {
  const response = await api.post<ClientNumberDto>(`/client-numbers/ni-reject/${numberId}`, { reason });
  return response.data;
}

export async function getNumberDetail(numberId: string): Promise<NumberDetailDto> {
  const response = await api.get<NumberDetailDto>(`/client-numbers/${numberId}/detail`);
  return response.data;
}

export async function searchNumbers(q: string): Promise<ClientNumberDto[]> {
  const response = await api.get<ClientNumberDto[]>('/client-numbers/search', { params: { q } });
  return response.data;
}
