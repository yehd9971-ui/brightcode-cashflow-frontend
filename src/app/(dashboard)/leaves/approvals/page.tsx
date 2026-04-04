'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getPendingLeaves, getAllLeaves, approveLeave, rejectLeave } from '@/lib/services/leaves';
import { getUsers } from '@/lib/services/users';
import { Role, LeaveStatus } from '@/types/api';
import { formatEgyptDateTime } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

function getLeaveStatusBadge(status: LeaveStatus) {
  const map: Record<string, { variant: 'warning' | 'success' | 'info' | 'error' | 'neutral'; label: string }> = {
    PENDING_LEAVE: { variant: 'warning', label: 'Pending' },
    APPROVED_PAID: { variant: 'success', label: 'Approved (Paid)' },
    APPROVED_UNPAID: { variant: 'info', label: 'Approved (Unpaid)' },
    REJECTED_LEAVE: { variant: 'error', label: 'Rejected' },
  };
  const s = map[status] || { variant: 'neutral' as const, label: status };
  return <Badge variant={s.variant} size="sm">{s.label}</Badge>;
}

type Tab = 'pending' | 'history';

const HISTORY_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: LeaveStatus.APPROVED_PAID, label: 'Approved (Paid)' },
  { value: LeaveStatus.APPROVED_UNPAID, label: 'Approved (Unpaid)' },
  { value: LeaveStatus.REJECTED_LEAVE, label: 'Rejected' },
];

export default function LeaveApprovalsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [userFilter, setUserFilter] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: string; email: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const limit = 20;

  // Pending leaves query
  const { data: pendingData, isLoading: pendingLoading, isFetching: pendingFetching, isError: pendingError, refetch: pendingRefetch } = useQuery({
    queryKey: ['pending-leaves', pendingPage],
    queryFn: () => getPendingLeaves({ page: pendingPage, limit }),
    enabled: activeTab === 'pending',
  });

  // Users query for employee filter
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => getUsers({ limit: 100 }),
    enabled: activeTab === 'history',
  });

  // History query
  const { data: historyData, isLoading: historyLoading, isFetching: historyFetching, isError: historyError, refetch: historyRefetch } = useQuery({
    queryKey: ['all-leaves', historyPage, statusFilter, userFilter],
    queryFn: () => getAllLeaves({
      page: historyPage,
      limit,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(userFilter ? { userId: userFilter } : {}),
    }),
    enabled: activeTab === 'history',
  });

  const pendingTotalPages = Math.ceil((pendingData?.total || 0) / limit);
  const historyTotalPages = Math.ceil((historyData?.total || 0) / limit);

  const approveMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'PAID' | 'UNPAID' }) => approveLeave(id, type),
    onSuccess: () => {
      toast.success('Leave approved');
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['all-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['salary'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve leave'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectLeave(rejectModal!.id, rejectReason),
    onSuccess: () => {
      toast.success('Leave rejected');
      setRejectModal(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['all-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reject leave'),
  });

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
          <p className="text-gray-500">Review and process pending leave requests</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending{pendingData?.total ? ` (${pendingData.total})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              History
            </button>
          </div>
          {activeTab === 'history' && (
            <div className="flex gap-2">
              <select
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setHistoryPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by employee"
              >
                <option value="">All Members</option>
                {usersData?.data
                  ?.filter((u) => u.role !== 'ADMIN')
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as LeaveStatus | ''); setHistoryPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by status"
              >
                {HISTORY_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <>
            {pendingError ? (
              <ErrorState message="Unable to load data" onRetry={pendingRefetch} />
            ) : pendingLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
            ) : !pendingData || pendingData.data.length === 0 ? (
              <Card>
                <EmptyState title="No pending leaves" description="All leave requests have been processed." />
              </Card>
            ) : (
              <>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {pendingData.data.map((leave) => (
                          <tr key={leave.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {leave.user?.email || leave.userId}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{leave.leaveDate}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                              {leave.reason || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatEgyptDateTime(leave.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              {getLeaveStatusBadge(leave.status)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveMutation.mutate({ id: leave.id, type: 'PAID' })}
                                  disabled={approveMutation.isPending}
                                >
                                  Paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveMutation.mutate({ id: leave.id, type: 'UNPAID' })}
                                  disabled={approveMutation.isPending}
                                >
                                  Unpaid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setRejectModal({ id: leave.id, email: leave.user?.email || leave.userId })}
                                >
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Pagination
                  currentPage={pendingPage}
                  totalPages={pendingTotalPages}
                  onPageChange={setPendingPage}
                  loading={pendingFetching}
                  total={pendingData.total}
                  limit={limit}
                />
              </>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {historyError ? (
              <ErrorState message="Unable to load data" onRetry={historyRefetch} />
            ) : historyLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
            ) : !historyData || historyData.data.length === 0 ? (
              <Card>
                <EmptyState
                  title="No leave requests"
                  description={statusFilter ? 'No leave requests match the selected filter.' : 'No leave requests have been submitted yet.'}
                />
              </Card>
            ) : (
              <>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewed By</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewed At</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejection Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {historyData.data.map((leave) => (
                          <tr key={leave.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {leave.user?.email || leave.userId}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{leave.leaveDate}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                              {leave.reason || '-'}
                            </td>
                            <td className="px-4 py-3">
                              {getLeaveStatusBadge(leave.status)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {leave.approvedBy?.email || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {leave.approvedAt ? formatEgyptDateTime(leave.approvedAt) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-500 max-w-xs truncate">
                              {leave.rejectionReason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Pagination
                  currentPage={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={setHistoryPage}
                  loading={historyFetching}
                  total={historyData.total}
                  limit={limit}
                />
              </>
            )}
          </>
        )}

        {/* Reject Modal */}
        <Modal
          isOpen={!!rejectModal}
          onClose={() => { setRejectModal(null); setRejectReason(''); }}
          title="Reject Leave Request"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectReason.length < 10}
                loading={rejectMutation.isPending}
              >
                Reject
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {rejectModal && (
              <p className="text-gray-600">
                Rejecting leave request from <strong>{rejectModal.email}</strong>
              </p>
            )}
            <Textarea
              label="Rejection Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason (minimum 10 characters)"
              maxLength={500}
              showCounter
              required
              error={rejectReason.length > 0 && rejectReason.length < 10 ? 'Reason must be at least 10 characters' : undefined}
            />
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
