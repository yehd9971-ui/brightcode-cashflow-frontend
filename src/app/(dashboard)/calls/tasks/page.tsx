'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, PhoneForwarded } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCallTasks, createCallTask } from '@/lib/services/call-tasks';
import { getMyDailyStats } from '@/lib/services/calls';
import { CallTaskStatus } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskStatusBadge } from '@/components/calls/CallStatusBadge';
import { DailyProgressCard } from '@/components/calls/DailyProgressCard';
import { useCallWebSocket } from '@/hooks/useCallWebSocket';

export default function CallTasksPage() {
  const { user, isAdmin, isSalesManager } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Create task modal
  const [showCreate, setShowCreate] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newDate, setNewDate] = useState(today);
  const [newTime, setNewTime] = useState('10:00');
  const [newNotes, setNewNotes] = useState('');

  // Follow-up modal
  const [followUpPhone, setFollowUpPhone] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useCallWebSocket({ userId: user?.id, enabled: !!user });

  const { data: stats } = useQuery({
    queryKey: ['calls', 'my-daily-stats', date],
    queryFn: () => getMyDailyStats(date),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['call-tasks', { date, status: statusFilter, page, limit }],
    queryFn: () => getCallTasks({
      date: date || undefined,
      status: statusFilter ? statusFilter as CallTaskStatus : undefined,
      page,
      limit,
    }),
  });

  const tasks = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const createMutation = useMutation({
    mutationFn: () => createCallTask({
      clientPhoneNumber: newPhone,
      taskDate: newDate,
      taskTime: newTime,
      notes: newNotes || undefined,
    }),
    onSuccess: () => {
      toast.success('Task created');
      queryClient.invalidateQueries({ queryKey: ['call-tasks'] });
      setShowCreate(false);
      setNewPhone(''); setNewNotes('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create task'),
  });

  const followUpMutation = useMutation({
    mutationFn: () => createCallTask({
      clientPhoneNumber: followUpPhone,
      taskDate: followUpDate,
      taskTime: followUpTime,
      notes: followUpNotes || undefined,
    }),
    onSuccess: () => {
      toast.success('Follow-up task created');
      queryClient.invalidateQueries({ queryKey: ['call-tasks'] });
      setShowFollowUp(false);
    },
    onError: () => toast.error('Failed to create follow-up'),
  });

  const openFollowUp = (phone: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpPhone(phone);
    setFollowUpDate(tomorrow.toISOString().split('T')[0]);
    setFollowUpTime('10:00');
    setFollowUpNotes('');
    setShowFollowUp(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Tasks</h1>
          <p className="text-gray-500">Manage your call tasks</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Create Task
        </Button>
      </div>

      {stats && <DailyProgressCard stats={stats} />}

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Input label="Date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'OVERDUE', label: 'Overdue' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
      ) : tasks.length === 0 ? (
        <Card><EmptyState title="No tasks" description="No tasks found for this date." /></Card>
      ) : (
        <>
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{task.rawPhoneNumber}</span>
                      <TaskStatusBadge status={task.status} size="sm" />
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{task.source.replace('_', ' ')}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {(isAdmin || isSalesManager) && task.user && (
                        <><span className="font-medium text-gray-700">{task.user.email}</span><span className="mx-1">·</span></>
                      )}
                      <span>{task.taskDate} at {task.taskTime}</span>
                      {task.notes && <span className="ml-3">{task.notes}</span>}
                    </div>
                    {task.rejectionReason && (
                      <p className="text-sm text-red-600">Rejected: {task.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'COMPLETED' && (
                      <Button variant="outline" size="sm" onClick={() => openFollowUp(task.rawPhoneNumber)}>
                        <PhoneForwarded className="w-4 h-4 mr-1" /> Follow-up
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

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Task"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!newPhone.trim()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="01xxxxxxxxx" required />
          <Input label="Date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          <Input label="Time" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} required />
          <Textarea label="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} maxLength={500} />
        </div>
      </Modal>

      {/* Follow-up Modal */}
      <Modal
        isOpen={showFollowUp}
        onClose={() => setShowFollowUp(false)}
        title="Create Follow-up"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowFollowUp(false)}>Cancel</Button>
            <Button onClick={() => followUpMutation.mutate()} loading={followUpMutation.isPending}>
              Create Follow-up
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Follow-up for <strong>{followUpPhone}</strong></p>
          <Input label="Date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} required />
          <Input label="Time" type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} required />
          <Textarea label="Notes (optional)" value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} maxLength={500} />
        </div>
      </Modal>
    </div>
  );
}
