# Getting Started

> **Last Updated:** 2026-01-20 06:51 (Africa/Cairo)

Get your React/TypeScript frontend connected to the BrightCode Cashflow API in minutes.

> **Note:** All monetary values are returned as **strings** for decimal precision. All dates use **Africa/Cairo timezone**.

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** installed ([download](https://nodejs.org/))
- ✅ **Backend API running** at `http://localhost:3000`
- ✅ **React project** (Vite, Create React App, or Next.js)
- ✅ Basic knowledge of REST APIs and JWT authentication

## Step 1: Environment Configuration

Create or update your `.env` file in your React project root:

### For Vite (Recommended)
```bash
# .env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_DEBUG=true
```

### For Next.js
```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### For Create React App
```bash
# .env
REACT_APP_API_BASE_URL=http://localhost:3000
```

> 💡 **Tip:** Download the complete `.env.frontend.example` from the [`examples/`](./examples/.env.frontend.example) folder.

## Step 2: Install Dependencies

### Option A: Using Built-in Fetch (No installation needed)
The examples below use native `fetch` API - no additional packages required.

### Option B: Using Axios (Recommended for production)
```bash
npm install axios
# or
yarn add axios
```

Axios provides better error handling, request/response interceptors, and automatic JSON transformation.

## Step 3: Verify Backend Connection

Test that your backend is running and accessible:

### Using JavaScript
```javascript
fetch('http://localhost:3000/health')
  .then(response => response.json())
  .then(data => {
    console.log('✅ API is running:', data);
    // Expected: { status: 'ok', timestamp: '2024-01-20T...' }
  })
  .catch(error => {
    console.error('❌ API connection failed:', error.message);
  });
```

### Using React Component
```tsx
import { useEffect, useState } from 'react';

function HealthCheck() {
  const [status, setStatus] = useState<string>('Checking...');

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then(res => res.json())
      .then(data => setStatus(`✅ API is healthy - ${data.timestamp}`))
      .catch(err => setStatus(`❌ API is down - ${err.message}`));
  }, []);

  return <div>{status}</div>;
}
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Step 4: Login and Get Access Token

Use the default admin credentials to authenticate:

### Default Credentials

**Admin Account:**
- Email: `info@brightc0de.com`
- Password: `Brightc0de@info`
- Role: ADMIN
- Access: Full system (all endpoints)

> ⚠️ **Security:** These are development credentials. Change them in production!

### Login Request

```typescript
async function login(email: string, password: string) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();

  // Store tokens (in real app, use secure storage)
  sessionStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  console.log('✅ Logged in as:', data.user.email);
  console.log('👤 Role:', data.user.role);
  console.log('🔑 Access token expires in:', data.expiresIn, 'seconds');

  return data;
}

// Usage
login('info@brightc0de.com', 'Brightc0de@info')
  .then(data => console.log('User:', data.user))
  .catch(error => console.error('Login failed:', error));
```

**Success Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIiwiZW1haWwiOiJpbmZvQGJyaWdodGMwZGUuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzA2MDA...",
  "refreshToken": "a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
  "expiresIn": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "info@brightc0de.com",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Token Details:**
- `accessToken`: JWT for API requests (15-minute expiry)
- `refreshToken`: For obtaining new access tokens (7-day expiry)
- `expiresIn`: Seconds until access token expires (900 = 15 minutes)

## Step 5: Make Your First Authenticated Request

Now use the access token to fetch data:

```typescript
async function getTransactions() {
  const accessToken = sessionStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('Not authenticated. Please login first.');
  }

  const response = await fetch('http://localhost:3000/transactions', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token expired. Please refresh or re-login.');
    }
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  console.log('📊 Transactions:', data);
  return data;
}

// Usage
getTransactions()
  .then(result => {
    console.log(`Found ${result.total} transactions`);
    console.log('First transaction:', result.data[0]);
  })
  .catch(error => console.error('Error:', error));
```

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "transactionNumber": "BC-2024-000001",
      "type": "IN",
      "amount": "5000.00",
      "description": "Website development project payment",
      "category": "WEBSITES",
      "status": "APPROVED",
      "createdBy": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "sales@brightcode.eg",
        "role": "SALES"
      },
      "approvedBy": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "info@brightc0de.com",
        "role": "ADMIN"
      },
      "attachments": [],
      "createdAt": "2024-01-20T09:00:00.000Z",
      "updatedAt": "2024-01-20T09:30:00.000Z",
      "approvedAt": "2024-01-20T09:30:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

## Step 6: Create Your First Transaction

Let's create a new transaction:

```typescript
async function createTransaction(data: {
  type: 'IN' | 'OUT';
  amount: number;
  description: string;
  category?: string;
}) {
  const accessToken = sessionStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/transactions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const transaction = await response.json();
  console.log('✅ Transaction created:', transaction.transactionNumber);
  return transaction;
}

// Usage
createTransaction({
  type: 'OUT',
  amount: 1500.50,
  description: 'Adobe Creative Cloud annual subscription',
  category: 'SOFTWARE'
})
  .then(tx => console.log('Created:', tx))
  .catch(error => console.error('Error:', error));
```

**Important:** Transactions require at least one attachment. Upload an attachment immediately after creation.

**Success Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "transactionNumber": "BC-2024-000002",
  "type": "OUT",
  "amount": "1500.50",
  "description": "Adobe Creative Cloud annual subscription",
  "category": "SOFTWARE",
  "status": "PENDING",
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "info@brightc0de.com",
    "role": "ADMIN"
  },
  "attachments": [],
  "createdAt": "2024-01-20T10:45:00.000Z",
  "updatedAt": "2024-01-20T10:45:00.000Z"
}
```

## Quick Testing with Postman

For rapid API testing without writing code:

1. **Import Collection:**
   - Open Postman
   - Click Import
   - Select `docs/frontend-integration/postman/brightcode-cashflow.postman_collection.json`

2. **Set Base URL:**
   - Collection variables already set to `http://localhost:3000`
   - No configuration needed!

3. **Login:**
   - Open "Authentication" folder
   - Run "Login" request
   - Tokens are automatically stored in collection variables

4. **Test Endpoints:**
   - All other requests automatically use stored tokens
   - No need to copy-paste tokens manually

## Interactive API Documentation (Swagger)

Access the auto-generated Swagger UI:

1. Open browser: `http://localhost:3000/api`
2. Click "Authorize" button (top right)
3. Run the `/auth/login` endpoint with credentials
4. Copy the `accessToken` from response
5. Paste token in authorization modal (format: `Bearer YOUR_TOKEN`)
6. Test all endpoints interactively

## Common Setup Issues

### Issue 1: CORS Error

**Error:** `Access to fetch at 'http://localhost:3000' has been blocked by CORS policy`

**Solution:** Backend should already have CORS enabled. If not, check backend `main.ts`:
```typescript
app.enableCors({
  origin: 'http://localhost:5173', // Your React dev server
  credentials: true,
});
```

### Issue 2: Network Error

**Error:** `Failed to fetch` or `Network request failed`

**Solutions:**
1. ✅ Verify backend is running: `npm run start:dev` (in backend directory)
2. ✅ Check backend URL: `http://localhost:3000/health`
3. ✅ Ensure no firewall blocking port 3000

### Issue 3: 401 Unauthorized

**Error:** `401 Unauthorized` on API requests

**Solutions:**
1. ✅ Check if you're including Authorization header: `Authorization: Bearer YOUR_TOKEN`
2. ✅ Verify token hasn't expired (15-minute lifetime)
3. ✅ Try logging in again to get fresh token

### Issue 4: 403 Forbidden

**Error:** `403 Forbidden resource`

**Solutions:**
1. ✅ Check if endpoint requires ADMIN role (you might be logged in as SALES)
2. ✅ Verify user account is active (`isActive: true`)
3. ✅ See [API Reference](./03-api-reference.md) for role requirements

### Issue 5: 429 Too Many Requests

**Error:** `429 Too Many Requests`

**Solution:** Login endpoint is rate-limited to 5 attempts per 60 seconds. Wait 60 seconds and try again.

### Issue 6: Invalid Credentials

**Error:** `401 Unauthorized` on login

**Solutions:**
1. ✅ Verify credentials: `info@brightc0de.com` / `Brightc0de@info`
2. ✅ Check for typos (case-sensitive password)
3. ✅ Ensure backend has seeded admin user

## Environment Variables Reference

Copy from `examples/.env.frontend.example`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_API_DEBUG=true
VITE_API_TIMEOUT=30000

# File Uploads
VITE_MAX_FILE_SIZE=5242880          # 5MB in bytes
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Pagination
VITE_DEFAULT_PAGE_SIZE=20
VITE_MAX_PAGE_SIZE=100

# Currency
VITE_CURRENCY=EGP
VITE_CURRENCY_SYMBOL=ج.م

# Date Formatting (Africa/Cairo timezone enforced by backend)
VITE_DATE_FORMAT=YYYY-MM-DD
VITE_DATETIME_FORMAT=YYYY-MM-DD HH:mm:ss
VITE_TIMEZONE=Africa/Cairo

# Token Refresh
VITE_TOKEN_REFRESH_BUFFER=2         # Refresh 2 mins before expiry

# Production (override in .env.production)
# VITE_API_BASE_URL=https://api.brightcode.eg
# VITE_API_DEBUG=false
```

## Next Steps

Now that you're connected to the API, learn more:

1. 🔐 **[Authentication Guide](./02-authentication.md)**
   - Understand JWT token flow
   - Implement auto token refresh
   - React authentication patterns
   - Secure token storage

2. 📋 **[TypeScript Types](./04-typescript-types.md)**
   - Copy all type definitions to your project
   - Get type safety for all API calls
   - Use enums for transaction types, categories, etc.

3. 📚 **[API Reference](./03-api-reference.md)**
   - Browse all 27 endpoints
   - See request/response examples
   - Understand validation rules
   - Learn error handling

4. 💻 **[Code Examples](./examples/)**
   - Complete React authentication implementation
   - Typed API client with hooks
   - Production-ready patterns

5. ✅ **[Best Practices](./06-best-practices.md)**
   - Security recommendations
   - Performance optimization
   - Testing strategies
   - Production deployment

## Quick Reference

### Base URL
```
http://localhost:3000
```

### Default Credentials
```
Email: info@brightc0de.com
Password: Brightc0de@info
```

### Token Lifetimes
```
Access Token: 15 minutes
Refresh Token: 7 days
```

### Common Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

**Ready for authentication?** Continue to [Authentication Guide →](./02-authentication.md)
