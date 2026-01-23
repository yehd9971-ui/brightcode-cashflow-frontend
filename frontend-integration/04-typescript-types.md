# TypeScript Types

> **Last Updated:** 2026-01-20 06:51 (Africa/Cairo)

Frontend-ready TypeScript type definitions for the BrightCode Cashflow API. Copy these directly into your React project.

> **Note:** All monetary values (amounts, totals, balances) are returned as **strings** to ensure decimal precision. All dates are in **Africa/Cairo timezone**.

## Usage

1. Create a file `types/api.ts` in your project
2. Copy all types from this document
3. Import where needed: `import { TransactionResponseDto, Role } from './types/api'`

## Table of Contents

- [Enums](#enums)
- [Authentication Types](#authentication-types)
- [User Types](#user-types)
- [Transaction Types](#transaction-types)
- [Report Types](#report-types)
- [Audit Types](#audit-types)
- [Common Types](#common-types)
- [Type Guards](#type-guards)
- [Utility Types](#utility-types)

---

## Enums

### Role
```typescript
export enum Role {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
}
```

### TransactionType
```typescript
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
}
```

### TransactionStatus
```typescript
export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
```

### TransactionCategory
```typescript
export enum TransactionCategory {
  WEBSITES = 'WEBSITES',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  HOSTING = 'HOSTING',
  SOFTWARE = 'SOFTWARE',
  CONSULTING = 'CONSULTING',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}
```

### AuditAction
```typescript
export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REFRESH = 'REFRESH',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  DELETE = 'DELETE',
  UPLOAD = 'UPLOAD',
  DEACTIVATE = 'DEACTIVATE',
  ACTIVATE = 'ACTIVATE',
}
```

### EntityType
```typescript
export enum EntityType {
  USER = 'USER',
  TRANSACTION = 'TRANSACTION',
  ATTACHMENT = 'ATTACHMENT',
}
```

---

## Authentication Types

### LoginDto
```typescript
export interface LoginDto {
  email: string;
  password: string;
}
```

### RefreshDto
```typescript
export interface RefreshDto {
  refreshToken: string;
}
```

### UserResponseDto
```typescript
export interface UserResponseDto {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}
```

### TokenResponseDto
```typescript
export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Seconds (900 = 15 minutes)
  user: UserResponseDto;
}
```

---

## User Types

### CreateUserDto
```typescript
export interface CreateUserDto {
  email: string;
  password: string; // Minimum 8 characters
  role?: Role; // Optional, defaults to SALES
}
```

### UpdateUserDto
```typescript
export interface UpdateUserDto {
  role?: Role;
  isActive?: boolean;
  password?: string; // Minimum 8 characters
}
```

### UserQueryDto
```typescript
export interface UserQueryDto {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  role?: Role;
  isActive?: boolean;
}
```

---

## Transaction Types

### CreateTransactionDto
```typescript
export interface CreateTransactionDto {
  type: TransactionType; // Required: IN or OUT
  amount: number; // Required: Min 0.01, max 2 decimal places
  description: string; // Required: Max 500 characters
  category?: TransactionCategory; // Optional, defaults to OTHER
}
```

### UpdateTransactionDto
```typescript
export interface UpdateTransactionDto {
  type?: TransactionType;
  amount?: number; // Min 0.01, max 2 decimal places
  description?: string; // Max 500 characters
  category?: TransactionCategory;
}
```

### RejectTransactionDto
```typescript
export interface RejectTransactionDto {
  reason: string; // Required: Min 10, Max 500 characters
}
```

### DeleteTransactionDto
```typescript
export interface DeleteTransactionDto {
  reason: string; // Required: Min 10, Max 500 characters
}
```

### TransactionQueryDto
```typescript
export interface TransactionQueryDto {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string; // ISO 8601 date (YYYY-MM-DD)
  endDate?: string; // ISO 8601 date (YYYY-MM-DD)
  createdById?: string; // User ID (UUID)
  minAmount?: number;
  maxAmount?: number;
  search?: string; // Searches description and transaction number
  category?: TransactionCategory;
  includeDeleted?: boolean; // Default: false
}
```

### TransactionUserDto
```typescript
export interface TransactionUserDto {
  id: string;
  email: string;
  role: Role;
}
```

### AttachmentResponseDto
```typescript
export interface AttachmentResponseDto {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string; // e.g., "image/jpeg", "application/pdf"
  size: number; // Bytes
  uploadedAt: string; // ISO 8601 date string
}
```

### TransactionResponseDto
```typescript
export interface TransactionResponseDto {
  id: string;
  transactionNumber: string; // Format: BC-YYYY-NNNNNN
  type: TransactionType;
  amount: string; // String for decimal precision
  description: string;
  category: string;
  status: TransactionStatus;
  rejectionReason?: string;
  createdBy: TransactionUserDto;
  approvedBy?: TransactionUserDto;
  attachments: AttachmentResponseDto[];
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  approvedAt?: string; // ISO 8601 date string
}
```

---

## Report Types

### ReportQueryDto
```typescript
export interface ReportQueryDto {
  startDate?: string; // ISO 8601 date (YYYY-MM-DD)
  endDate?: string; // ISO 8601 date (YYYY-MM-DD)
  type?: TransactionType;
  status?: TransactionStatus; // Default: APPROVED
  category?: TransactionCategory;
}
```

### SummaryDto
```typescript
export interface SummaryDto {
  totalIn: string; // Total money IN (approved only) - string for precision
  totalOut: string; // Total money OUT (approved only) - string for precision
  netCashflow: string; // totalIn - totalOut - string for precision
  countIn: number; // Number of IN transactions
  countOut: number; // Number of OUT transactions
  totalCount: number; // Total approved transactions
}
```

### DailyTotalDto
```typescript
export interface DailyTotalDto {
  date: string; // YYYY-MM-DD (Africa/Cairo timezone)
  totalIn: string; // String for precision
  totalOut: string; // String for precision
  net: string; // totalIn - totalOut - string for precision
}
```

### ReportResponseDto
```typescript
export interface ReportResponseDto {
  summary: SummaryDto;
  dailyTotals: DailyTotalDto[];
  generatedAt: string; // ISO 8601 date string
  startDate?: string; // ISO 8601 date
  endDate?: string; // ISO 8601 date
  currency: string; // "EGP"
}
```

### BalanceResponseDto
```typescript
export interface BalanceResponseDto {
  totalIn: string; // String for precision
  totalOut: string; // String for precision
  netBalance: string; // totalIn - totalOut - string for precision
  currency: string; // "EGP"
  asOf: string; // ISO 8601 date string (when report was generated)
}
```

### CategoryExpenseDto
```typescript
export interface CategoryExpenseDto {
  category: string;
  total: string; // String for precision
  count: number; // Number of transactions in this category
}
```

### ExpensesByCategoryResponseDto
```typescript
export interface ExpensesByCategoryResponseDto {
  fromDate?: string; // ISO 8601 date
  toDate?: string; // ISO 8601 date
  categories: CategoryExpenseDto[]; // Sorted by total (descending)
  grandTotal: string; // Sum of all category totals - string for precision
  currency: string; // "EGP"
}
```

---

## Audit Types

### AuditQueryDto
```typescript
export interface AuditQueryDto {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  entityType?: EntityType;
  entityId?: string; // UUID
  actorId?: string; // User ID (UUID)
  action?: AuditAction;
  startDate?: string; // ISO 8601 date
  endDate?: string; // ISO 8601 date
}
```

### AuditActorDto
```typescript
export interface AuditActorDto {
  id: string;
  email: string;
}
```

### AuditLogResponseDto
```typescript
export interface AuditLogResponseDto {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  beforeSnapshot?: Record<string, unknown>; // JSON object
  afterSnapshot?: Record<string, unknown>; // JSON object
  actor?: AuditActorDto;
  ipAddress?: string;
  timestamp: string; // ISO 8601 date string
}
```

---

## Common Types

### PaginationDto
```typescript
export interface PaginationDto {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
}
```

### PaginationMeta
```typescript
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### PaginatedResponse<T>
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

### ValidationError
```typescript
export interface ValidationError {
  field: string;
  message: string;
}
```

### ErrorResponse
```typescript
export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: ValidationError[];
  timestamp: string; // ISO 8601 date string
  path: string; // Request URL
}
```

---

## Type Guards

Type guards help you safely narrow types at runtime:

### isErrorResponse
```typescript
export function isErrorResponse(response: any): response is ErrorResponse {
  return (
    response &&
    typeof response.statusCode === 'number' &&
    typeof response.message === 'string' &&
    typeof response.timestamp === 'string'
  );
}
```

### isPaginatedResponse
```typescript
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return (
    response &&
    Array.isArray(response.data) &&
    typeof response.total === 'number' &&
    typeof response.page === 'number' &&
    typeof response.limit === 'number'
  );
}
```

### isTransactionResponse
```typescript
export function isTransactionResponse(data: any): data is TransactionResponseDto {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.transactionNumber === 'string' &&
    ['IN', 'OUT'].includes(data.type) &&
    typeof data.amount === 'string' // Amount is now a string for precision
  );
}
```

### isUserResponse
```typescript
export function isUserResponse(data: any): data is UserResponseDto {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.email === 'string' &&
    ['ADMIN', 'SALES'].includes(data.role) &&
    typeof data.isActive === 'boolean'
  );
}
```

---

## Utility Types

### TransactionList
```typescript
export type TransactionList = PaginatedResponse<TransactionResponseDto>;
```

### UserList
```typescript
export type UserList = PaginatedResponse<UserResponseDto>;
```

### AuditList
```typescript
export type AuditList = PaginatedResponse<AuditLogResponseDto>;
```

### ApiResponse<T>
```typescript
export type ApiResponse<T> = T | ErrorResponse;
```

### AsyncApiResponse<T>
```typescript
export type AsyncApiResponse<T> = Promise<T | ErrorResponse>;
```

---

## React Component Props Types

### TransactionCardProps
```typescript
export interface TransactionCardProps {
  transaction: TransactionResponseDto;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onDelete?: (id: string, reason: string) => void;
  showActions?: boolean;
}
```

### UserCardProps
```typescript
export interface UserCardProps {
  user: UserResponseDto;
  onEdit?: (id: string) => void;
  onDeactivate?: (id: string) => void;
  onActivate?: (id: string) => void;
  showActions?: boolean;
}
```

### PaginationProps
```typescript
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}
```

---

## React Hook Return Types

### useTransactions
```typescript
export interface UseTransactionsReturn {
  transactions: TransactionResponseDto[];
  total: number;
  page: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

### useAuth
```typescript
export interface UseAuthReturn {
  user: UserResponseDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserResponseDto>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
}
```

### useCreateTransaction
```typescript
export interface UseCreateTransactionReturn {
  createTransaction: (data: CreateTransactionDto) => Promise<TransactionResponseDto>;
  isCreating: boolean;
  error: Error | null;
  reset: () => void;
}
```

---

## Validation Helpers

### Validation Constants
```typescript
export const VALIDATION_RULES = {
  password: {
    minLength: 8,
    pattern: /^.{8,}$/, // At least 8 characters
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  amount: {
    min: 0.01,
    max: 9999999.99,
    decimalPlaces: 2,
  },
  description: {
    maxLength: 500,
  },
  reason: {
    minLength: 10,
    maxLength: 500,
  },
  pagination: {
    minPage: 1,
    minLimit: 1,
    maxLimit: 100,
  },
  file: {
    maxSize: 5242880, // 5MB in bytes
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
  },
} as const;
```

### Validation Functions
```typescript
export function validateEmail(email: string): boolean {
  return VALIDATION_RULES.email.pattern.test(email);
}

export function validatePassword(password: string): boolean {
  return password.length >= VALIDATION_RULES.password.minLength;
}

export function validateAmount(amount: number | string): boolean {
  const { min, max } = VALIDATION_RULES.amount;
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return false;
  const decimalPlaces = (numericAmount.toString().split('.')[1] || '').length;
  return numericAmount >= min && numericAmount <= max && decimalPlaces <= 2;
}

export function validateDescription(description: string): boolean {
  return description.length > 0 && description.length <= VALIDATION_RULES.description.maxLength;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const { maxSize, allowedTypes } = VALIDATION_RULES.file;

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be under 5MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and PDF files are allowed' };
  }

  return { valid: true };
}
```

---

## Complete Type File Template

Copy this complete file into your project as `types/api.ts`:

```typescript
// types/api.ts
// Auto-generated TypeScript types for BrightCode Cashflow API
// Last updated: 2026-01-20 (Africa/Cairo)
// Note: All monetary values are strings for decimal precision

// ============================================================================
// ENUMS
// ============================================================================

export enum Role {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
}

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TransactionCategory {
  WEBSITES = 'WEBSITES',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  HOSTING = 'HOSTING',
  SOFTWARE = 'SOFTWARE',
  CONSULTING = 'CONSULTING',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REFRESH = 'REFRESH',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  DELETE = 'DELETE',
  UPLOAD = 'UPLOAD',
  DEACTIVATE = 'DEACTIVATE',
  ACTIVATE = 'ACTIVATE',
}

export enum EntityType {
  USER = 'USER',
  TRANSACTION = 'TRANSACTION',
  ATTACHMENT = 'ATTACHMENT',
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshDto {
  refreshToken: string;
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
  expiresIn: number;
  user: UserResponseDto;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface CreateUserDto {
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserDto {
  role?: Role;
  isActive?: boolean;
  password?: string;
}

export interface UserQueryDto {
  page?: number;
  limit?: number;
  role?: Role;
  isActive?: boolean;
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  description: string;
  category?: TransactionCategory;
}

export interface UpdateTransactionDto {
  type?: TransactionType;
  amount?: number;
  description?: string;
  category?: TransactionCategory;
}

export interface RejectTransactionDto {
  reason: string;
}

export interface DeleteTransactionDto {
  reason: string;
}

export interface TransactionQueryDto {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  createdById?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  category?: TransactionCategory;
  includeDeleted?: boolean;
}

export interface TransactionUserDto {
  id: string;
  email: string;
  role: Role;
}

export interface AttachmentResponseDto {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface TransactionResponseDto {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  amount: string; // String for decimal precision
  description: string;
  category: string;
  status: TransactionStatus;
  rejectionReason?: string;
  createdBy: TransactionUserDto;
  approvedBy?: TransactionUserDto;
  attachments: AttachmentResponseDto[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface ReportQueryDto {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  category?: TransactionCategory;
}

export interface SummaryDto {
  totalIn: string; // String for precision
  totalOut: string; // String for precision
  netCashflow: string; // String for precision
  countIn: number;
  countOut: number;
  totalCount: number;
}

export interface DailyTotalDto {
  date: string; // Africa/Cairo timezone
  totalIn: string; // String for precision
  totalOut: string; // String for precision
  net: string; // String for precision
}

export interface ReportResponseDto {
  summary: SummaryDto;
  dailyTotals: DailyTotalDto[];
  generatedAt: string;
  startDate?: string;
  endDate?: string;
  currency: string;
}

export interface BalanceResponseDto {
  totalIn: string; // String for precision
  totalOut: string; // String for precision
  netBalance: string; // String for precision
  currency: string;
  asOf: string;
}

export interface CategoryExpenseDto {
  category: string;
  total: string; // String for precision
  count: number;
}

export interface ExpensesByCategoryResponseDto {
  fromDate?: string;
  toDate?: string;
  categories: CategoryExpenseDto[];
  grandTotal: string; // String for precision
  currency: string;
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export interface AuditQueryDto {
  page?: number;
  limit?: number;
  entityType?: EntityType;
  entityId?: string;
  actorId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}

export interface AuditActorDto {
  id: string;
  email: string;
}

export interface AuditLogResponseDto {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  actor?: AuditActorDto;
  ipAddress?: string;
  timestamp: string;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface PaginationDto {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: ValidationError[];
  timestamp: string;
  path: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isErrorResponse(response: any): response is ErrorResponse {
  return (
    response &&
    typeof response.statusCode === 'number' &&
    typeof response.message === 'string'
  );
}

export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return (
    response &&
    Array.isArray(response.data) &&
    typeof response.total === 'number'
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type TransactionList = PaginatedResponse<TransactionResponseDto>;
export type UserList = PaginatedResponse<UserResponseDto>;
export type AuditList = PaginatedResponse<AuditLogResponseDto>;
export type ApiResponse<T> = T | ErrorResponse;
```

---

**Next:** Learn about error handling in [Error Handling Guide →](./05-error-handling.md)
