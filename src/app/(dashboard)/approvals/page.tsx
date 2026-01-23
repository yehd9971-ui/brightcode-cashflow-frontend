'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, CheckCircle, XCircle, Paperclip, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getTransactions,
  approveTransaction,
  rejectTransaction,
} from '@/lib/services/transactions';
import { TransactionStatus, TransactionResponseDto } from '@/types/api';
import { formatAmount, formatDateShort } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TypeBadge } from '@/components/ui/StatusBadge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Role } from '@/types/api';

export default function ApprovalsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<TransactionResponseDto | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const limit = 10;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', 'approvals', { page, limit }],
    queryFn: () =>
      getTransactions({
        status: TransactionStatus.PENDING,
        page,
        limit,
      }),
  });

  const transactions = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveTransaction(id),
    onSuccess: () => {
      toast.success('Transaction approved');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowApproveConfirm(false);
      setSelectedTx(null);
    },
    onError: () => {
      toast.error('Failed to approve transaction');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectTransaction(id, { reason }),
    onSuccess: () => {
      toast.success('Transaction rejected');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowRejectModal(false);
      setSelectedTx(null);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Failed to reject transaction');
    },
  });

  const handleApprove = (tx: TransactionResponseDto) => {
    setSelectedTx(tx);
    setShowApproveConfirm(true);
  };

  const handleReject = (tx: TransactionResponseDto) => {
    setSelectedTx(tx);
    setShowRejectModal(true);
  };

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500">
            Review and approve or reject pending transactions
          </p>
        </div>

        {/* Pending Transactions */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <EmptyState
              title="No pending approvals"
              description="All transactions have been reviewed. Check back later for new submissions."
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {transactions.map((tx) => {
                const hasAttachments = tx.attachments.length > 0;

                return (
                  <Card key={tx.id} className="hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/transactions/${tx.id}`}
                            className="text-lg font-semibold text-blue-600 hover:text-blue-700"
                          >
                            {tx.transactionNumber}
                          </Link>
                          <TypeBadge type={tx.type} size="sm" />
                          <Badge variant="neutral">{tx.category}</Badge>
                        </div>

                        <p className="text-sm text-gray-600">{tx.description}</p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span>{formatDateShort(tx.createdAt)}</span>
                          <span>by {tx.createdBy.email}</span>
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-4 h-4" />
                            {tx.attachments.length} attachment{tx.attachments.length !== 1 && 's'}
                          </span>
                        </div>

                        {!hasAttachments && (
                          <div className="flex items-center gap-2 text-yellow-600 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>No attachments - cannot approve</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-end">
                          <p className="text-xl font-bold text-gray-900">
                            {formatAmount(tx.amount)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/transactions/${tx.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(tx)}
                            disabled={!hasAttachments}
                            title={!hasAttachments ? 'Upload attachments first' : 'Approve'}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(tx)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={isFetching}
              total={data?.total || 0}
              limit={limit}
            />
          </>
        )}

        {/* Approve Confirmation */}
        {selectedTx && (
          <ConfirmDialog
            isOpen={showApproveConfirm}
            onClose={() => {
              setShowApproveConfirm(false);
              setSelectedTx(null);
            }}
            onConfirm={() => approveMutation.mutate(selectedTx.id)}
            title="Approve Transaction"
            message={`Approve ${selectedTx.transactionNumber} for ${formatAmount(selectedTx.amount)}?`}
            confirmText="Approve"
            loading={approveMutation.isPending}
          />
        )}

        {/* Reject Modal */}
        {selectedTx && (
          <Modal
            isOpen={showRejectModal}
            onClose={() => {
              setShowRejectModal(false);
              setSelectedTx(null);
              setRejectReason('');
            }}
            title="Reject Transaction"
            size="md"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedTx(null);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    rejectMutation.mutate({
                      id: selectedTx.id,
                      reason: rejectReason,
                    })
                  }
                  disabled={rejectReason.length < 10}
                  loading={rejectMutation.isPending}
                >
                  Reject
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-gray-600">
                Rejecting: <strong>{selectedTx.transactionNumber}</strong>
              </p>
              <Textarea
                label="Rejection Reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason (minimum 10 characters)"
                maxLength={500}
                showCounter
                required
                error={
                  rejectReason.length > 0 && rejectReason.length < 10
                    ? 'Reason must be at least 10 characters'
                    : undefined
                }
              />
            </div>
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}
