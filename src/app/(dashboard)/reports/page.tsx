'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FileSpreadsheet, FileDown, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getBalance,
  getSummary,
  getExpensesByCategory,
  exportToExcel,
  exportToCsv,
  downloadBlob,
} from '@/lib/services/reports';
import { ReportQueryDto } from '@/types/api';
import { formatAmount, formatDateShort } from '@/utils/formatters';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Loading';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Role } from '@/types/api';

export default function ReportsPage() {
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
  });

  const [isExporting, setIsExporting] = useState(false);

  // Validate date range: endDate must be >= startDate
  const dateRangeError =
    dateRange.endDate < dateRange.startDate
      ? 'End date must be after or equal to start date'
      : '';

  const query: ReportQueryDto = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  };

  // Fetch balance (all-time)
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['reports', 'balance'],
    queryFn: getBalance,
  });

  // Fetch summary for date range
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports', 'summary', query],
    queryFn: () => getSummary(query),
  });

  // Fetch expenses by category
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['reports', 'expenses', query],
    queryFn: () => getExpensesByCategory(query),
  });

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await exportToExcel(query);
      const filename = `cashflow-report-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`;
      downloadBlob(blob, filename);
      toast.success('Excel report downloaded');
    } catch {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await exportToCsv(query);
      const filename = `cashflow-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      downloadBlob(blob, filename);
      toast.success('CSV report downloaded');
    } catch {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const getMaxExpense = () => {
    if (!expenses?.categories.length) return 1;
    return Math.max(...expenses.categories.map((c) => parseFloat(c.total)));
  };

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-500">View financial summaries and export data</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              loading={isExporting}
              disabled={isExporting}
            >
              <FileDown className="w-4 h-4 me-2" />
              CSV
            </Button>
            <Button
              onClick={handleExportExcel}
              loading={isExporting}
              disabled={isExporting}
            >
              <FileSpreadsheet className="w-4 h-4 me-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <Input
              label="From Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
            />
            <Input
              label="To Date"
              type="date"
              value={dateRange.endDate}
              min={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              error={dateRangeError}
            />
          </div>
        </Card>

        {/* All-Time Balance */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Current Balance (All Time)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {balanceLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : balance ? (
              <>
                <StatCard
                  title="Total Income"
                  value={formatAmount(balance.totalIn)}
                  icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                />
                <StatCard
                  title="Total Expenses"
                  value={formatAmount(balance.totalOut)}
                  icon={<TrendingDown className="w-6 h-6 text-red-600" />}
                />
                <StatCard
                  title="Net Balance"
                  value={formatAmount(balance.netBalance)}
                  subtitle={`As of ${formatDateShort(balance.asOf)}`}
                  icon={<Wallet className="w-6 h-6 text-blue-600" />}
                />
              </>
            ) : null}
          </div>
        </div>

        {/* Period Summary */}
        <Card
          title={`Period Summary (${formatDateShort(dateRange.startDate)} - ${formatDateShort(dateRange.endDate)})`}
        >
          {summaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Income</p>
                <p className="text-xl font-bold text-green-700">
                  {formatAmount(summary.summary.totalIn)}
                </p>
                <p className="text-xs text-green-600">
                  {summary.summary.countIn} transactions
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">Expenses</p>
                <p className="text-xl font-bold text-red-700">
                  {formatAmount(summary.summary.totalOut)}
                </p>
                <p className="text-xs text-red-600">
                  {summary.summary.countOut} transactions
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Net Cashflow</p>
                <p className="text-xl font-bold text-blue-700">
                  {formatAmount(summary.summary.netCashflow)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-xl font-bold text-gray-700">
                  {summary.summary.totalCount}
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        {/* Expenses by Category */}
        <Card title="Expenses by Category">
          {expensesLoading ? (
            <TableSkeleton rows={5} />
          ) : expenses && expenses.categories.length > 0 ? (
            <div className="space-y-4">
              {expenses.categories.map((category) => {
                const percentage =
                  (parseFloat(category.total) / getMaxExpense()) * 100;

                return (
                  <div key={category.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {category.category}
                      </span>
                      <span className="text-gray-500">
                        {formatAmount(category.total)} ({category.count} txns)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Grand Total</span>
                  <span className="font-bold text-gray-900">
                    {formatAmount(expenses.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No expense data for selected period
            </p>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
