# Best Practices

Production-ready patterns and recommendations for integrating your React/TypeScript frontend with the BrightCode Cashflow API.

## Table of Contents

- [Security](#security)
- [Performance](#performance)
- [Authentication](#authentication)
- [Data Fetching](#data-fetching)
- [State Management](#state-management)
- [Form Handling](#form-handling)
- [File Uploads](#file-uploads)
- [Date Handling](#date-handling)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Production Deployment](#production-deployment)

---

## Security

### Token Storage

#### ✅ DO

**Store Access Tokens in Memory (React State/Context)**
```typescript
// In AuthContext
const [accessToken, setAccessToken] = useState<string | null>(null);

// Lost on page refresh, but secure from XSS
```

**Store Refresh Tokens Securely**
```typescript
// Option 1: httpOnly Cookie (Production - Backend sets this)
// Backend: res.cookie('refreshToken', token, { httpOnly: true, secure: true });

// Option 2: localStorage (Development only)
localStorage.setItem('refreshToken', refreshToken);
```

#### ❌ DON'T

```typescript
// ❌ Never store access tokens in localStorage
localStorage.setItem('accessToken', token); // XSS vulnerable!

// ❌ Never log tokens
console.log('Token:', accessToken); // Security risk!

// ❌ Never send tokens in URL
const url = `/api/data?token=${accessToken}`; // Logged in browser history!
```

### HTTPS Only (Production)

```typescript
// config.ts
const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.brightcode.eg' // ✅ HTTPS in production
    : 'http://localhost:3000'; // OK for development
```

### CSRF Protection

If using httpOnly cookies for refresh tokens:

```typescript
// axios configuration
axios.defaults.withCredentials = true; // Include cookies
axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
```

### Input Sanitization

```typescript
import DOMPurify from 'dompurify';

// Sanitize user input before display
const sanitizedDescription = DOMPurify.sanitize(transaction.description);

// In JSX
<div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
```

### Content Security Policy (CSP)

Add to your HTML `<head>`:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; connect-src 'self' http://localhost:3000 https://api.brightcode.eg"
/>
```

---

## Performance

### React Query for Data Fetching

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch with automatic caching
export function useTransactions(query?: TransactionQueryDto) {
  return useQuery({
    queryKey: ['transactions', query],
    queryFn: () => api.listTransactions(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Mutation with cache invalidation
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionDto) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// Usage in component
function TransactionList() {
  const { data, isLoading, error } = useTransactions({ page: 1, limit: 20 });
  const { mutate: createTransaction } = useCreateTransaction();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <>
      {data.data.map(tx => <TransactionCard key={tx.id} transaction={tx} />)}
    </>
  );
}
```

### Pagination

Always paginate large lists:

```typescript
function TransactionList() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data } = useTransactions({ page, limit });

  return (
    <>
      <TransactionGrid transactions={data?.data} />
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(data?.total / limit)}
        onPageChange={setPage}
      />
    </>
  );
}
```

### Debounced Search

```typescript
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

function TransactionSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 300); // 300ms delay

  const { data } = useTransactions({ search: debouncedSearch });

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search transactions..."
    />
  );
}
```

### Virtualized Lists (For Large Datasets)

```typescript
import { FixedSizeList } from 'react-window';

function VirtualizedTransactionList({ transactions }: { transactions: TransactionResponseDto[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TransactionCard transaction={transactions[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={transactions.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Lazy Loading Images

```typescript
function AttachmentPreview({ attachment }: { attachment: AttachmentResponseDto }) {
  return (
    <img
      src={`/api/attachments/${attachment.id}`}
      alt={attachment.originalFilename}
      loading="lazy" // Browser-native lazy loading
      width={200}
      height={200}
    />
  );
}
```

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Reports = lazy(() => import('./components/Reports'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

---

## Authentication

### Auto Token Refresh

**Strategy 1: Timer-Based (Proactive)**

```typescript
function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout>();

  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Refresh 2 minutes before expiry
    const refreshTime = (expiresIn - 120) * 1000;

    refreshTimerRef.current = setTimeout(async () => {
      try {
        await refreshAccessToken();
      } catch (error) {
        console.error('Auto refresh failed:', error);
        logout();
      }
    }, refreshTime);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // ... rest of provider
}
```

**Strategy 2: Axios Interceptor (Reactive)**

```typescript
// See Authentication Guide for complete implementation
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Concurrent Request Handling

Prevent multiple simultaneous refresh requests:

```typescript
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

// In interceptor
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then((token) => {
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return axios(originalRequest);
  });
}
```

---

## Data Fetching

### SWR Alternative

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function TransactionList() {
  const { data, error, mutate } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 30000, // Refresh every 30s
    revalidateOnFocus: true,
  });

  if (error) return <Error />;
  if (!data) return <Loading />;

  return <TransactionGrid transactions={data.data} />;
}
```

### Optimistic Updates

```typescript
function useApproveTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.approveTransaction(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      // Snapshot previous value
      const previousTransactions = queryClient.getQueryData(['transactions']);

      // Optimistically update
      queryClient.setQueryData(['transactions'], (old: any) => ({
        ...old,
        data: old.data.map((tx: TransactionResponseDto) =>
          tx.id === id ? { ...tx, status: TransactionStatus.APPROVED } : tx
        ),
      }));

      return { previousTransactions };
    },
    onError: (err, id, context) => {
      // Rollback on error
      queryClient.setQueryData(['transactions'], context?.previousTransactions);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
```

---

## State Management

### Zustand (Lightweight Alternative to Redux)

```typescript
import create from 'zustand';

interface AppState {
  user: UserResponseDto | null;
  accessToken: string | null;
  setAuth: (user: UserResponseDto, accessToken: string) => void;
  clearAuth: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}));

// Usage
function Dashboard() {
  const user = useAppStore((state) => state.user);
  const clearAuth = useAppStore((state) => state.clearAuth);

  if (!user) return <Login />;

  return <div>Welcome, {user.email}</div>;
}
```

### Context + Reducer Pattern

```typescript
interface State {
  transactions: TransactionResponseDto[];
  isLoading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: TransactionResponseDto[] }
  | { type: 'FETCH_ERROR'; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, transactions: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
};

function TransactionsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    transactions: [],
    isLoading: false,
    error: null,
  });

  return (
    <TransactionsContext.Provider value={{ state, dispatch }}>
      {children}
    </TransactionsContext.Provider>
  );
}
```

---

## Form Handling

### React Hook Form + Zod Validation

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  type: z.enum(['IN', 'OUT']),
  amount: z.number().min(0.01).max(9999999.99),
  description: z.string().min(1).max(500),
  category: z.nativeEnum(TransactionCategory).optional(),
});

type FormData = z.infer<typeof schema>;

function TransactionForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await api.createTransaction(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register('type')}>
        <option value="IN">Money IN</option>
        <option value="OUT">Money OUT</option>
      </select>
      {errors.type && <span>{errors.type.message}</span>}

      <input
        type="number"
        step="0.01"
        {...register('amount', { valueAsNumber: true })}
      />
      {errors.amount && <span>{errors.amount.message}</span>}

      <textarea {...register('description')} />
      {errors.description && <span>{errors.description.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

---

## File Uploads

### Pre-Upload Validation

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, and PDF files are allowed';
  }
  if (file.size > MAX_SIZE) {
    return 'File size must be under 5MB';
  }
  return null;
}
```

### Progress Tracking

```typescript
function FileUpload({ transactionId }: { transactionId: string }) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`/transactions/${transactionId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const percent = (event.loaded / event.total!) * 100;
          setProgress(Math.round(percent));
        },
      });
      setProgress(100);
    } catch (err) {
      setError('Upload failed');
    }
  };

  return (
    <>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      {progress > 0 && progress < 100 && <ProgressBar value={progress} />}
      {error && <Error message={error} />}
    </>
  );
}
```

### Preview Before Upload

```typescript
function FilePreview({ file }: { file: File }) {
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }

    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [file]);

  if (file.type === 'application/pdf') {
    return <PdfIcon />;
  }

  return <img src={preview} alt="Preview" width={200} />;
}
```

---

## Date Handling

### Always Use ISO Strings for API

```typescript
// ✅ Correct
const startDate = new Date('2024-01-01').toISOString().split('T')[0];
// "2024-01-01"

// ❌ Wrong (format varies by locale)
const startDate = new Date('01/01/2024').toString();
```

### Display Formatting with date-fns

```typescript
import { format, parseISO } from 'date-fns';

function TransactionDate({ transaction }: { transaction: TransactionResponseDto }) {
  const formattedDate = format(parseISO(transaction.createdAt), 'MMM dd, yyyy HH:mm');

  return <time dateTime={transaction.createdAt}>{formattedDate}</time>;
}
```

### Relative Time

```typescript
import { formatDistanceToNow } from 'date-fns';

function RelativeTime({ timestamp }: { timestamp: string }) {
  const relative = formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
  return <span>{relative}</span>; // "2 hours ago"
}
```

---

## Error Handling

See [Error Handling Guide](./05-error-handling.md) for comprehensive patterns.

### Global Error Boundary

```typescript
// Place at app root
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

### Toast Notifications

```typescript
import { toast } from 'react-toastify';

// Success
toast.success('Transaction created successfully!');

// Error
toast.error('Failed to create transaction');

// Warning
toast.warning('Token expires in 2 minutes');

// Info
toast.info('Report generation started');
```

---

## Testing

### Unit Tests (Vitest + React Testing Library)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should show validation errors for invalid email', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should call login API on valid submission', async () => {
    const mockLogin = vi.fn();
    render(<LoginForm onLogin={mockLogin} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
```

### API Mocking (MSW - Mock Service Worker)

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('http://localhost:3000/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        expiresIn: 900,
        user: {
          id: '123',
          email: 'test@example.com',
          role: 'ADMIN',
          isActive: true,
        },
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### E2E Tests (Playwright/Cypress)

```typescript
// Cypress example
describe('Transaction Flow', () => {
  beforeEach(() => {
    cy.login('info@brightc0de.com', 'Brightc0de@info');
  });

  it('should create a transaction', () => {
    cy.visit('/transactions/new');
    cy.get('[name="type"]').select('OUT');
    cy.get('[name="amount"]').type('1500.50');
    cy.get('[name="description"]').type('Test transaction');
    cy.get('[type="submit"]').click();

    cy.contains('Transaction created successfully');
    cy.url().should('include', '/transactions');
  });
});
```

---

## Production Deployment

### Environment Variables

```bash
# .env.production
VITE_API_BASE_URL=https://api.brightcode.eg
VITE_API_DEBUG=false
VITE_SENTRY_DSN=https://your-sentry-dsn
```

### Build Optimization

```json
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: true, // For debugging
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@tanstack/react-query', 'react-router-dom'],
        },
      },
    },
  },
});
```

### Performance Monitoring

```typescript
// reportWebVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, delta, id }: Metric) {
  // Send to analytics service
  console.log({ name, delta, id });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});

// Use ErrorBoundary
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

### Lighthouse CI

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

**Complete Examples**: Check [`examples/auth-flow-example.tsx`](./examples/auth-flow-example.tsx) and [`examples/api-client-example.ts`](./examples/api-client-example.ts) for production-ready implementations.
