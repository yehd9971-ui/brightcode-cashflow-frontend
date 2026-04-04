import api from '@/lib/api';
import {
  DealDto,
  DealList,
  CreateDealDto,
  UpdateDealDto,
  DealQueryDto,
  DealCommissionDto,
} from '@/types/api';

export async function createDeal(data: CreateDealDto): Promise<DealDto> {
  const response = await api.post<DealDto>('/deals', data);
  return response.data;
}

export async function getMyDeals(query?: DealQueryDto): Promise<DealList> {
  const response = await api.get<DealList>('/deals/my', { params: query });
  return response.data;
}

export async function getAllDeals(query?: DealQueryDto): Promise<DealList> {
  const response = await api.get<DealList>('/deals', { params: query });
  return response.data;
}

export async function getMyCommission(month?: number, year?: number): Promise<DealCommissionDto> {
  const params: Record<string, unknown> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const response = await api.get<DealCommissionDto>('/deals/commission', { params });
  return response.data;
}

export async function getEmployeeCommission(userId: string, month?: number, year?: number): Promise<DealCommissionDto> {
  const params: Record<string, unknown> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const response = await api.get<DealCommissionDto>(`/deals/commission/${userId}`, { params });
  return response.data;
}

export async function updateDeal(id: string, data: UpdateDealDto): Promise<DealDto> {
  const response = await api.patch<DealDto>(`/deals/${id}`, data);
  return response.data;
}

export async function approveDeal(id: string): Promise<DealDto> {
  const response = await api.post<DealDto>(`/deals/${id}/approve`);
  return response.data;
}

export async function rejectDeal(id: string, reason: string): Promise<DealDto> {
  const response = await api.post<DealDto>(`/deals/${id}/reject`, { reason });
  return response.data;
}

export async function closeDeal(id: string): Promise<DealDto> {
  const response = await api.post<DealDto>(`/deals/${id}/close`);
  return response.data;
}

export async function markDealLost(id: string): Promise<DealDto> {
  const response = await api.post<DealDto>(`/deals/${id}/lost`);
  return response.data;
}
