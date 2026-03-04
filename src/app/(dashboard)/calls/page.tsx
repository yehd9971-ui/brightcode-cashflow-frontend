'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCalls, updateCall, getMyDailyStats } from '@/lib/services/calls';
import { CallStatus, CallApprovalStatus, UpdateCallDto } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { CallStatusBadge, ApprovalStatusBadge } from '@/components/calls/CallStatusBadge';
import { DailyProgressCard } from '@/components/calls/DailyProgressCard';
import { formatDateShort } from '@/utils/formatters';

export default function MyCallsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [callStatusFilter, setCallStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Edit modal state
  const [editCallId, setEditCallId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['calls', 'my-daily-stats', date],
    queryFn: () => getMyDailyStats(date),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['calls', { date, callStatus: callStatusFilter, approvalStatus: approvalFilter, showSuperseded, page, limit }],
    queryFn: () => getCalls({
      date: date || undefined,
      callStatus: callStatusFilter ? callStatusFilter as CallStatus : undefined,
      approvalStatus: approvalFilter ? approvalFilter as CallApprovalStatus : undefined,
      showSuperseded,
      page,
      limit,
    }),
  });

  const calls = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const editMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCallDto }) => updateCall(id, dto),
    onSuccess: () => {
      toast.success('Call updated');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setEditCallId(null);
    },
    onError: () => toast.error('Failed to update call'),
  });

  const openEdit = (call: any) => {
    setEditCallId(call.id);
    setEditDuration(call.durationMinutes?.toString() || '');
    setEditNotes(call.notes || '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Calls</h1>
        <p className="text-gray-500">View and manage your call records</p>
      </div>

      {stats && <DailyProgressCard stats={stats} />}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
          />
          <Select
            label="Call Status"
            value={callStatusFilter}
            onChange={(e) => { setCallStatusFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All' },
              { value: 'ANSWERED', label: 'Answered' },
              { value: 'NOT_ANSWERED', label: 'Not Answered' },
            ]}
          />
          <Select
            label="Approval"
            value={approvalFilter}
            onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
            <input
              type="checkbox"
              checked={showSuperseded}
              onChange={(e) => setShowSuperseded(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show Superseded
          </label>
        </div>
      </Card>

      {/* Calls List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
      ) : calls.length === 0 ? (
        <Card><EmptyState title="No calls found" description="No calls match your filters." /></Card>
      ) : (
        <>
          <div className="space-y-3">
            {calls.map((call) => (
              <Card key={call.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{call.rawPhoneNumber}</span>
                      <CallStatusBadge status={call.callStatus} size="sm" />
                      <ApprovalStatusBadge status={call.approvalStatus} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {call.durationMinutes && <span>{call.durationMinutes} min</span>}
                      <span>{formatDateShort(call.createdAt)}</span>
                      {call.notes && <span className="truncate max-w-xs">{call.notes}</span>}
                    </div>
                    {call.rejectionReason && (
                      <p className="text-sm text-red-600">Rejection: {call.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {call.approvalStatus === 'PENDING' && call.userId === user?.id && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(call)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={isFetching} total={data?.total || 0} limit={limit} />
        </>
      )}

      {/* Edit Modal */}
      {editCallId && (
        <Modal
          isOpen={!!editCallId}
          onClose={() => setEditCallId(null)}
          title="Edit Call"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditCallId(null)}>Cancel</Button>
              <Button
                onClick={() => editMutation.mutate({
                  id: editCallId,
                  dto: {
                    durationMinutes: editDuration ? parseInt(editDuration) : undefined,
                    notes: editNotes || undefined,
                  },
                })}
                loading={editMutation.isPending}
              >
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Duration (minutes)" type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} min={1} />
            <Textarea label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} maxLength={1000} />
          </div>
        </Modal>
      )}
    </div>
  );
}
