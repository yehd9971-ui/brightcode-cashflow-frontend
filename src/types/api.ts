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
  SALARIES = 'SALARIES',
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
  customerName?: string;
  phoneNumber?: string;
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
  customerName?: string;
  phoneNumber?: string;
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
  totalAmount?: number; // Total sum of transaction amounts (for filtered results)
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

export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'statusCode' in response &&
    typeof (response as ErrorResponse).statusCode === 'number' &&
    'message' in response &&
    typeof (response as ErrorResponse).message === 'string'
  );
}

export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Array.isArray((response as PaginatedResponse<T>).data) &&
    'total' in response &&
    typeof (response as PaginatedResponse<T>).total === 'number'
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type TransactionList = PaginatedResponse<TransactionResponseDto>;
export type UserList = PaginatedResponse<UserResponseDto>;
export type AuditList = PaginatedResponse<AuditLogResponseDto>;
export type ApiResponse<T> = T | ErrorResponse;

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResultDto {
  successCount: number;
  errorCount: number;
  errors: ImportRowError[];
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_RULES = {
  password: {
    minLength: 8,
    pattern: /^.{8,}$/,
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
  customerName: {
    maxLength: 100,
  },
  phoneNumber: {
    pattern: /^[+]?[\d\s-]{7,20}$/,
    maxLength: 20,
  },
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

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

  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and PDF files are allowed' };
  }

  return { valid: true };
}
