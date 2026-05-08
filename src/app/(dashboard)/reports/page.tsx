'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  FileDown,
  Flame,
  Percent,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getBalance,
  getSummary,
  getExpensesByCategory,
  getSalesComparison,
  getCrmReport,
  exportToExcel,
  exportToCsv,
  downloadBlob,
} from '@/lib/services/reports';
import { getUsers } from '@/lib/services/users';
import { CRM_STAGE_OPTIONS, crmStageLabel } from '@/lib/crm-stages';
import { CrmReportQueryDto, CrmStage, ReportQueryDto, TransactionStatus, UserResponseDto } from '@/types/api';
import { formatAmount, formatDateShort } from '@/utils/formatters';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'crm'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const [crmOwnerId, setCrmOwnerId] = useState('');
  const [crmStage, setCrmStage] = useState('');
  const [crmPriority, setCrmPriority] = useState('');
  const [crmStaleDays, setCrmStaleDays] = useState('7');

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
  const salesUsers = allUsers.filter((u: UserResponseDto) => u.role === Role.SALES || u.role === Role.SALES_MANAGER);
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
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useQuery({
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

  const crmReportQuery: CrmReportQueryDto = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ownerId: crmOwnerId || undefined,
    stage: crmStage ? (crmStage as CrmStage) : undefined,
    priority: crmPriority ? Number(crmPriority) : undefined,
    staleDays: crmStaleDays ? Number(crmStaleDays) : 7,
    page: 1,
    limit: 20,
  };

  const {
    data: crmReport,
    isLoading: crmReportLoading,
    isError: crmReportError,
    refetch: refetchCrmReport,
  } = useQuery({
    queryKey: ['reports', 'crm', crmReportQuery],
    queryFn: () => getCrmReport(crmReportQuery),
    enabled: activeTab === 'crm',
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

  const crmStageOptions = [
    { value: '', label: 'All Stages' },
    ...CRM_STAGE_OPTIONS,
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: '1', label: 'Low' },
    { value: '2', label: 'Normal' },
    { value: '3', label: 'High' },
    { value: '4', label: 'Urgent' },
  ];

  if (summaryError) return <ErrorState message="Unable to load data" onRetry={refetchSummary} />;

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
          <button
            data-testid="crm-reports-tab"
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'crm'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            onClick={() => setActiveTab('crm')}
          >
            CRM
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

        {activeTab === 'crm' && (
          <div data-testid="crm-reports-page" className="space-y-6">
            <Card>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  data-testid="crm-report-employee-filter"
                  label="Employee"
                  options={[{ value: '', label: 'All Employees' }]}
                  groups={[{
                    label: 'Sales Members',
                    options: salesUsers.map((u: UserResponseDto) => ({ value: u.id, label: u.email })),
                  }]}
                  value={crmOwnerId}
                  onChange={(e) => setCrmOwnerId(e.target.value)}
                />
                <Select
                  data-testid="crm-report-stage-filter"
                  label="Stage"
                  options={crmStageOptions}
                  value={crmStage}
                  onChange={(e) => setCrmStage(e.target.value)}
                />
                <Select
                  data-testid="crm-report-priority-filter"
                  label="Priority"
                  options={priorityOptions}
                  value={crmPriority}
                  onChange={(e) => setCrmPriority(e.target.value)}
                />
                <Input
                  label="Stale Days"
                  type="number"
                  min="1"
                  max="90"
                  value={crmStaleDays}
                  onChange={(e) => setCrmStaleDays(e.target.value)}
                />
              </div>
            </Card>

            {crmReportError && (
              <ErrorState message="Unable to load CRM reports" onRetry={() => refetchCrmReport()} />
            )}

            {crmReportLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : crmReport ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                  <div data-testid="crm-report-overdue-card">
                    <StatCard
                      title="Overdue Tasks"
                      value={crmReport.cards.overdueTasks}
                      icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
                    />
                  </div>
                  <div data-testid="crm-report-hot-card">
                    <StatCard
                      title="Hot Leads"
                      value={crmReport.cards.hotLeads}
                      icon={<Flame className="h-6 w-6 text-orange-600" />}
                    />
                  </div>
                  <div data-testid="crm-report-stale-card">
                    <StatCard
                      title="Stale Leads"
                      value={crmReport.cards.staleLeads}
                      icon={<Clock className="h-6 w-6 text-yellow-600" />}
                    />
                  </div>
                  <StatCard
                    title="Hot Without Action"
                    value={crmReport.cards.hotLeadsWithoutFollowUp}
                    icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
                  />
                  <StatCard
                    title="Avg Completion"
                    value={`${crmReport.cards.averageCompletionHours}h`}
                    icon={<Clock className="h-6 w-6 text-blue-600" />}
                  />
                  <StatCard
                    title="Hot Conversion"
                    value={`${crmReport.cards.hotLeadConversionRate}%`}
                    subtitle={`${crmReport.hotLeadConversion.soldFromHotLeadCount}/${crmReport.hotLeadConversion.hotLeadCount} sold`}
                    icon={<Percent className="h-6 w-6 text-green-600" />}
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Card title="Overdue Tasks by Employee">
                    <div data-testid="crm-report-overdue-table" className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Employee
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                              Overdue
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {crmReport.overdueByEmployee.map((row) => (
                            <tr key={row.userId}>
                              <td className="px-4 py-3 text-sm text-gray-900">{row.email}</td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                                {row.count}
                              </td>
                            </tr>
                          ))}
                          {crmReport.overdueByEmployee.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-500">
                                No overdue tasks
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card title="Stale Leads by Stage">
                    <div data-testid="crm-report-stale-stage-table" className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Stage
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                              Leads
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {crmReport.staleLeadsByStage.map((row) => (
                            <tr key={row.stage}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {crmStageLabel(row.stage)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-yellow-700">
                                {row.count}
                              </td>
                            </tr>
                          ))}
                          {crmReport.staleLeadsByStage.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-500">
                                No stale leads
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                <Card title="Hot Leads Without Follow-up">
                  <div data-testid="crm-report-hot-no-action-table" className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Phone
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Client
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Owner
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Last Contacted
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                            Priority
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {crmReport.hotLeadsWithoutFollowUp.map((lead) => (
                          <tr key={lead.id}>
                            <td className="px-4 py-3 font-mono text-sm text-blue-700">{lead.phoneNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{lead.clientName || 'Unnamed'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{lead.ownerEmail || 'Unassigned'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {lead.lastContactedAt ? formatDateShort(lead.lastContactedAt) : 'None'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {lead.priority ?? 'Normal'}
                            </td>
                          </tr>
                        ))}
                        {crmReport.hotLeadsWithoutFollowUp.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                              No hot leads without follow-up
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            ) : null}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
