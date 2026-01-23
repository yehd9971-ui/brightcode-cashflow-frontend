'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getAuditLogs } from '@/lib/services/audit';
import { AuditAction, EntityType, AuditLogResponseDto, Role } from '@/types/api';
import { formatDate } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { cn } from '@/utils/cn';

const entityTypeOptions = [
  { value: '', label: 'All Entities' },
  ...Object.values(EntityType).map((type) => ({
    value: type,
    label: type,
  })),
];

const actionOptions = [
  { value: '', label: 'All Actions' },
  ...Object.values(AuditAction).map((action) => ({
    value: action,
    label: action,
  })),
];

const actionVariants: Record<AuditAction, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  [AuditAction.LOGIN]: 'info',
  [AuditAction.LOGOUT]: 'neutral',
  [AuditAction.REFRESH]: 'neutral',
  [AuditAction.CREATE]: 'success',
  [AuditAction.UPDATE]: 'warning',
  [AuditAction.APPROVE]: 'success',
  [AuditAction.REJECT]: 'error',
  [AuditAction.DELETE]: 'error',
  [AuditAction.UPLOAD]: 'info',
  [AuditAction.DEACTIVATE]: 'error',
  [AuditAction.ACTIVATE]: 'success',
};

function ExpandableRow({ log }: { log: AuditLogResponseDto }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSnapshots = log.beforeSnapshot || log.afterSnapshot;

  return (
    <>
      <tr
        className={cn(
          'hover:bg-gray-50 cursor-pointer',
          hasSnapshots && 'border-b-0'
        )}
        onClick={() => hasSnapshots && setIsExpanded(!isExpanded)}
      >
        <td className="px-4 py-3 text-sm text-gray-500">
          {formatDate(log.timestamp)}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900">
          {log.actor?.email || 'System'}
        </td>
        <td className="px-4 py-3">
          <Badge variant={actionVariants[log.action]}>{log.action}</Badge>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{log.entityType}</td>
        <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
          {log.entityId || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">{log.ipAddress || '-'}</td>
        <td className="px-4 py-3">
          {hasSnapshots && (
            <button className="text-gray-400 hover:text-gray-600">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </td>
      </tr>
      {isExpanded && hasSnapshots && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {log.beforeSnapshot && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Before:</p>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                    {JSON.stringify(log.beforeSnapshot, null, 2)}
                  </pre>
                </div>
              )}
              {log.afterSnapshot && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">After:</p>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                    {JSON.stringify(log.afterSnapshot, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const limit = 50;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit', { page, entityType, action, startDate, endDate }],
    queryFn: () =>
      getAuditLogs({
        page,
        limit,
        entityType: entityType ? (entityType as EntityType) : undefined,
        action: action ? (action as AuditAction) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const logs = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500">View system activity and changes</p>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              options={entityTypeOptions}
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              placeholder="Entity Type"
            />
            <Select
              options={actionOptions}
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              placeholder="Action"
            />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              placeholder="From Date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              placeholder="To Date"
            />
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card padding="none">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={10} />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No audit logs found"
              description="Try adjusting your filters or check back later"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Timestamp
                      </th>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        User
                      </th>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Action
                      </th>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Entity
                      </th>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Entity ID
                      </th>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        IP Address
                      </th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <ExpandableRow key={log.id} log={log} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 border-t border-gray-200">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  loading={isFetching}
                  total={data?.total || 0}
                  limit={limit}
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
