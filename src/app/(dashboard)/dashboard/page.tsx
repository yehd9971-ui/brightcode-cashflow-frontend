'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDashboardStats, generateEndOfDayReport } from '@/lib/services/calls';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useCallWebSocket } from '@/hooks/useCallWebSocket';
import { cn } from '@/utils/cn';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Role } from '@/types/api';

export default function CallDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  useCallWebSocket({ userId: user?.id, joinDashboard: true, enabled: !!user });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['calls', 'dashboard-stats', date],
    queryFn: () => getDashboardStats(date),
    enabled: !!date,
  });

  const reportMutation = useMutation({
    mutationFn: () => generateEndOfDayReport(date),
    onSuccess: () => {
      toast.success('Report generated successfully');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const getCompletionColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600 bg-green-50';
    if (percent >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SALES_MANAGER]}>
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Dashboard</h1>
          <p className="text-gray-500">Employee call performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant="outline" onClick={() => reportMutation.mutate()} loading={reportMutation.isPending}>
            <FileText className="w-4 h-4 mr-1" /> Generate Report
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState message="Unable to load data" onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
      ) : !data || data.employees.length === 0 ? (
        <Card><EmptyState title="No data" description="No employee data for this date." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-start p-3 font-medium text-gray-600">Employee</th>
                <th className="text-center p-3 font-medium text-gray-600">Calls</th>
                <th className="text-center p-3 font-medium text-gray-600">Answered</th>
                <th className="text-center p-3 font-medium text-gray-600">Talk Time</th>
                <th className="text-center p-3 font-medium text-gray-600">Pending</th>
                <th className="text-center p-3 font-medium text-gray-600">Approved</th>
                <th className="text-center p-3 font-medium text-gray-600">Rejected</th>
                <th className="text-center p-3 font-medium text-gray-600">Tasks</th>
                <th className="text-center p-3 font-medium text-gray-600">Completion</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp) => (
                <tr key={emp.userId} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{emp.email}</td>
                  <td className="p-3 text-center">{emp.stats.totalCalls}/{emp.stats.dynamicCallTarget}</td>
                  <td className="p-3 text-center">{emp.stats.answeredCalls}/10</td>
                  <td className="p-3 text-center">{emp.stats.totalTalkMinutes}/60 min</td>
                  <td className="p-3 text-center text-yellow-600">{emp.stats.pendingCalls}</td>
                  <td className="p-3 text-center text-green-600">{emp.stats.approvedCalls}</td>
                  <td className="p-3 text-center text-red-600">{emp.stats.rejectedCalls}</td>
                  <td className="p-3 text-center">{emp.stats.completedTasks}/{emp.stats.totalTasks}</td>
                  <td className="p-3 text-center">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getCompletionColor(emp.stats.completionPercent))}>
                      {Math.round(emp.stats.completionPercent)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
    </ProtectedRoute>
  );
}
