import api from '@/lib/api';
import {
  ClientWebsiteDto,
  CreateClientWebsiteDto,
  UpdateClientWebsiteDto,
} from '@/types/api';

export async function addWebsite(clientId: string, data: CreateClientWebsiteDto): Promise<ClientWebsiteDto> {
  const response = await api.post<ClientWebsiteDto>(`/clients/${clientId}/websites`, data);
  return response.data;
}

export async function getClientWebsites(clientId: string): Promise<ClientWebsiteDto[]> {
  const response = await api.get<ClientWebsiteDto[]>(`/clients/${clientId}/websites`);
  return response.data;
}

export async function updateWebsite(id: string, data: UpdateClientWebsiteDto): Promise<ClientWebsiteDto> {
  const response = await api.patch<ClientWebsiteDto>(`/client-websites/${id}`, data);
  return response.data;
}

export async function deleteWebsite(id: string): Promise<void> {
  await api.delete(`/client-websites/${id}`);
}

export async function getPortfolio(): Promise<ClientWebsiteDto[]> {
  const response = await api.get<ClientWebsiteDto[]>('/client-websites/portfolio');
  return response.data;
}
