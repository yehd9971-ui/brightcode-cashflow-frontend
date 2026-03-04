'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCallApprovals, approveCall, rejectCall } from '@/lib/services/calls';
import { CallResponseDto, Role } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { CallStatusBadge } from '@/components/calls/CallStatusBadge';
import { ScreenshotViewer } from '@/components/calls/ScreenshotViewer';
import { formatDateShort } from '@/utils/formatters';

export default function CallApprovalsPage() {
  const { user, isSalesManager } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallResponseDto | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const limit = 10;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['calls', 'approvals', { page, limit }],
    queryFn: () => getCallApprovals({ page, limit }),
  });

  const calls = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveCall(id),
    onSuccess: () => {
      toast.success('Call approved');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setShowApproveConfirm(false);
      setSelectedCall(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve call'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCall(id, { reason }),
    onSuccess: () => {
      toast.success('Call rejected');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setShowRejectModal(false);
      setSelectedCall(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject call'),
  });

  const isSelfCall = (call: CallResponseDto) => isSalesManager && call.userId === user?.id;

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SALES_MANAGER]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Approvals</h1>
          <p className="text-gray-500">Review and approve or reject pending calls</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
        ) : calls.length === 0 ? (
          <Card><EmptyState title="No pending approvals" description="All calls have been reviewed." /></Card>
        ) : (
          <>
            <div className="space-y-3">
              {calls.map((call) => (
                <Card key={call.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">{call.rawPhoneNumber}</span>
                        <CallStatusBadge status={call.callStatus} size="sm" />
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>by {call.user.email}</span>
                        <span>{formatDateShort(call.createdAt)}</span>
                        {call.durationMinutes && <span>{call.durationMinutes} min</span>}
                      </div>
                      {call.notes && <p className="text-sm text-gray-600">{call.notes}</p>}
                      {call.screenshot && <ScreenshotViewer screenshot={call.screenshot} />}
                      {isSelfCall(call) && (
                        <p className="text-sm text-yellow-600">You cannot approve your own calls</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setSelectedCall(call); setShowApproveConfirm(true); }}
                        disabled={isSelfCall(call)}
                        title={isSelfCall(call) ? 'Cannot self-approve' : 'Approve'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => { setSelectedCall(call); setShowRejectModal(true); }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={isFetching} total={data?.total || 0} limit={limit} />
          </>
        )}

        {selectedCall && (
          <ConfirmDialog
            isOpen={showApproveConfirm}
            onClose={() => { setShowApproveConfirm(false); setSelectedCall(null); }}
            onConfirm={() => approveMutation.mutate(selectedCall.id)}
            title="Approve Call"
            message={`Approve call to ${selectedCall.rawPhoneNumber} by ${selectedCall.user.email}?`}
            confirmText="Approve"
            loading={approveMutation.isPending}
          />
        )}

        {selectedCall && (
          <Modal
            isOpen={showRejectModal}
            onClose={() => { setShowRejectModal(false); setSelectedCall(null); setRejectReason(''); }}
            title="Reject Call"
            size="md"
            footer={
              <>
                <Button variant="outline" onClick={() => { setShowRejectModal(false); setSelectedCall(null); setRejectReason(''); }}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={() => rejectMutation.mutate({ id: selectedCall.id, reason: rejectReason })}
                  disabled={rejectReason.length < 10}
                  loading={rejectMutation.isPending}
                >
                  Reject
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-gray-600">Rejecting call to <strong>{selectedCall.rawPhoneNumber}</strong></p>
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
        )}
      </div>
    </ProtectedRoute>
  );
}
