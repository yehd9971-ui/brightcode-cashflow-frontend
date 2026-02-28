'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Clock, AlertTriangle } from 'lucide-react';
import { getAttendanceHistory, getAttendanceSummary } from '@/lib/services/attendance';
import { getMySummary } from '@/lib/services/reports';
import { Role } from '@/types/api';
import { formatAmount, formatDateShort } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { cn } from '@/utils/cn';

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function MyReportsPage() {
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
  });
  const [activeTab, setActiveTab] = useState<'attendance' | 'transactions'>('attendance');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch personal attendance history
  const { data: historyData, isLoading: historyLoading, isFetching: historyFetching } = useQuery({
    queryKey: ['my-attendance', 'history', { page, limit, ...dateRange }],
    queryFn: () =>
      getAttendanceHistory({
        page,
        limit,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    enabled: activeTab === 'attendance',
  });

  // Fetch personal attendance summary
  const { data: attendanceSummary, isLoading: attendanceSummaryLoading } = useQuery({
    queryKey: ['my-attendance', 'summary', dateRange],
    queryFn: () =>
      getAttendanceSummary({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    enabled: activeTab === 'attendance',
  });

  // Fetch personal transaction summary
  const { data: txSummary, isLoading: txSummaryLoading } = useQuery({
    queryKey: ['my-reports', 'summary', dateRange],
    queryFn: () =>
      getMySummary({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    enabled: activeTab === 'transactions',
  });

  const sessions = historyData?.data || [];
  const totalPages = Math.ceil((historyData?.total || 0) / limit);

  return (
    <ProtectedRoute requiredRoles={[Role.SALES, Role.SALES_MANAGER]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
          <p className="text-gray-500">View your personal attendance and transaction data</p>
        </div>

        {/* Date Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="From Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => {
                setDateRange({ ...dateRange, startDate: e.target.value });
                setPage(1);
              }}
            />
            <Input
              label="To Date"
              type="date"
              value={dateRange.endDate}
              min={dateRange.startDate}
              onChange={(e) => {
                setDateRange({ ...dateRange, endDate: e.target.value });
                setPage(1);
              }}
            />
          </div>
        </Card>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200">
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
            onClick={() => setActiveTab('attendance')}
          >
            My Attendance
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'transactions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
            onClick={() => setActiveTab('transactions')}
          >
            My Transactions
          </button>
        </div>

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <>
            {/* Attendance Summary Stats */}
            {attendanceSummaryLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : attendanceSummary ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Days Worked</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceSummary.totalDaysWorked}</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceSummary.totalHoursFormatted}</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Avg Hours/Day</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatMinutesToHours(attendanceSummary.averageMinutesPerDay)}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Total Minutes</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceSummary.totalMinutes}</p>
                  </div>
                </Card>
              </div>
            ) : null}

            {/* Attendance History */}
            <Card title="Attendance History" padding="none">
              {historyLoading ? (
                <div className="p-4">
                  <TableSkeleton rows={5} />
                </div>
              ) : sessions.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">Date</th>
                          <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">Clock In</th>
                          <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">Clock Out</th>
                          <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">Duration</th>
                          <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sessions.map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{formatDateShort(session.clockIn)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{formatTime(session.clockIn)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {session.clockOut ? formatTime(session.clockOut) : (
                                <Badge variant="success">Active</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-end font-medium text-gray-900">
                              {session.durationMinutes != null
                                ? formatMinutesToHours(session.durationMinutes)
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-end">
                              {session.autoClosedAt ? (
                                <Badge variant="warning">
                                  <AlertTriangle className="w-3 h-3 me-1 inline" />
                                  Auto-closed
                                </Badge>
                              ) : session.clockOut ? (
                                <Badge variant="neutral">Completed</Badge>
                              ) : (
                                <Badge variant="success">
                                  <Clock className="w-3 h-3 me-1 inline" />
                                  Active
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 border-t border-gray-200">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      loading={historyFetching}
                      total={historyData?.total || 0}
                      limit={limit}
                    />
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No attendance records"
                  description="Your attendance history will appear here once you start clocking in"
                />
              )}
            </Card>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            {txSummaryLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : txSummary ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <div className="p-2 bg-green-50 rounded-lg text-center">
                      <p className="text-sm text-green-600">Income</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatAmount(txSummary.summary.totalIn)}
                      </p>
                      <p className="text-xs text-green-600">{txSummary.summary.countIn} transactions</p>
                    </div>
                  </Card>
                  <Card>
                    <div className="p-2 bg-red-50 rounded-lg text-center">
                      <p className="text-sm text-red-600">Expenses</p>
                      <p className="text-xl font-bold text-red-700">
                        {formatAmount(txSummary.summary.totalOut)}
                      </p>
                      <p className="text-xs text-red-600">{txSummary.summary.countOut} transactions</p>
                    </div>
                  </Card>
                  <Card>
                    <div className="p-2 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-blue-600">Net Cashflow</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatAmount(txSummary.summary.netCashflow)}
                      </p>
                    </div>
                  </Card>
                  <Card>
                    <div className="p-2 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-bold text-gray-700">{txSummary.summary.totalCount}</p>
                      <p className="text-xs text-gray-500">transactions</p>
                    </div>
                  </Card>
                </div>

                {/* Daily Totals */}
                {txSummary.dailyTotals.length > 0 && (
                  <Card title="Daily Breakdown" padding="none">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">Date</th>
                            <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">Income</th>
                            <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">Expenses</th>
                            <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {txSummary.dailyTotals.map((day) => (
                            <tr key={day.date} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{day.date}</td>
                              <td className="px-4 py-3 text-sm text-end text-green-600 font-medium">
                                {formatAmount(day.totalIn)}
                              </td>
                              <td className="px-4 py-3 text-sm text-end text-red-600 font-medium">
                                {formatAmount(day.totalOut)}
                              </td>
                              <td className="px-4 py-3 text-sm text-end font-medium">
                                <span className={parseFloat(day.net) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatAmount(day.net)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
