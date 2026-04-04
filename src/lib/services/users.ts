import api from '@/lib/api';
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
  UserList,
} from '@/types/api';

export async function getUsers(query?: UserQueryDto): Promise<UserList> {
  const response = await api.get<UserList>('/users', { params: query });
  return response.data;
}

export async function getSalesUsers(): Promise<UserResponseDto[]> {
  // We don't filter by role: 'SALES' in the query so we can retrieve both SALES and SALES_MANAGER
  // However, the backend might need an update to handle multiple roles or we can fetch all and filter in frontend.
  // Better approach: fetch all users (limit 100) and filter the relevant ones in frontend or change API endpoint to support arrays.
  // We'll fetch all here and adjust the frontend component to filter them.
  const response = await api.get<UserList>('/users', { params: { limit: 100 } });
  return response.data.data;
}

export async function getUserById(id: string): Promise<UserResponseDto> {
  const response = await api.get<UserResponseDto>(`/users/${id}`);
  return response.data;
}

export async function createUser(data: CreateUserDto): Promise<UserResponseDto> {
  const response = await api.post<UserResponseDto>('/users', data);
  return response.data;
}

export async function updateUser(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
  const response = await api.patch<UserResponseDto>(`/users/${id}`, data);
  return response.data;
}

export async function activateUser(id: string): Promise<UserResponseDto> {
  const response = await api.post<UserResponseDto>(`/users/${id}/activate`);
  return response.data;
}

export async function deactivateUser(id: string): Promise<UserResponseDto> {
  const response = await api.post<UserResponseDto>(`/users/${id}/deactivate`);
  return response.data;
}

export async function startCall(phone?: string): Promise<{ status: string; callStartedAt: string }> {
  const response = await api.post('/users/start-call', { phone });
  return response.data;
}

export async function getMyCallStatus(): Promise<{ currentStatus: string | null; currentCallPhone: string | null }> {
  const response = await api.get('/users/my-call-status');
  return response.data;
}

export async function getSalesStatus(): Promise<{ employees: Array<{ userId: string; email: string; currentStatus: string | null; statusUpdatedAt: string | null; callStartedAt: string | null; durationSeconds: number }> }> {
  const response = await api.get('/users/sales-status');
  return response.data;
}
