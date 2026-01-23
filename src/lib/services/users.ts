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
