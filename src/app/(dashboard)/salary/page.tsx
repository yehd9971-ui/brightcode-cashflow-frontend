'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getMySalarySummary, getMyAccumulatedSalary, getTeamSalarySummary } from '@/lib/services/salary';
import { Card, StatCard } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { DayStatus, Role, DeductionType, EmployeeSalaryOverviewDto } from '@/types/api';
import { formatAmount } from '@/utils/formatters';
import { Wallet, TrendingUp, TrendingDown, Calendar, Users } from 'lucide-react';

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

function getDayStatusColor(status: DayStatus): string {
  switch (status) {
    case DayStatus.FULL: return 'bg-green-100 text-green-800';
    case DayStatus.PARTIAL: return 'bg-yellow-100 text-yellow-800';
    case DayStatus.LEAVE_PAID: return 'bg-blue-100 text-blue-800';
    case DayStatus.LEAVE_UNPAID: return 'bg-orange-100 text-orange-800';
    case DayStatus.ABSENT_UNEXCUSED: return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default function SalaryPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'my-salary' | 'team'>('my-salary');
  const isSM = user?.role === Role.SALES_MANAGER;

  const { data: accumulated, isLoading: accLoading } = useQuery({
    queryKey: ['salary', 'accumulated'],
    queryFn: getMyAccumulatedSalary,
  });

  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ['salary', 'summary', month, year],
    queryFn: () => getMySalarySummary(month, year),
  });

  const { data: teamSummary, isLoading: teamLoading } = useQuery({
    queryKey: ['salary', 'team-summary', month, year],
    queryFn: () => getTeamSalarySummary(month, year),
    enabled: isSM && activeTab === 'team',
  });

  if (isError) return <ErrorState message="Unable to load data" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Salary</h1>

      {/* Tab switcher for SM */}
      {isSM && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('my-salary')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my-salary' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            My Salary
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'team' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Team Salary
          </button>
        </div>
      )}

      {/* Month/Year Selector */}
      <div className="flex gap-3">
        <Select label="Month" value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} options={MONTHS} />
        <Select label="Year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))} options={[
          { value: String(now.getFullYear() - 1), label: String(now.getFullYear() - 1) },
          { value: String(now.getFullYear()), label: String(now.getFullYear()) },
        ]} />
      </div>

      {(isLoading || accLoading) ? <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div> : (<>
      {activeTab === 'my-salary' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Accumulated This Month" value={accumulated ? formatAmount(String(accumulated.netSalary ?? 0)) : 'EGP 0.00'} icon={<Wallet className="w-5 h-5" />} />
            <StatCard title="Base Salary" value={summary ? formatAmount(summary.baseSalary) : 'EGP 0.00'} icon={<TrendingUp className="w-5 h-5" />} />
            <StatCard title="Total Deductions" value={summary ? formatAmount(String(parseFloat(summary.totalCallDeductions) + parseFloat(summary.totalAbsenceDeductions) + parseFloat(summary.totalManualDeductions) + parseFloat(summary.totalLateReportDeductions || '0'))) : 'EGP 0.00'} icon={<TrendingDown className="w-5 h-5" />} />
            <StatCard title="Days Worked" value={String(summary?.totalDaysWorked ?? 0)} icon={<Calendar className="w-5 h-5" />} />
          </div>

          {/* Net Salary Card */}
          {summary && (
            <Card title="Monthly Summary">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                <div><p className="text-sm text-gray-500">Total Earned</p><p className="text-lg font-semibold text-green-600">{formatAmount(summary.totalEarned)}</p></div>
                <div><p className="text-sm text-gray-500">Call Deductions</p><p className="text-lg font-semibold text-red-600">-{formatAmount(summary.totalCallDeductions)}</p></div>
                <div><p className="text-sm text-gray-500">Absence Deductions</p><p className="text-lg font-semibold text-red-600">-{formatAmount(summary.totalAbsenceDeductions)}</p></div>
                <div><p className="text-sm text-gray-500">Manual Deductions</p><p className="text-lg font-semibold text-red-600">-{formatAmount(summary.totalManualDeductions)}</p></div>
                <div><p className="text-sm text-gray-500">Late Report Deductions</p><p className="text-lg font-semibold text-red-600">-{formatAmount(summary.totalLateReportDeductions || '0')}</p></div>
                <div><p className="text-sm text-gray-500">Bonuses + Commission</p><p className="text-lg font-semibold text-green-600">+{formatAmount(String(parseFloat(summary.totalBonuses) + parseFloat(summary.totalCommission)))}</p></div>
                <div><p className="text-sm text-gray-500">Net Salary</p><p className="text-2xl font-bold text-blue-600">{formatAmount(summary.netSalary)}</p></div>
              </div>
            </Card>
          )}

          {/* Deductions Breakdown */}
          {summary && summary.deductions && summary.deductions.length > 0 && (
            <Card title="Deductions Breakdown">
              <div className="divide-y divide-gray-100">
                {summary.deductions.map((d) => (
                  <div key={d.id} className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          d.type === DeductionType.LATE_REPORT ? 'error' :
                          d.type === DeductionType.MISSING_CALLS ? 'warning' :
                          d.type === DeductionType.ABSENCE_UNEXCUSED ? 'error' :
                          'info'
                        }>
                          {d.type === DeductionType.MISSING_CALLS ? 'Missing Calls' :
                           d.type === DeductionType.LATE_REPORT ? 'Late Report' :
                           d.type === DeductionType.ABSENCE_UNEXCUSED ? 'Absence' :
                           'Manual'}
                        </Badge>
                        <span className="text-sm text-gray-500">{d.dateEgypt}</span>
                      </div>
                      <p className="text-sm text-gray-700">{d.description}</p>
                    </div>
                    <span className="text-lg font-semibold text-red-600">-{Number(d.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100 text-center">
                <a href="/salary/deductions" className="text-sm text-indigo-600 hover:underline">View all deductions</a>
              </div>
            </Card>
          )}

          {/* Daily Records Table */}
          {summary && summary.dailyRecords.length > 0 && (
            <Card title="Daily Breakdown">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earned</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Call Ded.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.dailyRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-4 py-3 text-sm">{record.dateEgypt}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${getDayStatusColor(record.dayStatus)}`}>{record.dayStatus.replace(/_/g, ' ')}</span></td>
                        <td className="px-4 py-3 text-sm">{Math.floor(record.totalMinutes / 60)}h {record.totalMinutes % 60}m</td>
                        <td className="px-4 py-3 text-sm">{record.dayPercentage}%{record.adminOverride && <span className="ml-1 text-xs text-purple-600">(override)</span>}</td>
                        <td className="px-4 py-3 text-sm text-green-600">{formatAmount(record.salaryEarned)}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{parseFloat(record.callDeduction) > 0 ? `-${formatAmount(record.callDeduction)}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* SM Team View */}
      {activeTab === 'team' && isSM && (
        <>
          {teamLoading ? (
            <CardSkeleton />
          ) : teamSummary && teamSummary.length > 0 ? (
            <Card title="Team Salary Summary (Read-Only)">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earned</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonuses</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {teamSummary.map((emp: EmployeeSalaryOverviewDto) => (
                      <tr key={emp.userId}>
                        <td className="px-4 py-3 text-sm font-medium">{emp.email}</td>
                        <td className="px-4 py-3 text-sm">{formatAmount(emp.baseSalary)}</td>
                        <td className="px-4 py-3 text-sm text-green-600">{formatAmount(emp.totalEarned)}</td>
                        <td className="px-4 py-3 text-sm text-red-600">-{formatAmount(emp.totalDeductions)}</td>
                        <td className="px-4 py-3 text-sm text-green-600">+{formatAmount(emp.totalBonuses)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600">{formatAmount(emp.netSalary)}</td>
                        <td className="px-4 py-3 text-sm">{emp.daysWorked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card title="Team Salary">
              <p className="p-4 text-gray-500">No SALES team members found.</p>
            </Card>
          )}
        </>
      )}
      </>)}
    </div>
  );
}
