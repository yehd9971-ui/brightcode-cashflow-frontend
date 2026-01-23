import api from '@/lib/api';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  RejectTransactionDto,
  DeleteTransactionDto,
  TransactionQueryDto,
  TransactionResponseDto,
  TransactionList,
  Role,
  TransactionType,
  ImportResultDto,
} from '@/types/api';

export async function getTransactions(query?: TransactionQueryDto): Promise<TransactionList> {
  const response = await api.get<TransactionList>('/transactions', { params: query });
  return response.data;
}

export async function getTransactionById(id: string): Promise<TransactionResponseDto> {
  const response = await api.get<TransactionResponseDto>(`/transactions/${id}`);
  return response.data;
}

export async function createTransaction(
  data: CreateTransactionDto,
  files: File[],
  userRole?: Role
): Promise<TransactionResponseDto> {
  // Security check: SALES users cannot create OUT (expense) transactions
  if (userRole === Role.SALES && data.type === TransactionType.OUT) {
    throw new Error('Sales users are not authorized to create expense transactions');
  }

  // FIX #2: Clean FormData - ONLY required fields
  const formData = new FormData();

  // Backend expects these EXACT 4 fields in DTO: type, amount, description, category
  // Key names MUST match backend CreateTransactionDto properties
  formData.append('type', data.type);

  // Financial Precision: Format amount as string with exactly 2 decimal places
  formData.append('amount', data.amount.toFixed(2));

  formData.append('description', data.description);

  // Append optional category only if provided
  if (data.category) {
    formData.append('category', data.category);
  }

  // Append optional customer details only if provided
  if (data.customerName?.trim()) {
    formData.append('customerName', data.customerName.trim());
  }

  if (data.phoneNumber?.trim()) {
    formData.append('phoneNumber', data.phoneNumber.trim());
  }

  // FIX #1: Backend uses FileInterceptor('file', ...) - key MUST be 'file' (singular)
  // This is consumed by @UploadedFile() decorator, NOT included in DTO
  if (files.length > 0) {
    formData.append('file', files[0]);
  }

  // FIX #3: Override default 'application/json' Content-Type
  // Axios instance has default 'Content-Type': 'application/json' (see api.ts:33)
  // We MUST explicitly override it to let axios auto-set multipart/form-data with boundary
  // Setting to undefined removes the default and lets axios handle FormData correctly
  const response = await api.post<TransactionResponseDto>(
    '/transactions',
    formData,
    {
      headers: {
        // CRITICAL: Override default JSON Content-Type to let axios auto-set multipart
        'Content-Type': undefined,
      },
    }
  );

  // Upload remaining files (if any) to attachments endpoint
  const transaction = response.data;
  if (files.length > 1) {
    const remainingFiles = files.slice(1);
    for (const file of remainingFiles) {
      await uploadAttachment(transaction.id, file);
    }
  }

  return transaction;
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionDto
): Promise<TransactionResponseDto> {
  const response = await api.patch<TransactionResponseDto>(`/transactions/${id}`, data);
  return response.data;
}

export async function approveTransaction(id: string): Promise<TransactionResponseDto> {
  const response = await api.post<TransactionResponseDto>(`/transactions/${id}/approve`);
  return response.data;
}

export async function rejectTransaction(
  id: string,
  data: RejectTransactionDto
): Promise<TransactionResponseDto> {
  const response = await api.post<TransactionResponseDto>(`/transactions/${id}/reject`, data);
  return response.data;
}

export async function deleteTransaction(id: string, data: DeleteTransactionDto): Promise<void> {
  await api.delete(`/transactions/${id}`, { data });
}

export async function uploadAttachment(
  transactionId: string,
  file: File
): Promise<TransactionResponseDto> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<TransactionResponseDto>(
    `/transactions/${transactionId}/attachments`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function downloadAttachment(attachmentId: string): Promise<Blob> {
  const response = await api.get(`/attachments/${attachmentId}`, {
    responseType: 'blob',
  });

  // VALIDATION: Check Content-Type header
  const contentType = response.headers['content-type'] || '';

  if (!contentType) {
    throw new Error('Backend response missing Content-Type header');
  }

  // Detect HTML error pages
  if (contentType.includes('text/html')) {
    throw new Error('Backend returned HTML page instead of attachment. Possible auth redirect.');
  }

  // Detect JSON error responses
  if (contentType.includes('application/json')) {
    const text = await response.data.text();
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || 'Backend returned JSON error response');
    } catch {
      throw new Error('Backend returned JSON instead of file attachment');
    }
  }

  return response.data;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await api.delete(`/attachments/${attachmentId}`);
}

/**
 * Removes empty, null, and undefined values from query parameters
 * to prevent 400 errors from backend validation
 */
function cleanQueryParams<T extends object>(params?: T): Partial<T> | undefined {
  if (!params) return undefined;

  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(params)) {
    // Only include non-empty, non-null, non-undefined values
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key as keyof T] = value as T[keyof T];
    }
  }

  // Return undefined if no valid params (cleaner URL)
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export async function exportTransactionsCSV(query?: TransactionQueryDto): Promise<Blob> {
  const response = await api.get('/reports/export/csv', {
    params: cleanQueryParams(query),
    responseType: 'blob',
  });
  return response.data;
}

export async function exportTransactionsExcel(query?: TransactionQueryDto): Promise<Blob> {
  // Ensure we always have date parameters to get transaction data (not summary)
  const params = {
    ...query,
    startDate: query?.startDate || '2020-01-01',
    endDate: query?.endDate || new Date().toISOString().split('T')[0],
  };

  const response = await api.get('/reports/export', {
    params: cleanQueryParams(params),
    responseType: 'blob',
  });
  return response.data;
}

export async function importTransactions(file: File): Promise<ImportResultDto> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ImportResultDto>(
    '/transactions/import',
    formData,
    {
      headers: {
        'Content-Type': undefined, // Let axios set multipart boundary
      },
      timeout: 120000, // 2 min timeout for large files (up to 1000 rows, 10MB)
    }
  );
  return response.data;
}
