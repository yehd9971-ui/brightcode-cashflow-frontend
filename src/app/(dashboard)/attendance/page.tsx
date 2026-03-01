'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAttendanceHistory, getAttendanceSummary, getActiveSessions } from '@/lib/services/attendance';
import { getUsers } from '@/lib/services/users';
import { Role, UserResponseDto } from '@/types/api';
import { formatDateShort } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
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

function formatDuration(clockInStr: string): string {
  const diff = Date.now() - new Date(clockInStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
  });
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'summary' | 'detail'>('summary');
  const limit = 20;

  // Fetch users for dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users', 'attendance-dropdown'],
    queryFn: () => getUsers({ limit: 100 }),
  });

  const allUsers = usersData?.data || [];
  const employeeUsers = allUsers.filter(
    (u: UserResponseDto) => u.role === Role.SALES || u.role === Role.SALES_MANAGER,
  );

  const employeeOptions = [
    { value: '', label: 'All Employees' },
    ...employeeUsers.map((u: UserResponseDto) => ({
      value: u.id,
      label: `${u.email} (${u.role})`,
    })),
  ];

  // Fetch attendance history
  const { data: historyData, isLoading: historyLoading, isFetching: historyFetching } = useQuery({
    queryKey: ['attendance', 'history', { page, limit, ...dateRange, userId: selectedEmployee }],
    queryFn: () =>
      getAttendanceHistory({
        page,
        limit,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        userId: selectedEmployee || undefined,
      }),
    enabled: activeTab === 'detail',
  });

  // Fetch attendance summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['attendance', 'summary', { ...dateRange, userId: selectedEmployee }],
    queryFn: () =>
      getAttendanceSummary({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        userId: selectedEmployee || undefined,
      }),
    enabled: activeTab === 'summary',
  });

  // Fetch active sessions (who is online now)
  const { data: activeSessions, isLoading: activeLoading } = useQuery({
    queryKey: ['attendance', 'active-sessions'],
    queryFn: getActiveSessions,
  });

  const sessions = historyData?.data || [];
  const totalPages = Math.ceil((historyData?.total || 0) / limit);

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SALES_MANAGER]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
          <p className="text-gray-500">View employee attendance records and summaries</p>
        </div>

        {/* Who is Online Now */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                {activeLoading ? '...' : (activeSessions?.length || 0)} Online Now
              </h2>
            </div>

            {activeLoading ? (
              <TableSkeleton rows={3} />
            ) : activeSessions && activeSessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-green-100/50 border-b border-green-200">
                    <tr>
                      <th className="text-start text-sm font-medium text-gray-600 px-4 py-2">Email</th>
                      <th className="text-start text-sm font-medium text-gray-600 px-4 py-2">Clock In</th>
                      <th className="text-end text-sm font-medium text-gray-600 px-4 py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-100">
                    {activeSessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{session.userEmail}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{formatTime(session.clockIn)}</td>
                        <td className="px-4 py-2 text-sm text-end font-medium text-gray-900">{formatDuration(session.clockIn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No one is currently online</p>
            )}
          </div>
        </Card>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Select
              label="Employee"
              options={employeeOptions}
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
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
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'detail'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
            onClick={() => setActiveTab('detail')}
          >
            Detail
          </button>
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <>
            {summaryLoading ? (
              <Card>
                <TableSkeleton rows={5} />
              </Card>
            ) : summaryData ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Card>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Days Worked</p>
                      <p className="text-2xl font-bold text-gray-900">{summaryData.totalDaysWorked}</p>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Hours</p>
                      <p className="text-2xl font-bold text-gray-900">{summaryData.totalHoursFormatted}</p>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Avg Hours/Day</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatMinutesToHours(summaryData.averageMinutesPerDay)}
                      </p>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Minutes</p>
                      <p className="text-2xl font-bold text-gray-900">{summaryData.totalMinutes}</p>
                    </div>
                  </Card>
                </div>

                {/* Daily Breakdown */}
                <Card title="Daily Breakdown" padding="none">
                  {summaryData.dailyBreakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">Email</th>
                            <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">Date</th>
                            <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">Sessions</th>
                            <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">Total Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {summaryData.dailyBreakdown.map((day) => (
                            <tr key={`${day.email}-${day.date}`} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700">{day.email}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{day.date}</td>
                              <td className="px-4 py-3 text-sm text-end text-gray-700">{day.sessionsCount}</td>
                              <td className="px-4 py-3 text-sm text-end font-medium text-gray-900">
                                {formatMinutesToHours(day.totalMinutes)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      title="No attendance data"
                      description="No attendance records found for the selected period"
                    />
                  )}
                </Card>
              </>
            ) : null}
          </>
        )}

        {/* Detail Tab */}
        {activeTab === 'detail' && (
          <Card title="Attendance Sessions" padding="none">
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
                        {isAdmin && (
                          <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">Employee</th>
                        )}
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
                          {isAdmin && (
                            <td className="px-4 py-3 text-sm text-gray-900">{session.userEmail}</td>
                          )}
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDateShort(session.clockIn)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatTime(session.clockIn)}
                          </td>
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
                description="No attendance sessions found for the selected period"
              />
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
