'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  pullFromPool,
  getMyNumbers,
  getPendingCompletions,
  pullForCompletion,
  markNotInterested,
  getNumberDetail,
  updateLeadStatus,
  returnToPool,
  scheduleFollowUps,
  addNumber,
} from '@/lib/services/client-numbers';
import { getTodayCallTasks, createCallTask } from '@/lib/services/call-tasks';
import { getSalesUsers } from '@/lib/services/users';
import { normalizePhoneNumber } from '@/utils/phone';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { NumberDetailCard } from '@/components/numbers/NumberDetailCard';
import { NumberSearchBar } from '@/components/numbers/NumberSearchBar';
import { PendingCompletionList } from '@/components/numbers/PendingCompletionList';
import { LeadStatus, Role, CallTaskStatus } from '@/types/api';
import type { ClientNumberDto, AddNumberDto, CallTaskResponseDto } from '@/types/api';
import { startCall, getMyCallStatus } from '@/lib/services/users';
import { getNeedsRetry } from '@/lib/services/calls';
import { useRouter } from 'next/navigation';
import { Phone, Plus, ArrowRight, PhoneCall, FileText, Clock, CalendarPlus, CheckCircle, ThumbsDown, AlertTriangle } from 'lucide-react';

// Get today's Egypt date as YYYY-MM-DD
function getTodayEgypt(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

export default function NumbersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const isManager = user?.role === Role.SALES_MANAGER;
  const canCreateTask = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState<'today' | 'assigned'>('today');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AddNumberDto>({ phoneNumber: '' });
  const [taskForm, setTaskForm] = useState({ phone: '', userId: '', date: '', time: '', notes: '' });
  const [viewUserId, setViewUserId] = useState<string>('');
  const isViewingOther = !!viewUserId;
  const targetUserId = viewUserId || undefined;

  const { data: salesUsers } = useQuery({
    queryKey: ['sales-users'],
    queryFn: getSalesUsers,
    enabled: isAdmin || isManager,
  });

  const viewingUserEmail = viewUserId ? salesUsers?.find(u => u.id === viewUserId)?.email : null;

  const { data: myNumbers, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-numbers', targetUserId],
    queryFn: () => getMyNumbers({ page: 1, limit: 100, userId: targetUserId }),
  });

  const { data: pendingCompletions } = useQuery({
    queryKey: ['pending-completions', targetUserId],
    queryFn: () => getPendingCompletions(targetUserId),
  });

  const { data: callStatus } = useQuery({
    queryKey: ['my-call-status'],
    queryFn: getMyCallStatus,
    refetchInterval: 15000,
    enabled: activeTab === 'today' && !isViewingOther,
  });

  const isOnCall = !isViewingOther && callStatus?.currentStatus === 'ON_CALL';
  const activeCallPhone = !isViewingOther ? callStatus?.currentCallPhone : undefined;

  const { data: needsRetry } = useQuery({
    queryKey: ['calls', 'needs-retry', targetUserId],
    queryFn: () => getNeedsRetry(targetUserId),
    refetchInterval: 30000,
    enabled: activeTab === 'today',
  });

  const { data: todayTasks } = useQuery({
    queryKey: ['call-tasks', 'today', targetUserId],
    queryFn: () => getTodayCallTasks(targetUserId),
    refetchInterval: 30000,
  });

  // Timer for countdown refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const todayEgypt = getTodayEgypt();

  // Retry wait map
  const retryWaitMap = new Map<string, number>();
  needsRetry?.forEach(call => {
    const minutesLeft = 120 - Math.floor((Date.now() - new Date(call.createdAt).getTime()) / 60000);
    if (minutesLeft > 0) {
      retryWaitMap.set(call.clientPhoneNumber, minutesLeft);
    }
  });

  const formatWait = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  };

  // Needs-retry phone set (normalized for consistent matching)
  const retryPhoneSet = useMemo(() => {
    const set = new Set<string>();
    needsRetry?.forEach(c => {
      set.add(normalizePhoneNumber(c.clientPhoneNumber));
    });
    return set;
  }, [needsRetry]);

  // Today's numbers: pulled/added today
  const todayNumbers = useMemo(() => {
    if (!myNumbers?.data) return { newNumbers: [] as ClientNumberDto[], calledNumbers: [] as ClientNumberDto[] };
    const newNums: ClientNumberDto[] = [];
    const calledNums: ClientNumberDto[] = [];
    for (const num of myNumbers.data) {
      // Use updatedAt: when pulled from pool or added, the record is updated today
      const updatedDate = new Date(num.updatedAt).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
      if (updatedDate !== todayEgypt) continue;
      // Skip numbers that are in Needs Retry (they show in their own section)
      const isInRetry = retryPhoneSet.has(normalizePhoneNumber(num.normalizedPhone));
      if (isInRetry) continue;
      const calledToday = num.lastAttemptDate === todayEgypt;
      if (calledToday) {
        calledNums.push(num);
      } else {
        newNums.push(num);
      }
    }
    return { newNumbers: newNums, calledNumbers: calledNums };
  }, [myNumbers?.data, todayEgypt, retryPhoneSet]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    if (!todayTasks) return [];
    const now = new Date();
    return [...todayTasks].sort((a, b) => {
      const aAlerted = new Date(a.scheduledAt) <= now;
      const bAlerted = new Date(b.scheduledAt) <= now;
      if (aAlerted && !bAlerted) return -1;
      if (!aAlerted && bAlerted) return 1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  }, [todayTasks]);

  // Task badge map for assigned tab
  const taskByPhone = useMemo(() => {
    const map = new Map<string, CallTaskResponseDto>();
    todayTasks?.forEach(task => {
      if (!map.has(task.clientPhoneNumber)) map.set(task.clientPhoneNumber, task);
    });
    return map;
  }, [todayTasks]);

  // Check if user has any uncalled pool-pulled numbers (blocks pulling another)
  const uncalledNumbers = useMemo(() => {
    if (isAdmin) return [];
    return myNumbers?.data.filter(
      n => n.assignmentType === 'POOL_PULLED'
        && !n.lastAttemptDate
        && n.leadStatus !== LeadStatus.NOT_INTERESTED
        && n.poolStatus === 'ASSIGNED'
        // If it's in needs-retry, it WAS called (first NOT_ANSWERED) so don't block
        && !retryPhoneSet.has(n.phoneNumber)
        && !retryPhoneSet.has(n.normalizedPhone)
    ) ?? [];
  }, [myNumbers?.data, isAdmin, retryPhoneSet]);

  // Count for tabs
  const todayCount = todayNumbers.newNumbers.length + sortedTasks.length + (needsRetry?.length ?? 0) + (pendingCompletions?.length ?? 0) + todayNumbers.calledNumbers.length;

  const { data: numberDetail } = useQuery({
    queryKey: ['number-detail', selectedNumberId],
    queryFn: () => getNumberDetail(selectedNumberId!),
    enabled: !!selectedNumberId,
  });

  // --- Mutations ---
  const pullMutation = useMutation({
    mutationFn: pullFromPool,
    onSuccess: (data) => {
      toast.success(`Pulled: ${data.phoneNumber}`);
      setActiveTab('today');
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['pool'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'No numbers available'),
  });

  const completionMutation = useMutation({
    mutationFn: pullForCompletion,
    onSuccess: () => {
      toast.success('Number pulled for completion');
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['pending-completions'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Cannot complete yet'),
  });

  const notInterestedMutation = useMutation({
    mutationFn: markNotInterested,
    onSuccess: () => {
      toast.success('Marked as not interested (pending approval)');
      setSelectedNumberId(null);
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['ni-pending'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const addMutation = useMutation({
    mutationFn: (data: AddNumberDto) => addNumber(data),
    onSuccess: () => {
      toast.success('Number added');
      setShowAddModal(false);
      setAddForm({ phoneNumber: '' });
      setActiveTab('today');
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add'),
  });

  const followUpMutation = useMutation({
    mutationFn: scheduleFollowUps,
    onSuccess: () => {
      toast.success('Follow-ups scheduled');
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['call-tasks', 'today'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const returnMutation = useMutation({
    mutationFn: returnToPool,
    onSuccess: () => {
      toast.success('Returned to pool');
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['pool'] });
      queryClient.invalidateQueries({ queryKey: ['call-tasks', 'today'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { clientPhoneNumber: string; taskDate: string; taskTime: string; notes?: string; userId?: string }) =>
      createCallTask(data),
    onSuccess: () => {
      toast.success('Task created');
      setShowTaskModal(false);
      setTaskForm({ phone: '', userId: '', date: '', time: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['call-tasks', 'today'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create task'),
  });

  // --- Call button helper ---
  const renderCallButton = (phoneNumber: string, variant?: 'yellow' | 'orange' | 'default') => {
    if (isViewingOther) return null;
    const waitMins = retryWaitMap.get(phoneNumber);
    if (isOnCall && activeCallPhone === phoneNumber) {
      return (
        <Button size="sm" variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-50"
          onClick={(e) => { e.stopPropagation(); router.push(`/calls/new?phone=${encodeURIComponent(phoneNumber)}`); }}>
          <FileText className="w-4 h-4 mr-1" /> Fill Report
        </Button>
      );
    }
    if (isOnCall) return null;
    if (waitMins && waitMins > 0) {
      return (
        <Button size="sm" disabled className="opacity-50 cursor-not-allowed">
          <PhoneCall className="w-4 h-4 mr-1" /> {variant === 'yellow' ? `Call Again (${formatWait(waitMins)})` : `Retry in ${formatWait(waitMins)}`}
        </Button>
      );
    }
    return (
      <Button size="sm"
        className={variant === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' : variant === 'orange' ? 'bg-orange-600 hover:bg-orange-700' : ''}
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await startCall(phoneNumber);
            window.open(`tel:${phoneNumber}`, '_self');
            setTimeout(() => { router.push(`/calls/new?phone=${encodeURIComponent(phoneNumber)}`); }, 500);
          } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to start call'); }
        }}>
        <PhoneCall className="w-4 h-4 mr-1" /> {variant === 'yellow' ? 'Call Again' : 'Call'}
      </Button>
    );
  };

  if (isError) return <ErrorState message="Unable to load data" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {isViewingOther ? `${viewingUserEmail}'s Numbers` : 'My Numbers'}
          </h1>
          {(isAdmin || isManager) && salesUsers && (
            <Select
              value={viewUserId}
              onChange={(e) => { setViewUserId(e.target.value); setSelectedNumberId(null); }}
              options={[
                { value: '', label: 'My Numbers' },
                ...salesUsers
                  .filter(u => u.id !== user?.id && (u.role === 'SALES' || u.role === 'SALES_MANAGER'))
                  .map(u => ({ value: u.id, label: u.email })),
              ]}
            />
          )}
        </div>
        {!isViewingOther && (
          <div className="flex gap-2">
            {canCreateTask && (
              <Button variant="outline" onClick={() => setShowTaskModal(true)}>
                <CalendarPlus className="w-4 h-4 mr-1" /> Create Task
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Number
            </Button>
            <Button
              onClick={() => pullMutation.mutate()}
              loading={pullMutation.isPending}
              disabled={uncalledNumbers.length > 0}
              title={uncalledNumbers.length > 0 ? `Call ${uncalledNumbers.map(n => n.phoneNumber).join(', ')} first` : undefined}
            >
              <ArrowRight className="w-4 h-4 mr-1" /> Pull from Pool
            </Button>
          </div>
        )}
      </div>

      {isViewingOther && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <span>Viewing {viewingUserEmail}'s numbers (read-only)</span>
        </div>
      )}

      {/* Global Number Search */}
      <NumberSearchBar />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'today' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Today's Calls ({todayCount})
        </button>
        <button
          onClick={() => setActiveTab('assigned')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'assigned' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Assigned Numbers ({myNumbers?.total ?? 0})
        </button>
      </div>

      {isLoading ? <CardSkeleton /> : (<>
      {/* Number Detail Card (shared) */}
      {selectedNumberId && numberDetail && (
        <NumberDetailCard
          number={numberDetail}
          activityLogs={numberDetail.activityLogs || []}
          previousAssignees={numberDetail.previousAssignees || []}
          onClose={() => setSelectedNumberId(null)}
        />
      )}

      {/* ═══════════════ TODAY'S CALLS TAB ═══════════════ */}
      {activeTab === 'today' && (
        <>
          {/* Active Call Banner */}
          {isOnCall && !isViewingOther && (
            <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-300 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="inline-block w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                <div>
                  <p className="font-semibold text-orange-800">You have an active call</p>
                  {activeCallPhone ? (
                    <p className="text-sm text-orange-600">Number: <span className="font-mono font-bold">{activeCallPhone}</span></p>
                  ) : (
                    <p className="text-sm text-orange-600">Please submit your call report to continue</p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => router.push(activeCallPhone ? `/calls/new?phone=${encodeURIComponent(activeCallPhone)}` : '/calls/new')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <FileText className="w-4 h-4 mr-2" /> Fill Report
              </Button>
            </div>
          )}

          {/* Uncalled Numbers Blocking Pull */}
          {uncalledNumbers.length > 0 && (
            <Card title={`Must Call First (${uncalledNumbers.length})`}>
              <div className="p-3 bg-red-50 border-b border-red-200 text-sm text-red-800">
                You must call these numbers before pulling a new one from the pool.
              </div>
              <div className="divide-y divide-gray-100">
                {uncalledNumbers.map((num) => (
                  <div key={num.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div>
                        <button onClick={() => setSelectedNumberId(num.id)} className="font-medium text-indigo-600 hover:underline">
                          {num.phoneNumber}
                        </button>
                        {num.clientName && <p className="text-xs text-gray-500">{num.clientName}</p>}
                      </div>
                    </div>
                    {renderCallButton(num.phoneNumber)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* New Numbers (pulled/added today, not yet called) */}
          {todayNumbers.newNumbers.length > 0 && (
            <Card title={`New Numbers (${todayNumbers.newNumbers.length})`}>
              <div className="p-3 bg-green-50 border-b border-green-200 text-sm text-green-800">
                Numbers pulled or added today. Call them to get started.
              </div>
              <div className="divide-y divide-gray-100">
                {todayNumbers.newNumbers.map((num) => (
                  <div key={num.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-green-500" />
                      <div>
                        <button onClick={() => setSelectedNumberId(num.id)} className="font-medium text-indigo-600 hover:underline">
                          {num.phoneNumber}
                        </button>
                        {num.clientName && <p className="text-xs text-gray-500">{num.clientName}</p>}
                      </div>
                    </div>
                    {renderCallButton(num.phoneNumber)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Today's Callbacks */}
          {sortedTasks.length > 0 && (
            <Card title={`Today's Callbacks (${sortedTasks.length})`}>
              <div className="p-3 bg-blue-50 border-b border-blue-200 text-sm text-blue-800">
                Scheduled callbacks for today. Orange cards have reached their scheduled time.
              </div>
              <div className="divide-y divide-gray-100">
                {sortedTasks.map((task) => {
                  const isAlerted = new Date(task.scheduledAt) <= new Date();
                  const isOverdue = task.status === CallTaskStatus.OVERDUE;
                  return (
                    <div key={task.id}
                      className={`flex items-center justify-between p-3 ${isOverdue ? 'bg-red-50' : isAlerted ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-500' : isAlerted ? 'text-orange-500' : 'text-blue-500'}`} />
                        <div>
                          <span className="font-medium text-gray-900">{task.rawPhoneNumber}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">at {task.taskTime}</span>
                            <Badge variant={isOverdue ? 'error' : isAlerted ? 'warning' : 'info'} className="text-xs">
                              {isOverdue ? 'OVERDUE' : isAlerted ? 'NOW' : 'UPCOMING'}
                            </Badge>
                            {task.source !== 'MANUAL_SALES' && (
                              <span className="text-xs text-gray-400">
                                {task.source === 'FOLLOW_UP' || task.source === 'FOLLOW_UP_AUTO' ? 'Follow-up' : 'Assigned'}
                              </span>
                            )}
                          </div>
                          {task.notes && <p className="text-xs text-gray-500 mt-0.5">{task.notes}</p>}
                        </div>
                      </div>
                      {renderCallButton(task.clientPhoneNumber, isAlerted ? 'orange' : 'default')}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Needs Retry */}
          {needsRetry && needsRetry.length > 0 && (
            <Card title={`Needs Retry (${needsRetry.length})`}>
              <div className="p-3 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800">
                These numbers didn't answer the first call today. Call again with a screenshot to complete.
              </div>
              <div className="divide-y divide-gray-100">
                {needsRetry.map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-yellow-500" />
                      <div>
                        <span className="font-medium text-gray-900">{call.clientPhoneNumber}</span>
                        <p className="text-xs text-gray-500">
                          First attempt: {new Date(call.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {renderCallButton(call.clientPhoneNumber, 'yellow')}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pending Completions */}
          {pendingCompletions && pendingCompletions.length > 0 && (
            <PendingCompletionList
              numbers={pendingCompletions}
              onComplete={(id) => completionMutation.mutate(id)}
            />
          )}

          {/* Called Today */}
          {todayNumbers.calledNumbers.length > 0 && (
            <Card title={`Called (${todayNumbers.calledNumbers.length})`}>
              <div className="divide-y divide-gray-100">
                {todayNumbers.calledNumbers.map((num) => (
                  <div key={num.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedNumberId(num.id)} className="font-medium text-gray-700 hover:underline">
                            {num.phoneNumber}
                          </button>
                          <Badge variant="success" className="text-xs">Called</Badge>
                        </div>
                        {num.clientName && <p className="text-xs text-gray-500">{num.clientName}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {renderCallButton(num.phoneNumber)}
                      {!isViewingOther && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => notInterestedMutation.mutate(num.id)}
                          loading={notInterestedMutation.isPending}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" /> Not Interested
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Empty state */}
          {todayCount === 0 && !isOnCall && (
            <Card>
              <EmptyState title="No calls for today" description="Pull from the pool or add a number to get started." />
            </Card>
          )}
        </>
      )}

      {/* ═══════════════ ASSIGNED NUMBERS TAB ═══════════════ */}
      {activeTab === 'assigned' && (
        <Card title={`Assigned Numbers (${myNumbers?.total ?? 0})`}>
          <div className="divide-y divide-gray-100">
            {myNumbers?.data.map((num: ClientNumberDto) => {
              const taskForNum = taskByPhone.get(num.phoneNumber);
              return (
                <div key={num.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedNumberId(num.id)} className="font-medium text-indigo-600 hover:underline">
                          {num.phoneNumber}
                        </button>
                        {taskForNum && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                            <Clock className="w-3 h-3" /> Task at {taskForNum.taskTime}
                          </span>
                        )}
                      </div>
                      {num.clientName && <p className="text-xs text-gray-500">{num.clientName}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={num.leadStatus === LeadStatus.SOLD ? 'success' : num.leadStatus === LeadStatus.NOT_INTERESTED ? 'error' : 'info'}>
                      {num.leadStatus.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-gray-400">Fails: {num.totalFailedAttempts}</span>
                    <div className="flex gap-1">
                      {renderCallButton(num.phoneNumber)}
                      {!isViewingOther && num.leadStatus === LeadStatus.NEW && (
                        <Button variant="outline" size="sm" onClick={() => followUpMutation.mutate(num.id)}>Follow Up</Button>
                      )}
                      {!isViewingOther && (
                        <Button variant="outline" size="sm" onClick={() => returnMutation.mutate(num.id)}>Return</Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {(!myNumbers?.data || myNumbers.data.length === 0) && (
              <p className="p-4 text-gray-500 text-center">No assigned numbers. Pull from the pool to get started.</p>
            )}
          </div>
        </Card>
      )}

      </>)}

      {/* ═══════════════ MODALS ═══════════════ */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Number">
        <div className="space-y-4">
          <Input label="Phone Number" value={addForm.phoneNumber} onChange={(e) => setAddForm({ ...addForm, phoneNumber: e.target.value })} placeholder="+201234567890" required />
          <Input label="Client Name" value={addForm.clientName || ''} onChange={(e) => setAddForm({ ...addForm, clientName: e.target.value })} />
          <Input label="Source" value={addForm.source || ''} onChange={(e) => setAddForm({ ...addForm, source: e.target.value })} />
          <Button onClick={() => { if (!addForm.phoneNumber.trim()) { toast.error('Phone number is required'); return; } addMutation.mutate(addForm); }} loading={addMutation.isPending} fullWidth>Add</Button>
        </div>
      </Modal>

      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Create Task">
        <div className="space-y-4">
          <Input label="Phone Number" value={taskForm.phone} onChange={(e) => setTaskForm({ ...taskForm, phone: e.target.value })} placeholder="01xxxxxxxxx" required />
          {canCreateTask && salesUsers && (
            <Select
              label="Assign To"
              value={taskForm.userId}
              onChange={(e) => setTaskForm({ ...taskForm, userId: e.target.value })}
              options={[
                { value: '', label: 'Self' },
                ...salesUsers.map((u) => ({ value: u.id, label: u.email })),
              ]}
            />
          )}
          <Input label="Date" type="date" value={taskForm.date} onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })} required />
          <Input label="Time" type="time" value={taskForm.time} onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })} required />
          <Textarea label="Notes" value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} placeholder="Optional notes..." />
          <Button
            onClick={() => createTaskMutation.mutate({
              clientPhoneNumber: taskForm.phone,
              taskDate: taskForm.date,
              taskTime: taskForm.time,
              notes: taskForm.notes || undefined,
              userId: taskForm.userId || undefined,
            })}
            loading={createTaskMutation.isPending}
            disabled={!taskForm.phone || !taskForm.date || !taskForm.time}
            fullWidth
          >
            Create Task
          </Button>
        </div>
      </Modal>
    </div>
  );
}
