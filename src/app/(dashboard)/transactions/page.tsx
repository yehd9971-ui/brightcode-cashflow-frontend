'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Eye, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions, exportTransactionsCSV, exportTransactionsExcel } from '@/lib/services/transactions';
import {
  TransactionType,
  TransactionStatus,
  TransactionCategory,
  TransactionQueryDto,
} from '@/types/api';
import { formatAmount, formatDateShort, truncateText } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: TransactionType.IN, label: 'IN (Income)' },
  { value: TransactionType.OUT, label: 'OUT (Expense)' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: TransactionStatus.PENDING, label: 'Pending' },
  { value: TransactionStatus.APPROVED, label: 'Approved' },
  { value: TransactionStatus.REJECTED, label: 'Rejected' },
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  ...Object.values(TransactionCategory).map((cat) => ({
    value: cat,
    label: cat.charAt(0) + cat.slice(1).toLowerCase(),
  })),
];

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();

  const [filters, setFilters] = useState<TransactionQueryDto>({
    page: Number(searchParams.get('page')) || 1,
    limit: 20,
    type: (searchParams.get('type') as TransactionType) || undefined,
    status: (searchParams.get('status') as TransactionStatus) || undefined,
    category: (searchParams.get('category') as TransactionCategory) || undefined,
    search: searchParams.get('search') || '',
  });

  const [isExporting, setIsExporting] = useState<'csv' | 'excel' | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => getTransactions(filters),
  });

  const transactions = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / (filters.limit || 20));
  const totalAmount = data?.totalAmount ?? 0; // Total sum of filtered transactions

  const handleFilterChange = (key: keyof TransactionQueryDto, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined,
      page: 1, // Reset to page 1 on filter change
    };
    setFilters(newFilters);
    updateUrl(newFilters);
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    updateUrl(newFilters);
  };

  const updateUrl = (newFilters: TransactionQueryDto) => {
    const params = new URLSearchParams();
    if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.type) params.set('type', newFilters.type);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.search) params.set('search', newFilters.search);

    const queryString = params.toString();
    router.push(queryString ? `/transactions?${queryString}` : '/transactions', { scroll: false });
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsExporting(format);
    try {
      const exportFilters = {
        type: filters.type,
        status: filters.status,
        category: filters.category,
        search: filters.search,
      };

      const blob = format === 'csv'
        ? await exportTransactionsCSV(exportFilters)
        : await exportTransactionsExcel(exportFilters);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">
            {isAdmin ? 'Manage all transactions' : 'View your transactions'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null || transactions.length === 0}
          >
            {isExporting === 'csv' ? (
              'Exporting...'
            ) : (
              <>
                <Download className="w-4 h-4 me-2" />
                Export CSV
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null || transactions.length === 0}
          >
            {isExporting === 'excel' ? (
              'Exporting...'
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 me-2" />
                Export Excel
              </>
            )}
          </Button>
          <Link href="/transactions/new">
            <Button>
              <Plus className="w-4 h-4 me-2" />
              New Transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="ps-10"
              />
            </div>
          </div>

          <Select
            options={typeOptions}
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            placeholder="Type"
          />

          <Select
            options={statusOptions}
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            placeholder="Status"
          />

          <Select
            options={categoryOptions}
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            placeholder="Category"
          />
        </div>
      </Card>

      {/* Summary Section */}
      {!isLoading && transactions.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Total Amount {(filters.type || filters.status || filters.category || filters.search) && '(Filtered)'}
              </h3>
              <p className="text-3xl font-bold text-gray-900">
                {formatAmount(totalAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Based on {data?.total || 0} transaction{(data?.total || 0) !== 1 ? 's' : ''}
                {filters.type && ` · Type: ${filters.type}`}
                {filters.status && ` · Status: ${filters.status}`}
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </Card>
      )}

      {/* Transactions Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description={
              filters.search || filters.type || filters.status || filters.category
                ? 'Try adjusting your filters'
                : 'Create your first transaction to get started'
            }
            action={
              !filters.search && !filters.type && !filters.status && !filters.category ? (
                <Link href="/transactions/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 me-2" />
                    New Transaction
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilters({ page: 1, limit: 20 });
                    router.push('/transactions');
                  }}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                      Transaction
                    </th>
                    <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                      Date
                    </th>
                    <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                      Type
                    </th>
                    <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                      Category
                    </th>
                    <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                      Description
                    </th>
                    <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                      Customer
                    </th>
                    <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                      Phone
                    </th>
                    <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">
                      Amount
                    </th>
                    <th className="text-center text-sm font-medium text-gray-500 px-4 py-3">
                      Status
                    </th>
                    {isAdmin && (
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Created By
                      </th>
                    )}
                    <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {tx.transactionNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateShort(tx.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={tx.type} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                        {truncateText(tx.description, 50)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.customerName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.phoneNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-end text-sm font-medium text-gray-900">
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={tx.status} size="sm" />
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {tx.createdBy.email}
                        </td>
                      )}
                      <td className="px-4 py-3 text-end">
                        <Link href={`/transactions/${tx.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 border-t border-gray-200">
              <Pagination
                currentPage={filters.page || 1}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={isFetching}
                total={data?.total || 0}
                limit={filters.limit || 20}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
