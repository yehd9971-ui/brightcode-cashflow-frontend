import api from '@/lib/api';
import {
  ClientDto,
  ClientList,
  ClientSearchResult,
  ClientBalanceDto,
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
} from '@/types/api';

export async function createClient(data: CreateClientDto): Promise<ClientDto> {
  const response = await api.post<ClientDto>('/clients', data);
  return response.data;
}

export async function getClients(query?: ClientQueryDto): Promise<ClientList> {
  const response = await api.get<ClientList>('/clients', { params: query });
  return response.data;
}

export async function getClientById(id: string): Promise<ClientDto> {
  const response = await api.get<ClientDto>(`/clients/${id}`);
  return response.data;
}

export async function updateClient(id: string, data: UpdateClientDto): Promise<ClientDto> {
  const response = await api.patch<ClientDto>(`/clients/${id}`, data);
  return response.data;
}

export async function linkNumberToClient(clientId: string, numberId: string): Promise<ClientDto> {
  const response = await api.post<ClientDto>(`/clients/${clientId}/link-number/${numberId}`);
  return response.data;
}

export async function searchClients(q: string): Promise<ClientSearchResult[]> {
  const response = await api.get<ClientSearchResult[]>('/clients/search', { params: { q } });
  return response.data;
}

export async function getClientBalance(id: string): Promise<ClientBalanceDto> {
  const response = await api.get<ClientBalanceDto>(`/clients/${id}/balance`);
  return response.data;
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`);
}
