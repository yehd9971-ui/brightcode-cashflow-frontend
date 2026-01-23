/**
 * Complete React Authentication Implementation
 * BrightCode Cashflow API - Frontend Integration
 *
 * This file demonstrates a production-ready authentication flow with:
 * - AuthContext for global state
 * - useAuth hook for components
 * - Automatic token refresh
 * - Protected routes
 * - Login/Logout functionality
 * - Error handling
 *
 * Usage:
 * 1. Wrap your app with <AuthProvider>
 * 2. Use useAuth() hook in components
 * 3. Wrap routes with <ProtectedRoute> for authorization
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Navigate } from 'react-router-dom';

// =============================================================================
// TYPES
// =============================================================================

export enum Role {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
}

export interface UserResponseDto {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Seconds
  user: UserResponseDto;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshDto {
  refreshToken: string;
}

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface AuthContextType {
  user: UserResponseDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserResponseDto>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const REFRESH_BUFFER = 120; // Refresh 2 minutes before expiry

// =============================================================================
// AUTH PROVIDER
// =============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTimerRef = useRef<NodeJS.Timeout>();

  /**
   * Schedule automatic token refresh
   * Refreshes 2 minutes before token expiry
   */
  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Calculate refresh time (expiresIn is in seconds)
    const refreshTime = Math.max(0, (expiresIn - REFRESH_BUFFER) * 1000);

    console.log(`🔄 Token refresh scheduled in ${refreshTime / 1000} seconds`);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        console.log('🔄 Auto-refreshing token...');
        await refreshAccessToken();
      } catch (error) {
        console.error('❌ Auto token refresh failed:', error);
        // On auto-refresh failure, log user out
        await logout();
      }
    }, refreshTime);
  }, []);

  /**
   * Login user with email and password
   * Stores tokens and schedules auto-refresh
   */
  const login = useCallback(
    async (email: string, password: string): Promise<UserResponseDto> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password } as LoginDto),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const data: TokenResponseDto = await response.json();

        // Update state
        setUser(data.user);
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);

        // Store refresh token in localStorage
        localStorage.setItem('refreshToken', data.refreshToken);

        // Schedule token refresh
        scheduleTokenRefresh(data.expiresIn);

        console.log('✅ Login successful:', data.user.email);

        return data.user;
      } catch (error) {
        console.error('❌ Login failed:', error);
        throw error;
      }
    },
    [scheduleTokenRefresh]
  );

  /**
   * Logout user
   * Revokes refresh token on backend and clears local state
   */
  const logout = useCallback(async () => {
    try {
      // If we have tokens, revoke them on backend
      if (refreshToken && accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken } as RefreshDto),
        });
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Continue with local cleanup even if backend call fails
    } finally {
      // Clear state
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);

      // Clear localStorage
      localStorage.removeItem('refreshToken');

      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      console.log('✅ Logged out');
    }
  }, [accessToken, refreshToken]);

  /**
   * Refresh access token using refresh token
   * Returns new access token
   */
  const refreshAccessToken = useCallback(async (): Promise<string> => {
    const token = refreshToken || localStorage.getItem('refreshToken');

    if (!token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token } as RefreshDto),
      });

      if (!response.ok) {
        const error = await response.json();

        // If refresh token is invalid/expired, force logout
        if (response.status === 401) {
          console.error('❌ Refresh token expired');
          await logout();
          throw new Error('Session expired. Please login again.');
        }

        throw new Error(error.message || 'Token refresh failed');
      }

      const data: TokenResponseDto = await response.json();

      // Update state with new tokens
      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      // Store new refresh token
      localStorage.setItem('refreshToken', data.refreshToken);

      // Schedule next refresh
      scheduleTokenRefresh(data.expiresIn);

      console.log('✅ Token refreshed');

      return data.accessToken;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }, [refreshToken, logout, scheduleTokenRefresh]);

  /**
   * Initialize: Check for existing refresh token and restore session
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (storedRefreshToken) {
        console.log('🔄 Found stored refresh token, restoring session...');
        setRefreshToken(storedRefreshToken);

        try {
          await refreshAccessToken();
          console.log('✅ Session restored');
        } catch (error) {
          console.error('❌ Session restoration failed:', error);
          // Clear invalid token
          localStorage.removeItem('refreshToken');
        }
      }

      setIsLoading(false);
    };

    initializeAuth();

    // Cleanup: Clear refresh timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// USE AUTH HOOK
// =============================================================================

/**
 * Hook to access authentication state and methods
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

// =============================================================================
// PROTECTED ROUTE COMPONENT
// =============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: Role;
  redirectTo?: string;
}

/**
 * Wrapper component for protecting routes
 * Redirects to login if not authenticated
 * Shows error if user doesn't have required role
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role requirement
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>This page requires {requiredRole} role.</p>
        <p>Your role: {user?.role}</p>
      </div>
    );
  }

  return <>{children}</>;
}

// =============================================================================
// LOGIN FORM COMPONENT (Example)
// =============================================================================

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard'); // Redirect after successful login
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem' }}>
      <h2>Login to BrightCode Cashflow</h2>

      {error && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
            placeholder="info@brightc0de.com"
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          fontSize: '0.875rem',
        }}
      >
        <strong>Development Credentials:</strong>
        <br />
        Email: <code>info@brightc0de.com</code>
        <br />
        Password: <code>Brightc0de@info</code>
      </div>
    </div>
  );
}

// =============================================================================
// USER PROFILE COMPONENT (Example)
// =============================================================================

export function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{user.email}</strong>
          <br />
          <small>
            Role: <span style={{ color: user.role === Role.ADMIN ? '#007bff' : '#28a745' }}>
              {user.role}
            </span>
          </small>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// APP USAGE EXAMPLE
// =============================================================================

/**
 * Example App.tsx showing how to use AuthProvider and ProtectedRoute
 *
 * import { BrowserRouter, Routes, Route } from 'react-router-dom';
 * import { AuthProvider, ProtectedRoute, LoginForm, Role } from './auth-flow-example';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <BrowserRouter>
 *         <Routes>
 *           <Route path="/login" element={<LoginForm />} />
 *
 *           <Route
 *             path="/dashboard"
 *             element={
 *               <ProtectedRoute>
 *                 <Dashboard />
 *               </ProtectedRoute>
 *             }
 *           />
 *
 *           <Route
 *             path="/admin"
 *             element={
 *               <ProtectedRoute requiredRole={Role.ADMIN}>
 *                 <AdminPanel />
 *               </ProtectedRoute>
 *             }
 *           />
 *
 *           <Route
 *             path="/transactions"
 *             element={
 *               <ProtectedRoute>
 *                 <TransactionList />
 *               </ProtectedRoute>
 *             }
 *           />
 *         </Routes>
 *       </BrowserRouter>
 *     </AuthProvider>
 *   );
 * }
 */

// =============================================================================
// AXIOS INTEGRATION (Optional - for automatic token injection)
// =============================================================================

/**
 * If using Axios, set up interceptors to automatically include access token
 * and handle token refresh on 401 errors.
 *
 * import axios from 'axios';
 *
 * const api = axios.create({
 *   baseURL: 'http://localhost:3000',
 * });
 *
 * // Request interceptor: Add token to all requests
 * api.interceptors.request.use(
 *   (config) => {
 *     const token = getAccessToken(); // Get from AuthContext
 *     if (token) {
 *       config.headers.Authorization = `Bearer ${token}`;
 *     }
 *     return config;
 *   },
 *   (error) => Promise.reject(error)
 * );
 *
 * // Response interceptor: Handle 401 and refresh token
 * let isRefreshing = false;
 * let failedQueue: Array<any> = [];
 *
 * api.interceptors.response.use(
 *   (response) => response,
 *   async (error) => {
 *     const originalRequest = error.config;
 *
 *     if (error.response?.status === 401 && !originalRequest._retry) {
 *       if (isRefreshing) {
 *         return new Promise((resolve, reject) => {
 *           failedQueue.push({ resolve, reject });
 *         }).then((token) => {
 *           originalRequest.headers.Authorization = `Bearer ${token}`;
 *           return api(originalRequest);
 *         });
 *       }
 *
 *       originalRequest._retry = true;
 *       isRefreshing = true;
 *
 *       try {
 *         const newToken = await refreshAccessToken(); // From AuthContext
 *         failedQueue.forEach((prom) => prom.resolve(newToken));
 *         failedQueue = [];
 *         originalRequest.headers.Authorization = `Bearer ${newToken}`;
 *         return api(originalRequest);
 *       } catch (refreshError) {
 *         failedQueue.forEach((prom) => prom.reject(refreshError));
 *         failedQueue = [];
 *         window.location.href = '/login';
 *         return Promise.reject(refreshError);
 *       } finally {
 *         isRefreshing = false;
 *       }
 *     }
 *
 *     return Promise.reject(error);
 *   }
 * );
 *
 * export default api;
 */
