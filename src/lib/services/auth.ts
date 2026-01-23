import api, { setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from '@/lib/api';
import { LoginDto, TokenResponseDto } from '@/types/api';

export async function login(credentials: LoginDto): Promise<TokenResponseDto> {
  const response = await api.post<TokenResponseDto>('/auth/login', credentials);
  const { accessToken, refreshToken } = response.data;

  setAccessToken(accessToken);
  setRefreshToken(refreshToken);

  return response.data;
}

export async function refreshAccessToken(): Promise<TokenResponseDto> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await api.post<TokenResponseDto>('/auth/refresh', { refreshToken });
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

  setAccessToken(newAccessToken);
  setRefreshToken(newRefreshToken);

  return response.data;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } finally {
    clearTokens();
  }
}
