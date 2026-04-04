'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyDeductions } from '@/lib/services/salary';
import { DeductionType } from '@/types/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Role } from '@/types/api';
import { formatDateShort } from '@/utils/formatters';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function getDeductionBadge(type: string) {
  switch (type) {
    case DeductionType.LATE_REPORT:
      return <Badge variant="error">Late Report</Badge>;
    case DeductionType.MISSING_CALLS:
      return <Badge variant="warning">Missing Calls</Badge>;
    case DeductionType.ABSENCE_UNEXCUSED:
      return <Badge variant="error">Absence</Badge>;
    case DeductionType.MANUAL:
      return <Badge variant="info">Manual</Badge>;
    default:
      return <Badge>{type.replace(/_/g, ' ')}</Badge>;
  }
}

export default function MyDeductionsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: deductions, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-deductions', month, year],
    queryFn: () => getMyDeductions(month, year),
  });

  const totalAmount = deductions?.reduce((sum, d) => sum + Number(d.amount), 0) ?? 0;

  return (
    <ProtectedRoute requiredRoles={[Role.SALES, Role.SALES_MANAGER]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deductions</h1>
          <p className="text-gray-500">View your salary deductions</p>
        </div>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="w-full md:w-40">
              <Select
                label="Month"
                value={String(month)}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                options={MONTHS}
              />
            </div>
            <div className="w-full md:w-32">
              <Select
                label="Year"
                value={String(year)}
                onChange={(e) => setYear(parseInt(e.target.value))}
                options={[
                  { value: String(now.getFullYear()), label: String(now.getFullYear()) },
                  { value: String(now.getFullYear() - 1), label: String(now.getFullYear() - 1) },
                ]}
              />
            </div>
            {deductions && deductions.length > 0 && (
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-500">Total Deductions</p>
                <p className="text-xl font-bold text-red-600">{totalAmount.toFixed(2)} EGP</p>
              </div>
            )}
          </div>
        </Card>

        {isError ? (
          <ErrorState message="Unable to load data" onRetry={refetch} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : !deductions || deductions.length === 0 ? (
          <Card>
            <EmptyState title="No deductions" description="No deductions found for this period." />
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {deductions.map((d) => (
                <div key={d.id} className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getDeductionBadge(d.type)}
                      <span className="text-sm text-gray-500">{formatDateShort(d.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{d.description}</p>
                  </div>
                  <span className="text-lg font-semibold text-red-600">-{Number(d.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
