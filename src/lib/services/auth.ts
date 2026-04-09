import api, { setAccessToken, clearTokens, performTokenRefresh } from '@/lib/api';
import { LoginDto, TokenResponseDto } from '@/types/api';

export async function login(credentials: LoginDto): Promise<TokenResponseDto> {
  const response = await api.post<TokenResponseDto>('/auth/login', credentials);
  const { accessToken } = response.data;

  setAccessToken(accessToken);

  return response.data;
}

export async function refreshAccessToken(): Promise<TokenResponseDto> {
  // Uses shared lock to prevent concurrent refresh races with the interceptor
  return performTokenRefresh();
}

export async function logout(): Promise<void> {
  try {
    // Cookie is sent automatically via withCredentials
    await api.post('/auth/logout');
  } finally {
    clearTokens();
  }
}
