'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCalls, updateCall, getMyDailyStats } from '@/lib/services/calls';
import { getSalesUsers } from '@/lib/services/users';
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
import { CallHistoryModal } from '@/components/calls/CallHistoryModal';
import { formatDateShort } from '@/utils/formatters';

export default function MyCallsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [callStatusFilter, setCallStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50; // Increased limit so grouping works better on a page

  // Modals state
  const [editCallId, setEditCallId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');
  
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['calls', 'my-daily-stats', date],
    queryFn: () => getMyDailyStats(date),
  });

  const { data: salesUsers } = useQuery({
    queryKey: ['sales-users'],
    queryFn: getSalesUsers,
    enabled: user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER',
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['calls', { date, callStatus: callStatusFilter, approvalStatus: approvalFilter, searchPhone, filterUserId, page, limit }],
    queryFn: () => getCalls({
      date: date || undefined,
      callStatus: callStatusFilter ? callStatusFilter as CallStatus : undefined,
      approvalStatus: approvalFilter ? approvalFilter as CallApprovalStatus : undefined,
      phoneNumber: searchPhone || undefined,
      userId: filterUserId || undefined,
      showSuperseded: false, // Always false now that history modal exists
      page,
      limit,
    }),
  });

  const allCalls = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  // Determine if grouping should be applied. Grouping makes most sense when NOT filtering by a single day
  // BUT the user requirement is they want the group behavior in the Calls table period.
  const groupedCalls = [];
  const seenPhones = new Set();

  for (const call of allCalls) {
    if (!seenPhones.has(call.clientPhoneNumber)) {
      seenPhones.add(call.clientPhoneNumber);
      groupedCalls.push(call);
    }
  }

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
          <Input
            label="Search Phone"
            type="text"
            placeholder="01xxxxxxxxx"
            value={searchPhone}
            onChange={(e) => { setSearchPhone(e.target.value); setPage(1); }}
          />
          {(user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER') && (
            <Select
              label="Member"
              value={filterUserId}
              onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Members' },
                ...(salesUsers
                  ?.filter(u =>
                    user.role === 'ADMIN' ? true // Admin sees everyone fetched (Admin, Sales Mgr, Sales)
                    : (u.role === 'SALES_MANAGER' || u.role === 'SALES') // Sales Mgr sees himself and sales team
                  )
                  .map((u) => ({ value: u.id, label: u.email })) || [])
              ]}
            />
          )}
        </div>
      </Card>

      {/* Calls List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
      ) : allCalls.length === 0 ? (
        <Card><EmptyState title="No calls found" description="No calls match your filters." /></Card>
      ) : (
        <>
          <div className="space-y-3">
            {groupedCalls.map((call) => (
              <div 
                key={call.id} 
                className="bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setHistoryPhone(call.clientPhoneNumber)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue-600 hover:underline">{call.rawPhoneNumber}</span>
                      <CallStatusBadge status={call.callStatus} size="sm" />
                      {call.screenshot?.duplicateInstances && call.screenshot.duplicateInstances.length > 0 && (
                        <div 
                          className="bg-yellow-100 text-yellow-600 rounded-full p-1 shadow-sm border border-yellow-300 flex items-center justify-center cursor-help" 
                          title="Warning: Identical image uploaded previously!"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
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
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {call.approvalStatus === 'PENDING' && call.userId === user?.id && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(call)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
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

      {/* History Modal */}
      <CallHistoryModal
        isOpen={!!historyPhone}
        onClose={() => setHistoryPhone(null)}
        phoneNumber={historyPhone || ''}
      />
    </div>
  );
}
