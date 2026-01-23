# BrightCode Cashflow API - Frontend Integration Guide

> **Last Updated:** 2026-01-20 06:51 (Africa/Cairo)

> **Complete documentation for integrating your React/TypeScript frontend with the BrightCode Cashflow Backend API**

## Overview

This guide provides everything you need to integrate with the BrightCode internal cashflow tracking system. The backend is built with NestJS, PostgreSQL, and provides a secure REST API with JWT authentication and role-based access control.

### Key Notes
- **Financial Precision:** All monetary values (amounts, totals, balances) are returned as **strings** to ensure decimal precision
- **Timezone:** All dates and report grouping use **Africa/Cairo timezone**
- **Attachment Requirement:** Transactions must have at least one attachment; last attachment cannot be deleted

### Technology Stack

**Backend:**
- NestJS 10.x with TypeScript 5.x
- PostgreSQL with Prisma ORM 5.x
- JWT-based authentication (access + refresh tokens)
- Role-based access control (ADMIN, SALES)
- File upload support (receipts/attachments)
- Excel and CSV export functionality

**API Features:**
- 27 RESTful endpoints across 7 modules
- Comprehensive validation with class-validator
- Automatic Swagger/OpenAPI documentation
- Audit logging for all operations
- Soft delete pattern with recovery options
- Rate limiting on sensitive endpoints

## Quick Start

Get up and running in 4 steps:

1. **Setup Environment**
   ```bash
   # Create .env file in your React project
   VITE_API_BASE_URL=http://localhost:3000
   ```

2. **Test Connection**
   ```javascript
   fetch('http://localhost:3000/health')
     .then(res => res.json())
     .then(data => console.log('API Status:', data));
   ```

3. **Login**
   ```javascript
   const response = await fetch('http://localhost:3000/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'info@brightc0de.com',
       password: 'Brightc0de@info'
     })
   });
   const { accessToken, user } = await response.json();
   ```

4. **Make Authenticated Request**
   ```javascript
   const transactions = await fetch('http://localhost:3000/transactions', {
     headers: { 'Authorization': `Bearer ${accessToken}` }
   }).then(res => res.json());
   ```

## Documentation

### 📚 Table of Contents

1. **[Getting Started](./01-getting-started.md)**
   - Environment setup
   - First API request
   - Default credentials
   - Common issues and solutions

2. **[Authentication](./02-authentication.md)**
   - JWT flow diagram
   - Token specifications (15min access, 7day refresh)
   - React implementation with hooks
   - Auto token refresh
   - Security best practices

3. **[API Reference](./03-api-reference.md)**
   - Complete documentation for all 27 endpoints
   - Request/response examples
   - Error scenarios
   - Validation rules
   - React integration notes

4. **[TypeScript Types](./04-typescript-types.md)**
   - Frontend-ready type definitions
   - All DTOs and interfaces
   - Enums (Role, TransactionType, Status, Category, etc.)
   - Type guards and utilities
   - React component props types

5. **[Error Handling](./05-error-handling.md)**
   - HTTP status codes reference
   - Common error scenarios
   - Error response format
   - React error handling patterns
   - Validation rules

6. **[Best Practices](./06-best-practices.md)**
   - Security (token storage, HTTPS, CSRF)
   - Performance (caching, pagination, debouncing)
   - React patterns (hooks, Context, React Query)
   - File uploads
   - Testing strategies

### 🛠️ Tools & Examples

**Postman Collection:**
- [brightcode-cashflow.postman_collection.json](./postman/brightcode-cashflow.postman_collection.json)
- Ready-to-import with all 27 endpoints
- Auto token management
- Example requests with realistic data

**Code Examples:**
- [.env.frontend.example](./examples/.env.frontend.example) - Environment template
- [auth-flow-example.tsx](./examples/auth-flow-example.tsx) - Complete React auth implementation
- [api-client-example.ts](./examples/api-client-example.ts) - Typed API client with React hooks

## API Modules

| Module | Endpoints | Access | Description |
|--------|-----------|--------|-------------|
| **Authentication** | 3 | Public | Login, refresh token, logout |
| **Transactions** | 8 | Mixed | Create, list, approve, reject, delete, attachments |
| **Users** | 6 | ADMIN | User management (CRUD, activate/deactivate) |
| **Reports** | 5 | ADMIN | Balance, summary, expenses by category, Excel export, CSV export |
| **Attachments** | 2 | Protected | Download, delete (receipts/invoices) |
| **Audit** | 1 | ADMIN | Audit log history |
| **Health** | 1 | Public | Health check |
| **Total** | **27** | | |

## Default Credentials

For development and testing:

**Admin Account:**
- Email: `info@brightc0de.com`
- Password: `Brightc0de@info`
- Role: ADMIN
- Access: Full system access (all endpoints)

> ⚠️ **Security Note:** Change these credentials in production environments.

## Base URL

**Development:** `http://localhost:3000`
**Production:** Update `VITE_API_BASE_URL` to your production API URL

## Authentication Flow

```
┌─────────────┐
│   Login     │  POST /auth/login
└──────┬──────┘
       │
       │ Returns: { accessToken, refreshToken, user }
       ▼
┌─────────────┐
│  Store      │  Memory: accessToken
│  Tokens     │  Secure: refreshToken
└──────┬──────┘
       │
       │ Every API Request
       ▼
┌─────────────┐
│  Include    │  Authorization: Bearer {accessToken}
│  Token      │
└──────┬──────┘
       │
       │ Token Expires (15min)
       ▼
┌─────────────┐
│  Refresh    │  POST /auth/refresh
│  Token      │  Body: { refreshToken }
└──────┬──────┘
       │
       │ Returns: New tokens
       ▼
┌─────────────┐
│  Retry      │  Retry original request
│  Request    │
└─────────────┘
```

## Quick Links

### Swagger UI
Access interactive API documentation at: `http://localhost:3000/api`

### Key Concepts

**JWT Tokens:**
- Access token: 15-minute expiry (for API requests)
- Refresh token: 7-day expiry (for obtaining new access tokens)
- Token rotation: Each refresh generates new tokens (old ones revoked)

**Roles:**
- **ADMIN**: Full system access (approve, reject, delete, reports, user management)
- **SALES**: Limited access (create transactions, view own data, upload attachments)

**Transaction Lifecycle:**
1. SALES creates transaction → Status: PENDING
2. SALES can edit/add attachments (only while PENDING)
3. ADMIN approves → Status: APPROVED (immutable)
4. ADMIN rejects → Status: REJECTED (with reason)
5. ADMIN can soft delete (with reason, recoverable)

**File Uploads:**
- Max size: 5MB
- Accepted formats: JPEG, PNG, PDF
- Max 5 attachments per transaction
- Minimum 1 attachment required per transaction (cannot delete last attachment)
- Only for PENDING transactions

## Support

### Documentation Issues
Found an error in the docs? Please report it to your technical lead.

### API Issues
- Check backend logs: `npm run start:dev` (backend terminal)
- Verify backend is running: `http://localhost:3000/health`
- Review error responses in [Error Handling](./05-error-handling.md)

### Common Questions

**Q: Why am I getting 401 Unauthorized?**
A: Your access token expired (15min lifetime). Use the refresh token to get a new one. See [Authentication](./02-authentication.md).

**Q: Why am I getting 403 Forbidden?**
A: You don't have the required role. Check if the endpoint requires ADMIN access. See [API Reference](./03-api-reference.md).

**Q: How do I test endpoints quickly?**
A: Import the Postman collection from `postman/` folder. Login request auto-stores tokens.

**Q: Can I use this with Vue/Angular/Svelte?**
A: Yes! While examples use React, all TypeScript types and API patterns work with any framework.

## Next Steps

1. 📖 Read [Getting Started](./01-getting-started.md) for environment setup
2. 🔐 Study [Authentication](./02-authentication.md) for token management
3. 📋 Copy [TypeScript Types](./04-typescript-types.md) to your project
4. 🚀 Import [Postman Collection](./postman/) to test endpoints
5. 💻 Review [Code Examples](./examples/) for React implementation

## Project Structure

```
docs/frontend-integration/
├── README.md                      ← You are here
├── 01-getting-started.md          Environment & first request
├── 02-authentication.md           JWT authentication with React
├── 03-api-reference.md            All 27 endpoints documented
├── 04-typescript-types.md         TypeScript definitions
├── 05-error-handling.md           Error codes & handling
├── 06-best-practices.md           Production patterns
├── postman/
│   └── brightcode-cashflow.postman_collection.json
└── examples/
    ├── .env.frontend.example
    ├── auth-flow-example.tsx
    └── api-client-example.ts
```

---

**Ready to integrate?** Start with [Getting Started →](./01-getting-started.md)
