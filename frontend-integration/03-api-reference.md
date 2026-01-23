# API Reference

> **Last Updated:** 2026-01-20 06:51 (Africa/Cairo)

Complete documentation for all 27 endpoints in the BrightCode Cashflow API.

> **Note:** All monetary values are returned as **strings** for decimal precision. All dates use **Africa/Cairo timezone**.

## Quick Navigation

- [Authentication](#authentication) (3 endpoints) 🔓 Public
- [Users](#users) (6 endpoints) 🎭 ADMIN
- [Transactions](#transactions) (8 endpoints) 🔒 Mixed
- [Reports](#reports) (5 endpoints) 🎭 ADMIN
- [Attachments](#attachments) (2 endpoints) 🔒 Protected
- [Audit](#audit) (1 endpoint) 🎭 ADMIN
- [Health](#health) (1 endpoint) 🔓 Public

**Legend:**
- 🔓 Public - No authentication required
- 🔒 Protected - Requires valid JWT token
- 🎭 ADMIN - Requires ADMIN role
- ⚡ Rate Limited

**Base URL:** `http://localhost:3000`

---

## Authentication

### 1. Login

**POST** `/auth/login`
🔓 Public | ⚡ 5 req/min

Authenticate user with email and password. Returns JWT access token (15min) and refresh token (7 days).

**Request Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "email": "info@brightc0de.com",
  "password": "Brightc0de@info"
}
```

**Validation:**
- `email`: Must be valid email format
- `password`: Minimum 8 characters

**Success Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6789abc...",
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

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded (max 5 attempts per 60 seconds)

---

### 2. Refresh Token

**POST** `/auth/refresh`
🔓 Public | ⚡ 5 req/min

Obtain new access and refresh tokens. Old refresh token is revoked (token rotation).

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6789abc..."
}
```

**Success Response (200 OK):**
Same as login response with new tokens.

**Error Responses:**
- `401 Unauthorized`: Invalid, expired, or revoked refresh token
- `401 Unauthorized`: User account deactivated

---

### 3. Logout

**POST** `/auth/logout`
🔒 Protected

Revoke refresh token on backend.

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {accessToken}"
}
```

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6789abc..."
}
```

**Success Response (204 No Content)**

---

## Users

### 4. Create User

**POST** `/users`
🎭 ADMIN only

Create a new user account.

**Request:**
```json
{
  "email": "sales@brightcode.eg",
  "password": "password123",
  "role": "SALES"
}
```

**Validation:**
- `email`: Valid email, unique
- `password`: Min 8 characters
- `role`: Optional, defaults to SALES

**Success (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "sales@brightcode.eg",
  "role": "SALES",
  "isActive": true,
  "createdAt": "2024-01-20T11:00:00.000Z",
  "updatedAt": "2024-01-20T11:00:00.000Z"
}
```

**Errors:**
- `409 Conflict`: Email already registered

---

### 5. List Users

**GET** `/users?page=1&limit=20&role=SALES&isActive=true`
🎭 ADMIN only

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)
- `role`: Filter by role (ADMIN or SALES)
- `isActive`: Filter by active status (true/false)

**Success (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "sales@brightcode.eg",
      "role": "SALES",
      "isActive": true,
      "createdAt": "2024-01-20T11:00:00.000Z",
      "updatedAt": "2024-01-20T11:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### 6. Get User by ID

**GET** `/users/:id`
🎭 ADMIN only

**Success (200 OK):**
Returns single user object (same structure as create response).

**Errors:**
- `404 Not Found`: User not found

---

### 7. Update User

**PATCH** `/users/:id`
🎭 ADMIN only

**Request:**
```json
{
  "role": "ADMIN",
  "isActive": true,
  "password": "newPassword123"
}
```

All fields optional.

**Success (200 OK):**
Returns updated user object.

---

### 8. Deactivate User

**POST** `/users/:id/deactivate`
🎭 ADMIN only

Sets `isActive` to false. User cannot login.

**Success (200 OK):**
Returns user with `isActive: false`.

---

### 9. Activate User

**POST** `/users/:id/activate`
🎭 ADMIN only

Sets `isActive` to true. User can login again.

**Success (200 OK):**
Returns user with `isActive: true`.

---

## Transactions

### 10. Create Transaction

**POST** `/transactions`
🔒 SALES + ADMIN

Create new transaction (status: PENDING).

**Request:**
```json
{
  "type": "OUT",
  "amount": 1500.50,
  "description": "Adobe Creative Cloud annual subscription",
  "category": "SOFTWARE"
}
```

**Validation:**
- `type`: Required, must be "IN" or "OUT"
- `amount`: Required, min 0.01, max 2 decimals
- `description`: Required, max 500 characters
- `category`: Optional, defaults to "OTHER"

**Categories:** WEBSITES, DESIGN, MARKETING, HOSTING, SOFTWARE, CONSULTING, TRAINING, OTHER

**Important:** Transactions require at least one attachment. Upload attachments immediately after creation.

**Success (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "transactionNumber": "BC-2024-000002",
  "type": "OUT",
  "amount": "1500.50",
  "description": "Adobe Creative Cloud annual subscription",
  "category": "SOFTWARE",
  "status": "PENDING",
  "rejectionReason": null,
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "info@brightc0de.com",
    "role": "ADMIN"
  },
  "approvedBy": null,
  "attachments": [],
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T12:00:00.000Z",
  "approvedAt": null
}
```

---

### 11. List Transactions

**GET** `/transactions?page=1&limit=20&type=OUT&status=PENDING&category=SOFTWARE`
🔒 SALES (own) + ADMIN (all)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)
- `type`: Filter by type (IN or OUT)
- `status`: Filter by status (PENDING, APPROVED, REJECTED)
- `startDate`: Filter from date (YYYY-MM-DD)
- `endDate`: Filter to date (YYYY-MM-DD)
- `createdById`: Filter by creator ID (UUID)
- `minAmount`: Filter minimum amount
- `maxAmount`: Filter maximum amount
- `search`: Search in description and transaction number
- `category`: Filter by category
- `includeDeleted`: Include soft-deleted (default: false)

**Success (200 OK):**
```json
{
  "data": [/* array of transactions */],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

**Access Control:**
- SALES users see only their own transactions
- ADMIN users see all transactions

---

### 12. Get Transaction by ID

**GET** `/transactions/:id`
🔒 SALES (own) + ADMIN (all)

**Success (200 OK):**
Returns single transaction object.

**Errors:**
- `404 Not Found`: Transaction not found
- `403 Forbidden`: SALES user accessing another user's transaction

---

### 13. Update Transaction

**PATCH** `/transactions/:id`
🎭 ADMIN only

Update PENDING transaction. Cannot update APPROVED or REJECTED.

**Request:**
```json
{
  "amount": 1600.00,
  "description": "Updated description",
  "category": "HOSTING"
}
```

All fields optional.

**Success (200 OK):**
Returns updated transaction.

**Errors:**
- `403 Forbidden`: Cannot modify approved/rejected transaction

---

### 14. Upload Attachment

**POST** `/transactions/:id/attachments`
🔒 Creator + ADMIN

Upload receipt/invoice (max 5 per transaction, only for PENDING).

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- Allowed types: JPEG, PNG, PDF
- Max size: 5MB

**Success (201 Created):**
Returns transaction with new attachment in `attachments` array.

**Errors:**
- `400 Bad Request`: Invalid file type or size
- `403 Forbidden`: Max 5 attachments or transaction not PENDING

---

### 15. Approve Transaction

**POST** `/transactions/:id/approve`
🎭 ADMIN only

Approve PENDING transaction. Sets status to APPROVED (immutable).

**Success (200 OK):**
Returns transaction with `status: "APPROVED"`, `approvedBy` populated, `approvedAt` timestamp.

**Errors:**
- `403 Forbidden`: Transaction not PENDING

---

### 16. Reject Transaction

**POST** `/transactions/:id/reject`
🎭 ADMIN only

Reject PENDING transaction with reason.

**Request:**
```json
{
  "reason": "Missing receipt attachment"
}
```

**Validation:**
- `reason`: Required, min 10 characters, max 500

**Success (200 OK):**
Returns transaction with `status: "REJECTED"`, `rejectionReason` populated.

---

### 17. Delete Transaction

**DELETE** `/transactions/:id`
🎭 ADMIN only

Soft delete transaction with reason. Can be recovered.

**Request:**
```json
{
  "reason": "Duplicate entry created by mistake"
}
```

**Validation:**
- `reason`: Required, min 10 characters, max 500

**Success (204 No Content)**

---

## Attachments

### 18. Download Attachment

**GET** `/attachments/:id`
🔒 Protected

Download attachment file (receipt/invoice).

**Success (200 OK):**
- Content-Type: File MIME type (image/jpeg, application/pdf, etc.)
- Content-Disposition: `attachment; filename="receipt.pdf"`
- Body: Binary file data

**Errors:**
- `404 Not Found`: Attachment not found
- `403 Forbidden`: No access to parent transaction

---

### 19. Delete Attachment

**DELETE** `/attachments/:id`
🔒 Creator + ADMIN

Delete attachment (only for PENDING transactions).

**Important:** Each transaction must have at least one attachment. You cannot delete the last remaining attachment.

**Success (204 No Content)**

**Errors:**
- `403 Forbidden`: Transaction not PENDING
- `403 Forbidden`: Cannot delete the last attachment (each transaction must have at least one)

---

## Reports

All report endpoints require ADMIN role and return data for APPROVED transactions only (unless specified otherwise).

### 20. Get Balance

**GET** `/reports/balance`
🎭 ADMIN only

Current balance (all-time APPROVED transactions).

**Success (200 OK):**
```json
{
  "totalIn": "45000.00",
  "totalOut": "23500.50",
  "netBalance": "21499.50",
  "currency": "EGP",
  "asOf": "2024-01-20T14:30:00.000Z"
}
```

---

### 21. Get Expenses by Category

**GET** `/reports/expenses-by-category?startDate=2024-01-01&endDate=2024-12-31`
🎭 ADMIN only

OUT transactions grouped by category.

**Query:**
- `startDate`: Optional (YYYY-MM-DD)
- `endDate`: Optional (YYYY-MM-DD)
- `category`: Optional filter

**Success (200 OK):**
```json
{
  "fromDate": "2024-01-01",
  "toDate": "2024-12-31",
  "categories": [
    {
      "category": "SOFTWARE",
      "total": "15000.00",
      "count": 10
    },
    {
      "category": "HOSTING",
      "total": "5000.00",
      "count": 12
    }
  ],
  "grandTotal": "20000.00",
  "currency": "EGP"
}
```

---

### 22. Get Summary

**GET** `/reports/summary?startDate=2024-01-01&endDate=2024-12-31&type=OUT&category=SOFTWARE`
🎭 ADMIN only

Financial summary with daily breakdown. Daily totals are grouped by Africa/Cairo timezone.

**Query:**
- `startDate`: Optional (YYYY-MM-DD)
- `endDate`: Optional (YYYY-MM-DD)
- `type`: Optional (IN or OUT)
- `status`: Optional (default: APPROVED)
- `category`: Optional

**Success (200 OK):**
```json
{
  "summary": {
    "totalIn": "45000.00",
    "totalOut": "23500.50",
    "netCashflow": "21499.50",
    "countIn": 25,
    "countOut": 42,
    "totalCount": 67
  },
  "dailyTotals": [
    {
      "date": "2024-01-01",
      "totalIn": "1000.00",
      "totalOut": "500.00",
      "net": "500.00"
    }
  ],
  "generatedAt": "2024-01-20T14:30:00.000Z",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "currency": "EGP"
}
```

---

### 23. Export to Excel

**GET** `/reports/export?startDate=2024-01-01&endDate=2024-12-31`
🎭 ADMIN only

Download Excel file with complete report (3 sheets). Dates are formatted in Africa/Cairo timezone.

**Query:** Same as summary endpoint

**Success (200 OK):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="cashflow-report-2024-01-01-to-2024-12-31.xlsx"`
- Body: Binary Excel file

**Excel Structure:**
- Sheet 1: Summary (totals and metrics)
- Sheet 2: Transactions (all details with dates in Africa/Cairo timezone)
- Sheet 3: Daily Totals (grouped by Africa/Cairo timezone)

---

### 24. Export to CSV

**GET** `/reports/export/csv?startDate=2024-01-01&endDate=2024-12-31`
🎭 ADMIN only

Download CSV file with transaction data. Dates are formatted in Africa/Cairo timezone.

**Query:** Same as summary endpoint

**Success (200 OK):**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="cashflow-report-2024-01-01-to-2024-12-31.csv"`
- Body: CSV text data

**CSV Columns:**
- Transaction # (e.g., BC-2024-000001)
- Date (YYYY-MM-DD in Africa/Cairo timezone)
- Type (IN/OUT)
- Amount (EGP)
- Category
- Description
- Status
- Created By (email)
- Approved By (email, if applicable)

---

## Audit

### 25. Get Audit Logs

**GET** `/audit?page=1&limit=50&action=CREATE&entityType=TRANSACTION`
🎭 ADMIN only

View audit trail of all actions.

**Query:**
- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)
- `entityType`: Filter by entity (USER, TRANSACTION, ATTACHMENT)
- `entityId`: Filter by specific entity ID
- `actorId`: Filter by user who performed action
- `action`: Filter by action (LOGIN, CREATE, UPDATE, APPROVE, REJECT, DELETE, etc.)
- `startDate`: From date (YYYY-MM-DD)
- `endDate`: To date (YYYY-MM-DD)

**Success (200 OK):**
```json
{
  "data": [
    {
      "id": "audit-log-id",
      "action": "APPROVE",
      "entityType": "TRANSACTION",
      "entityId": "550e8400-e29b-41d4-a716-446655440002",
      "beforeSnapshot": {
        "status": "PENDING"
      },
      "afterSnapshot": {
        "status": "APPROVED"
      },
      "actor": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "info@brightc0de.com"
      },
      "ipAddress": "127.0.0.1",
      "timestamp": "2024-01-20T12:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

---

## Health

### 26. Health Check

**GET** `/health`
🔓 Public

Check if API is running.

**Success (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T15:00:00.000Z"
}
```

---

## Common Patterns

### Pagination

All list endpoints support pagination:

```typescript
const response = await fetch('/transactions?page=2&limit=50');
```

Response includes:
```json
{
  "data": [/* items */],
  "total": 125,    // Total items
  "page": 2,       // Current page
  "limit": 50      // Items per page
}
```

### Date Filtering

Use ISO 8601 date format (YYYY-MM-DD):

```typescript
const params = {
  startDate: '2024-01-01',
  endDate: '2024-12-31'
};
```

### Search

Use `search` parameter to search across multiple fields:

```typescript
// Searches in description and transaction number
const response = await fetch('/transactions?search=adobe');
```

### Error Response Format

All errors follow consistent structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "validation",
      "message": "amount must be a positive number"
    }
  ],
  "timestamp": "2024-01-20T15:00:00.000Z",
  "path": "/transactions"
}
```

### React Usage Examples

```typescript
// Using fetch
async function fetchTransactions() {
  const token = getAccessToken();
  const response = await fetch('http://localhost:3000/transactions', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

// Using API client
import { api, useTransactions } from './api-client-example';

function TransactionList() {
  const { data, isLoading } = useTransactions({ page: 1, limit: 20 });

  if (isLoading) return <Spinner />;

  return (
    <div>
      {data.data.map(tx => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}
```

---

**Next Steps:**
- See [Getting Started](./01-getting-started.md) for setup
- See [Authentication Guide](./02-authentication.md) for JWT flow
- See [TypeScript Types](./04-typescript-types.md) for type definitions
- See [Error Handling](./05-error-handling.md) for error scenarios
- Import [Postman Collection](./postman/) for testing
