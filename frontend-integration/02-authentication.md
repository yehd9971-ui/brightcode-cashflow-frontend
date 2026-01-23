# Authentication Guide

Complete guide to implementing JWT authentication in your React/TypeScript frontend with the BrightCode Cashflow API.

## Table of Contents

- [Token Specifications](#token-specifications)
- [Authentication Flow](#authentication-flow)
- [React Implementation](#react-implementation)
- [Token Storage](#token-storage)
- [Auto Token Refresh](#auto-token-refresh)
- [Protected Routes](#protected-routes)
- [Axios Interceptors](#axios-interceptors)
- [Security Best Practices](#security-best-practices)

## Token Specifications

### Access Token
- **Type:** JWT (JSON Web Token)
- **Lifetime:** 15 minutes (900 seconds)
- **Purpose:** Authorize API requests
- **Storage:** Memory (React state/Context)
- **Format:** `Bearer {token}`

**Payload Structure:**
```typescript
{
  sub: string;        // User ID (UUID)
  email: string;      // User email
  role: 'ADMIN' | 'SALES';
  iat: number;        // Issued at (Unix timestamp)
  exp: number;        // Expiration (Unix timestamp)
}
```

### Refresh Token
- **Type:** Cryptographically secure random string (128 hex characters)
- **Lifetime:** 7 days
- **Purpose:** Obtain new access tokens
- **Storage:** Secure storage (httpOnly cookie in production, localStorage for development)
- **Security:** Stored as SHA256 hash in backend database

### Token Rotation
Each time you refresh, you get:
- ✅ New access token
- ✅ New refresh token
- ❌ Old refresh token is revoked (security measure)

## Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                       │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  1. User Login  │  POST /auth/login
│  Email/Password │  { email, password }
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  2. Backend Validates                               │
│     ✓ Email exists                                  │
│     ✓ Password matches (bcrypt)                     │
│     ✓ Account is active                             │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  3. Backend Returns Tokens                          │
│     {                                                │
│       accessToken: "eyJh...",  (15 min)             │
│       refreshToken: "a1b2...", (7 days)             │
│       expiresIn: 900,                                │
│       user: { id, email, role, isActive }           │
│     }                                                │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  4. Frontend Stores Tokens                          │
│     • accessToken → Memory (React State)            │
│     • refreshToken → Secure Storage                 │
│     • Set auto-refresh timer                        │
└────────┬────────────────────────────────────────────┘
         │
         │  Every API Request
         ▼
┌─────────────────────────────────────────────────────┐
│  5. Include Access Token                            │
│     Headers: {                                      │
│       Authorization: "Bearer eyJh..."               │
│     }                                                │
└────────┬────────────────────────────────────────────┘
         │
         │  Token Expires (15 min)
         ▼
┌─────────────────────────────────────────────────────┐
│  6. Refresh Access Token                            │
│     POST /auth/refresh                              │
│     { refreshToken: "a1b2..." }                     │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  7. Get New Tokens                                  │
│     • New accessToken (15 min)                      │
│     • New refreshToken (7 days)                     │
│     • Old refreshToken revoked                      │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  8. Retry Original Request                          │
│     Use new accessToken                             │
└─────────────────────────────────────────────────────┘
```

## React Implementation

### Basic useAuth Hook

Create a custom hook for authentication:

```typescript
// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'SALES';
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
  });

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();

    // Store tokens
    setState({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isLoading: false,
    });

    // Store refresh token in localStorage
    localStorage.setItem('refreshToken', data.refreshToken);

    // Schedule token refresh
    scheduleTokenRefresh(data.expiresIn);

    return data.user;
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    if (state.refreshToken) {
      try {
        await fetch('http://localhost:3000/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: state.refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear tokens
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
    });
    localStorage.removeItem('refreshToken');
  }, [state.accessToken, state.refreshToken]);

  // Refresh token function
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = state.refreshToken || localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed, force re-login
      logout();
      throw new Error('Refresh token expired');
    }

    const data = await response.json();

    setState(prev => ({
      ...prev,
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }));

    localStorage.setItem('refreshToken', data.refreshToken);
    scheduleTokenRefresh(data.expiresIn);

    return data.accessToken;
  }, [state.refreshToken, logout]);

  // Schedule automatic token refresh
  const scheduleTokenRefresh = (expiresIn: number) => {
    // Refresh 2 minutes before expiry
    const refreshTime = (expiresIn - 120) * 1000;
    setTimeout(() => {
      refreshAccessToken().catch(console.error);
    }, refreshTime);
  };

  // Initialize: Check for existing refresh token
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      setState(prev => ({ ...prev, refreshToken: storedRefreshToken }));
      refreshAccessToken().catch(() => {
        setState(prev => ({ ...prev, isLoading: false }));
      });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  return {
    user: state.user,
    accessToken: state.accessToken,
    isAuthenticated: !!state.user,
    isLoading: state.isLoading,
    login,
    logout,
    refreshAccessToken,
  };
}
```

### AuthContext Provider (Recommended)

For app-wide authentication state:

```typescript
// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'SALES';
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);

    // Store refresh token securely
    localStorage.setItem('refreshToken', data.refreshToken);

    // Schedule token refresh
    const refreshTime = (data.expiresIn - 120) * 1000; // 2 min before expiry
    setTimeout(() => {
      refreshAccessToken().catch(console.error);
    }, refreshTime);

    return data.user;
  }, [API_BASE_URL]);

  const logout = useCallback(async () => {
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('refreshToken');
  }, [accessToken, refreshToken, API_BASE_URL]);

  const refreshAccessToken = useCallback(async (): Promise<string> => {
    const token = refreshToken || localStorage.getItem('refreshToken');

    if (!token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });

    if (!response.ok) {
      // Refresh failed, clear everything
      await logout();
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();

    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);

    localStorage.setItem('refreshToken', data.refreshToken);

    // Schedule next refresh
    const refreshTime = (data.expiresIn - 120) * 1000;
    setTimeout(() => {
      refreshAccessToken().catch(console.error);
    }, refreshTime);

    return data.accessToken;
  }, [refreshToken, logout, API_BASE_URL]);

  // Initialize: Check for existing refresh token
  useEffect(() => {
    const storedToken = localStorage.getItem('refreshToken');
    if (storedToken) {
      setRefreshToken(storedToken);
      refreshAccessToken()
        .catch(() => {
          // Refresh failed, user needs to login
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
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

// Hook to use AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Login Component

```typescript
// components/LoginForm.tsx
import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
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
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Login to BrightCode Cashflow</h2>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="info@brightc0de.com"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
          disabled={isLoading}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>

      <div className="dev-credentials">
        <small>Development credentials:</small>
        <code>info@brightc0de.com / Brightc0de@info</code>
      </div>
    </form>
  );
}
```

## Token Storage

### Development (Not Recommended for Production)

```typescript
// ❌ Avoid in production (XSS vulnerable)
localStorage.setItem('accessToken', token);

// ❌ Avoid in production (XSS vulnerable)
sessionStorage.setItem('accessToken', token);
```

### Production (Recommended)

```typescript
// ✅ Store access token in memory (React state)
const [accessToken, setAccessToken] = useState<string | null>(null);

// ✅ Store refresh token in httpOnly cookie (backend sets it)
// Backend response sets cookie:
// Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict

// ✅ Or use secure localStorage for refresh token (less secure than httpOnly)
localStorage.setItem('refreshToken', token);
```

**Security Comparison:**

| Storage | Access Token | Refresh Token | Security |
|---------|-------------|---------------|----------|
| **Memory (State)** | ✅ Recommended | ❌ Lost on reload | XSS safe, lost on refresh |
| **httpOnly Cookie** | ❌ No | ✅ Best | XSS safe, CSRF vulnerable (use CSRF tokens) |
| **localStorage** | ❌ No | ⚠️ OK for dev | XSS vulnerable |
| **sessionStorage** | ❌ No | ❌ No | XSS vulnerable, lost on tab close |

## Auto Token Refresh

### Strategy 1: Timer-Based (Proactive)

Refresh token 2 minutes before expiry:

```typescript
function scheduleTokenRefresh(expiresIn: number) {
  const refreshBuffer = 120; // 2 minutes in seconds
  const refreshTime = (expiresIn - refreshBuffer) * 1000; // Convert to ms

  const timerId = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch (error) {
      console.error('Auto refresh failed:', error);
      // Redirect to login
      window.location.href = '/login';
    }
  }, refreshTime);

  // Clear timer on unmount
  return () => clearTimeout(timerId);
}
```

### Strategy 2: Axios Interceptor (Reactive)

Refresh token when API returns 401:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Request interceptor: Add token
api.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken(); // From state/context
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 and refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Protected Routes

### Using React Router

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'SALES';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <div>Access Denied: Requires {requiredRole} role</div>;
  }

  return <>{children}</>;
}

// Usage in App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginForm />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

## Axios Interceptors

Complete setup with error handling:

```typescript
// api/axios.ts
import axios from 'axios';
import { refreshAccessToken, getAccessToken, logout } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Security Best Practices

### ✅ DO

1. **Store access tokens in memory** (React state/Context)
2. **Store refresh tokens in httpOnly cookies** (production)
3. **Use HTTPS in production** (prevents token interception)
4. **Implement token refresh before expiry** (better UX)
5. **Clear tokens on logout** (both client and server)
6. **Validate tokens server-side** (never trust client)
7. **Use secure random strings** for refresh tokens
8. **Implement rate limiting** on auth endpoints
9. **Log authentication events** for audit
10. **Handle token expiry gracefully** (auto-refresh or redirect)

### ❌ DON'T

1. **Don't store access tokens in localStorage** (XSS risk)
2. **Don't log tokens to console** (security risk)
3. **Don't send tokens in URL params** (logged in browser history)
4. **Don't use long-lived access tokens** (reduces security)
5. **Don't skip HTTPS in production** (tokens sent in plain text)
6. **Don't share tokens between users** (obvious, but happens)
7. **Don't implement auto-login with stored passwords** (use refresh tokens)
8. **Don't trust expired tokens** (always validate on backend)

## Troubleshooting

### Token Refresh Loop

**Problem:** Infinite refresh loop

**Solution:**
```typescript
// Add retry flag to prevent loop
if (!originalRequest._retry) {
  originalRequest._retry = true;
  // ... refresh logic
}
```

### Token Not Persisting

**Problem:** Token lost on page refresh

**Solution:** Store refresh token in localStorage and restore on mount:
```typescript
useEffect(() => {
  const token = localStorage.getItem('refreshToken');
  if (token) {
    refreshAccessToken().catch(() => {
      // Token invalid, clear it
      localStorage.removeItem('refreshToken');
    });
  }
}, []);
```

### CORS Issues

**Problem:** Token requests blocked by CORS

**Solution:** Backend must allow your origin:
```typescript
// Backend main.ts
app.enableCors({
  origin: 'http://localhost:5173',
  credentials: true, // Allow cookies
});
```

## Complete Example

See [`examples/auth-flow-example.tsx`](./examples/auth-flow-example.tsx) for a production-ready implementation with:
- AuthContext provider
- useAuth hook
- Login component
- Protected routes
- Auto token refresh
- Error handling

---

**Next:** Learn about all available endpoints in [API Reference →](./03-api-reference.md)
