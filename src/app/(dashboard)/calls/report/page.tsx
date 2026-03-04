'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateEndOfDayReport } from '@/lib/services/calls';
import { DailyCallReportDto } from '@/types/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';

export default function CallReportPage() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [reports, setReports] = useState<DailyCallReportDto[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: () => generateEndOfDayReport(date),
    onSuccess: (data) => {
      setReports(data);
      setGeneratedAt(new Date().toISOString());
      toast.success('Report generated');
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const getCompletionColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600 bg-green-50';
    if (percent >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">End of Day Report</h1>
          <p className="text-gray-500">Generate and view daily call reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
            <RefreshCw className="w-4 h-4 mr-1" /> Generate Report
          </Button>
        </div>
      </div>

      {generatedAt && (
        <p className="text-sm text-gray-500">
          Report generated at {new Date(generatedAt).toLocaleString()}
        </p>
      )}

      {reports.length === 0 ? (
        <Card>
          <EmptyState
            title="No report data"
            description="Click 'Generate Report' to create an end-of-day report for the selected date."
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-start p-3 font-medium text-gray-600">Employee</th>
                <th className="text-center p-3 font-medium text-gray-600">Total Calls</th>
                <th className="text-center p-3 font-medium text-gray-600">Answered</th>
                <th className="text-center p-3 font-medium text-gray-600">Talk Time</th>
                <th className="text-center p-3 font-medium text-gray-600">Approved</th>
                <th className="text-center p-3 font-medium text-gray-600">Tasks Done</th>
                <th className="text-center p-3 font-medium text-gray-600">Overdue</th>
                <th className="text-center p-3 font-medium text-gray-600">Completion</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{report.user.email}</td>
                  <td className="p-3 text-center">{report.totalCalls}</td>
                  <td className="p-3 text-center">{report.answeredCalls}</td>
                  <td className="p-3 text-center">{report.totalTalkMinutes} min</td>
                  <td className="p-3 text-center">{report.approvedCalls}</td>
                  <td className="p-3 text-center">{report.completedTasks}/{report.totalTasks}</td>
                  <td className="p-3 text-center">{report.overdueTasks > 0 ? <span className="text-orange-600">{report.overdueTasks}</span> : '0'}</td>
                  <td className="p-3 text-center">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getCompletionColor(report.completionPercent))}>
                      {Math.round(report.completionPercent)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
