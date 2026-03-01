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
  getSalesComparison,
  exportToExcel,
  exportToCsv,
  downloadBlob,
} from '@/lib/services/reports';
import { getUsers } from '@/lib/services/users';
import { ReportQueryDto, TransactionStatus, UserResponseDto } from '@/types/api';
import { formatAmount, formatDateShort } from '@/utils/formatters';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Loading';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/api';
import { cn } from '@/utils/cn';

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
  });

  const [selectedMember, setSelectedMember] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('APPROVED');
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  // Validate date range: endDate must be >= startDate
  const dateRangeError =
    dateRange.endDate < dateRange.startDate
      ? 'End date must be after or equal to start date'
      : '';

  // Fetch all users for dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users', 'members-dropdown'],
    queryFn: () => getUsers({ limit: 100 }),
  });

  const allUsers = usersData?.data || [];
  const salesUsers = allUsers.filter((u: UserResponseDto) => u.role === Role.SALES);
  const adminUsers = allUsers.filter((u: UserResponseDto) => u.role === Role.ADMIN);

  // Parse selected member value: could be a user ID, "role:SALES", or "role:ADMIN"
  const isRoleFilter = selectedMember.startsWith('role:');
  const selectedRole = isRoleFilter ? (selectedMember.split(':')[1] as Role) : undefined;
  const selectedUserId = isRoleFilter ? undefined : selectedMember || undefined;

  // Build query with filters
  const memberFilter: Partial<ReportQueryDto> = {};
  if (selectedUserId) {
    memberFilter.createdById = selectedUserId;
  } else if (selectedRole) {
    memberFilter.createdByRole = selectedRole;
  }

  const query: ReportQueryDto = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...memberFilter,
    ...(selectedStatus ? { status: selectedStatus as TransactionStatus } : {}),
  };

  // Balance query (includes user filter and status)
  const balanceQuery: ReportQueryDto = {
    ...memberFilter,
    ...(selectedStatus ? { status: selectedStatus as TransactionStatus } : {}),
  };

  // Selected user email for display
  const selectedUserEmail = allUsers.find((u: UserResponseDto) => u.id === selectedUserId)?.email;
  const selectedMemberLabel = selectedRole
    ? `All ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}s`
    : selectedUserEmail;

  // Fetch balance (ADMIN only)
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['reports', 'balance', balanceQuery],
    queryFn: () => getBalance(balanceQuery),
    enabled: isAdmin,
  });

  // Fetch summary for date range
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports', 'summary', query],
    queryFn: () => getSummary(query),
  });

  // Fetch expenses by category (ADMIN only)
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['reports', 'expenses', query],
    queryFn: () => getExpensesByCategory(query),
    enabled: isAdmin,
  });

  // Fetch sales comparison (lazy — only when tab is active)
  const comparisonQuery: ReportQueryDto = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...(selectedStatus ? { status: selectedStatus as TransactionStatus } : {}),
  };

  const { data: comparison, isLoading: comparisonLoading } = useQuery({
    queryKey: ['reports', 'sales-comparison', comparisonQuery],
    queryFn: () => getSalesComparison(comparisonQuery),
    enabled: activeTab === 'comparison',
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

  const statusOptions = [
    { value: 'APPROVED', label: 'Approved' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: '', label: 'All Statuses' },
  ];

  const memberTopOptions = [
    { value: '', label: 'All Members' },
  ];

  const memberGroups = [
    {
      label: 'Sales Members',
      options: [
        { value: 'role:SALES', label: 'All Sales Members' },
        ...salesUsers.map((u: UserResponseDto) => ({ value: u.id, label: u.email })),
      ],
    },
    ...(isAdmin
      ? [{
          label: 'Admins',
          options: [
            { value: 'role:ADMIN', label: 'All Admins' },
            ...adminUsers.map((u: UserResponseDto) => ({ value: u.id, label: u.email })),
          ],
        }]
      : []),
  ];

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SALES_MANAGER]}>
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

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Select
              label="Member"
              options={memberTopOptions}
              groups={memberGroups}
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            />
            <Select
              label="Status"
              options={statusOptions}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            />
          </div>
        </Card>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200">
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'comparison'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            onClick={() => setActiveTab('comparison')}
          >
            Sales Comparison
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* All-Time Balance (ADMIN only) */}
            {isAdmin && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedMemberLabel
                  ? `Balance: ${selectedMemberLabel}`
                  : 'Current Balance (All Time)'}
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
            )}

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

            {/* Expenses by Category (ADMIN only) */}
            {isAdmin && (
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
            )}
          </>
        )}

        {/* Sales Comparison Tab */}
        {activeTab === 'comparison' && (
          <Card title="Sales Members Comparison">
            {comparisonLoading ? (
              <TableSkeleton rows={5} />
            ) : comparison && comparison.members.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sales Member
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total IN
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total OUT
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Cashflow
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IN Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        OUT Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Txns
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {comparison.members.map((member) => (
                      <tr key={member.userId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {member.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                          {formatAmount(member.totalIn)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                          {formatAmount(member.totalOut)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          <span
                            className={
                              parseFloat(member.netCashflow) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {formatAmount(member.netCashflow)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {member.countIn}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {member.countOut}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {member.totalCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        Totals
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-700">
                        {formatAmount(comparison.totals.totalIn)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-700">
                        {formatAmount(comparison.totals.totalOut)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span
                          className={
                            parseFloat(comparison.totals.netCashflow) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                          }
                        >
                          {formatAmount(comparison.totals.netCashflow)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {comparison.totals.countIn}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {comparison.totals.countOut}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {comparison.totals.totalCount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No sales member data available
              </p>
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
