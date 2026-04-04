'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertTriangle, CheckCheck, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCallApprovals, approveCall, rejectCall, bulkApproveCalls, getNeedsRetry, getCalls } from '@/lib/services/calls';
import { getNiPending, approveNi, rejectNi } from '@/lib/services/client-numbers';
import { getSalesUsers } from '@/lib/services/users';
import { CallResponseDto, CallApprovalStatus, Role } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { CallStatusBadge } from '@/components/calls/CallStatusBadge';
import { ScreenshotViewer } from '@/components/calls/ScreenshotViewer';
import { formatDateShort } from '@/utils/formatters';

export default function CallApprovalsPage() {
  const { user, isSalesManager } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === Role.ADMIN;

  const [activeTab, setActiveTab] = useState<'pending' | 'retry' | 'ni' | 'history'>('pending');
  const [page, setPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallResponseDto | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'selected' | 'all' | null>(null);
  const limit = 10;

  // Fetch users for employee filter (ADMIN only)
  const { data: usersData } = useQuery({
    queryKey: ['sales-users'],
    queryFn: getSalesUsers,
    enabled: isAdmin,
  });

  const userOptions = useMemo(() => {
    const opts = [{ value: '', label: 'All Employees' }];
    if (usersData) {
      usersData.forEach((u) => opts.push({ value: u.id, label: u.email }));
    }
    return opts;
  }, [usersData]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['calls', 'approvals', { page, limit, userId: filterUserId || undefined }],
    queryFn: () => getCallApprovals({ page, limit, userId: filterUserId || undefined }),
  });

  const calls = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const { data: retryData } = useQuery({
    queryKey: ['calls', 'needs-retry'],
    queryFn: getNeedsRetry,
    refetchInterval: 15000,
  });
  const retryCalls = retryData || [];

  // NI pending
  const { data: niPendingData } = useQuery({
    queryKey: ['ni-pending'],
    queryFn: getNiPending,
    refetchInterval: 15000,
  });
  const niPending = niPendingData || [];

  // History tab state
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<string>('APPROVED');
  const [historyUserId, setHistoryUserId] = useState('');

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['calls', 'history', { page: historyPage, limit, approvalStatus: historyFilter || undefined, userId: historyUserId || undefined }],
    queryFn: () => getCalls({ page: historyPage, limit, approvalStatus: (historyFilter || undefined) as CallApprovalStatus | undefined, userId: historyUserId || undefined }),
    enabled: activeTab === 'history',
  });
  const historyCalls = historyData?.data || [];
  const historyTotalPages = Math.ceil((historyData?.total || 0) / limit);

  const niApproveMutation = useMutation({
    mutationFn: (id: string) => approveNi(id),
    onSuccess: () => {
      toast.success('Not Interested approved');
      queryClient.invalidateQueries({ queryKey: ['ni-pending'] });
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['pool'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const [niRejectId, setNiRejectId] = useState<string | null>(null);
  const [niRejectReason, setNiRejectReason] = useState('');

  const niRejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectNi(id, reason),
    onSuccess: () => {
      toast.success('Not Interested rejected — number returned to rep');
      queryClient.invalidateQueries({ queryKey: ['ni-pending'] });
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      setNiRejectId(null);
      setNiRejectReason('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  // --- Individual mutations ---
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveCall(id),
    onSuccess: () => {
      toast.success('Call approved');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'my-daily-stats'] });
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'my-daily-stats'] });
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      setShowRejectModal(false);
      setSelectedCall(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject call'),
  });

  // --- Bulk mutation ---
  const bulkMutation = useMutation({
    mutationFn: bulkApproveCalls,
    onSuccess: (result) => {
      toast.success(`${result.approved} call(s) approved${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'my-daily-stats'] });
      queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] });
      setSelectedIds(new Set());
      setBulkAction(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Bulk approve failed');
      setBulkAction(null);
    },
  });

  const isSelfCall = (call: CallResponseDto) => isSalesManager && call.userId === user?.id;

  // Checkbox helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === calls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(calls.map((c) => c.id)));
    }
  }

  const allSelected = calls.length > 0 && selectedIds.size === calls.length;

  function handleBulkConfirm() {
    if (bulkAction === 'selected') {
      bulkMutation.mutate({ callIds: Array.from(selectedIds) });
    } else if (bulkAction === 'all') {
      if (filterUserId) {
        bulkMutation.mutate({ userId: filterUserId });
      } else {
        bulkMutation.mutate({ all: true });
      }
    }
  }

  const bulkConfirmMessage =
    bulkAction === 'selected'
      ? `Approve ${selectedIds.size} selected call(s)?`
      : filterUserId
        ? `Approve all pending calls for this employee?`
        : 'Approve ALL pending calls?';

  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SALES_MANAGER]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Approvals</h1>
          <p className="text-gray-500">Review and approve or reject pending calls</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Approval ({data?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('retry')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'retry' ? 'border-yellow-600 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Needs Retry ({retryCalls.length})
          </button>
          <button
            onClick={() => setActiveTab('ni')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ni' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Not Interested ({niPending.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
        </div>

        {activeTab === 'history' ? (
          <>
            {/* History filters */}
            <Card className="p-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="w-full md:w-48">
                  <Select
                    label="Status"
                    value={historyFilter}
                    onChange={(e) => { setHistoryFilter(e.target.value); setHistoryPage(1); }}
                    options={[
                      { value: '', label: 'All' },
                      { value: 'APPROVED', label: 'Approved' },
                      { value: 'REJECTED', label: 'Rejected' },
                    ]}
                  />
                </div>
                {isAdmin && (
                  <div className="w-full md:w-64">
                    <Select
                      label="Employee"
                      value={historyUserId}
                      onChange={(e) => { setHistoryUserId(e.target.value); setHistoryPage(1); }}
                      options={userOptions}
                    />
                  </div>
                )}
              </div>
            </Card>

            {historyLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
            ) : historyCalls.length === 0 ? (
              <Card><EmptyState title="No calls found" description="No approved or rejected calls match your filters." /></Card>
            ) : (
              <>
                <div className="space-y-3">
                  {historyCalls.map((call) => (
                    <Card key={call.id} className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-gray-900">{call.rawPhoneNumber}</span>
                            <CallStatusBadge status={call.callStatus} size="sm" />
                            {call.approvalStatus === 'APPROVED' ? (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Approved</span>
                            ) : call.approvalStatus === 'REJECTED' ? (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">Rejected</span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span>by {call.user.email}</span>
                            <span>{formatDateShort(call.createdAt)}</span>
                            {call.durationMinutes && <span>Duration: {call.durationMinutes} min</span>}
                            {call.approvedBy && <span>Reviewed by: {call.approvedBy.email}</span>}
                          </div>
                          {call.notes && <p className="text-sm text-gray-600">{call.notes}</p>}
                          {call.rejectionReason && (
                            <p className="text-sm text-red-600">Reason: {call.rejectionReason}</p>
                          )}
                          {call.screenshot && <ScreenshotViewer screenshot={call.screenshot} />}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <Pagination currentPage={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} total={historyData?.total || 0} limit={limit} />
              </>
            )}
          </>
        ) : activeTab === 'ni' ? (
          <Card>
            {niPending.length === 0 ? (
              <EmptyState title="No pending requests" description="No Not Interested requests to review." />
            ) : (
              <div className="divide-y divide-gray-100">
                {niPending.map((num: any) => {
                  const call = num.linkedCall;
                  return (
                    <Card key={num.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-gray-900">{num.phoneNumber}</span>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">Not Interested</span>
                            {call && <CallStatusBadge status={call.callStatus} size="sm" />}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span>by {call?.user?.email || num.enteredBy?.email || 'unknown'}</span>
                            {call && <span>{formatDateShort(call.createdAt)}</span>}
                            {call?.durationMinutes && <span>Duration: {call.durationMinutes} min</span>}
                            {call?.callStartedAt && (() => {
                              const startTime = new Date(call.callStartedAt);
                              const endTime = new Date(call.createdAt);
                              const totalMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                              const exceeded = call.durationMinutes && Math.abs(totalMin - call.durationMinutes) > 1;
                              const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                              return (
                                <span className={exceeded ? 'text-red-600 font-semibold' : ''}>
                                  Total Time: {totalMin} min ({fmt(startTime)} - {fmt(endTime)})
                                  {exceeded && ' \u26a0'}
                                </span>
                              );
                            })()}
                          </div>
                          {num.clientName && <p className="text-sm text-gray-600">Client: {num.clientName}</p>}
                          {call?.notes && <p className="text-sm text-gray-600">{call.notes}</p>}
                          {call?.screenshot && <ScreenshotViewer screenshot={call.screenshot} />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => niApproveMutation.mutate(num.id)} loading={niApproveMutation.isPending}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setNiRejectId(num.id)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        ) : activeTab === 'retry' ? (
          <Card>
            {retryCalls.length === 0 ? (
              <EmptyState title="No calls need retry" description="All first attempts have been followed up." />
            ) : (
              <div className="divide-y divide-gray-100">
                {retryCalls.map((call) => (
                  <div key={call.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-gray-900">{call.clientPhoneNumber}</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">Awaiting 2nd call</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                      <span>by {call.user.email}</span>
                      <span>First call: {new Date(call.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
        <>

        {/* Filters & Bulk Actions (ADMIN only) */}
        {isAdmin && (
          <Card className="p-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="w-full md:w-64">
                <Select
                  label="Filter by Employee"
                  value={filterUserId}
                  onChange={(e) => { setFilterUserId(e.target.value); setPage(1); setSelectedIds(new Set()); }}
                  options={userOptions}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedIds.size === 0 || bulkMutation.isPending}
                  onClick={() => setBulkAction('selected')}
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Approve Selected ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  disabled={calls.length === 0 || bulkMutation.isPending}
                  onClick={() => setBulkAction('all')}
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Approve All
                </Button>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
        ) : isError ? (
          <ErrorState message="Unable to load data" onRetry={refetch} />
        ) : calls.length === 0 ? (
          <Card><EmptyState title="No pending approvals" description="All calls have been reviewed." /></Card>
        ) : (
          <>
            {/* Select All checkbox (ADMIN only) */}
            {isAdmin && (
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </span>
              </div>
            )}

            <div className="space-y-3">
              {calls.map((call) => (
                <Card key={call.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Checkbox (ADMIN only) */}
                    {isAdmin && (
                      <div className="flex items-start pt-1 shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(call.id)}
                          onChange={() => toggleSelect(call.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">{call.rawPhoneNumber}</span>
                        <div className="flex items-center gap-2">
                          <CallStatusBadge status={call.callStatus} size="sm" />
                          {call.screenshot?.duplicateInstances && call.screenshot.duplicateInstances.length > 0 && (
                            <div
                              className="bg-yellow-100 text-yellow-600 rounded-full p-1 shadow-sm border border-yellow-300 flex items-center justify-center cursor-help"
                              title="Warning: Identical image uploaded previously! Click the image to view details."
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>by {call.user.email}</span>
                        <span>{formatDateShort(call.createdAt)}</span>
                        {call.durationMinutes && <span>Duration: {call.durationMinutes} min</span>}
                        {call.callStartedAt && (() => {
                          const startTime = new Date(call.callStartedAt);
                          const endTime = new Date(call.createdAt);
                          const totalMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                          const exceeded = call.durationMinutes && Math.abs(totalMin - call.durationMinutes) > 1;
                          const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <span className={exceeded ? 'text-red-600 font-semibold' : ''}>
                              Total Time: {totalMin} min ({fmt(startTime)} - {fmt(endTime)})
                              {exceeded && ' ⚠'}
                            </span>
                          );
                        })()}
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
                        aria-label="Approve call"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => { setSelectedCall(call); setShowRejectModal(true); }}
                        aria-label="Reject call"
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

        {/* Individual approve confirm */}
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

        {/* Individual reject modal */}
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

        {/* Bulk approve confirm dialog */}
        <ConfirmDialog
          isOpen={!!bulkAction}
          onClose={() => setBulkAction(null)}
          onConfirm={handleBulkConfirm}
          title="Bulk Approve Calls"
          message={bulkConfirmMessage}
          confirmText="Approve"
          loading={bulkMutation.isPending}
        />
        </>
        )}
        {/* NI Reject Modal */}
        {niRejectId && (
          <Modal
            isOpen={!!niRejectId}
            onClose={() => { setNiRejectId(null); setNiRejectReason(''); }}
            title="Reject Not Interested"
            size="md"
            footer={
              <>
                <Button variant="outline" onClick={() => { setNiRejectId(null); setNiRejectReason(''); }}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={() => niRejectMutation.mutate({ id: niRejectId, reason: niRejectReason || undefined })}
                  loading={niRejectMutation.isPending}
                >
                  Reject & Return to Rep
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-gray-600">This will return the number back to the rep's assigned list.</p>
              <Textarea
                label="Reason (optional)"
                value={niRejectReason}
                onChange={(e) => setNiRejectReason(e.target.value)}
                placeholder="Optional reason for rejection..."
                maxLength={500}
              />
            </div>
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}
