'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPoolNumbers,
  getPoolStats,
  bulkImport,
  returnToPool,
  approveAttempt,
} from '@/lib/services/client-numbers';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { NumberPoolStatus, Role } from '@/types/api';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import type { ClientNumberDto } from '@/types/api';
import { formatEgyptDateTime } from '@/utils/formatters';
import { Database, ArrowDownToLine, Snowflake, Clock, Archive, CheckCircle } from 'lucide-react';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: NumberPoolStatus.AVAILABLE, label: 'Available' },
  { value: NumberPoolStatus.ASSIGNED, label: 'Assigned' },
  { value: NumberPoolStatus.COOLING_DOWN, label: 'Cooling Down' },
  { value: NumberPoolStatus.FROZEN, label: 'Frozen' },
  { value: NumberPoolStatus.ARCHIVED, label: 'Archived' },
];

export default function NumberPoolPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const isAdmin = user?.role === Role.ADMIN;

  const { data: stats } = useQuery({
    queryKey: ['pool', 'stats'],
    queryFn: getPoolStats,
  });

  const { data: numbers, isLoading, isError, refetch } = useQuery({
    queryKey: ['pool', 'numbers', statusFilter, page],
    queryFn: () => getPoolNumbers({
      page,
      limit: 20,
      ...(statusFilter ? { poolStatus: statusFilter as NumberPoolStatus } : {}),
    }),
  });

  const importMutation = useMutation({
    mutationFn: () => {
      const lines = importText.trim().split('\n').filter(Boolean);
      const nums = lines.map((line) => {
        const [phoneNumber, clientName, source] = line.split(',').map((s) => s.trim());
        return { phoneNumber, clientName, source };
      });
      return bulkImport({ numbers: nums });
    },
    onSuccess: (result) => {
      toast.success(`Imported: ${result.successCount} success, ${result.errorCount} errors`);
      setImportText('');
      setShowImport(false);
      queryClient.invalidateQueries({ queryKey: ['pool'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Import failed'),
  });

  const returnMutation = useMutation({
    mutationFn: returnToPool,
    onSuccess: () => {
      toast.success('Returned to pool');
      queryClient.invalidateQueries({ queryKey: ['pool'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to return number'),
  });

  const approveMutation = useMutation({
    mutationFn: approveAttempt,
    onSuccess: () => {
      toast.success('Attempt approved, cooldown/freeze applied');
      queryClient.invalidateQueries({ queryKey: ['pool'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SALES_MANAGER]}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Number Pool</h1>
        {isAdmin && (
          <Button onClick={() => setShowImport(!showImport)}>
            <ArrowDownToLine className="w-4 h-4 mr-1" /> Bulk Import
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard title="Available" value={String(stats.available)} icon={<Database className="w-4 h-4" />} />
          <StatCard title="Assigned" value={String(stats.assigned)} icon={<CheckCircle className="w-4 h-4" />} />
          <StatCard title="Cooling Down" value={String(stats.coolingDown)} icon={<Clock className="w-4 h-4" />} />
          <StatCard title="Frozen" value={String(stats.frozen)} icon={<Snowflake className="w-4 h-4" />} />
          <StatCard title="Archived" value={String(stats.archived)} icon={<Archive className="w-4 h-4" />} />
          <StatCard title="Total" value={String(stats.total)} icon={<Database className="w-4 h-4" />} />
        </div>
      )}

      {/* Bulk Import */}
      {showImport && isAdmin && (
        <Card title="Bulk Import (CSV: phone,name,source)">
          <div className="p-4 space-y-3">
            <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={5} placeholder={"+201000000001,Ahmed,Facebook\n+201000000002,Sara,Website"} />
            <Button onClick={() => importMutation.mutate()} loading={importMutation.isPending}>Import</Button>
          </div>
        </Card>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === tab.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Numbers List */}
      {isError ? <ErrorState message="Unable to load data" onRetry={refetch} /> : isLoading ? <CardSkeleton /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Release</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {numbers?.data.map((num: ClientNumberDto) => (
                  <tr key={num.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{num.phoneNumber}</td>
                    <td className="px-4 py-3 text-sm">{num.clientName || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        num.poolStatus === NumberPoolStatus.AVAILABLE ? 'success' :
                        num.poolStatus === NumberPoolStatus.FROZEN ? 'error' :
                        num.poolStatus === NumberPoolStatus.COOLING_DOWN ? 'warning' : 'info'
                      }>
                        {num.poolStatus.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{num.leadStatus.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm">{num.totalFailedAttempts}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {num.cooldownUntil && formatEgyptDateTime(num.cooldownUntil)}
                      {num.frozenUntil && formatEgyptDateTime(num.frozenUntil)}
                      {!num.cooldownUntil && !num.frozenUntil && '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {num.poolStatus === NumberPoolStatus.ASSIGNED && (
                          <Button variant="outline" size="sm" onClick={() => returnMutation.mutate(num.id)}>Return</Button>
                        )}
                        {isAdmin && num.poolStatus === NumberPoolStatus.ASSIGNED && (
                          <Button size="sm" onClick={() => approveMutation.mutate(num.id)}>Approve Attempt</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {numbers && numbers.total > 20 && (
            <div className="p-4">
              <Pagination currentPage={page} totalPages={Math.ceil(numbers.total / 20)} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
    </ProtectedRoute>
  );
}
