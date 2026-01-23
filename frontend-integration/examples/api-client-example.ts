/**
 * Typed API Client for BrightCode Cashflow API
 * Complete implementation with TypeScript, Axios, and React Query hooks
 *
 * Features:
 * - Type-safe API methods for all 26 endpoints
 * - Automatic token injection
 * - Error handling and retry logic
 * - React Query hooks for data fetching
 * - Optimistic updates
 * - Request/response interceptors
 *
 * Usage:
 * 1. Copy this file to your project (e.g., api/client.ts)
 * 2. Initialize client: const api = new BrightCodeAPI('http://localhost:3000')
 * 3. Use hooks in components: const { data } = useTransactions({ page: 1 })
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// =============================================================================
// TYPES (Copy from 04-typescript-types.md or import from types/api.ts)
// =============================================================================

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

// DTOs
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
  amount: number;
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

export interface ReportQueryDto {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  category?: TransactionCategory;
}

export interface SummaryDto {
  totalIn: number;
  totalOut: number;
  netCashflow: number;
  countIn: number;
  countOut: number;
  totalCount: number;
}

export interface DailyTotalDto {
  date: string;
  totalIn: number;
  totalOut: number;
  net: number;
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
  totalIn: number;
  totalOut: number;
  netBalance: number;
  currency: string;
  asOf: string;
}

export interface CategoryExpenseDto {
  category: string;
  total: number;
  count: number;
}

export interface ExpensesByCategoryResponseDto {
  fromDate?: string;
  toDate?: string;
  categories: CategoryExpenseDto[];
  grandTotal: number;
  currency: string;
}

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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  timestamp: string;
  path: string;
}

// =============================================================================
// API CLIENT CLASS
// =============================================================================

export class BrightCodeAPI {
  private axios: AxiosInstance;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.axios = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors() {
    // Request interceptor: Add authorization header
    this.axios.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle errors
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        if (error.response) {
          // Transform Axios error to our ErrorResponse
          const errorResponse: ErrorResponse = error.response.data;
          return Promise.reject(errorResponse);
        }
        return Promise.reject(error);
      }
    );
  }

  // ===========================================================================
  // AUTHENTICATION ENDPOINTS
  // ===========================================================================

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const response = await this.axios.post<TokenResponseDto>('/auth/login', dto);
    return response.data;
  }

  async refresh(dto: RefreshDto): Promise<TokenResponseDto> {
    const response = await this.axios.post<TokenResponseDto>('/auth/refresh', dto);
    return response.data;
  }

  async logout(dto: RefreshDto): Promise<void> {
    await this.axios.post('/auth/logout', dto);
  }

  // ===========================================================================
  // USER ENDPOINTS
  // ===========================================================================

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const response = await this.axios.post<UserResponseDto>('/users', dto);
    return response.data;
  }

  async listUsers(query?: UserQueryDto): Promise<PaginatedResponse<UserResponseDto>> {
    const response = await this.axios.get<PaginatedResponse<UserResponseDto>>('/users', {
      params: query,
    });
    return response.data;
  }

  async getUser(id: string): Promise<UserResponseDto> {
    const response = await this.axios.get<UserResponseDto>(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const response = await this.axios.patch<UserResponseDto>(`/users/${id}`, dto);
    return response.data;
  }

  async deactivateUser(id: string): Promise<UserResponseDto> {
    const response = await this.axios.post<UserResponseDto>(`/users/${id}/deactivate`);
    return response.data;
  }

  async activateUser(id: string): Promise<UserResponseDto> {
    const response = await this.axios.post<UserResponseDto>(`/users/${id}/activate`);
    return response.data;
  }

  // ===========================================================================
  // TRANSACTION ENDPOINTS
  // ===========================================================================

  async createTransaction(dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    const response = await this.axios.post<TransactionResponseDto>('/transactions', dto);
    return response.data;
  }

  async listTransactions(
    query?: TransactionQueryDto
  ): Promise<PaginatedResponse<TransactionResponseDto>> {
    const response = await this.axios.get<PaginatedResponse<TransactionResponseDto>>(
      '/transactions',
      { params: query }
    );
    return response.data;
  }

  async getTransaction(id: string): Promise<TransactionResponseDto> {
    const response = await this.axios.get<TransactionResponseDto>(`/transactions/${id}`);
    return response.data;
  }

  async updateTransaction(
    id: string,
    dto: UpdateTransactionDto
  ): Promise<TransactionResponseDto> {
    const response = await this.axios.patch<TransactionResponseDto>(`/transactions/${id}`, dto);
    return response.data;
  }

  async approveTransaction(id: string): Promise<TransactionResponseDto> {
    const response = await this.axios.post<TransactionResponseDto>(
      `/transactions/${id}/approve`
    );
    return response.data;
  }

  async rejectTransaction(id: string, dto: RejectTransactionDto): Promise<TransactionResponseDto> {
    const response = await this.axios.post<TransactionResponseDto>(
      `/transactions/${id}/reject`,
      dto
    );
    return response.data;
  }

  async deleteTransaction(id: string, dto: DeleteTransactionDto): Promise<void> {
    await this.axios.delete(`/transactions/${id}`, { data: dto });
  }

  async uploadAttachment(id: string, file: File): Promise<TransactionResponseDto> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.axios.post<TransactionResponseDto>(
      `/transactions/${id}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  // ===========================================================================
  // ATTACHMENT ENDPOINTS
  // ===========================================================================

  async downloadAttachment(id: string): Promise<Blob> {
    const response = await this.axios.get<Blob>(`/attachments/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.axios.delete(`/attachments/${id}`);
  }

  // ===========================================================================
  // REPORT ENDPOINTS
  // ===========================================================================

  async getBalance(): Promise<BalanceResponseDto> {
    const response = await this.axios.get<BalanceResponseDto>('/reports/balance');
    return response.data;
  }

  async getExpensesByCategory(
    query?: ReportQueryDto
  ): Promise<ExpensesByCategoryResponseDto> {
    const response = await this.axios.get<ExpensesByCategoryResponseDto>(
      '/reports/expenses-by-category',
      { params: query }
    );
    return response.data;
  }

  async getSummary(query?: ReportQueryDto): Promise<ReportResponseDto> {
    const response = await this.axios.get<ReportResponseDto>('/reports/summary', {
      params: query,
    });
    return response.data;
  }

  async exportToExcel(query?: ReportQueryDto): Promise<Blob> {
    const response = await this.axios.get<Blob>('/reports/export', {
      params: query,
      responseType: 'blob',
    });
    return response.data;
  }

  // ===========================================================================
  // AUDIT ENDPOINTS
  // ===========================================================================

  async listAuditLogs(query?: AuditQueryDto): Promise<PaginatedResponse<AuditLogResponseDto>> {
    const response = await this.axios.get<PaginatedResponse<AuditLogResponseDto>>('/audit', {
      params: query,
    });
    return response.data;
  }

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.axios.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const api = new BrightCodeAPI(API_BASE_URL);

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================

// ---------------------------------------------------------------------------
// Transaction Hooks
// ---------------------------------------------------------------------------

export function useTransactions(
  query?: TransactionQueryDto,
  options?: UseQueryOptions<PaginatedResponse<TransactionResponseDto>>
) {
  return useQuery({
    queryKey: ['transactions', query],
    queryFn: () => api.listTransactions(query),
    ...options,
  });
}

export function useTransaction(
  id: string,
  options?: UseQueryOptions<TransactionResponseDto>
) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => api.getTransaction(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateTransaction(
  options?: UseMutationOptions<TransactionResponseDto, ErrorResponse, CreateTransactionDto>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateTransactionDto) => api.createTransaction(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    ...options,
  });
}

export function useUpdateTransaction(
  options?: UseMutationOptions<
    TransactionResponseDto,
    ErrorResponse,
    { id: string; dto: UpdateTransactionDto }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }) => api.updateTransaction(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', data.id] });
    },
    ...options,
  });
}

export function useApproveTransaction(
  options?: UseMutationOptions<TransactionResponseDto, ErrorResponse, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.approveTransaction(id),
    onMutate: async (id) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      // Snapshot previous value
      const previousTransactions = queryClient.getQueryData(['transactions']);

      // Optimistically update
      queryClient.setQueryData(['transactions'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((tx: TransactionResponseDto) =>
            tx.id === id ? { ...tx, status: TransactionStatus.APPROVED } : tx
          ),
        };
      });

      return { previousTransactions };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    ...options,
  });
}

export function useRejectTransaction(
  options?: UseMutationOptions<
    TransactionResponseDto,
    ErrorResponse,
    { id: string; dto: RejectTransactionDto }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }) => api.rejectTransaction(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    ...options,
  });
}

export function useDeleteTransaction(
  options?: UseMutationOptions<void, ErrorResponse, { id: string; dto: DeleteTransactionDto }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }) => api.deleteTransaction(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    ...options,
  });
}

export function useUploadAttachment(
  options?: UseMutationOptions<TransactionResponseDto, ErrorResponse, { id: string; file: File }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }) => api.uploadAttachment(id, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', data.id] });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// User Hooks
// ---------------------------------------------------------------------------

export function useUsers(
  query?: UserQueryDto,
  options?: UseQueryOptions<PaginatedResponse<UserResponseDto>>
) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: () => api.listUsers(query),
    ...options,
  });
}

export function useUser(id: string, options?: UseQueryOptions<UserResponseDto>) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.getUser(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateUser(
  options?: UseMutationOptions<UserResponseDto, ErrorResponse, CreateUserDto>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateUserDto) => api.createUser(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
}

export function useUpdateUser(
  options?: UseMutationOptions<UserResponseDto, ErrorResponse, { id: string; dto: UpdateUserDto }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }) => api.updateUser(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', data.id] });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Report Hooks
// ---------------------------------------------------------------------------

export function useBalance(options?: UseQueryOptions<BalanceResponseDto>) {
  return useQuery({
    queryKey: ['balance'],
    queryFn: () => api.getBalance(),
    ...options,
  });
}

export function useExpensesByCategory(
  query?: ReportQueryDto,
  options?: UseQueryOptions<ExpensesByCategoryResponseDto>
) {
  return useQuery({
    queryKey: ['expenses-by-category', query],
    queryFn: () => api.getExpensesByCategory(query),
    ...options,
  });
}

export function useSummary(
  query?: ReportQueryDto,
  options?: UseQueryOptions<ReportResponseDto>
) {
  return useQuery({
    queryKey: ['summary', query],
    queryFn: () => api.getSummary(query),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Audit Hooks
// ---------------------------------------------------------------------------

export function useAuditLogs(
  query?: AuditQueryDto,
  options?: UseQueryOptions<PaginatedResponse<AuditLogResponseDto>>
) {
  return useQuery({
    queryKey: ['audit', query],
    queryFn: () => api.listAuditLogs(query),
    ...options,
  });
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/**
 * Example 1: Fetch transactions with pagination
 *
 * function TransactionList() {
 *   const { data, isLoading, error } = useTransactions({ page: 1, limit: 20 });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       {data.data.map(tx => (
 *         <TransactionCard key={tx.id} transaction={tx} />
 *       ))}
 *     </div>
 *   );
 * }
 */

/**
 * Example 2: Create transaction with mutation
 *
 * function CreateTransactionForm() {
 *   const { mutate, isLoading } = useCreateTransaction({
 *     onSuccess: () => {
 *       toast.success('Transaction created!');
 *       navigate('/transactions');
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 *
 *   const handleSubmit = (data: CreateTransactionDto) => {
 *     mutate(data);
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 */

/**
 * Example 3: Optimistic update with approve
 *
 * function ApproveButton({ transactionId }: { transactionId: string }) {
 *   const { mutate, isLoading } = useApproveTransaction();
 *
 *   return (
 *     <button onClick={() => mutate(transactionId)} disabled={isLoading}>
 *       {isLoading ? 'Approving...' : 'Approve'}
 *     </button>
 *   );
 * }
 */
