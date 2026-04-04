import api, { setAccessToken, clearTokens } from '@/lib/api';
import { LoginDto, TokenResponseDto } from '@/types/api';

export async function login(credentials: LoginDto): Promise<TokenResponseDto> {
  const response = await api.post<TokenResponseDto>('/auth/login', credentials);
  const { accessToken } = response.data;

  setAccessToken(accessToken);

  return response.data;
}

export async function refreshAccessToken(): Promise<TokenResponseDto> {
  // Cookie is sent automatically via withCredentials
  const response = await api.post<TokenResponseDto>('/auth/refresh', {});
  const { accessToken: newAccessToken } = response.data;

  setAccessToken(newAccessToken);

  return response.data;
}

export async function logout(): Promise<void> {
  try {
    // Cookie is sent automatically via withCredentials
    await api.post('/auth/logout');
  } finally {
    clearTokens();
  }
}
