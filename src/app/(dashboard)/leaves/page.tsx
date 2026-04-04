'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorState } from '@/components/ui/ErrorState';
import toast from 'react-hot-toast';
import { requestLeave, getMyLeaves, cancelLeave } from '@/lib/services/leaves';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Loading';
import { LeaveStatus } from '@/types/api';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';

function getLeaveStatusBadge(status: LeaveStatus) {
  const map: Record<string, { bg: string; label: string }> = {
    PENDING_LEAVE: { bg: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    APPROVED_PAID: { bg: 'bg-green-100 text-green-800', label: 'Approved (Paid)' },
    APPROVED_UNPAID: { bg: 'bg-blue-100 text-blue-800', label: 'Approved (Unpaid)' },
    REJECTED_LEAVE: { bg: 'bg-red-100 text-red-800', label: 'Rejected' },
  };
  const s = map[status] || { bg: 'bg-gray-100 text-gray-800', label: status };
  return <span className={`px-2 py-1 text-xs rounded-full ${s.bg}`}>{s.label}</span>;
}

export default function LeavesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ leaveDate: '', reason: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-leaves', page],
    queryFn: () => getMyLeaves({ page, limit: 20 }),
  });

  const requestMutation = useMutation({
    mutationFn: () => requestLeave({ leaveDate: form.leaveDate, reason: form.reason || undefined }),
    onSuccess: () => { toast.success('Leave requested'); setShowModal(false); setForm({ leaveDate: '', reason: '' }); queryClient.invalidateQueries({ queryKey: ['my-leaves'] }); queryClient.invalidateQueries({ queryKey: ['pending-leaves'] }); queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelLeave,
    onSuccess: () => { toast.success('Leave cancelled'); queryClient.invalidateQueries({ queryKey: ['my-leaves'] }); queryClient.invalidateQueries({ queryKey: ['pending-leaves'] }); queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (isError) return <ErrorState message="Unable to load data" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Request Leave</Button>
      </div>

      {isLoading ? <CardSkeleton /> : !data || data.data.length === 0 ? (
        <EmptyState title="No leave requests" description="You haven't requested any leaves yet." action={<Button onClick={() => setShowModal(true)}>Request Leave</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejection Reason</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((leave) => (
                  <tr key={leave.id}>
                    <td className="px-4 py-3 text-sm font-medium">{leave.leaveDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{leave.reason || '-'}</td>
                    <td className="px-4 py-3">{getLeaveStatusBadge(leave.status)}</td>
                    <td className="px-4 py-3 text-sm text-red-500">{leave.rejectionReason || '-'}</td>
                    <td className="px-4 py-3">
                      {leave.status === LeaveStatus.PENDING_LEAVE && (
                        <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate(leave.id)}><Trash2 className="w-3 h-3" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.total > 20 && <Pagination currentPage={page} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} />}
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Leave">
        <div className="space-y-4">
          <div>
            <Input label="Leave Date" type="date" value={form.leaveDate} onChange={(e) => { setForm({ ...form, leaveDate: e.target.value }); setFormErrors((prev) => { const { leaveDate, ...rest } = prev; return rest; }); }} required />
            {formErrors.leaveDate && <p className="text-sm text-red-600 mt-1">{formErrors.leaveDate}</p>}
          </div>
          <Textarea label="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Button onClick={() => { if (!form.leaveDate) { setFormErrors({ leaveDate: 'Date is required' }); return; } setFormErrors({}); requestMutation.mutate(); }} loading={requestMutation.isPending} fullWidth>Submit Request</Button>
        </div>
      </Modal>
    </div>
  );
}
