'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAllDeals, approveDeal, rejectDeal, closeDeal, markDealLost } from '@/lib/services/deals';
import { getSalesUsers } from '@/lib/services/users';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DealStatus, DealDto, Role } from '@/types/api';
import { formatAmount, formatEgyptDateTime } from '@/utils/formatters';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: DealStatus.PENDING_DEAL, label: 'Pending' },
  { value: DealStatus.APPROVED_DEAL, label: 'Approved' },
  { value: DealStatus.CLOSED, label: 'Closed' },
  { value: DealStatus.LOST, label: 'Lost' },
  { value: DealStatus.REJECTED_DEAL, label: 'Rejected' },
];

function getDealStatusBadge(status: DealStatus) {
  const map: Record<string, { variant: 'warning' | 'success' | 'info' | 'neutral' | 'error'; label: string }> = {
    PENDING_DEAL: { variant: 'warning', label: 'Pending' },
    APPROVED_DEAL: { variant: 'success', label: 'Approved' },
    CLOSED: { variant: 'info', label: 'Closed' },
    LOST: { variant: 'neutral', label: 'Lost' },
    REJECTED_DEAL: { variant: 'error', label: 'Rejected' },
  };
  const s = map[status] || { variant: 'neutral' as const, label: status };
  return <Badge variant={s.variant} size="sm">{s.label}</Badge>;
}

export default function DealsAdminPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: string; service: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveConfirm, setApproveConfirm] = useState<{ id: string; service: string } | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<{ id: string; service: string } | null>(null);
  const [lostConfirm, setLostConfirm] = useState<{ id: string; service: string } | null>(null);
  const limit = 20;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['all-deals', page, statusFilter],
    queryFn: () => getAllDeals({ page, limit, status: (statusFilter as DealStatus) || undefined }),
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  // Fetch sales users for commission summary
  const { data: salesUsers } = useQuery({
    queryKey: ['sales-users-deals'],
    queryFn: getSalesUsers,
  });

  // Calculate commission summary from current deals data
  const commissionSummary = useMemo(() => {
    if (!data?.data) return [];
    const map = new Map<string, { email: string; totalAmount: number; dealCount: number }>();

    data.data.forEach((deal: DealDto) => {
      if (deal.status === DealStatus.CLOSED || deal.status === DealStatus.APPROVED_DEAL) {
        const key = deal.userId;
        const existing = map.get(key);
        const amount = parseFloat(deal.commissionAmount || '0');
        if (existing) {
          existing.totalAmount += amount;
          existing.dealCount += 1;
        } else {
          map.set(key, {
            email: deal.user?.email || deal.userId,
            totalAmount: amount,
            dealCount: 1,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [data]);

  // --- Mutations ---
  const approveMutation = useMutation({
    mutationFn: approveDeal,
    onSuccess: () => {
      toast.success('Deal approved');
      queryClient.invalidateQueries({ queryKey: ['all-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-commission'] });
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve deal'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectDeal(rejectModal!.id, rejectReason),
    onSuccess: () => {
      toast.success('Deal rejected');
      setRejectModal(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['all-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-deals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reject deal'),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeDeal(id),
    onSuccess: () => {
      toast.success('Deal marked as closed');
      setCloseConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['all-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-commission'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to close deal'),
  });

  const lostMutation = useMutation({
    mutationFn: (id: string) => markDealLost(id),
    onSuccess: () => {
      toast.success('Deal marked as lost');
      setLostConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['all-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-commission'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to mark deal as lost'),
  });

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Deals</h1>
          <p className="text-gray-500">Manage deals, approvals, and track commissions</p>
        </div>

        {/* Commission Summary */}
        {commissionSummary.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Commission Summary (Current Page)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {commissionSummary.map((item) => (
                <div key={item.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.email}</p>
                    <p className="text-xs text-gray-500">{item.dealCount} deal(s)</p>
                  </div>
                  <span className="text-sm font-semibold text-green-700">
                    {formatAmount(item.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Filter */}
        <div className="w-full md:w-64">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
        ) : isError ? (
          <ErrorState message="Unable to load data" onRetry={refetch} />
        ) : !data || data.data.length === 0 ? (
          <Card>
            <EmptyState title="No deals found" description="No deals match the current filter." />
          </Card>
        ) : (
          <>
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.data.map((deal: DealDto) => (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{deal.user?.email || deal.userId}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {deal.clientName || deal.phoneNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{deal.service}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatAmount(deal.amount)}</td>
                        <td className="px-4 py-3 text-sm text-green-700">
                          {deal.commissionAmount ? formatAmount(deal.commissionAmount) : '-'}
                        </td>
                        <td className="px-4 py-3">{getDealStatusBadge(deal.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatEgyptDateTime(deal.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {deal.status === DealStatus.PENDING_DEAL && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setApproveConfirm({ id: deal.id, service: deal.service })}
                                  disabled={approveMutation.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setRejectModal({ id: deal.id, service: deal.service })}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {deal.status === DealStatus.APPROVED_DEAL && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCloseConfirm({ id: deal.id, service: deal.service })}
                                >
                                  Close
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setLostConfirm({ id: deal.id, service: deal.service })}
                                >
                                  Lost
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={isFetching}
              total={data.total}
              limit={limit}
            />
          </>
        )}

        {/* Reject Modal */}
        <Modal
          isOpen={!!rejectModal}
          onClose={() => { setRejectModal(null); setRejectReason(''); }}
          title="Reject Deal"
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
                Reject Deal
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {rejectModal && (
              <p className="text-gray-600">
                Rejecting deal: <strong>{rejectModal.service}</strong>
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

        {/* Approve Deal Confirm */}
        <ConfirmDialog
          isOpen={!!approveConfirm}
          onClose={() => setApproveConfirm(null)}
          onConfirm={() => { if (approveConfirm) { approveMutation.mutate(approveConfirm.id); setApproveConfirm(null); } }}
          title="Approve Deal"
          message={approveConfirm ? `Approve the deal "${approveConfirm.service}"? This will trigger commission calculation.` : ''}
          confirmText="Approve"
          loading={approveMutation.isPending}
        />

        {/* Close Deal Confirm */}
        <ConfirmDialog
          isOpen={!!closeConfirm}
          onClose={() => setCloseConfirm(null)}
          onConfirm={() => closeConfirm && closeMutation.mutate(closeConfirm.id)}
          title="Close Deal"
          message={closeConfirm ? `Mark the deal "${closeConfirm.service}" as closed? This indicates the deal has been successfully completed.` : ''}
          confirmText="Close Deal"
          loading={closeMutation.isPending}
        />

        {/* Lost Deal Confirm */}
        <ConfirmDialog
          isOpen={!!lostConfirm}
          onClose={() => setLostConfirm(null)}
          onConfirm={() => lostConfirm && lostMutation.mutate(lostConfirm.id)}
          title="Mark Deal as Lost"
          message={lostConfirm ? `Mark the deal "${lostConfirm.service}" as lost? This indicates the deal did not go through.` : ''}
          confirmText="Mark as Lost"
          variant="danger"
          loading={lostMutation.isPending}
        />
      </div>
    </ProtectedRoute>
  );
}
