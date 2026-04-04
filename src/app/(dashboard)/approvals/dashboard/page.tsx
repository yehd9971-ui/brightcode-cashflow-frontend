'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, DollarSign, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCallApprovals, approveCall, rejectCall } from '@/lib/services/calls';
import { getPendingLeaves, approveLeave, rejectLeave } from '@/lib/services/leaves';
import { getAllDeals, approveDeal, rejectDeal } from '@/lib/services/deals';
import { formatEgyptDateTime, formatAmount } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Role, DealStatus, CallResponseDto, LeaveRequestDto, DealDto } from '@/types/api';

type RejectTarget =
  | { type: 'call'; id: string; label: string }
  | { type: 'leave'; id: string; label: string }
  | { type: 'deal'; id: string; label: string };

export default function ApprovalDashboardPage() {
  const queryClient = useQueryClient();

  // Collapse states
  const [callsOpen, setCallsOpen] = useState(true);
  const [leavesOpen, setLeavesOpen] = useState(true);
  const [dealsOpen, setDealsOpen] = useState(true);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // --- Data fetching ---
  const { data: callsData, isLoading: callsLoading, isError, refetch } = useQuery({
    queryKey: ['approval-dashboard', 'calls'],
    queryFn: () => getCallApprovals({ limit: 50 }),
  });

  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ['approval-dashboard', 'leaves'],
    queryFn: () => getPendingLeaves({ limit: 50 }),
  });

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['approval-dashboard', 'deals'],
    queryFn: () => getAllDeals({ status: DealStatus.PENDING_DEAL, limit: 50 }),
  });

  const calls = callsData?.data || [];
  const leaves = leavesData?.data || [];
  const deals = dealsData?.data || [];

  // --- Mutations ---
  const approveCallMut = useMutation({
    mutationFn: (id: string) => approveCall(id),
    onSuccess: () => {
      toast.success('Call approved');
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'my-daily-stats'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve call'),
  });

  const approveLeaveMut = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'PAID' | 'UNPAID' }) => approveLeave(id, type),
    onSuccess: () => {
      toast.success('Leave approved');
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['all-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve leave'),
  });

  const approveDealMut = useMutation({
    mutationFn: (id: string) => approveDeal(id),
    onSuccess: () => {
      toast.success('Deal approved');
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['all-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-commission'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve deal'),
  });

  const rejectCallMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCall(id, { reason }),
    onSuccess: () => {
      toast.success('Call rejected');
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'my-daily-stats'] });
      closeRejectModal();
    },
    onError: () => toast.error('Failed to reject call'),
  });

  const rejectLeaveMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectLeave(id, reason),
    onSuccess: () => {
      toast.success('Leave rejected');
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['all-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      closeRejectModal();
    },
    onError: () => toast.error('Failed to reject leave'),
  });

  const rejectDealMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDeal(id, reason),
    onSuccess: () => {
      toast.success('Deal rejected');
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['all-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-deals'] });
      queryClient.invalidateQueries({ queryKey: ['my-commission'] });
      closeRejectModal();
    },
    onError: () => toast.error('Failed to reject deal'),
  });

  function closeRejectModal() {
    setRejectTarget(null);
    setRejectReason('');
  }

  function handleRejectSubmit() {
    if (!rejectTarget || rejectReason.length < 10) return;
    const { type, id } = rejectTarget;
    if (type === 'call') rejectCallMut.mutate({ id, reason: rejectReason });
    if (type === 'leave') rejectLeaveMut.mutate({ id, reason: rejectReason });
    if (type === 'deal') rejectDealMut.mutate({ id, reason: rejectReason });
  }

  const isRejectPending = rejectCallMut.isPending || rejectLeaveMut.isPending || rejectDealMut.isPending;

  const totalPending = calls.length + leaves.length + deals.length;

  if (isError) return <ErrorState message="Unable to load data" onRetry={refetch} />;

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Dashboard</h1>
          <p className="text-gray-500">
            All pending items in one place.{' '}
            {!callsLoading && !leavesLoading && !dealsLoading && (
              <Badge variant={totalPending > 0 ? 'warning' : 'success'} size="sm">
                {totalPending} pending
              </Badge>
            )}
          </p>
        </div>

        {/* === PENDING CALLS === */}
        <Card>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setCallsOpen((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Pending Call Approvals</h2>
              <Badge variant={calls.length > 0 ? 'warning' : 'success'} size="sm">
                {callsLoading ? '...' : calls.length}
              </Badge>
            </div>
            {callsOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {callsOpen && (
            <div className="px-4 pb-4">
              {callsLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>
              ) : calls.length === 0 ? (
                <EmptyState title="No pending calls" description="All calls have been reviewed." />
              ) : (
                <div className="space-y-3">
                  {calls.map((call: CallResponseDto) => (
                    <div key={call.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{call.rawPhoneNumber}</p>
                        <p className="text-sm text-gray-500">
                          by {call.user.email} &middot; {formatEgyptDateTime(call.createdAt)}
                          {call.durationMinutes ? ` &middot; ${call.durationMinutes} min` : ''}
                        </p>
                        {call.notes && <p className="text-sm text-gray-600 mt-1">{call.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => approveCallMut.mutate(call.id)}
                          disabled={approveCallMut.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectTarget({ type: 'call', id: call.id, label: call.rawPhoneNumber })}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* === PENDING LEAVES === */}
        <Card>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setLeavesOpen((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Pending Leave Requests</h2>
              <Badge variant={leaves.length > 0 ? 'warning' : 'success'} size="sm">
                {leavesLoading ? '...' : leaves.length}
              </Badge>
            </div>
            {leavesOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {leavesOpen && (
            <div className="px-4 pb-4">
              {leavesLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>
              ) : leaves.length === 0 ? (
                <EmptyState title="No pending leaves" description="All leave requests have been processed." />
              ) : (
                <div className="space-y-3">
                  {leaves.map((leave: LeaveRequestDto) => (
                    <div key={leave.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{leave.user?.email || leave.userId}</p>
                        <p className="text-sm text-gray-500">
                          Leave on {leave.leaveDate} &middot; Submitted {formatEgyptDateTime(leave.createdAt)}
                        </p>
                        {leave.reason && <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => approveLeaveMut.mutate({ id: leave.id, type: 'PAID' })}
                          disabled={approveLeaveMut.isPending}
                        >
                          <DollarSign className="w-4 h-4 mr-1" /> Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveLeaveMut.mutate({ id: leave.id, type: 'UNPAID' })}
                          disabled={approveLeaveMut.isPending}
                        >
                          <Ban className="w-4 h-4 mr-1" /> Unpaid
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectTarget({ type: 'leave', id: leave.id, label: leave.user?.email || leave.userId })}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* === PENDING DEALS === */}
        <Card>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setDealsOpen((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Pending Deal Approvals</h2>
              <Badge variant={deals.length > 0 ? 'warning' : 'success'} size="sm">
                {dealsLoading ? '...' : deals.length}
              </Badge>
            </div>
            {dealsOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {dealsOpen && (
            <div className="px-4 pb-4">
              {dealsLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>
              ) : deals.length === 0 ? (
                <EmptyState title="No pending deals" description="All deals have been reviewed." />
              ) : (
                <div className="space-y-3">
                  {deals.map((deal: DealDto) => (
                    <div key={deal.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {deal.service} &middot; {formatAmount(deal.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          by {deal.user?.email || deal.userId}
                          {deal.phoneNumber && ` &middot; Client: ${deal.phoneNumber}`}
                          {deal.clientName && ` (${deal.clientName})`}
                          {' &middot; '}{formatEgyptDateTime(deal.createdAt)}
                        </p>
                        {deal.notes && <p className="text-sm text-gray-600 mt-1">{deal.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => approveDealMut.mutate(deal.id)}
                          disabled={approveDealMut.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectTarget({ type: 'deal', id: deal.id, label: deal.service })}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* === Shared Reject Modal === */}
        <Modal
          isOpen={!!rejectTarget}
          onClose={closeRejectModal}
          title={rejectTarget ? `Reject ${rejectTarget.type === 'call' ? 'Call' : rejectTarget.type === 'leave' ? 'Leave' : 'Deal'}` : 'Reject'}
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={closeRejectModal}>Cancel</Button>
              <Button
                variant="danger"
                onClick={handleRejectSubmit}
                disabled={rejectReason.length < 10}
                loading={isRejectPending}
              >
                Reject
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {rejectTarget && (
              <p className="text-gray-600">
                Rejecting {rejectTarget.type} <strong>{rejectTarget.label}</strong>
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
