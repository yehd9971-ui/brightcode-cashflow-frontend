import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ErrorResponse, TokenResponseDto } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000;

// In-memory access token (not stored in localStorage for security)
let accessToken: string | null = null;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: {
  resolve: (token: string) => void;
  reject: (err: Error) => void;
}[] = [];

// Notify all subscribers when token is refreshed
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((sub) => sub.resolve(token));
  refreshSubscribers = [];
}

// Reject all subscribers on refresh failure
function onTokenRefreshFailed(err: Error) {
  refreshSubscribers.forEach((sub) => sub.reject(err));
  refreshSubscribers = [];
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

      if (isRefreshing) {
        // Wait for token refresh to complete
        return new Promise((resolve, reject) => {
          refreshSubscribers.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err: Error) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Cookie sent automatically via withCredentials
        const response = await axios.post<TokenResponseDto>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const { accessToken: newAccessToken } = response.data;

        setAccessToken(newAccessToken);
        onTokenRefreshed(newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onTokenRefreshFailed(
          refreshError instanceof Error
            ? refreshError
            : new Error('Token refresh failed'),
        );

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
