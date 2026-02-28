'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { UserResponseDto, Role } from '@/types/api';
import {
  login as loginService,
  logout as logoutService,
  refreshAccessToken,
} from '@/lib/services/auth';
import { setAccessToken, getRefreshToken, clearTokens } from '@/lib/api';

interface AuthState {
  user: UserResponseDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<UserResponseDto>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSales: boolean;
  isSalesManager: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from stored refresh token
  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        try {
          const response = await refreshAccessToken();
          setState({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });

          // Schedule token refresh 2 minutes before expiry
          scheduleTokenRefresh(response.expiresIn);
        } catch {
          // Token refresh failed, clear tokens
          clearTokens();
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  // Cross-tab logout synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Detect when refreshToken is removed in another tab
      if (e.key === 'refreshToken' && !e.newValue && e.oldValue) {
        // Token was removed, logout this tab
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        router.push('/login');
      }
    };

    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  // Schedule proactive token refresh
  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    // Refresh 2 minutes before expiry
    const refreshTime = (expiresIn - 120) * 1000;

    if (refreshTime > 0) {
      setTimeout(async () => {
        try {
          const response = await refreshAccessToken();
          setState((prev) => ({
            ...prev,
            user: response.user,
          }));
          // Schedule next refresh
          scheduleTokenRefresh(response.expiresIn);
        } catch {
          // Refresh failed, logout user
          clearTokens();
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          router.push('/login');
        }
      }, refreshTime);
    }
  }, [router]);

  const login = useCallback(
    async (email: string, password: string): Promise<UserResponseDto> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await loginService({ email, password });
        setState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });

        // Schedule token refresh
        scheduleTokenRefresh(response.expiresIn);

        return response.user;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [scheduleTokenRefresh]
  );

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await logoutService();
    } finally {
      clearTokens();
      setAccessToken(null);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      router.push('/login');
    }
  }, [router]);

  const isAdmin = state.user?.role === Role.ADMIN;
  const isSales = state.user?.role === Role.SALES;
  const isSalesManager = state.user?.role === Role.SALES_MANAGER;

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    isAdmin,
    isSales,
    isSalesManager,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
