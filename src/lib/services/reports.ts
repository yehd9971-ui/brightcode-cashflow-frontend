import api from '@/lib/api';
import {
  ReportQueryDto,
  BalanceResponseDto,
  ReportResponseDto,
  ExpensesByCategoryResponseDto,
  SalesComparisonResponseDto,
} from '@/types/api';

export async function getBalance(query?: ReportQueryDto): Promise<BalanceResponseDto> {
  const response = await api.get<BalanceResponseDto>('/reports/balance', { params: query });
  return response.data;
}

export async function getSummary(query?: ReportQueryDto): Promise<ReportResponseDto> {
  const response = await api.get<ReportResponseDto>('/reports/summary', { params: query });
  return response.data;
}

export async function getExpensesByCategory(
  query?: ReportQueryDto
): Promise<ExpensesByCategoryResponseDto> {
  const response = await api.get<ExpensesByCategoryResponseDto>('/reports/expenses-by-category', {
    params: query,
  });
  return response.data;
}

export async function exportToExcel(query?: ReportQueryDto): Promise<Blob> {
  const response = await api.get('/reports/export', {
    params: query,
    responseType: 'blob',
  });
  return response.data;
}

export async function exportToCsv(query?: ReportQueryDto): Promise<Blob> {
  // Only pass date range for summary report, not transaction-specific filters
  const summaryParams = query ? {
    startDate: query.startDate,
    endDate: query.endDate,
  } : undefined;

  const response = await api.get('/reports/export/csv', {
    params: summaryParams,
    responseType: 'blob',
  });
  return response.data;
}

export async function getSalesComparison(query?: ReportQueryDto): Promise<SalesComparisonResponseDto> {
  const response = await api.get<SalesComparisonResponseDto>('/reports/sales-comparison', { params: query });
  return response.data;
}

export async function getMySummary(query?: ReportQueryDto): Promise<ReportResponseDto> {
  const response = await api.get<ReportResponseDto>('/reports/my-summary', { params: query });
  return response.data;
}

// Helper function to download blob as file
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
