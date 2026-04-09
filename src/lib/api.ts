import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ErrorResponse, TokenResponseDto } from '@/types/api';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000;

// In-memory access token (not stored in localStorage for security)
let accessToken: string | null = null;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: {
  resolve: (data: TokenResponseDto) => void;
  reject: (err: Error) => void;
}[] = [];

// Notify all subscribers when token is refreshed
function onTokenRefreshed(data: TokenResponseDto) {
  refreshSubscribers.forEach((sub) => sub.resolve(data));
  refreshSubscribers = [];
}

// Reject all subscribers on refresh failure
function onTokenRefreshFailed(err: Error) {
  refreshSubscribers.forEach((sub) => sub.reject(err));
  refreshSubscribers = [];
}

// Shared token refresh with race protection — used by both the interceptor and AuthContext
export async function performTokenRefresh(): Promise<TokenResponseDto> {
  if (isRefreshing) {
    return new Promise<TokenResponseDto>((resolve, reject) => {
      refreshSubscribers.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const response = await axios.post<TokenResponseDto>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );

    setAccessToken(response.data.accessToken);
    onTokenRefreshed(response.data);
    isRefreshing = false;

    return response.data;
  } catch (error) {
    isRefreshing = false;
    onTokenRefreshFailed(
      error instanceof Error ? error : new Error('Token refresh failed'),
    );
    throw error;
  }
}

// Create axios instance with credentials for cookie-based auth
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not a retry, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is a login or refresh request (don't retry these)
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const data = await performTokenRefresh();
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear tokens and redirect to login
        clearTokens();

        // Only redirect in browser environment
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Token management functions
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearTokens(): void {
  accessToken = null;
}

// Check if user is authenticated (only in-memory access token is checkable)
export function isAuthenticated(): boolean {
  return accessToken !== null;
}

export default api;
