'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  FileText,
  Phone,
  Plus,
  ThumbsDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  addNumber,
  getMyNumbers,
  getNumberDetail,
  getPendingCompletions,
  markNotInterested,
  pullForCompletion,
  pullFromPool,
  returnToPool,
  scheduleFollowUps,
} from '@/lib/services/client-numbers';
import { createCallTask, getOpenTasks } from '@/lib/services/call-tasks';
import { closeCrmTask, completeCrmTask, getCrmLeads } from '@/lib/services/crm';
import { getNeedsRetry } from '@/lib/services/calls';
import { getMyCallStatus, getSalesUsers, startCall } from '@/lib/services/users';
import { normalizePhoneNumber } from '@/utils/phone';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { NumberDetailCard } from '@/components/numbers/NumberDetailCard';
import { NumberSearchBar } from '@/components/numbers/NumberSearchBar';
import { PendingCompletionList } from '@/components/numbers/PendingCompletionList';
import {
  WorkbenchFilters,
  WorkbenchLeadItem,
  WorkbenchLeadRow,
  WorkbenchSection,
  WorkbenchTaskRow,
} from '@/components/numbers/workbench';
import {
  AddNumberDto,
  CallResponseDto,
  ClientNumberDto,
  CrmLeadResponseDto,
  CrmStage,
  LeadStatus,
  OpenTaskBucket,
  OpenTaskResponseDto,
  Role,
} from '@/types/api';

function priorityValue(value: string) {
  return value ? Number(value) : undefined;
}

function formatWait(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function taskMatchesStage(task: OpenTaskResponseDto, stage: string) {
  if (!stage) return true;
  return task.clientNumber?.crmStage === stage;
}

function leadMatchesStage(lead: CrmLeadResponseDto, stage: string) {
  if (!stage) return true;
  return lead.stage === stage || lead.crmStage === stage;
}

function phoneKey(phone?: string) {
  return normalizePhoneNumber(phone || '');
}

export default function NumbersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const isManager = user?.role === Role.SALES_MANAGER;
  const canFilterEmployee = Boolean(isAdmin || isManager);
  const canManagerMutate = Boolean(isAdmin || isManager);

  const [activeTab, setActiveTab] = useState<'workbench' | 'assigned'>('workbench');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [taskToClose, setTaskToClose] = useState<OpenTaskResponseDto | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [addForm, setAddForm] = useState<AddNumberDto>({ phoneNumber: '' });
  const [taskForm, setTaskForm] = useState({ phone: '', userId: '', date: '', time: '', notes: '' });
  const [viewUserId, setViewUserId] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const isViewingOther = Boolean(viewUserId);
  const workbenchUserId = user?.role === Role.SALES ? user.id : viewUserId || undefined;
  const numbersUserId = viewUserId || user?.id;
  const selectedPriority = priorityValue(priorityFilter);

  const { data: salesUsers } = useQuery({
    queryKey: ['sales-users'],
    queryFn: getSalesUsers,
    enabled: canFilterEmployee,
  });

  const viewingUserEmail = viewUserId ? salesUsers?.find((item) => item.id === viewUserId)?.email : null;

  const { data: myNumbers, isLoading: myNumbersLoading, isError: myNumbersError, refetch: refetchMyNumbers } = useQuery({
    queryKey: ['my-numbers', numbersUserId],
    queryFn: () => getMyNumbers({ page: 1, limit: 100, userId: numbersUserId }),
    enabled: Boolean(numbersUserId),
  });

  const { data: pendingCompletions } = useQuery({
    queryKey: ['pending-completions', numbersUserId],
    queryFn: () => getPendingCompletions(numbersUserId),
    enabled: Boolean(numbersUserId),
  });

  const { data: callStatus } = useQuery({
    queryKey: ['my-call-status'],
    queryFn: getMyCallStatus,
    refetchInterval: activeTab === 'workbench' && !isViewingOther ? 15000 : false,
    enabled: !isViewingOther,
  });

  const isOnCall = !isViewingOther && callStatus?.currentStatus === 'ON_CALL';
  const activeCallPhone = !isViewingOther ? callStatus?.currentCallPhone : undefined;

  const openTasksQuery = useMemo(() => ({
    bucket: OpenTaskBucket.ALL,
    page: 1,
    limit: 100,
    userId: workbenchUserId,
    priority: selectedPriority,
  }), [workbenchUserId, selectedPriority]);

  const {
    data: openTasks,
    isLoading: openTasksLoading,
    isError: openTasksError,
    refetch: refetchOpenTasks,
  } = useQuery({
    queryKey: ['call-tasks', 'open', openTasksQuery],
    queryFn: () => getOpenTasks(openTasksQuery),
    refetchInterval: activeTab === 'workbench' ? 30000 : false,
    enabled: Boolean(user),
  });

  const crmBaseQuery = useMemo(() => ({
    page: 1,
    limit: 100,
    ownerId: workbenchUserId,
    priority: selectedPriority,
  }), [workbenchUserId, selectedPriority]);

  const {
    data: hotLeads,
    isLoading: hotLeadsLoading,
    isError: hotLeadsError,
    refetch: refetchHotLeads,
  } = useQuery({
    queryKey: ['crm', 'leads', 'hot', crmBaseQuery, stageFilter],
    queryFn: () => getCrmLeads({
      ...crmBaseQuery,
      stage: CrmStage.HOT_LEAD,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    }),
    enabled: Boolean(user),
  });

  const {
    data: staleLeads,
    isLoading: staleLeadsLoading,
    isError: staleLeadsError,
    refetch: refetchStaleLeads,
  } = useQuery({
    queryKey: ['crm', 'leads', 'stale', crmBaseQuery, stageFilter],
    queryFn: () => getCrmLeads({
      ...crmBaseQuery,
      stage: stageFilter ? (stageFilter as CrmStage) : undefined,
      stale: true,
      staleDays: 7,
      sortBy: 'lastContactedAt',
      sortOrder: 'asc',
    }),
    enabled: Boolean(user),
  });

  const {
    data: needsRetry,
    isLoading: needsRetryLoading,
    isError: needsRetryError,
    refetch: refetchNeedsRetry,
  } = useQuery({
    queryKey: ['calls', 'needs-retry', workbenchUserId],
    queryFn: () => getNeedsRetry(workbenchUserId),
    refetchInterval: activeTab === 'workbench' ? 30000 : false,
    enabled: Boolean(user),
  });

  const { data: numberDetail } = useQuery({
    queryKey: ['number-detail', selectedNumberId],
    queryFn: () => getNumberDetail(selectedNumberId!),
    enabled: Boolean(selectedNumberId),
  });

  const invalidateWorkbench = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['call-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['call-tasks', 'open'] });
    queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] });
    queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
    queryClient.invalidateQueries({ queryKey: ['calls', 'needs-retry'] });
    queryClient.invalidateQueries({ queryKey: ['pending-completions'] });
    queryClient.invalidateQueries({ queryKey: ['my-call-status'] });
  }, [queryClient]);

  const retryWaitMap = useMemo(() => {
    const map = new Map<string, string>();
    needsRetry?.forEach((call) => {
      const minutesLeft = 30 - Math.floor((Date.now() - new Date(call.createdAt).getTime()) / 60000);
      if (minutesLeft > 0) {
        map.set(phoneKey(call.clientPhoneNumber), `Retry in ${formatWait(minutesLeft)}`);
      }
    });
    return map;
  }, [needsRetry]);

  const numberByPhone = useMemo(() => {
    const map = new Map<string, ClientNumberDto>();
    myNumbers?.data.forEach((number) => {
      map.set(phoneKey(number.phoneNumber), number);
      map.set(phoneKey(number.normalizedPhone), number);
    });
    return map;
  }, [myNumbers?.data]);

  const retryPhoneSet = useMemo(() => {
    const set = new Set<string>();
    needsRetry?.forEach((call) => set.add(phoneKey(call.clientPhoneNumber)));
    return set;
  }, [needsRetry]);

  const filteredTasks = useMemo(() => {
    return (openTasks?.data ?? []).filter((task) => taskMatchesStage(task, stageFilter));
  }, [openTasks?.data, stageFilter]);

  const overdueTasks = useMemo(() => {
    return filteredTasks.filter((task) => task.bucket === OpenTaskBucket.OVERDUE || task.isOverdue);
  }, [filteredTasks]);

  const todayTasks = useMemo(() => {
    return filteredTasks.filter((task) => task.bucket === OpenTaskBucket.TODAY && !task.isOverdue);
  }, [filteredTasks]);

  const upcomingTasks = useMemo(() => {
    return filteredTasks.filter((task) => task.bucket === OpenTaskBucket.UPCOMING);
  }, [filteredTasks]);

  const hotLeadRows = useMemo<WorkbenchLeadItem[]>(() => {
    return (hotLeads?.data ?? [])
      .filter((lead) => leadMatchesStage(lead, stageFilter))
      .map((lead) => ({
        id: lead.id,
        phoneNumber: lead.phoneNumber,
        clientName: lead.clientName,
        stage: lead.stage,
        priority: lead.priority,
        nextActionAt: lead.nextActionAt,
        lastContactedAt: lead.lastContactedAt,
        ownerEmail: lead.owner?.email,
        meta: lead.nextOpenTask ? `Task at ${lead.nextOpenTask.taskTime}` : undefined,
        kind: 'hot',
      }));
  }, [hotLeads?.data, stageFilter]);

  const staleLeadRows = useMemo<WorkbenchLeadItem[]>(() => {
    return (staleLeads?.data ?? []).map((lead) => ({
      id: lead.id,
      phoneNumber: lead.phoneNumber,
      clientName: lead.clientName,
      stage: lead.stage,
      priority: lead.priority,
      nextActionAt: lead.nextActionAt,
      lastContactedAt: lead.lastContactedAt,
      ownerEmail: lead.owner?.email,
      meta: lead.totalFailedAttempts ? `Failed attempts: ${lead.totalFailedAttempts}` : undefined,
      kind: 'stale',
    }));
  }, [staleLeads?.data]);

  const retryRows = useMemo<WorkbenchLeadItem[]>(() => {
    return (needsRetry ?? []).map((call: CallResponseDto) => {
      const number = numberByPhone.get(phoneKey(call.clientPhoneNumber));
      return {
        id: number?.id || call.id,
        phoneNumber: call.clientPhoneNumber,
        clientName: number?.clientName,
        stage: number?.crmStage || number?.leadStatus,
        priority: number?.priority,
        lastContactedAt: call.createdAt,
        ownerEmail: call.user?.email,
        meta: `First attempt: ${new Date(call.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
        kind: 'retry',
      };
    });
  }, [needsRetry, numberByPhone]);

  const taskByPhone = useMemo(() => {
    const map = new Map<string, OpenTaskResponseDto>();
    filteredTasks.forEach((task) => {
      if (!map.has(phoneKey(task.clientPhoneNumber))) map.set(phoneKey(task.clientPhoneNumber), task);
      if (!map.has(phoneKey(task.rawPhoneNumber))) map.set(phoneKey(task.rawPhoneNumber), task);
    });
    return map;
  }, [filteredTasks]);

  const uncalledNumbers = useMemo(() => {
    if (isAdmin) return [];
    return myNumbers?.data.filter((number) =>
      number.assignmentType === 'POOL_PULLED' &&
      !number.lastAttemptDate &&
      number.leadStatus !== LeadStatus.NOT_INTERESTED &&
      number.poolStatus === 'ASSIGNED' &&
      !retryPhoneSet.has(phoneKey(number.phoneNumber)) &&
      !retryPhoneSet.has(phoneKey(number.normalizedPhone)),
    ) ?? [];
  }, [myNumbers?.data, isAdmin, retryPhoneSet]);

  const workbenchCount =
    overdueTasks.length +
    todayTasks.length +
    upcomingTasks.length +
    retryRows.length +
    hotLeadRows.length +
    staleLeadRows.length +
    (pendingCompletions?.length ?? 0);

  const pullMutation = useMutation({
    mutationFn: pullFromPool,
    onSuccess: (data) => {
      toast.success(`Pulled: ${data.phoneNumber}`);
      setActiveTab('workbench');
      invalidateWorkbench();
      queryClient.invalidateQueries({ queryKey: ['pool'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'No numbers available'),
  });

  const completionMutation = useMutation({
    mutationFn: pullForCompletion,
    onSuccess: () => {
      toast.success('Number pulled for completion');
      invalidateWorkbench();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Cannot complete yet'),
  });

  const notInterestedMutation = useMutation({
    mutationFn: markNotInterested,
    onSuccess: () => {
      toast.success('Marked as not interested (pending approval)');
      setSelectedNumberId(null);
      invalidateWorkbench();
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
      setActiveTab('workbench');
      invalidateWorkbench();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add'),
  });

  const followUpMutation = useMutation({
    mutationFn: scheduleFollowUps,
    onSuccess: () => {
      toast.success('Follow-ups scheduled');
      invalidateWorkbench();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const returnMutation = useMutation({
    mutationFn: returnToPool,
    onSuccess: () => {
      toast.success('Returned to pool');
      invalidateWorkbench();
      queryClient.invalidateQueries({ queryKey: ['pool'] });
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
      invalidateWorkbench();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create task'),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (task: OpenTaskResponseDto) => completeCrmTask(task.id),
    onSuccess: () => {
      toast.success('Task completed');
      invalidateWorkbench();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to complete task'),
  });

  const closeTaskMutation = useMutation({
    mutationFn: ({ task, reason }: { task: OpenTaskResponseDto; reason: string }) =>
      closeCrmTask(task.id, { closedReason: reason }),
    onSuccess: () => {
      toast.success('Task closed');
      setTaskToClose(null);
      setCloseReason('');
      invalidateWorkbench();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to close task'),
  });

  const handleCall = useCallback(async (phoneNumber: string) => {
    try {
      await startCall(phoneNumber);
      window.open(`tel:${phoneNumber}`, '_self');
      setTimeout(() => {
        router.push(`/calls/new?phone=${encodeURIComponent(phoneNumber)}`);
      }, 500);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start call');
    }
  }, [router]);

  const handleFillReport = useCallback((phoneNumber: string) => {
    router.push(`/calls/new?phone=${encodeURIComponent(phoneNumber)}`);
  }, [router]);

  const resetFilters = () => {
    setViewUserId('');
    setStageFilter('');
    setPriorityFilter('');
    setSelectedNumberId(null);
  };

  const closeTask = () => {
    if (!taskToClose || !closeReason.trim()) {
      toast.error('Close reason is required');
      return;
    }
    closeTaskMutation.mutate({ task: taskToClose, reason: closeReason.trim() });
  };

  const renderTaskRow = (task: OpenTaskResponseDto) => (
    <WorkbenchTaskRow
      key={task.id}
      task={task}
      isViewingOther={isViewingOther}
      isOnCall={Boolean(isOnCall)}
      activeCallPhone={activeCallPhone}
      canComplete={canManagerMutate}
      canClose={canManagerMutate}
      isBusy={completeTaskMutation.isPending || closeTaskMutation.isPending}
      onCall={handleCall}
      onFillReport={handleFillReport}
      onComplete={(item) => completeTaskMutation.mutate(item)}
      onClose={(item) => setTaskToClose(item)}
      onSelectLead={setSelectedNumberId}
    />
  );

  const renderLeadRow = (item: WorkbenchLeadItem) => (
    <WorkbenchLeadRow
      key={`${item.kind}-${item.id}`}
      item={item}
      isViewingOther={isViewingOther}
      isOnCall={Boolean(isOnCall)}
      activeCallPhone={activeCallPhone}
      waitLabel={retryWaitMap.get(phoneKey(item.phoneNumber))}
      onCall={handleCall}
      onFillReport={handleFillReport}
      onSelectLead={setSelectedNumberId}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isViewingOther ? `${viewingUserEmail || 'Employee'}'s Numbers` : 'My Numbers'}
          </h1>
        </div>
        {!isViewingOther && (
          <div className="flex flex-wrap gap-2">
            {canManagerMutate && (
              <Button variant="outline" onClick={() => setShowTaskModal(true)}>
                <CalendarPlus className="mr-1 h-4 w-4" /> Create Task
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Number
            </Button>
            <Button
              onClick={() => pullMutation.mutate()}
              loading={pullMutation.isPending}
              disabled={uncalledNumbers.length > 0}
              title={uncalledNumbers.length > 0 ? `Call ${uncalledNumbers.map((n) => n.phoneNumber).join(', ')} first` : undefined}
            >
              <ArrowRight className="mr-1 h-4 w-4" /> Pull from Pool
            </Button>
          </div>
        )}
      </div>

      {isViewingOther && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Viewing {viewingUserEmail || 'selected employee'} in read-only mode.
        </div>
      )}

      <NumberSearchBar />

      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('workbench')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'workbench'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Workbench ({workbenchCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assigned')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'assigned'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Assigned Numbers ({myNumbers?.total ?? 0})
        </button>
      </div>

      {selectedNumberId && numberDetail && (
        <NumberDetailCard
          number={numberDetail}
          activityLogs={numberDetail.activityLogs || []}
          previousAssignees={numberDetail.previousAssignees || []}
          onClose={() => setSelectedNumberId(null)}
        />
      )}

      {activeTab === 'workbench' && (
        <div className="space-y-4">
          {isOnCall && !isViewingOther && (
            <div className="flex flex-col gap-3 rounded-lg border border-orange-300 bg-orange-50 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
                <div>
                  <p className="font-semibold text-orange-800">Active call</p>
                  <p className="text-sm text-orange-700">
                    {activeCallPhone ? <span className="font-mono">{activeCallPhone}</span> : 'Report pending'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push(activeCallPhone ? `/calls/new?phone=${encodeURIComponent(activeCallPhone)}` : '/calls/new')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <FileText className="mr-2 h-4 w-4" /> Fill Report
              </Button>
            </div>
          )}

          {uncalledNumbers.length > 0 && (
            <Card title={`Must Call First (${uncalledNumbers.length})`} padding="none">
              <div className="divide-y divide-gray-100">
                {uncalledNumbers.map((number) => (
                  <div key={number.id} className="flex flex-col gap-3 p-3 hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedNumberId(number.id)}
                          className="font-mono text-sm font-semibold text-indigo-700 hover:underline"
                        >
                          {number.phoneNumber}
                        </button>
                        {number.clientName && <p className="text-xs text-gray-500">{number.clientName}</p>}
                      </div>
                    </div>
                    {!isOnCall && <Button size="sm" onClick={() => handleCall(number.phoneNumber)}>Call</Button>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <WorkbenchFilters
            canFilterEmployee={canFilterEmployee}
            salesUsers={salesUsers}
            currentUserId={user?.id}
            viewUserId={viewUserId}
            stage={stageFilter}
            priority={priorityFilter}
            onViewUserChange={(value) => {
              setViewUserId(value);
              setSelectedNumberId(null);
            }}
            onStageChange={setStageFilter}
            onPriorityChange={setPriorityFilter}
            onReset={resetFilters}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <WorkbenchSection
              title="Overdue"
              count={overdueTasks.length}
              testId="workbench-overdue"
              tone="red"
              isLoading={openTasksLoading}
              isError={openTasksError}
              emptyTitle="No overdue tasks"
              onRetry={() => refetchOpenTasks()}
            >
              {overdueTasks.map(renderTaskRow)}
            </WorkbenchSection>

            <WorkbenchSection
              title="Due Today"
              count={todayTasks.length}
              testId="workbench-today"
              tone="blue"
              isLoading={openTasksLoading}
              isError={openTasksError}
              emptyTitle="No tasks due today"
              onRetry={() => refetchOpenTasks()}
            >
              {todayTasks.map(renderTaskRow)}
            </WorkbenchSection>

            <WorkbenchSection
              title="Upcoming"
              count={upcomingTasks.length}
              testId="workbench-upcoming"
              tone="green"
              isLoading={openTasksLoading}
              isError={openTasksError}
              emptyTitle="No upcoming tasks"
              onRetry={() => refetchOpenTasks()}
            >
              {upcomingTasks.map(renderTaskRow)}
            </WorkbenchSection>

            <WorkbenchSection
              title="Needs Retry"
              count={retryRows.length}
              testId="workbench-needs-retry"
              tone="amber"
              isLoading={needsRetryLoading}
              isError={needsRetryError}
              emptyTitle="No retries waiting"
              onRetry={() => refetchNeedsRetry()}
            >
              {retryRows.map(renderLeadRow)}
            </WorkbenchSection>

            <WorkbenchSection
              title="Hot Leads"
              count={hotLeadRows.length}
              testId="workbench-hot-leads"
              tone="amber"
              isLoading={hotLeadsLoading}
              isError={hotLeadsError}
              emptyTitle="No hot leads"
              onRetry={() => refetchHotLeads()}
            >
              {hotLeadRows.map(renderLeadRow)}
            </WorkbenchSection>

            <WorkbenchSection
              title="Stale Leads"
              count={staleLeadRows.length}
              testId="workbench-stale-leads"
              tone="gray"
              isLoading={staleLeadsLoading}
              isError={staleLeadsError}
              emptyTitle="No stale leads"
              onRetry={() => refetchStaleLeads()}
            >
              {staleLeadRows.map(renderLeadRow)}
            </WorkbenchSection>
          </div>

          {pendingCompletions && pendingCompletions.length > 0 && (
            <PendingCompletionList
              numbers={pendingCompletions}
              onComplete={(id) => completionMutation.mutate(id)}
            />
          )}
        </div>
      )}

      {activeTab === 'assigned' && (
        <>
          {myNumbersError ? (
            <ErrorState message="Unable to load assigned numbers" onRetry={() => refetchMyNumbers()} />
          ) : myNumbersLoading ? (
            <CardSkeleton />
          ) : (
            <Card title={`Assigned Numbers (${myNumbers?.total ?? 0})`} padding="none">
              <div className="divide-y divide-gray-100">
                {myNumbers?.data.map((number) => {
                  const taskForNumber =
                    taskByPhone.get(phoneKey(number.phoneNumber)) ||
                    taskByPhone.get(phoneKey(number.normalizedPhone));
                  return (
                    <div key={number.id} className="flex flex-col gap-3 p-3 hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <button
                            type="button"
                            onClick={() => setSelectedNumberId(number.id)}
                            className="font-mono text-sm font-semibold text-indigo-700 hover:underline"
                          >
                            {number.phoneNumber}
                          </button>
                          {taskForNumber && (
                            <Badge variant={taskForNumber.isOverdue ? 'error' : 'warning'} size="sm">
                              {taskForNumber.isOverdue ? 'Overdue' : `Task ${taskForNumber.taskTime}`}
                            </Badge>
                          )}
                        </div>
                        {number.clientName && <p className="mt-1 text-xs text-gray-500">{number.clientName}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            number.leadStatus === LeadStatus.SOLD
                              ? 'success'
                              : number.leadStatus === LeadStatus.NOT_INTERESTED
                                ? 'error'
                                : number.leadStatus === LeadStatus.HOT_LEAD
                                  ? 'warning'
                                  : 'info'
                          }
                        >
                          {number.leadStatus.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-400">Fails: {number.totalFailedAttempts}</span>
                        {!isViewingOther && !isOnCall && (
                          <Button size="sm" onClick={() => handleCall(number.phoneNumber)}>Call</Button>
                        )}
                        {!isViewingOther && number.leadStatus === LeadStatus.NEW && (
                          <Button variant="outline" size="sm" onClick={() => followUpMutation.mutate(number.id)}>Follow Up</Button>
                        )}
                        {!isViewingOther && (
                          <Button variant="outline" size="sm" onClick={() => returnMutation.mutate(number.id)}>Return</Button>
                        )}
                        {!isViewingOther && number.leadStatus !== LeadStatus.NOT_INTERESTED && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => notInterestedMutation.mutate(number.id)}
                            loading={notInterestedMutation.isPending}
                          >
                            <ThumbsDown className="mr-1 h-4 w-4" /> Not Interested
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!myNumbers?.data || myNumbers.data.length === 0) && (
                  <div className="p-4">
                    <EmptyState title="No assigned numbers" description="Pull from the pool or add a number." />
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Number">
        <div className="space-y-4">
          <Input
            label="Phone Number"
            value={addForm.phoneNumber}
            onChange={(event) => setAddForm({ ...addForm, phoneNumber: event.target.value })}
            placeholder="+201234567890"
            required
          />
          <Input
            label="Client Name"
            value={addForm.clientName || ''}
            onChange={(event) => setAddForm({ ...addForm, clientName: event.target.value })}
          />
          <Input
            label="Source"
            value={addForm.source || ''}
            onChange={(event) => setAddForm({ ...addForm, source: event.target.value })}
          />
          <Button
            onClick={() => {
              if (!addForm.phoneNumber.trim()) {
                toast.error('Phone number is required');
                return;
              }
              addMutation.mutate(addForm);
            }}
            loading={addMutation.isPending}
            fullWidth
          >
            Add
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Create Task">
        <div className="space-y-4">
          <Input
            label="Phone Number"
            value={taskForm.phone}
            onChange={(event) => setTaskForm({ ...taskForm, phone: event.target.value })}
            placeholder="01xxxxxxxxx"
            required
          />
          {canManagerMutate && salesUsers && (
            <Select
              label="Assign To"
              value={taskForm.userId}
              onChange={(event) => setTaskForm({ ...taskForm, userId: event.target.value })}
              options={[
                { value: '', label: 'Self' },
                ...salesUsers.map((item) => ({ value: item.id, label: item.email })),
              ]}
            />
          )}
          <Input
            label="Date"
            type="date"
            value={taskForm.date}
            onChange={(event) => setTaskForm({ ...taskForm, date: event.target.value })}
            required
          />
          <Input
            label="Time"
            type="time"
            value={taskForm.time}
            onChange={(event) => setTaskForm({ ...taskForm, time: event.target.value })}
            required
          />
          <Textarea
            label="Notes"
            value={taskForm.notes}
            onChange={(event) => setTaskForm({ ...taskForm, notes: event.target.value })}
            placeholder="Optional notes..."
          />
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

      <Modal isOpen={Boolean(taskToClose)} onClose={() => setTaskToClose(null)} title="Close Task">
        <div className="space-y-4">
          <Textarea
            id="closeReason"
            label="Close Reason"
            value={closeReason}
            onChange={(event) => setCloseReason(event.target.value)}
            placeholder="Reason"
            required
          />
          <Button
            onClick={closeTask}
            loading={closeTaskMutation.isPending}
            disabled={!closeReason.trim()}
            fullWidth
          >
            Close Task
          </Button>
        </div>
      </Modal>
    </div>
  );
}
