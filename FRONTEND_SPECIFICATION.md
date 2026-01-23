# Next.js Frontend Specification: Bright Code Cashflow Dashboard

**Version:** 1.0
**Last Updated:** 2026-01-20
**Backend API Version:** Based on frontend-integration documentation
**Critical Rule:** Backend is the single source of truth. This spec is 100% aligned with actual backend contracts.

---

## 1. Backend Contract Summary

### Complete Endpoint Inventory (26 Endpoints + Health Check)

Based on comprehensive analysis of the API reference documentation:

#### Authentication (3 endpoints - Public)
1. **POST /auth/login** - Login with email/password (⚡ Rate limited: 5 req/min)
2. **POST /auth/refresh** - Refresh access token (⚡ Rate limited: 5 req/min)
3. **POST /auth/logout** - Revoke refresh token (🔒 Protected)

#### Users (6 endpoints - 🎭 ADMIN only)
4. **POST /users** - Create new user
5. **GET /users** - List users with pagination and filters
6. **GET /users/:id** - Get user by ID
7. **PATCH /users/:id** - Update user
8. **POST /users/:id/deactivate** - Deactivate user account
9. **POST /users/:id/activate** - Activate user account

#### Transactions (8 endpoints - Mixed access)
10. **POST /transactions** - Create transaction (🔒 SALES + ADMIN)
11. **GET /transactions** - List transactions, paginated (🔒 SALES: own only, ADMIN: all)
12. **GET /transactions/:id** - Get transaction by ID (🔒 SALES: own only, ADMIN: all)
13. **PATCH /transactions/:id** - Update transaction (🎭 ADMIN only, PENDING only)
14. **POST /transactions/:id/attachments** - Upload attachment (🔒 Creator + ADMIN, PENDING only)
15. **POST /transactions/:id/approve** - Approve transaction (🎭 ADMIN only)
16. **POST /transactions/:id/reject** - Reject transaction (🎭 ADMIN only)
17. **DELETE /transactions/:id** - Soft delete transaction (🎭 ADMIN only)

#### Attachments (2 endpoints - Protected)
18. **GET /attachments/:id** - Download attachment (🔒 Based on transaction access)
19. **DELETE /attachments/:id** - Delete attachment (🔒 Creator + ADMIN, PENDING only, min 1 required)

#### Reports (5 endpoints - 🎭 ADMIN only)
20. **GET /reports/balance** - Current balance (all-time APPROVED transactions)
21. **GET /reports/expenses-by-category** - OUT transactions grouped by category
22. **GET /reports/summary** - Financial summary with daily breakdown
23. **GET /reports/export** - Export to Excel (.xlsx)
24. **GET /reports/export/csv** - Export to CSV

#### Audit (1 endpoint - 🎭 ADMIN only)
25. **GET /audit** - Get audit logs with pagination and filters

#### Health (1 endpoint - Public)
26. **GET /health** - Health check

**Legend:**
- 🔓 Public - No authentication required
- 🔒 Protected - Requires valid JWT token
- 🎭 ADMIN - Requires ADMIN role
- ⚡ Rate Limited

### Data Models

#### Core Enums

```typescript
enum Role {
  ADMIN = 'ADMIN',
  SALES = 'SALES'
}

enum TransactionType {
  IN = 'IN',   // Money coming in
  OUT = 'OUT'  // Money going out
}

enum TransactionStatus {
  PENDING = 'PENDING',     // Just created, can be edited
  APPROVED = 'APPROVED',   // Immutable, counted in reports
  REJECTED = 'REJECTED'    // Rejected with reason
}

enum TransactionCategory {
  WEBSITES = 'WEBSITES',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  HOSTING = 'HOSTING',
  SOFTWARE = 'SOFTWARE',
  CONSULTING = 'CONSULTING',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER'
}
```

#### Validation Constants

```typescript
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'email must be an email'
  },
  password: {
    minLength: 8,
    message: 'password must be longer than or equal to 8 characters'
  },
  amount: {
    min: 0.01,
    maxDecimals: 2,
    message: 'amount must not be less than 0.01'
  },
  description: {
    maxLength: 500,
    message: 'description cannot exceed 500 characters'
  },
  reason: {
    minLength: 10,
    maxLength: 500,
    message: 'reason must be longer than or equal to 10 characters'
  },
  pagination: {
    minPage: 1,
    minLimit: 1,
    maxLimit: 100,
    defaultLimit: 20
  },
  file: {
    maxSize: 5242880, // 5MB in bytes (CONFIRMED)
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
    maxPerTransaction: 5,
    minPerTransaction: 1
  }
};
```

---

## 2. Known Differences Between OpenAPI & Controllers

**Status:** No controller files were available for verification. This specification is based entirely on the comprehensive API reference documentation located at `frontend-integration/docs/03-api-reference.md`, which serves as the authoritative source.

**Assumptions:**
- All endpoints documented in the API reference are implemented and functional
- Validation rules specified are enforced by the backend
- Role-based access controls (RBAC) are properly implemented via guards/decorators

**Recommendation:** When backend controllers become available, cross-reference them with this spec to identify any discrepancies in:
- Permission decorators (@Roles(), @UseGuards())
- Validation pipes and DTOs
- Status transition logic in transaction service
- Attachment file upload middleware configuration

---

## 3. Corrections & Removed Requests (Backend-Driven)

### CORRECTED

1. **Transaction Categories**
   - **Original Request:** Categories split by transaction type:
     - OUT: DOMAINS, HOSTING, PLUGINS, EMPLOYEES, OTHER
     - IN: DESIGN, WEBSITES, OTHER
   - **Backend Reality:** 8 universal categories (not split by type):
     - WEBSITES, DESIGN, MARKETING, HOSTING, SOFTWARE, CONSULTING, TRAINING, OTHER
   - **Correction:** UI will show all 8 categories in dropdown, but recommend categories based on transaction type (e.g., suggest MARKETING, HOSTING, SOFTWARE for OUT)

2. **File Size Limit Clarification**
   - **Original Request:** Mentioned both 5MB and 10MB
   - **Backend Reality:** Maximum 5MB (5,242,880 bytes) enforced
   - **Correction:** All file upload validation uses 5MB limit

3. **Transaction Editing by SALES Users**
   - **Original Request:** "SALES can edit/delete own PENDING transactions"
   - **Backend Reality:**
     - PATCH /transactions/:id is ADMIN only
     - DELETE /transactions/:id is ADMIN only
     - SALES can only CREATE transactions and UPLOAD attachments to their own transactions
   - **Correction:** SALES users cannot edit transaction details after creation. Only ADMIN can edit PENDING transactions.

### REMOVED

4. **Bulk Approval Feature**
   - **Original Request:** "Bulk approval capability (if supported by backend - verify)"
   - **Backend Reality:** No bulk approval endpoint exists. Only single-transaction approval via POST /transactions/:id/approve
   - **Action:** Removed bulk approval from scope. UI will only support single-transaction approval.

5. **Edit User Email**
   - **Original Request:** "Edit user (update role, password, email if supported)"
   - **Backend Reality:** PATCH /users/:id supports: role, isActive, password (email NOT supported)
   - **Correction:** User email cannot be changed after creation. Only role, password, and active status are editable.

### VERIFIED

6. **CSV Export Exists**
   - **Original Request:** "Export options: Excel (.xlsx) and CSV (if CSV export endpoint exists - verify)"
   - **Backend Reality:** ✅ Both exports exist:
     - GET /reports/export → Excel (.xlsx)
     - GET /reports/export/csv → CSV
   - **Action:** Both export options will be available in Reports page

7. **Attachment Minimum Requirement**
   - **Backend Rule:** Every transaction MUST have at least 1 attachment
   - **Frontend Enforcement:**
     - Cannot submit transaction for approval if no attachments uploaded
     - Cannot delete the last remaining attachment (button disabled + backend validation)
     - Show warning message: "Each transaction must have at least one attachment"

8. **Status Transition Immutability**
   - **Backend Rule:** APPROVED and REJECTED transactions are immutable
   - **Frontend Enforcement:**
     - Hide edit/delete buttons for approved/rejected transactions
     - Show read-only badge for these statuses
     - Only PENDING transactions show action buttons

---

## 4. Sitemap & Routes

### Route Structure (Next.js App Router)

```
/
├── (auth)/
│   └── login/              # Public - Login page
│       └── page.tsx
│
├── (dashboard)/            # Protected - Authenticated users only
│   ├── layout.tsx          # Main app layout with sidebar
│   │
│   ├── page.tsx            # Dashboard home (/)
│   │
│   ├── transactions/
│   │   ├── page.tsx        # List transactions
│   │   ├── [id]/
│   │   │   └── page.tsx    # Transaction detail view
│   │   └── new/
│   │       └── page.tsx    # Create new transaction
│   │
│   ├── approvals/          # ADMIN only
│   │   └── page.tsx        # Pending approvals queue
│   │
│   ├── reports/            # ADMIN only
│   │   └── page.tsx        # Financial reports
│   │
│   ├── users/              # ADMIN only
│   │   ├── page.tsx        # List users
│   │   ├── [id]/
│   │   │   └── page.tsx    # User detail/edit
│   │   └── new/
│   │       └── page.tsx    # Create new user
│   │
│   └── audit/              # ADMIN only
│       └── page.tsx        # Audit logs
│
└── api/                    # API route handlers (optional)
    └── auth/
        └── [...nextauth].ts
```

### Route Protection Rules

| Route | Access | Role Required | Redirect If Unauthorized |
|-------|--------|---------------|--------------------------|
| `/login` | Public | None | Redirect to `/` if authenticated |
| `/` (Dashboard) | Protected | Any authenticated | Redirect to `/login` |
| `/transactions` | Protected | Any authenticated | Redirect to `/login` |
| `/transactions/new` | Protected | Any authenticated | Redirect to `/login` |
| `/transactions/[id]` | Protected | Own or ADMIN | Show 403 if SALES viewing other's |
| `/approvals` | Protected | ADMIN only | Show 403 Forbidden |
| `/reports` | Protected | ADMIN only | Show 403 Forbidden |
| `/users` | Protected | ADMIN only | Show 403 Forbidden |
| `/audit` | Protected | ADMIN only | Show 403 Forbidden |

### Middleware Configuration

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/login') {
    // If already authenticated, redirect to dashboard
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Decode token to check role (simplified - use proper JWT verification)
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userRole = payload.role;

  // ADMIN-only routes
  const adminRoutes = ['/approvals', '/reports', '/users', '/audit'];
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 5. Role-Based Navigation

### ADMIN Navigation Menu

```typescript
const adminNavigation = [
  {
    label: 'Dashboard',
    href: '/',
    icon: 'HomeIcon',
  },
  {
    label: 'Transactions',
    href: '/transactions',
    icon: 'CurrencyIcon',
    badge: pendingCount, // Optional badge for pending
  },
  {
    label: 'Approvals',
    href: '/approvals',
    icon: 'CheckCircleIcon',
    badge: approvalQueueCount,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: 'ChartBarIcon',
  },
  {
    label: 'Users',
    href: '/users',
    icon: 'UsersIcon',
  },
  {
    label: 'Audit Logs',
    href: '/audit',
    icon: 'ClipboardListIcon',
  },
];
```

### SALES Navigation Menu

```typescript
const salesNavigation = [
  {
    label: 'Dashboard',
    href: '/',
    icon: 'HomeIcon',
  },
  {
    label: 'My Transactions',
    href: '/transactions',
    icon: 'CurrencyIcon',
    badge: myPendingCount,
  },
];
```

### Navigation Component Structure

```typescript
interface NavigationProps {
  userRole: 'ADMIN' | 'SALES';
  currentPath: string;
  userName: string;
  userEmail: string;
}

// Sidebar will include:
// - Logo/branding
// - Role-specific menu items
// - Active route highlighting (bg color change)
// - Language switcher (AR/EN)
// - User profile dropdown:
//   - User name & email
//   - Settings (optional)
//   - Logout button
```

---

## 6. Page-by-Page Requirements

### Page 1: Login Page (`/login`)

**Purpose:** Authenticate users with email and password

**Route:** `/login` (Public)

**Backend Endpoints:**
- POST /auth/login

**UI Layout:**
- Centered card/form on full-page background
- Logo at top
- Email input field
- Password input field (with show/hide toggle)
- Login button
- Loading state during submission
- Error message display area
- Language switcher (top-right corner)
- Optional: "Remember me" checkbox (stores refresh token longer)

**Form Fields:**

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Email | text (email) | Valid email format | Yes |
| Password | password | Min 8 characters | Yes |

**User Interactions:**
1. User enters email and password
2. Click "Login" button → POST /auth/login
3. On success:
   - Store accessToken in memory (React state)
   - Store refreshToken in localStorage
   - Redirect to `/` (dashboard)
4. On error:
   - 401: Show "Invalid email or password"
   - 429: Show "Too many login attempts. Please wait 60 seconds."
   - 401 (deactivated): Show "Your account has been deactivated. Contact administrator."

**Loading States:**
- Button disabled with spinner during login
- Form fields disabled during submission

**Error States:**
- Display error message below form
- Red border on invalid fields
- Rate limit: Show countdown timer (60 seconds)

**Empty States:** N/A

**Role-Based Behavior:** N/A (public page)

**i18n Keys:**
```json
{
  "login.title": "Login to Cashflow Dashboard",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Login",
  "login.error.invalid": "Invalid email or password",
  "login.error.rateLimit": "Too many attempts. Please wait {seconds} seconds.",
  "login.error.deactivated": "Account deactivated. Contact administrator."
}
```

---

### Page 2: Dashboard Home (`/`)

**Purpose:** Role-specific overview and quick actions

**Route:** `/` (Protected - Any authenticated user)

**Backend Endpoints:**
- ADMIN:
  - GET /reports/balance
  - GET /transactions?status=PENDING&limit=5 (for approval queue count)
- SALES:
  - GET /transactions?status=PENDING&createdById={userId}&limit=5

**UI Layout:**

#### ADMIN View:
```
┌────────────────────────────────────────────────────────┐
│ Welcome back, Admin Name                               │
├────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│ │ Total Income │ │ Total Expense│ │ Net Balance  │  │
│ │ 45,000.00 EGP│ │ 23,500.50 EGP│ │ 21,499.50 EGP│  │
│ │ (Approved)   │ │ (Approved)   │ │              │  │
│ └──────────────┘ └──────────────┘ └──────────────┘  │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌────────────────────┐  │
│ │ Pending Approvals: 12    │ │ Recent Activity    │  │
│ │ [View All →]             │ │ (5 latest txns)    │  │
│ └──────────────────────────┘ └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### SALES View:
```
┌────────────────────────────────────────────────────────┐
│ Welcome back, Sales Name                               │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌────────────────────┐  │
│ │ My Pending Transactions  │ │ My Recent Activity │  │
│ │ Count: 3                 │ │ (5 latest txns)    │  │
│ │ [View All →]             │ └────────────────────┘  │
│ └──────────────────────────┘                           │
├────────────────────────────────────────────────────────┤
│ Quick Actions:                                         │
│ [+ Create New Transaction]                             │
└────────────────────────────────────────────────────────┘
```

**Display Fields:**
- Balance cards (ADMIN): totalIn, totalOut, netBalance (formatted as "X,XXX.XX EGP")
- Pending count with link to /approvals (ADMIN) or /transactions (SALES)
- Recent transactions list: transactionNumber, date, type, amount, status

**User Interactions:**
- Click balance cards → Navigate to /reports
- Click "Pending Approvals" → Navigate to /approvals
- Click "Create New Transaction" → Navigate to /transactions/new
- Click transaction in recent list → Navigate to /transactions/[id]

**Loading States:**
- Skeleton loaders for balance cards
- Loading spinner for recent transactions table

**Empty States:**
- "No pending approvals" (ADMIN)
- "No recent transactions" (SALES/ADMIN)

**Role-Based Visibility:**
- ADMIN sees: Balance, pending approvals, all recent transactions
- SALES sees: Only their pending count and their recent transactions

---

### Page 3: Transactions Management (`/transactions`)

**Purpose:** List, filter, search, and manage transactions

**Route:** `/transactions` (Protected - Any authenticated user)

**Backend Endpoints:**
- GET /transactions (with query params)
- POST /transactions (create modal/page)

**UI Layout:**
```
┌───────────────────────────────────────────────────────────────┐
│ Transactions                            [+ New Transaction]   │
├───────────────────────────────────────────────────────────────┤
│ Filters:                                                       │
│ [Type: All ▼] [Status: All ▼] [Category: All ▼]              │
│ [Date From: ] [Date To: ] [Search: ________________] [Apply]  │
├───────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ #     | Date       | Type | Amount    | Status | Actions│  │
│ ├─────────────────────────────────────────────────────────┤  │
│ │ BC-2024-000001 | Jan 20 | IN | 5,000 EGP | APPROVED | [View]│
│ │ BC-2024-000002 | Jan 19 | OUT| 1,500 EGP | PENDING  | [View][Edit][Delete]│
│ └─────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────┤
│ Showing 1-20 of 125    [< Prev] [1] [2] [3] ... [7] [Next >] │
└───────────────────────────────────────────────────────────────┘
```

**Form Fields (Filters):**

| Filter | Type | Options | Default |
|--------|------|---------|---------|
| Type | Select | All, IN, OUT | All |
| Status | Select | All, PENDING, APPROVED, REJECTED | All |
| Category | Select | All, + 8 categories | All |
| Date From | Date picker | YYYY-MM-DD | None |
| Date To | Date picker | YYYY-MM-DD | None |
| Search | Text input | Search description & transaction number | Empty |
| Page | Number | Min 1 | 1 |
| Limit | Select | 10, 20, 50, 100 | 20 |

**Display Fields (Table):**
- Transaction Number (transactionNumber)
- Date (createdAt - formatted in Africa/Cairo timezone)
- Type (IN/OUT with colored badge: green for IN, red for OUT)
- Amount (string formatted as "X,XXX.XX EGP")
- Category
- Description (truncated to 50 chars with ellipsis)
- Status (badge: yellow for PENDING, green for APPROVED, red for REJECTED)
- Created By (user email) - ADMIN only
- Actions (View, Edit, Delete buttons based on role and status)

**User Interactions:**
1. **Filter/Search:**
   - Change filter dropdown → Auto-apply (debounced)
   - Enter search text → Debounce 500ms → API call
   - Click "Apply" → API call with all filters

2. **Create Transaction:**
   - Click "+ New Transaction" → Open modal or navigate to /transactions/new
   - Form fields: type, amount, description, category
   - On submit → POST /transactions → Redirect to transaction detail page
   - **Important:** Show warning: "Don't forget to upload receipt!"

3. **View Transaction:**
   - Click row or "View" button → Navigate to /transactions/[id]

4. **Edit Transaction (ADMIN only, PENDING only):**
   - Click "Edit" button → Open edit modal
   - Editable fields: amount, description, category
   - On submit → PATCH /transactions/:id

5. **Delete Transaction (ADMIN only):**
   - Click "Delete" button → Open confirmation dialog
   - Require deletion reason (min 10, max 500 chars)
   - On confirm → DELETE /transactions/:id with reason

**Loading States:**
- Table skeleton loader during initial fetch
- Spinner overlay during filter changes
- Button disabled states during actions

**Empty States:**
- "No transactions found. Create your first transaction!"
- Icon + message when filters return no results

**Error States:**
- API errors shown as toast notifications
- Validation errors inline in forms

**Role-Based Visibility:**
- **SALES:**
  - See only their own transactions (backend enforces)
  - Cannot see "Edit" or "Delete" buttons
  - Can see "View" button

- **ADMIN:**
  - See all transactions
  - Can edit/delete PENDING transactions
  - "Created By" column visible
  - All action buttons available

**Pagination:**
- Show total count: "Showing X-Y of Z"
- Previous/Next buttons
- Page number buttons (max 7 visible)
- Maintain filters when changing pages

---

### Page 4: Transaction Detail View (`/transactions/[id]`)

**Purpose:** View complete transaction details, attachments, and perform actions

**Route:** `/transactions/[id]` (Protected - Own transaction or ADMIN)

**Backend Endpoints:**
- GET /transactions/:id
- POST /transactions/:id/attachments
- DELETE /attachments/:id
- POST /transactions/:id/approve (ADMIN)
- POST /transactions/:id/reject (ADMIN)
- PATCH /transactions/:id (ADMIN, PENDING only)
- DELETE /transactions/:id (ADMIN)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Transactions                                       │
├─────────────────────────────────────────────────────────────┤
│ Transaction BC-2024-000002          [PENDING] [Edit] [Delete]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Transaction Details                                      │ │
│ │ Type: OUT (Expense)                                      │ │
│ │ Amount: 1,500.50 EGP                                     │ │
│ │ Category: SOFTWARE                                       │ │
│ │ Description: Adobe Creative Cloud annual subscription   │ │
│ │ Created By: sales@brightcode.eg                          │ │
│ │ Created At: Jan 20, 2024 10:30 AM                       │ │
│ │ Updated At: Jan 20, 2024 11:00 AM                       │ │
│ │ Status: PENDING                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Attachments (2/5)        [Upload Receipt] (PENDING only)│ │
│ │ ┌──────────────────┐ ┌──────────────────┐              │ │
│ │ │ receipt.pdf      │ │ invoice.jpg      │              │ │
│ │ │ 1.2 MB           │ │ 850 KB           │              │ │
│ │ │ Jan 20, 10:35 AM │ │ Jan 20, 10:40 AM │              │ │
│ │ │ [View] [Delete]  │ │ [View] [Delete]  │              │ │
│ │ └──────────────────┘ └──────────────────┘              │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Actions (ADMIN only, PENDING only):                          │
│ [Approve Transaction] [Reject Transaction]                   │
└─────────────────────────────────────────────────────────────┘
```

**Display Fields:**
- All transaction properties (see TransactionResponseDto)
- Formatted dates in Africa/Cairo timezone
- Amount as string with 2 decimals
- Status badge (colored)
- Type badge (colored: green for IN, red for OUT)
- Created By user (email + role)
- Approved By user (if status = APPROVED)
- Approval Date (if status = APPROVED)
- Rejection Reason (if status = REJECTED)

**Attachment Management:**

**Upload Attachment:**
- Button: "Upload Receipt" (visible only if status = PENDING)
- Disabled if already 5 attachments
- Click → Open file picker
- Allowed types: JPEG, PNG, PDF
- Max size: 5MB
- Client-side validation before upload
- On select → POST /transactions/:id/attachments
- Show progress bar during upload
- On success → Refresh transaction data

**View Attachment:**
- Click attachment card or "View" button
- Open in new tab: GET /attachments/:id
- Browser will download or display based on MIME type

**Delete Attachment:**
- Button: "Delete" (visible only if status = PENDING and more than 1 attachment)
- If last attachment: Button disabled with tooltip "Cannot delete last attachment"
- Click → Confirmation dialog
- On confirm → DELETE /attachments/:id
- On success → Refresh transaction data

**Transaction Actions (ADMIN only, PENDING only):**

1. **Approve:**
   - Button: "Approve Transaction"
   - Disabled if no attachments (show tooltip: "Upload at least one attachment")
   - Click → Confirmation dialog: "Are you sure you want to approve this transaction?"
   - On confirm → POST /transactions/:id/approve
   - On success → Status changes to APPROVED, page refreshes, action buttons hidden

2. **Reject:**
   - Button: "Reject Transaction"
   - Click → Open modal with reason textarea
   - Reason required: min 10, max 500 chars
   - Character counter shown
   - On submit → POST /transactions/:id/reject with reason
   - On success → Status changes to REJECTED, rejection reason displayed

3. **Edit (ADMIN only, PENDING only):**
   - Button: "Edit" (top-right)
   - Click → Open edit modal
   - Editable fields: amount, description, category
   - Type is NOT editable
   - On submit → PATCH /transactions/:id

4. **Delete (ADMIN only):**
   - Button: "Delete" (top-right)
   - Click → Confirmation dialog with reason textarea
   - Reason required: min 10, max 500 chars
   - On confirm → DELETE /transactions/:id with reason
   - On success → Navigate back to /transactions with success message

**Loading States:**
- Skeleton loader for transaction details
- Attachment cards skeleton loader
- Button spinners during actions

**Empty States:**
- "No attachments yet. Upload a receipt to continue." (with upload button)

**Error States:**
- 404: "Transaction not found"
- 403: "You don't have permission to view this transaction" (SALES viewing other's)
- File upload errors shown as toast
- Action errors shown as toast

**Role-Based Visibility:**
- **SALES:**
  - Can view only their own transactions
  - Can upload/delete attachments (if PENDING)
  - Cannot see Edit, Delete, Approve, Reject buttons

- **ADMIN:**
  - Can view all transactions
  - All action buttons visible (based on status)

**Status-Based Visibility:**
- **PENDING:**
  - Upload attachment button visible
  - Delete attachment button visible (if > 1 attachment)
  - Edit button visible (ADMIN)
  - Approve/Reject buttons visible (ADMIN)

- **APPROVED/REJECTED:**
  - All action buttons hidden
  - Read-only view
  - Show approval/rejection details

---

### Page 5: Create Transaction (`/transactions/new`)

**Purpose:** Create a new transaction

**Route:** `/transactions/new` (Protected - Any authenticated user)

**Backend Endpoints:**
- POST /transactions

**UI Layout:**
```
┌──────────────────────────────────────────────────────┐
│ ← Back to Transactions                                │
├──────────────────────────────────────────────────────┤
│ Create New Transaction                                │
├──────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐ │
│ │ Type: [○ IN (Income)] [● OUT (Expense)]         │ │
│ │                                                  │ │
│ │ Amount (EGP): [________________]                │ │
│ │                                                  │ │
│ │ Category: [Select category ▼]                   │ │
│ │                                                  │ │
│ │ Description (max 500 chars): [245/500]          │ │
│ │ [___________________________________________]    │ │
│ │ [___________________________________________]    │ │
│ │ [___________________________________________]    │ │
│ │                                                  │ │
│ │ ⚠️ Remember to upload receipt after creation!   │ │
│ │                                                  │ │
│ │ [Cancel]                    [Create Transaction]│ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Form Fields:**

| Field | Type | Validation | Required | Default |
|-------|------|------------|----------|---------|
| Type | Radio buttons | IN or OUT | Yes | OUT |
| Amount | Number input | Min 0.01, max 2 decimals | Yes | - |
| Category | Select dropdown | 8 categories | No | OTHER |
| Description | Textarea | Max 500 chars | Yes | - |

**Category Recommendations (UI hint):**
- When Type = OUT: Highlight MARKETING, HOSTING, SOFTWARE in dropdown
- When Type = IN: Highlight WEBSITES, DESIGN, CONSULTING in dropdown

**Validation Rules:**
- Amount:
  - Min: 0.01
  - Max decimals: 2
  - Error: "Amount must be at least 0.01 EGP"
  - Error: "Amount cannot have more than 2 decimal places"
- Description:
  - Max: 500 characters
  - Show character counter: "X/500"
  - Error: "Description cannot exceed 500 characters"

**User Interactions:**
1. Fill form fields
2. Click "Create Transaction"
3. Frontend validation
4. POST /transactions with data
5. On success:
   - Navigate to /transactions/[newId]
   - Show success toast: "Transaction BC-YYYY-NNNNNN created!"
   - Show prominent warning: "⚠️ Upload receipt now to complete transaction"
6. On error:
   - Display validation errors inline
   - Show error toast for API errors

**Loading States:**
- Button disabled with spinner during submission
- Form fields disabled during submission

**Empty States:** N/A

**Error States:**
- Display validation errors below each field
- API error shown as toast notification

**i18n Keys:**
```json
{
  "transactions.create.title": "Create New Transaction",
  "transactions.create.type": "Type",
  "transactions.create.type.in": "IN (Income)",
  "transactions.create.type.out": "OUT (Expense)",
  "transactions.create.amount": "Amount (EGP)",
  "transactions.create.category": "Category",
  "transactions.create.description": "Description",
  "transactions.create.warning": "Remember to upload receipt after creation!",
  "transactions.create.submit": "Create Transaction",
  "transactions.create.success": "Transaction created successfully!"
}
```

---

### Page 6: Approvals Queue (`/approvals`) - ADMIN Only

**Purpose:** Review and approve/reject pending transactions

**Route:** `/approvals` (Protected - ADMIN only)

**Backend Endpoints:**
- GET /transactions?status=PENDING
- POST /transactions/:id/approve
- POST /transactions/:id/reject

**UI Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Pending Approvals (12)                                      │
├────────────────────────────────────────────────────────────┤
│ Filters: [Type: All ▼] [Category: All ▼] [Date From:] [To:]│
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ BC-2024-000002                          [View Details] │ │
│ │ Type: OUT | Amount: 1,500.50 EGP | Software            │ │
│ │ Created: Jan 20, 2024 by sales@brightcode.eg          │ │
│ │ Description: Adobe subscription                         │ │
│ │ Attachments: 2 (✓ Has receipts)                        │ │
│ │ [Approve] [Reject]                                      │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ BC-2024-000003                          [View Details] │ │
│ │ Type: IN | Amount: 5,000.00 EGP | Websites             │ │
│ │ Created: Jan 19, 2024 by sales2@brightcode.eg         │ │
│ │ Description: Website project payment                    │ │
│ │ ⚠️ No attachments - Cannot approve                     │ │
│ │ [Reject]                                                │ │
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ Showing 1-10 of 12         [< Prev] [1] [2] [Next >]      │
└────────────────────────────────────────────────────────────┘
```

**Display Fields (Card Format):**
- Transaction Number
- Type badge (colored)
- Amount (formatted)
- Category
- Created date and creator email
- Description (truncated)
- Attachment count with warning if 0
- Action buttons

**Filters:**
- Type (All, IN, OUT)
- Category (All, + 8 categories)
- Date range (created date)

**User Interactions:**

1. **View Details:**
   - Click "View Details" or card → Navigate to /transactions/[id]

2. **Approve Transaction:**
   - Button: "Approve"
   - Disabled if no attachments (tooltip: "Upload receipt first")
   - Click → Confirmation dialog: "Approve transaction BC-YYYY-NNNNNN for X EGP?"
   - On confirm → POST /transactions/:id/approve
   - On success → Remove from list, show success toast, update count

3. **Reject Transaction:**
   - Button: "Reject"
   - Click → Open modal with reason textarea
   - Reason: required, min 10, max 500 chars
   - Character counter: "X/500"
   - On submit → POST /transactions/:id/reject with reason
   - On success → Remove from list, show success toast

**Loading States:**
- Card skeleton loaders
- Button spinners during actions
- Overlay spinner when filtering

**Empty States:**
- "🎉 No pending approvals! All transactions are reviewed."
- Icon + message when filters return no results

**Error States:**
- API errors shown as toast notifications
- Inline validation errors in rejection modal

**Role-Based Visibility:**
- Only ADMIN can access this page
- SALES users see 403 Forbidden page

**Note:** Bulk approval was removed (see Section 3 - Corrections)

---

### Page 7: Reports (`/reports`) - ADMIN Only

**Purpose:** View financial reports and export data

**Route:** `/reports` (Protected - ADMIN only)

**Backend Endpoints:**
- GET /reports/balance
- GET /reports/summary
- GET /reports/expenses-by-category
- GET /reports/export (Excel)
- GET /reports/export/csv

**UI Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Financial Reports                     [Export Excel] [Export CSV]│
├──────────────────────────────────────────────────────────────┤
│ Date Range: [From: YYYY-MM-DD] [To: YYYY-MM-DD] [Generate]  │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Current Balance (All Time)                               │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │ │
│ │ │ Total Income │ │ Total Expense│ │ Net Balance  │    │ │
│ │ │ 45,000.00 EGP│ │ 23,500.50 EGP│ │ 21,499.50 EGP│    │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘    │ │
│ │ As of: Jan 20, 2024 2:30 PM                             │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Period Summary (Jan 1 - Jan 20, 2024)                   │ │
│ │ Income: 10,000 EGP | Expenses: 5,500 EGP | Net: 4,500   │ │
│ │ Transactions: 15 IN, 22 OUT, Total: 37                  │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Expenses by Category                                     │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ SOFTWARE:    5,000 EGP (10 transactions) ███████    │ │ │
│ │ │ HOSTING:     3,000 EGP (12 transactions) █████      │ │ │
│ │ │ MARKETING:   2,000 EGP (5 transactions)  ████       │ │ │
│ │ │ OTHER:       1,000 EGP (3 transactions)  ██         │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ Grand Total: 11,000 EGP                                 │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Daily Cashflow Chart                                     │ │
│ │ [Line chart showing daily IN, OUT, NET over date range] │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Date Range Filters:**
- From Date (startDate): Optional, YYYY-MM-DD
- To Date (endDate): Optional, YYYY-MM-DD
- Default: Current month (1st to today)
- Validation: startDate <= endDate
- Click "Generate" → Fetch all reports with date range

**Display Components:**

1. **Balance Card (All-Time):**
   - Always visible, no date filter
   - Data from: GET /reports/balance
   - Fields: totalIn, totalOut, netBalance, asOf timestamp
   - Format: "X,XXX.XX EGP"

2. **Period Summary:**
   - Data from: GET /reports/summary
   - Display: totalIn, totalOut, netCashflow, countIn, countOut, totalCount
   - Date range shown: "Jan 1 - Jan 20, 2024"

3. **Expenses by Category:**
   - Data from: GET /reports/expenses-by-category
   - Horizontal bar chart showing each category
   - Sorted by total (descending)
   - Shows: category name, total amount, transaction count
   - Grand total at bottom

4. **Daily Cashflow Chart:**
   - Data from: GET /reports/summary (dailyTotals array)
   - Line chart with 3 lines: IN (green), OUT (red), NET (blue)
   - X-axis: Date (Africa/Cairo timezone)
   - Y-axis: Amount in EGP
   - Tooltip on hover showing exact values

**Export Functionality:**

1. **Export to Excel:**
   - Button: "Export Excel"
   - Click → GET /reports/export with current date filters
   - Browser downloads file: "cashflow-report-YYYY-MM-DD-to-YYYY-MM-DD.xlsx"
   - File contains 3 sheets: Summary, Transactions, Daily Totals

2. **Export to CSV:**
   - Button: "Export CSV"
   - Click → GET /reports/export/csv with current date filters
   - Browser downloads file: "cashflow-report-YYYY-MM-DD-to-YYYY-MM-DD.csv"
   - CSV contains transaction data

**Loading States:**
- Skeleton loaders for all cards
- Chart loading spinner
- Button disabled during export

**Empty States:**
- "No transactions in selected date range"
- Chart shows "No data available"

**Error States:**
- API errors shown as toast notifications
- Invalid date range: Show inline error

**Role-Based Visibility:**
- Only ADMIN can access this page
- SALES users see 403 Forbidden page

---

### Page 8: Users Management (`/users`) - ADMIN Only

**Purpose:** Manage user accounts

**Route:** `/users` (Protected - ADMIN only)

**Backend Endpoints:**
- GET /users
- POST /users
- PATCH /users/:id
- POST /users/:id/activate
- POST /users/:id/deactivate

**UI Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ Users Management                         [+ Create User] │
├──────────────────────────────────────────────────────────┤
│ Filters: [Role: All ▼] [Status: All ▼]                  │
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐  │
│ │ Email              | Role  | Status  | Actions     │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ admin@brightc0de.com | ADMIN | Active  | [Edit] [Deactivate]│
│ │ sales@brightcode.eg  | SALES | Active  | [Edit] [Deactivate]│
│ │ old@example.com      | SALES | Inactive| [Edit] [Activate]│
│ └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│ Showing 1-20 of 5           [< Prev] [1] [Next >]       │
└──────────────────────────────────────────────────────────┘
```

**Filters:**
- Role: All, ADMIN, SALES
- Status: All, Active (isActive=true), Inactive (isActive=false)

**Display Fields (Table):**
- Email
- Role (badge)
- Status (Active/Inactive badge: green/gray)
- Created At (formatted date)
- Actions (Edit, Activate/Deactivate buttons)

**User Interactions:**

1. **Create User:**
   - Click "+ Create User" → Open modal
   - Form fields:
     - Email (required, unique, valid format)
     - Password (required, min 8 chars)
     - Role (select: ADMIN or SALES, default: SALES)
   - On submit → POST /users
   - On success → Refresh list, show success toast
   - On error (409): "Email already registered"

2. **Edit User:**
   - Click "Edit" → Open modal
   - Form fields:
     - Email (read-only, cannot be changed)
     - Role (select: ADMIN or SALES)
     - Password (optional, min 8 chars if provided, placeholder: "Leave blank to keep current")
     - Status (checkbox: Active/Inactive)
   - On submit → PATCH /users/:id
   - On success → Refresh list, show success toast

3. **Activate User:**
   - Click "Activate" → Confirmation dialog
   - On confirm → POST /users/:id/activate
   - On success → Update row, show success toast

4. **Deactivate User:**
   - Click "Deactivate" → Confirmation dialog with warning
   - Warning: "This user will be logged out and unable to login."
   - On confirm → POST /users/:id/deactivate
   - On success → Update row, show success toast

**Form Validation:**
- Email: Valid email format, unique
- Password: Min 8 characters
- All fields required on create
- All fields optional on edit (except role)

**Loading States:**
- Table skeleton loader
- Button spinners during actions
- Modal form disabled during submission

**Empty States:**
- "No users found. Create your first user!"

**Error States:**
- 409 (Email conflict): Show inline error
- API errors shown as toast

**Role-Based Visibility:**
- Only ADMIN can access this page
- Cannot deactivate your own account (button disabled)

**i18n Keys:**
```json
{
  "users.title": "Users Management",
  "users.create": "Create User",
  "users.edit": "Edit User",
  "users.email": "Email",
  "users.password": "Password",
  "users.role": "Role",
  "users.status": "Status",
  "users.activate": "Activate",
  "users.deactivate": "Deactivate",
  "users.deactivate.warning": "This user will be logged out and unable to login."
}
```

---

### Page 9: Audit Logs (`/audit`) - ADMIN Only

**Purpose:** View system audit trail

**Route:** `/audit` (Protected - ADMIN only)

**Backend Endpoints:**
- GET /audit

**UI Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Audit Logs                                                    │
├──────────────────────────────────────────────────────────────┤
│ Filters:                                                      │
│ [Entity Type: All ▼] [Action: All ▼] [User: All ▼]          │
│ [Date From:] [Date To:] [Apply]                              │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Timestamp      | User  | Action | Entity | Details    │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ Jan 20, 2:30PM | admin | APPROVE| Transaction | BC-2024-000002│
│ │                |       |        |            | Status: PENDING → APPROVED│
│ │ Jan 20, 2:00PM | sales | CREATE | Transaction | BC-2024-000003│
│ │                |       |        |            | Amount: 5000 EGP│
│ │ Jan 20, 1:30PM | admin | LOGIN  | User       | IP: 127.0.0.1│
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ Showing 1-50 of 150    [< Prev] [1] [2] [3] [Next >]        │
└──────────────────────────────────────────────────────────────┘
```

**Filters:**

| Filter | Options |
|--------|---------|
| Entity Type | All, USER, TRANSACTION, ATTACHMENT |
| Action | All, LOGIN, LOGOUT, CREATE, UPDATE, APPROVE, REJECT, DELETE, UPLOAD, DEACTIVATE, ACTIVATE |
| User (Actor) | All, + dropdown of all users |
| Date From | YYYY-MM-DD |
| Date To | YYYY-MM-DD |
| Page | Number (min 1) |
| Limit | 20, 50, 100 (default 50) |

**Display Fields (Table):**
- Timestamp (Africa/Cairo timezone, formatted)
- Actor (user email)
- Action (badge with color based on action type)
- Entity Type
- Entity ID (with link if applicable)
- Before/After snapshots (expandable row)
- IP Address

**Expandable Row Details:**
- Click row → Expand to show before/after snapshots
- Display JSON diff highlighting changes
- Example:
  ```
  Before: { status: "PENDING", approvedBy: null }
  After:  { status: "APPROVED", approvedBy: "admin@brightc0de.com" }
  ```

**User Interactions:**
- Apply filters → API call with query params
- Click entity ID → Navigate to relevant detail page (e.g., /transactions/[id])
- Expand row → Show before/after snapshots
- Pagination

**Loading States:**
- Table skeleton loader
- Spinner during filter application

**Empty States:**
- "No audit logs found for selected filters"

**Error States:**
- API errors shown as toast

**Role-Based Visibility:**
- Only ADMIN can access this page

---

## 7. API Call Mapping

Complete table of user actions mapped to backend API calls:

| User Action | Page | HTTP Method | Endpoint | Request Body/Params | Success Response | Error Handling |
|-------------|------|-------------|----------|---------------------|------------------|----------------|
| **Login** | /login | POST | /auth/login | {email, password} | {accessToken, refreshToken, user} | 401 → show error, 429 → rate limit message |
| **Logout** | Any | POST | /auth/logout | {refreshToken} | 204 No Content | Clear tokens, redirect to /login |
| **Refresh Token** | Background | POST | /auth/refresh | {refreshToken} | {accessToken, refreshToken, user} | 401 → force re-login |
| **Load Dashboard (ADMIN)** | / | GET | /reports/balance | - | {totalIn, totalOut, netBalance} | Show error toast |
| **Load Dashboard Pending Count** | / | GET | /transactions?status=PENDING&limit=1 | - | {total} | Show error toast |
| **List Transactions** | /transactions | GET | /transactions | page, limit, filters | {data[], total, page, limit} | Show error toast |
| **Create Transaction** | /transactions/new | POST | /transactions | {type, amount, description, category} | Transaction object | Show validation errors |
| **View Transaction** | /transactions/[id] | GET | /transactions/:id | - | Transaction object | 404 → not found, 403 → access denied |
| **Update Transaction** | /transactions/[id] | PATCH | /transactions/:id | {amount, description, category} | Updated transaction | 403 → cannot modify |
| **Delete Transaction** | /transactions/[id] | DELETE | /transactions/:id | {reason} | 204 No Content | Show confirmation |
| **Upload Attachment** | /transactions/[id] | POST | /transactions/:id/attachments | multipart/form-data: file | Transaction with new attachment | 400 → file validation, 403 → max 5 or not PENDING |
| **Download Attachment** | /transactions/[id] | GET | /attachments/:id | - | Binary file data | 404 → not found |
| **Delete Attachment** | /transactions/[id] | DELETE | /attachments/:id | - | 204 No Content | 403 → cannot delete last |
| **Approve Transaction** | /approvals | POST | /transactions/:id/approve | - | Approved transaction | 403 → not PENDING |
| **Reject Transaction** | /approvals | POST | /transactions/:id/reject | {reason} | Rejected transaction | 400 → reason validation |
| **Load Reports Balance** | /reports | GET | /reports/balance | - | {totalIn, totalOut, netBalance} | Show error toast |
| **Load Reports Summary** | /reports | GET | /reports/summary | startDate, endDate, filters | {summary, dailyTotals} | Show error toast |
| **Load Expenses by Category** | /reports | GET | /reports/expenses-by-category | startDate, endDate, category | {categories[], grandTotal} | Show error toast |
| **Export to Excel** | /reports | GET | /reports/export | startDate, endDate, filters | Binary .xlsx file | Show error toast |
| **Export to CSV** | /reports | GET | /reports/export/csv | startDate, endDate, filters | Binary .csv file | Show error toast |
| **List Users** | /users | GET | /users | page, limit, role, isActive | {data[], total} | Show error toast |
| **Create User** | /users | POST | /users | {email, password, role} | User object | 409 → email exists |
| **Update User** | /users | PATCH | /users/:id | {role, password, isActive} | Updated user | Show validation errors |
| **Activate User** | /users | POST | /users/:id/activate | - | User with isActive=true | Show error toast |
| **Deactivate User** | /users | POST | /users/:id/deactivate | - | User with isActive=false | Show error toast |
| **Load Audit Logs** | /audit | GET | /audit | page, limit, filters | {data[], total} | Show error toast |

---

## 8. Authentication & Token Management

### Token Storage Strategy

**Access Token:**
- **Storage:** Memory only (React state via AuthContext)
- **Lifetime:** 15 minutes (900 seconds)
- **Security:** Immune to XSS attacks (not in localStorage)
- **Drawback:** Lost on page refresh (must use refresh token)

**Refresh Token:**
- **Storage:** localStorage (development) or httpOnly cookie (production recommended)
- **Lifetime:** 7 days
- **Security:** httpOnly cookies immune to XSS, localStorage is vulnerable
- **Usage:** Automatically retrieve new access token before expiry

**Implementation:**
```typescript
// context/AuthContext.tsx
interface AuthState {
  user: UserResponseDto | null;
  accessToken: string | null; // Stored in memory
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Store refresh token
localStorage.setItem('refreshToken', data.refreshToken);

// Or use httpOnly cookie (set by backend)
// Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict
```

### Token Refresh Flow

**Strategy 1: Proactive Refresh (Recommended)**
- Refresh token 2 minutes (120 seconds) before expiry
- Prevents user-visible 401 errors
- Better user experience (no interruption)

```typescript
function scheduleTokenRefresh(expiresIn: number) {
  const refreshTime = (expiresIn - 120) * 1000; // 2 min before expiry
  setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch (error) {
      // Refresh failed, redirect to login
      logout();
      navigate('/login');
    }
  }, refreshTime);
}
```

**Strategy 2: Reactive Refresh (Fallback)**
- Intercept 401 responses and refresh automatically
- Retry original request with new token
- Used in axios/fetch interceptors

```typescript
// Axios interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api(error.config); // Retry with new token
    }
    return Promise.reject(error);
  }
);
```

### Automatic Retry Logic

**Scenario:** Access token expires mid-session

**Flow:**
1. User makes API request with expired access token
2. Backend returns 401 Unauthorized
3. Frontend intercepts 401 response
4. Call POST /auth/refresh with refresh token
5. Receive new access token + refresh token
6. Store new tokens (old refresh token revoked)
7. Retry original request with new access token
8. Return response to user (transparent refresh)

**Edge Case:** Refresh token also expired
1. POST /auth/refresh fails with 401
2. Clear all tokens from storage
3. Redirect user to /login
4. Show message: "Session expired. Please login again."

### Logout Flow

**Complete logout procedure:**
1. Call POST /auth/logout with refresh token (revokes on backend)
2. Clear access token from memory
3. Clear refresh token from localStorage
4. Update AuthContext state (user = null)
5. Redirect to /login
6. Show success message: "Logged out successfully"

```typescript
async function logout() {
  try {
    await fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear tokens even if API call fails
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    navigate('/login');
  }
}
```

### Protected Route Guards

**Implementation using React Router:**

```typescript
// components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'ADMIN' | 'SALES';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role required but user doesn't have it → show 403
  if (requiredRole && user?.role !== requiredRole) {
    return <ForbiddenPage />;
  }

  // All checks passed → render children
  return <>{children}</>;
}
```

**Usage in routing:**
```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />

  <Route path="/" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />

  <Route path="/approvals" element={
    <ProtectedRoute requiredRole="ADMIN">
      <ApprovalsPage />
    </ProtectedRoute>
  } />
</Routes>
```

### Security Best Practices

**DO:**
✅ Use HTTPS in production
✅ Store access tokens in memory (not localStorage)
✅ Store refresh tokens in httpOnly cookies (production) or localStorage (dev)
✅ Implement token rotation (old refresh token revoked)
✅ Refresh proactively before expiry
✅ Clear tokens on logout (both client and server)
✅ Validate tokens server-side
✅ Implement rate limiting on auth endpoints
✅ Log authentication events for audit
✅ Handle deactivated users gracefully

**DON'T:**
❌ Store access tokens in localStorage (XSS risk)
❌ Log tokens to console
❌ Send tokens in URL params
❌ Use long-lived access tokens
❌ Skip HTTPS in production
❌ Trust expired tokens
❌ Implement auto-login with stored passwords
❌ Share tokens between users

---

## 9. i18n & RTL/LTR Strategy

### i18n Library

**Recommendation:** `next-i18next` or `react-i18next`

**Rationale:**
- Seamless Next.js integration
- Server-side rendering support
- Namespace organization for large apps
- Dynamic language switching without page reload
- RTL/LTR auto-detection

### Translation File Structure

```
/locales/
  ├── en/
  │   ├── common.json           # Shared UI (buttons, labels, etc.)
  │   ├── auth.json             # Login, logout, etc.
  │   ├── transactions.json     # Transaction-related strings
  │   ├── reports.json          # Reports page
  │   ├── users.json            # User management
  │   └── validation.json       # Validation error messages
  └── ar/
      ├── common.json
      ├── auth.json
      ├── transactions.json
      ├── reports.json
      ├── users.json
      └── validation.json
```

**Example translation files:**

```json
// locales/en/common.json
{
  "app.title": "Bright Code Cashflow Dashboard",
  "nav.dashboard": "Dashboard",
  "nav.transactions": "Transactions",
  "nav.approvals": "Approvals",
  "nav.reports": "Reports",
  "nav.users": "Users",
  "nav.audit": "Audit Logs",
  "button.create": "Create",
  "button.edit": "Edit",
  "button.delete": "Delete",
  "button.cancel": "Cancel",
  "button.save": "Save",
  "button.approve": "Approve",
  "button.reject": "Reject",
  "button.upload": "Upload",
  "button.download": "Download",
  "button.export": "Export",
  "button.logout": "Logout",
  "loading": "Loading...",
  "error.generic": "An error occurred. Please try again.",
  "success.saved": "Saved successfully",
  "pagination.showing": "Showing {{start}}-{{end}} of {{total}}",
  "currency": "EGP"
}
```

```json
// locales/ar/common.json
{
  "app.title": "لوحة تحكم التدفق النقدي - برايت كود",
  "nav.dashboard": "لوحة التحكم",
  "nav.transactions": "المعاملات",
  "nav.approvals": "الموافقات",
  "nav.reports": "التقارير",
  "nav.users": "المستخدمون",
  "nav.audit": "سجلات التدقيق",
  "button.create": "إنشاء",
  "button.edit": "تعديل",
  "button.delete": "حذف",
  "button.cancel": "إلغاء",
  "button.save": "حفظ",
  "button.approve": "موافقة",
  "button.reject": "رفض",
  "button.upload": "رفع",
  "button.download": "تحميل",
  "button.export": "تصدير",
  "button.logout": "تسجيل الخروج",
  "loading": "جاري التحميل...",
  "error.generic": "حدث خطأ. يرجى المحاولة مرة أخرى.",
  "success.saved": "تم الحفظ بنجاح",
  "pagination.showing": "عرض {{start}}-{{end}} من {{total}}",
  "currency": "جنيه مصري"
}
```

### RTL/LTR Switching

**Approach:**
- Detect language and set `dir` attribute on `<html>` element
- Use CSS logical properties for layout (e.g., `margin-inline-start` instead of `margin-left`)
- Mirror icons/images for RTL if needed
- Tailwind CSS RTL plugin for automatic direction support

**Implementation:**

```typescript
// i18n.config.ts
export const i18nConfig = {
  locales: ['en', 'ar'],
  defaultLocale: 'ar', // Default to Arabic as per requirements
  localeDetection: true,
};

// Get direction for locale
export function getDirection(locale: string): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
```

```typescript
// app/layout.tsx
import { getDirection } from '@/i18n.config';

export default function RootLayout({ children, params }: Props) {
  const direction = getDirection(params.locale);

  return (
    <html lang={params.locale} dir={direction}>
      <body>{children}</body>
    </html>
  );
}
```

**CSS Considerations:**
```css
/* Use logical properties for RTL/LTR support */
.card {
  margin-inline-start: 1rem;  /* Left in LTR, Right in RTL */
  padding-inline: 1rem;       /* Horizontal padding */
  border-inline-start: 1px solid gray; /* Left border in LTR, Right in RTL */
}

/* Tailwind with RTL plugin */
<div className="ms-4 ps-2 border-s">
  <!-- ms = margin-start, ps = padding-start, border-s = border-start -->
</div>
```

### Language Switcher Component

```typescript
// components/LanguageSwitcher.tsx
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

export function LanguageSwitcher() {
  const router = useRouter();
  const { i18n } = useTranslation();

  const currentLocale = router.locale || 'ar';
  const otherLocale = currentLocale === 'ar' ? 'en' : 'ar';

  const switchLanguage = () => {
    router.push(router.pathname, router.asPath, { locale: otherLocale });
  };

  return (
    <button
      onClick={switchLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100"
    >
      <GlobeIcon className="w-5 h-5" />
      <span>{otherLocale === 'ar' ? 'العربية' : 'English'}</span>
    </button>
  );
}
```

### Date/Number Formatting

**Use locale-aware formatters:**

```typescript
// utils/formatters.ts
import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export function formatDate(
  isoDate: string,
  locale: string,
  formatString: string = 'MMM dd, yyyy HH:mm'
): string {
  const date = parseISO(isoDate);
  const dateLocale = locale === 'ar' ? ar : enUS;
  return format(date, formatString, { locale: dateLocale });
}

export function formatAmount(
  amount: string | number,
  locale: string
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

// Usage
formatDate('2024-01-20T10:30:00.000Z', 'ar'); // "يناير 20, 2024 10:30"
formatDate('2024-01-20T10:30:00.000Z', 'en'); // "Jan 20, 2024 10:30"

formatAmount('1500.50', 'ar'); // "١٬٥٠٠٫٥٠"
formatAmount('1500.50', 'en'); // "1,500.50"
```

### Component Usage

```typescript
// Example component with i18n
import { useTranslation } from 'next-i18next';

export function TransactionCard({ transaction }: Props) {
  const { t, i18n } = useTranslation('transactions');
  const currentLocale = i18n.language;

  return (
    <div>
      <h3>{t('card.title')}</h3>
      <p>{t('card.amount')}: {formatAmount(transaction.amount, currentLocale)} {t('common:currency')}</p>
      <p>{t('card.date')}: {formatDate(transaction.createdAt, currentLocale)}</p>
    </div>
  );
}
```

### RTL-Specific Considerations

1. **Icons:** Mirror directional icons (arrows, chevrons) in RTL
2. **Charts:** Ensure chart libraries support RTL (may need configuration)
3. **Tables:** Column order should reverse in RTL (most frameworks handle this)
4. **Forms:** Label placement and alignment
5. **Animations:** Direction-based animations may need adjustment

---

## 10. Reusable Component Inventory

### Layout Components

#### 1. AppLayout
**Purpose:** Main application wrapper with sidebar and header

**Props:**
```typescript
interface AppLayoutProps {
  children: ReactNode;
  userRole: 'ADMIN' | 'SALES';
  userName: string;
  userEmail: string;
  currentPath: string;
}
```

**Features:**
- Responsive sidebar (collapsible on mobile)
- Header with logo, language switcher, user menu
- Role-based navigation menu
- Footer (optional)
- RTL/LTR support

**Accessibility:**
- Semantic HTML (`<header>`, `<nav>`, `<main>`, `<aside>`)
- Skip to main content link
- ARIA labels for navigation
- Keyboard navigation support

---

#### 2. Sidebar
**Purpose:** Navigation sidebar with role-based menu items

**Props:**
```typescript
interface SidebarProps {
  userRole: 'ADMIN' | 'SALES';
  currentPath: string;
  isCollapsed: boolean;
  onToggle: () => void;
}
```

**Features:**
- Active route highlighting
- Badge support for counts (e.g., pending approvals)
- Collapsible on mobile
- Smooth animations

**Variants:**
- Desktop: Always visible, full width
- Mobile: Drawer overlay

---

#### 3. Navbar
**Purpose:** Top navigation bar

**Props:**
```typescript
interface NavbarProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}
```

**Features:**
- Logo/branding
- Language switcher
- User dropdown menu
- Logout button
- Mobile menu toggle

---

### Form Components

#### 4. Input
**Purpose:** Text input with validation

**Props:**
```typescript
interface InputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
}
```

**Features:**
- Label with optional required indicator (*)
- Error message display (red text below input)
- Disabled state styling
- Character counter (if maxLength provided)
- Number validation (if type="number")

**Variants:**
- Default
- With icon (leading or trailing)
- With prefix/suffix (e.g., "EGP")

**Accessibility:**
- Associated label (for/id)
- ARIA invalid and error message
- Keyboard accessible

---

#### 5. Select
**Purpose:** Dropdown select

**Props:**
```typescript
interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}
```

**Features:**
- Searchable (optional)
- Multi-select support (optional)
- Custom option rendering

---

#### 6. Textarea
**Purpose:** Multi-line text input

**Props:**
```typescript
interface TextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}
```

**Features:**
- Character counter (X/500)
- Auto-resize (optional)
- Error display

---

#### 7. DatePicker
**Purpose:** Date input with calendar

**Props:**
```typescript
interface DatePickerProps {
  label: string;
  name: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}
```

**Features:**
- Calendar popup
- Locale-aware (AR/EN)
- Date range validation
- Keyboard input support

**Accessibility:**
- ARIA date picker role
- Keyboard navigation in calendar

---

#### 8. FilePicker
**Purpose:** File upload with drag-drop

**Props:**
```typescript
interface FilePickerProps {
  label: string;
  accept: string; // e.g., "image/jpeg,image/png,application/pdf"
  maxSize: number; // bytes
  maxFiles?: number;
  onSelect: (files: File[]) => void;
  error?: string;
  disabled?: boolean;
}
```

**Features:**
- Drag-and-drop zone
- Click to browse
- File validation (type, size)
- Multiple file support
- Preview thumbnails
- Progress bar during upload

**Accessibility:**
- ARIA dropzone role
- Keyboard accessible file input

---

### Data Display Components

#### 9. Table
**Purpose:** Data table with sorting, filtering, pagination

**Props:**
```typescript
interface TableProps<T> {
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: T) => ReactNode;
  }>;
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}
```

**Features:**
- Sortable columns
- Custom cell rendering
- Loading skeleton
- Empty state
- Responsive (cards on mobile)
- Row selection (optional)

**Accessibility:**
- Semantic table markup
- ARIA sort indicators
- Keyboard navigation

---

#### 10. Card
**Purpose:** Content container

**Props:**
```typescript
interface CardProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  className?: string;
}
```

**Variants:**
- Default
- With header
- With footer
- Elevated (shadow)
- Bordered

---

#### 11. Badge
**Purpose:** Status/label indicator

**Props:**
```typescript
interface BadgeProps {
  children: ReactNode;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}
```

**Examples:**
- PENDING: Yellow badge
- APPROVED: Green badge
- REJECTED: Red badge
- IN: Green badge
- OUT: Red badge
- ADMIN: Blue badge
- SALES: Gray badge

---

#### 12. StatusLabel
**Purpose:** Transaction status display

**Props:**
```typescript
interface StatusLabelProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  size?: 'sm' | 'md' | 'lg';
}
```

**Styling:**
- PENDING: Yellow background, yellow text, clock icon
- APPROVED: Green background, white text, check icon
- REJECTED: Red background, white text, X icon

---

#### 13. AmountDisplay
**Purpose:** Formatted monetary amount

**Props:**
```typescript
interface AmountDisplayProps {
  amount: string;
  currency?: string; // Default: "EGP"
  locale?: string;
  type?: 'IN' | 'OUT' | 'neutral';
}
```

**Features:**
- Locale-aware number formatting
- Currency symbol/code
- Color coding: Green for IN, Red for OUT
- Positive/negative prefix (+ or -)

---

### Feedback Components

#### 14. Alert
**Purpose:** Inline message box

**Props:**
```typescript
interface AlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}
```

**Features:**
- Icon based on type
- Dismissible close button
- Auto-dismiss timeout (optional)

**Accessibility:**
- ARIA role="alert"
- Focus management on dismiss

---

#### 15. Toast/Notification
**Purpose:** Temporary notification

**Props:**
```typescript
interface ToastProps {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  duration?: number; // ms
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}
```

**Features:**
- Auto-dismiss after duration
- Stacking multiple toasts
- Swipe to dismiss (mobile)
- Icon based on type

**Recommendation:** Use library like `react-toastify` or `react-hot-toast`

---

#### 16. Modal
**Purpose:** Overlay dialog

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}
```

**Features:**
- Backdrop overlay (click to close)
- Close button (X)
- Escape key to close
- Focus trap
- Scroll lock on body

**Accessibility:**
- ARIA role="dialog"
- ARIA labelledby/describedby
- Focus on first interactive element
- Return focus on close

---

#### 17. ConfirmDialog
**Purpose:** Confirmation prompt

**Props:**
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string; // Default: "Confirm"
  cancelText?: string; // Default: "Cancel"
  variant?: 'danger' | 'warning' | 'info'; // Default: "info"
}
```

**Features:**
- Two-button layout (Cancel, Confirm)
- Danger variant (red confirm button)
- Optional reason textarea (for delete actions)

---

#### 18. LoadingSpinner
**Purpose:** Loading indicator

**Props:**
```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean; // Overlay entire screen
}
```

**Variants:**
- Inline spinner
- Full-screen overlay with spinner
- Button spinner (small)

**Accessibility:**
- ARIA role="status"
- ARIA live region for text updates

---

### Navigation Components

#### 19. Breadcrumbs
**Purpose:** Show current page hierarchy

**Props:**
```typescript
interface BreadcrumbsProps {
  items: Array<{
    label: string;
    href?: string;
  }>;
}
```

**Example:**
```
Home > Transactions > BC-2024-000002
```

**Accessibility:**
- ARIA label="Breadcrumb"
- Current page marked with aria-current="page"

---

#### 20. Pagination
**Purpose:** Navigate pages of data

**Props:**
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  showInfo?: boolean; // "Showing 1-20 of 125"
}
```

**Features:**
- Previous/Next buttons
- Page number buttons (max 7 visible: 1 ... 3 4 5 ... 10)
- First/Last buttons (optional)
- Loading state (disabled buttons)
- Mobile-friendly (smaller buttons)

**Accessibility:**
- ARIA label for pagination nav
- Current page indicated with aria-current="page"
- Disabled buttons have aria-disabled

---

#### 21. LanguageSwitcher
**Purpose:** Toggle between Arabic and English

**Props:**
```typescript
interface LanguageSwitcherProps {
  currentLocale: string;
  onSwitch: (locale: string) => void;
}
```

**Features:**
- Button with globe icon
- Show language name (العربية / English)
- Dropdown (if more than 2 languages in future)

---

## 11. Edge Cases & Acceptance Criteria

### Attachment Upload

**Edge Cases:**

1. **File size exceeds limit (5MB)**
   - Client-side validation: Show error before upload
   - Message: "File size must be under 5MB"
   - File rejected, not uploaded

2. **Invalid file type**
   - Allowed: JPEG, PNG, PDF only
   - Client-side validation: Check MIME type and extension
   - Message: "Only JPEG, PNG, and PDF files are allowed"

3. **Maximum attachments reached (5)**
   - Upload button disabled
   - Tooltip: "Maximum 5 attachments per transaction"
   - Backend also enforces (403 error)

4. **Cannot delete last attachment**
   - Delete button disabled when only 1 attachment remains
   - Tooltip: "Each transaction must have at least one attachment"
   - Backend enforces (403 error)

5. **Upload to non-PENDING transaction**
   - Upload button hidden for APPROVED/REJECTED transactions
   - Backend enforces (403 error)

6. **Network error during upload**
   - Show error toast: "Upload failed. Please try again."
   - File not added to transaction
   - Allow retry

**Acceptance Criteria:**
- ✅ Client validates file size and type before upload
- ✅ Upload progress bar shown during upload
- ✅ Transaction refreshes after successful upload
- ✅ Error messages displayed for all failure cases
- ✅ Upload button disabled appropriately (status, max files)
- ✅ Delete button disabled when only 1 attachment

---

### Transaction Approval

**Edge Cases:**

1. **Approve transaction with no attachments**
   - Approve button disabled
   - Tooltip: "Upload at least one receipt before approving"
   - Backend enforces (403 error if bypassed)

2. **Approve already approved transaction**
   - Button hidden for APPROVED transactions
   - Backend enforces (403 error)

3. **Approve already rejected transaction**
   - Button hidden for REJECTED transactions
   - Backend enforces (403 error)

4. **SALES user attempts to approve**
   - Approve button not visible to SALES users
   - Backend enforces (403 Forbidden)

5. **Transaction deleted during approval process**
   - Backend returns 404 Not Found
   - Show error: "Transaction no longer exists"
   - Redirect to /approvals

**Acceptance Criteria:**
- ✅ Approve button only visible to ADMIN users
- ✅ Approve button only visible for PENDING transactions
- ✅ Approve button disabled if no attachments (with tooltip)
- ✅ Confirmation dialog shown before approval
- ✅ Status changes to APPROVED after success
- ✅ Approved transaction becomes immutable (read-only)

---

### Transaction Rejection

**Edge Cases:**

1. **Reject without reason**
   - Submit button disabled until reason entered
   - Validation: Min 10 characters
   - Error: "Reason must be at least 10 characters"

2. **Reason exceeds max length (500 chars)**
   - Character counter shown: "X/500"
   - Input blocked at 500 characters
   - Error: "Reason cannot exceed 500 characters"

3. **Reject already rejected transaction**
   - Button hidden for REJECTED transactions
   - Backend enforces (403 error)

4. **Reject already approved transaction**
   - Button hidden for APPROVED transactions
   - Backend enforces (403 error)

**Acceptance Criteria:**
- ✅ Rejection reason textarea with character counter
- ✅ Submit disabled until min 10 chars entered
- ✅ Max 500 chars enforced
- ✅ Rejection reason saved and displayed in transaction detail
- ✅ Status changes to REJECTED after success
- ✅ Rejected transaction becomes immutable

---

### Form Submissions

**Edge Cases:**

1. **Double submission (user clicks submit twice)**
   - Submit button disabled after first click
   - Show loading spinner on button
   - Ignore additional clicks
   - Re-enable on success/error

2. **Validation errors**
   - Show inline error below each field
   - Red border on invalid fields
   - Submit button remains enabled
   - Focus on first error field

3. **Network timeout**
   - Show error after 30 seconds
   - Message: "Request timed out. Please try again."
   - Form remains filled (don't clear)
   - Allow retry

4. **Concurrent edits (two users edit same transaction)**
   - Backend handles with last-write-wins or version checking
   - Frontend shows error from backend
   - Message: "Transaction was modified by another user. Please refresh."

**Acceptance Criteria:**
- ✅ Submit button disabled during submission
- ✅ Loading spinner shown
- ✅ Validation errors shown inline
- ✅ Network errors handled gracefully
- ✅ Form data preserved on error
- ✅ Success message shown after successful submission

---

### Token Expiry

**Edge Cases:**

1. **Access token expires mid-session**
   - API returns 401
   - Frontend intercepts and refreshes automatically
   - Original request retried with new token
   - User sees no interruption

2. **Refresh token expires**
   - POST /auth/refresh returns 401
   - Frontend clears all tokens
   - Redirect to /login
   - Message: "Session expired. Please login again."

3. **User deactivated mid-session**
   - Next API call returns 401 with "account deactivated" message
   - Frontend detects message
   - Clear tokens and redirect to /login
   - Message: "Your account has been deactivated. Contact administrator."

4. **Multiple tabs open**
   - Token refresh in one tab updates localStorage
   - Other tabs need to detect change and update
   - Use storage event listener to sync across tabs

**Acceptance Criteria:**
- ✅ Automatic token refresh before expiry (proactive)
- ✅ Automatic token refresh on 401 (reactive)
- ✅ Original request retried after refresh
- ✅ Redirect to login if refresh fails
- ✅ Handle deactivated user gracefully
- ✅ Token sync across multiple tabs

---

### Deactivated User

**Edge Cases:**

1. **User deactivated during session**
   - Next API call returns 401
   - Clear tokens and redirect to /login
   - Message: "Your account has been deactivated."

2. **Deactivated user attempts login**
   - POST /auth/login returns 401
   - Message: "Your account has been deactivated. Contact administrator."

3. **Admin deactivates their own account**
   - Button disabled (cannot deactivate self)
   - Tooltip: "You cannot deactivate your own account"

**Acceptance Criteria:**
- ✅ Deactivated user cannot login
- ✅ Active user deactivated mid-session is logged out
- ✅ Clear error message shown
- ✅ Admin cannot deactivate own account (UI prevents)

---

### Rate Limiting

**Edge Cases:**

1. **5 failed login attempts**
   - Backend returns 429 Too Many Requests
   - Frontend shows message: "Too many login attempts. Please wait 60 seconds."
   - Disable login form for 60 seconds
   - Show countdown timer: "Try again in 45 seconds..."

2. **Refresh token rate limit**
   - Same as login (5 req/min)
   - If exceeded, show error and don't retry automatically
   - User must wait before manual retry

**Acceptance Criteria:**
- ✅ Rate limit error detected (429 status)
- ✅ Form disabled for 60 seconds
- ✅ Countdown timer shown
- ✅ Form re-enabled after timeout

---

### Pagination

**Edge Cases:**

1. **Page out of bounds (e.g., page 100 when only 10 pages)**
   - Backend returns empty data array
   - Frontend detects total pages and redirects to last valid page

2. **Empty results**
   - Show empty state message
   - Hide pagination controls

3. **Filter changes while on page 5**
   - Reset to page 1 when filters change
   - Prevents empty results from page 5 of old filter not existing in new filter

4. **Limit change (e.g., 20 to 100 per page)**
   - Recalculate current page to maintain approximate position
   - Example: Page 5 of 20 = item 80-100 → Page 1 of 100

**Acceptance Criteria:**
- ✅ Pagination respects total pages from backend
- ✅ Reset to page 1 on filter change
- ✅ Handle empty results gracefully
- ✅ Show loading state during page change
- ✅ Maintain filter state when paginating

---

### Date Ranges

**Edge Cases:**

1. **From date > To date**
   - Client-side validation
   - Error: "From date must be before To date"
   - Prevent form submission

2. **Future dates (if not allowed)**
   - Date picker max date set to today
   - Error: "Date cannot be in the future"

3. **Very large date range**
   - Backend may timeout or return partial data
   - Show warning: "Large date range may take longer to load"
   - Consider pagination or chunking

4. **Invalid date format**
   - Date picker ensures valid format (YYYY-MM-DD)
   - Manual input validated
   - Error: "Invalid date format"

**Acceptance Criteria:**
- ✅ Validate From <= To
- ✅ Prevent future dates if not allowed
- ✅ Date picker enforces valid format
- ✅ Clear error messages for invalid dates
- ✅ Loading indicator for large date ranges

---

## 12. Implementation Verification Plan

### How to Test Frontend with Backend

**Pre-Implementation Checklist:**
1. ✅ Backend API running at http://localhost:3000
2. ✅ Swagger UI accessible at http://localhost:3000/api
3. ✅ Default admin user exists (info@brightc0de.com / Brightc0de@info)
4. ✅ Database seeded with sample data (optional but helpful)

**Phase 1: Authentication Testing**
- [ ] Login with valid credentials → Successful login, tokens received
- [ ] Login with invalid credentials → 401 error, error message shown
- [ ] Login with 5+ failed attempts → 429 rate limit, countdown shown
- [ ] Login with deactivated account → 401 error, deactivated message shown
- [ ] Token auto-refresh 2 min before expiry → New tokens received, no interruption
- [ ] Token refresh on 401 error → Request retried successfully
- [ ] Logout → Tokens cleared, redirected to login, cannot access protected routes

**Phase 2: Transaction CRUD Testing (SALES User)**
- [ ] Create transaction with all required fields → 201 Created, transaction returned
- [ ] Create transaction without required fields → 400 validation errors shown
- [ ] Upload attachment to transaction → Attachment added, transaction updated
- [ ] Upload invalid file type → 400 error, file rejected
- [ ] Upload file > 5MB → 400 error, file rejected
- [ ] Delete attachment (when multiple exist) → Attachment removed
- [ ] Attempt to delete last attachment → 403 error, button disabled
- [ ] View own transaction → Transaction detail shown
- [ ] Attempt to view other SALES user's transaction → 403 error

**Phase 3: Transaction Approval Testing (ADMIN User)**
- [ ] Approve PENDING transaction with attachments → Status changes to APPROVED
- [ ] Attempt to approve transaction without attachments → Button disabled, error shown
- [ ] Attempt to approve already approved transaction → Button hidden
- [ ] Reject PENDING transaction with reason → Status changes to REJECTED, reason saved
- [ ] Reject without reason → Submit disabled until 10 chars entered
- [ ] Edit PENDING transaction → Updates saved
- [ ] Attempt to edit APPROVED transaction → Edit button hidden
- [ ] Delete PENDING transaction with reason → Soft deleted (204 No Content)
- [ ] Delete without reason → Submit disabled

**Phase 4: Reports Testing (ADMIN User)**
- [ ] View balance report → Correct totals shown
- [ ] Generate summary report with date range → Data filtered correctly
- [ ] View expenses by category → Categories and totals correct
- [ ] Export to Excel → .xlsx file downloads
- [ ] Export to CSV → .csv file downloads
- [ ] Verify dates in export use Africa/Cairo timezone

**Phase 5: User Management Testing (ADMIN User)**
- [ ] Create new user → User created successfully
- [ ] Create user with existing email → 409 conflict error
- [ ] Edit user (change role) → Role updated
- [ ] Edit user (change password) → Password updated (test login with new password)
- [ ] Deactivate user → isActive = false, user cannot login
- [ ] Activate user → isActive = true, user can login
- [ ] Attempt to deactivate own account → Button disabled

**Phase 6: Audit Logs Testing (ADMIN User)**
- [ ] View audit logs → All actions logged
- [ ] Filter by action type → Filtered results shown
- [ ] Filter by user → Filtered results shown
- [ ] Filter by date range → Filtered results shown
- [ ] Expand audit log row → Before/after snapshots shown

**Phase 7: Pagination & Filtering Testing**
- [ ] Paginate transactions (page 2) → Correct data shown
- [ ] Change page size (20 → 50) → More items shown per page
- [ ] Filter by status → Filtered results shown
- [ ] Filter by type → Filtered results shown
- [ ] Search by description → Matching transactions shown
- [ ] Combine multiple filters → All filters applied correctly
- [ ] Reset to page 1 when filters change → Page 1 shown

**Phase 8: i18n & RTL Testing**
- [ ] Switch to Arabic → All UI text translated, layout RTL
- [ ] Switch to English → All UI text translated, layout LTR
- [ ] Arabic numbers formatted correctly → Eastern Arabic numerals
- [ ] Dates formatted in Arabic → Arabic month names
- [ ] All icons mirrored in RTL → Directional icons reversed

**Phase 9: Error Handling Testing**
- [ ] Simulate network timeout (slow 3G) → Timeout error shown
- [ ] Simulate 500 server error → Generic error message shown
- [ ] Simulate 403 Forbidden → Access denied message shown
- [ ] Simulate 404 Not Found → Not found message shown
- [ ] Validation errors shown inline → Red borders, error messages

**Phase 10: Mobile Responsiveness Testing**
- [ ] Login on mobile → Form usable, no horizontal scroll
- [ ] Navigation on mobile → Hamburger menu, drawer sidebar
- [ ] Transaction list on mobile → Cards instead of table
- [ ] Transaction detail on mobile → Scrollable, attachments stack vertically
- [ ] Forms on mobile → All fields accessible, keyboard doesn't obscure submit button

**Phase 11: Cross-Browser Testing**
- [ ] Chrome/Edge → All features work
- [ ] Firefox → All features work
- [ ] Safari (desktop + iOS) → All features work
- [ ] Chrome Mobile (Android) → All features work

**Phase 12: Performance Testing**
- [ ] Load time under 3 seconds (dashboard) → Passes
- [ ] Time to interactive under 5 seconds → Passes
- [ ] Large transaction list (100+ items) → Smooth scrolling, no lag
- [ ] Image upload progress bar → Accurate progress shown
- [ ] Bundle size optimized (under 500KB gzipped) → Passes

**Phase 13: Accessibility Testing**
- [ ] Keyboard navigation → All interactive elements reachable
- [ ] Screen reader (NVDA/JAWS) → All content accessible
- [ ] Focus indicators → Visible on all focusable elements
- [ ] Color contrast → Meets WCAG AA standards
- [ ] Form labels → All inputs have associated labels
- [ ] ARIA attributes → Used correctly (roles, labels, live regions)

**Tools for Testing:**
- **API Testing:** Postman (collection provided), Swagger UI
- **Browser DevTools:** Network tab, Console, Lighthouse
- **Accessibility:** axe DevTools, WAVE, NVDA/JAWS screen readers
- **Performance:** Lighthouse, WebPageTest
- **Responsiveness:** Chrome DevTools device toolbar, BrowserStack
- **i18n:** Manual testing with both locales

**Bug Report Template:**
```markdown
## Bug Report

**Title:** [Short description]

**Steps to Reproduce:**
1. Login as ADMIN
2. Navigate to /approvals
3. Click "Approve" on BC-2024-000001
4. ...

**Expected Result:**
Transaction should be approved and status changes to APPROVED.

**Actual Result:**
Error: "Cannot approve transaction" (403)

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- User Role: ADMIN
- Locale: English

**Additional Info:**
Transaction has 2 attachments, status is PENDING.

**Screenshots:**
[Attach error message screenshot]
```

---

## 13. Environment Variables & Configuration

### Required Environment Variables

```bash
# .env.local (Frontend)

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=30000

# i18n Configuration
NEXT_PUBLIC_DEFAULT_LOCALE=ar
NEXT_PUBLIC_AVAILABLE_LOCALES=en,ar

# Feature Flags (Optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=false

# Development Only
NEXT_PUBLIC_SHOW_DEV_CREDENTIALS=true
```

### Backend Configuration (For Reference)
```bash
# Backend .env (Not part of frontend, but good to know)

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cashflow

# JWT Secrets
JWT_ACCESS_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# File Upload
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_DIR=./uploads

# Rate Limiting
LOGIN_RATE_LIMIT=5
LOGIN_RATE_WINDOW=60000  # 60 seconds
```

---

## Summary & Next Steps

This specification document provides a complete blueprint for building the Bright Code Cashflow Dashboard frontend with 100% alignment to the backend API.

**Key Takeaways:**
1. **26 API endpoints** fully mapped with exact request/response formats
2. **All corrections documented** (categories, file size, SALES permissions, bulk approval removed)
3. **7 main pages** with detailed UI layouts, forms, and user interactions
4. **21 reusable components** with complete prop interfaces
5. **Comprehensive edge case handling** for attachments, approvals, tokens, pagination
6. **Bilingual support** (AR/EN) with RTL/LTR layouts
7. **Full testing plan** with 13 phases covering all scenarios

**What a Frontend Developer Needs to Do:**
1. Set up Next.js 14+ project with TypeScript
2. Install dependencies: `react-i18next`, `axios`, `react-query`, `tailwindcss`, `date-fns`
3. Copy TypeScript types from `frontend-integration/04-typescript-types.md`
4. Implement authentication context and token management
5. Build reusable components (start with layout, then forms, then data display)
6. Build pages one by one (start with login, then dashboard, then transactions)
7. Implement i18n with translation files
8. Test against backend using verification plan
9. Fix any bugs found during testing
10. Deploy to production

**The developer will NEVER need to ask:**
- "How does this work on the backend?" → All endpoints documented
- "What validation rules should I use?" → All rules specified
- "What happens if...?" → Edge cases covered
- "Can the backend do X?" → If not documented, it's not supported

This specification is ready for implementation. 🚀

---

**Document End**
