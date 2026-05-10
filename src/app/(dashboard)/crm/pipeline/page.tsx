'use client';

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { LayoutDashboard, Plus } from 'lucide-react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LeadDetailDrawer } from '@/components/crm/lead-detail';
import {
  PipelineActionColumn,
  PipelineRetryCard,
  PipelineTaskCard,
} from '@/components/crm/pipeline/PipelineActionColumn';
import { PipelineFilters } from '@/components/crm/pipeline/PipelineFilters';
import { PipelineStageColumn } from '@/components/crm/pipeline/PipelineStageColumn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ensureClientNumberForTask, getOpenTasks } from '@/lib/services/call-tasks';
import { ensureClientNumberForCall, getNeedsRetry } from '@/lib/services/calls';
import { addNumber } from '@/lib/services/client-numbers';
import { closeCrmTask, completeCrmTask, getCrmLeads, updateCrmLeadStage } from '@/lib/services/crm';
import { getMyCallStatus, getSalesUsers, startCall } from '@/lib/services/users';
import { CRM_PIPELINE_STAGES, crmStageLabel } from '@/lib/crm-stages';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePhoneNumber } from '@/utils/phone';
import {
  AddNumberDto,
  CallResponseDto,
  CrmLeadResponseDto,
  CrmLeadsQueryDto,
  CrmLeadsResponseDto,
  CrmStage,
  ErrorResponse,
  OpenTaskBucket,
  OpenTaskResponseDto,
  Role,
} from '@/types/api';

const PIPELINE_STAGES = CRM_PIPELINE_STAGES;
const PIPELINE_LIMIT = 50;
const MOBILE_TASKS_TAB = 'TASKS_REQUIRED';
const MOBILE_RETRY_TAB = 'NEEDS_RETRY';

function priorityValue(value: string) {
  return value ? Number(value) : undefined;
}

function formatWait(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function isRequiredTask(task: OpenTaskResponseDto) {
  return task.bucket === OpenTaskBucket.OVERDUE || task.bucket === OpenTaskBucket.TODAY || task.isOverdue;
}

function phoneSearchKey(value?: string) {
  return normalizePhoneNumber(value || '').replace(/\D/g, '');
}

function retryMatchesSearch(call: CallResponseDto, searchDigits: string) {
  if (!searchDigits) return true;
  return (
    phoneSearchKey(call.clientPhoneNumber).includes(searchDigits) ||
    phoneSearchKey(call.rawPhoneNumber).includes(searchDigits)
  );
}

function apiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ErrorResponse>;
  return axiosError.response?.data?.message || fallback;
}

function createInitialStagePages() {
  return PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = 1;
    return acc;
  }, {} as Record<CrmStage, number>);
}

function useIsMobilePipeline() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function PipelineLoadingFallback() {
  return (
    <div data-testid="pipeline-loading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

function CrmPipelineContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAdmin, isSalesManager, user } = useAuth();
  const isMobilePipeline = useIsMobilePipeline();
  const [ownerId, setOwnerId] = useState('');
  const [ownerFilterInitialized, setOwnerFilterInitialized] = useState(false);
  const [priority, setPriority] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [stagePages, setStagePages] = useState(createInitialStagePages);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddNumberDto>({ phoneNumber: '' });
  const [resolvingTaskId, setResolvingTaskId] = useState<string | null>(null);
  const [resolvingCallId, setResolvingCallId] = useState<string | null>(null);
  const [taskToClose, setTaskToClose] = useState<OpenTaskResponseDto | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState<string>(CrmStage.NEW);
  const searchString = searchParams.toString();
  const selectedLeadId = searchParams.get('leadId');
  const phoneSearchDigits = phoneSearch.replace(/\D/g, '');
  const effectivePhoneSearch = phoneSearchDigits.length >= 5 ? phoneSearch.trim() : undefined;
  const selectedPriority = priorityValue(priority);
  const operationalUserId = ownerId || undefined;
  const canViewAllEmployees = isAdmin || isSalesManager;
  const canMutateTasks = canViewAllEmployees;
  const pipelineQueriesEnabled = Boolean(user) && ownerFilterInitialized;

  useEffect(() => {
    if (ownerFilterInitialized || !user) return;

    if (user.role === Role.ADMIN || user.role === Role.SALES_MANAGER || user.role === Role.SALES) {
      setOwnerId(user.id);
    }
    setOwnerFilterInitialized(true);
  }, [ownerFilterInitialized, user]);

  const baseLeadsQuery: Omit<CrmLeadsQueryDto, 'page' | 'limit' | 'stage'> = useMemo(() => ({
    ownerId: operationalUserId,
    priority: selectedPriority,
    search: effectivePhoneSearch,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  }), [effectivePhoneSearch, operationalUserId, selectedPriority]);

  const requiredTasksQuery = useMemo(() => ({
    bucket: OpenTaskBucket.ALL,
    page: 1,
    limit: 100,
    userId: operationalUserId,
    priority: selectedPriority,
    phoneNumber: effectivePhoneSearch,
  }), [effectivePhoneSearch, operationalUserId, selectedPriority]);

  const {
    data: users,
    isLoading: usersLoading,
  } = useQuery({
    queryKey: ['users', 'sales-users', 'pipeline'],
    queryFn: getSalesUsers,
    enabled: isAdmin || isSalesManager,
  });

  const stageQueries = useQueries({
    queries: PIPELINE_STAGES.map((stage) => {
      const query: CrmLeadsQueryDto = {
        ...baseLeadsQuery,
        stage,
        includeLegacyInterested: stage === CrmStage.HOT_LEAD ? true : undefined,
        page: stagePages[stage] ?? 1,
        limit: PIPELINE_LIMIT,
      };

      return {
        queryKey: ['crm', 'leads', 'pipeline', stage, query] as const,
        queryFn: () => getCrmLeads(query),
        enabled: pipelineQueriesEnabled,
      };
    }),
  });

  const {
    data: openTasks,
    isLoading: requiredTasksLoading,
    isError: requiredTasksError,
    refetch: refetchRequiredTasks,
  } = useQuery({
    queryKey: ['call-tasks', 'open', 'pipeline-required', requiredTasksQuery],
    queryFn: () => getOpenTasks(requiredTasksQuery),
    enabled: pipelineQueriesEnabled,
  });

  const { data: callStatus } = useQuery({
    queryKey: ['my-call-status', 'pipeline'],
    queryFn: getMyCallStatus,
    enabled: pipelineQueriesEnabled,
    refetchInterval: 15000,
  });

  const {
    data: needsRetry,
    isLoading: needsRetryLoading,
    isError: needsRetryError,
    refetch: refetchNeedsRetry,
  } = useQuery({
    queryKey: ['calls', 'needs-retry', 'pipeline', operationalUserId],
    queryFn: () => getNeedsRetry(operationalUserId),
    enabled: pipelineQueriesEnabled,
  });

  const stageData = useMemo(() => {
    return PIPELINE_STAGES.reduce((acc, stage, index) => {
      acc[stage] = stageQueries[index].data;
      return acc;
    }, {} as Partial<Record<CrmStage, CrmLeadsResponseDto>>);
  }, [stageQueries]);

  const countForStage = (stage: CrmStage) => {
    const total = stageData[stage]?.total;
    return typeof total === 'number' ? total : 0;
  };

  const totalPagesForStage = (stage: CrmStage) => stageData[stage]?.totalPages ?? 1;
  const leadsForStage = (stage: CrmStage) => stageData[stage]?.data ?? [];
  const totalLeads = PIPELINE_STAGES.reduce((sum, stage) => sum + countForStage(stage), 0);
  const leadsLoading = !ownerFilterInitialized || stageQueries.some((query) => query.isLoading);
  const leadsInitialLoading = leadsLoading && stageQueries.every((query) => !query.data);
  const leadsError = stageQueries.some((query) => query.isError);
  const requiredTasks = useMemo(
    () => (openTasks?.data ?? []).filter(isRequiredTask),
    [openTasks?.data],
  );
  const retryCalls = useMemo(
    () => (needsRetry ?? []).filter((call) => retryMatchesSearch(call, effectivePhoneSearch ? phoneSearchDigits : '')),
    [effectivePhoneSearch, needsRetry, phoneSearchDigits],
  );
  const retryWaitMap = useMemo(() => {
    const map = new Map<string, string>();
    retryCalls.forEach((call) => {
      const minutesLeft = 30 - Math.floor((Date.now() - new Date(call.createdAt).getTime()) / 60000);
      if (minutesLeft > 0) {
        map.set(call.id, `Retry in ${formatWait(minutesLeft)}`);
      }
    });
    return map;
  }, [retryCalls]);
  const mobileTabs = [
    ...PIPELINE_STAGES.map((stage) => ({
      id: stage,
      label: stage === CrmStage.NOT_ANSWERED ? 'No Answer' : crmStageLabel(stage),
      count: countForStage(stage),
    })),
    {
      id: MOBILE_TASKS_TAB,
      label: 'Tasks',
      count: requiredTasks.length,
    },
    {
      id: MOBILE_RETRY_TAB,
      label: 'Retry',
      count: retryCalls.length,
    },
  ];
  const refetchLeads = () => {
    stageQueries.forEach((query) => query.refetch());
  };

  const invalidatePipelineData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['call-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['call-tasks', 'open'] });
    queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] });
    queryClient.invalidateQueries({ queryKey: ['crm', 'leads', 'pipeline'] });
    queryClient.invalidateQueries({ queryKey: ['calls', 'needs-retry'] });
    queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
    queryClient.invalidateQueries({ queryKey: ['my-call-status'] });
  }, [queryClient]);

  const moveStageMutation = useMutation({
    mutationFn: ({ lead, stage }: { lead: CrmLeadResponseDto; stage: CrmStage }) =>
      updateCrmLeadStage(lead.id, { stage }),
    onMutate: async ({ lead }) => {
      setUpdatingLeadId(lead.id);
      await queryClient.cancelQueries({ queryKey: ['crm', 'leads', 'pipeline'] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to update stage'));
    },
    onSuccess: () => {
      toast.success('Stage updated');
    },
    onSettled: () => {
      setUpdatingLeadId(undefined);
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads', 'pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['call-tasks', 'open'] });
    },
  });

  const addNumberMutation = useMutation({
    mutationFn: (data: AddNumberDto) => addNumber(data),
    onSuccess: () => {
      toast.success('Number added');
      setShowAddModal(false);
      setAddForm({ phoneNumber: '' });
      setStagePages(createInitialStagePages());
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads', 'pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['pool'] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to add'));
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (task: OpenTaskResponseDto) => completeCrmTask(task.id),
    onSuccess: () => {
      toast.success('Task completed');
      invalidatePipelineData();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to complete task'));
    },
  });

  const closeTaskMutation = useMutation({
    mutationFn: ({ task, reason }: { task: OpenTaskResponseDto; reason: string }) =>
      closeCrmTask(task.id, { closedReason: reason }),
    onSuccess: () => {
      toast.success('Task closed');
      setTaskToClose(null);
      setCloseReason('');
      invalidatePipelineData();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to close task'));
    },
  });

  const handleMoveStage = (lead: CrmLeadResponseDto, stage: CrmStage) => {
    if (lead.stage === stage || moveStageMutation.isPending) return;
    moveStageMutation.mutate({ lead, stage });
  };

  const handlePageChange = (stage: CrmStage, page: number) => {
    setStagePages((current) => ({ ...current, [stage]: page }));
  };

  const openLeadDetailById = useCallback((leadId: string) => {
    const params = new URLSearchParams(searchString);
    params.set('leadId', leadId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchString]);

  const openLeadDetail = useCallback((lead: CrmLeadResponseDto) => {
    openLeadDetailById(lead.id);
  }, [openLeadDetailById]);

  const openLeadDetailByTask = useCallback(async (task: OpenTaskResponseDto) => {
    if (resolvingTaskId) return;

    setResolvingTaskId(task.id);
    try {
      const number = await ensureClientNumberForTask(task.id);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['call-tasks', 'open'] }),
        queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] }),
        queryClient.invalidateQueries({ queryKey: ['crm', 'leads', 'pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['my-numbers'] }),
      ]);
      openLeadDetailById(number.id);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to open number details'));
    } finally {
      setResolvingTaskId(null);
    }
  }, [openLeadDetailById, queryClient, resolvingTaskId]);

  const openLeadDetailByCall = useCallback(async (call: CallResponseDto) => {
    if (resolvingCallId) return;

    setResolvingCallId(call.id);
    try {
      const number = await ensureClientNumberForCall(call.id);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calls', 'needs-retry'] }),
        queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] }),
        queryClient.invalidateQueries({ queryKey: ['crm', 'leads', 'pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['my-numbers'] }),
      ]);
      openLeadDetailById(number.id);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to open number details'));
    } finally {
      setResolvingCallId(null);
    }
  }, [openLeadDetailById, queryClient, resolvingCallId]);

  const handlePipelineCall = useCallback(async (phoneNumber: string) => {
    const phone = phoneNumber.trim();
    if (!phone) return;

    const currentStatus = callStatus?.currentStatus;
    const activePhone = callStatus?.currentCallPhone || '';
    const isSameActiveCall = Boolean(
      currentStatus === 'ON_CALL' &&
        phoneSearchKey(activePhone) &&
        phoneSearchKey(activePhone) === phoneSearchKey(phone),
    );

    if (isSameActiveCall) {
      router.push(`/calls/new?phone=${encodeURIComponent(phone)}`);
      return;
    }

    if (currentStatus === 'ON_CALL') {
      toast.error('Finish the active call report first');
      return;
    }

    try {
      await startCall(phone);
      queryClient.invalidateQueries({ queryKey: ['my-call-status'] });
      window.open(`tel:${phone}`, '_self');
      setTimeout(() => {
        router.push(`/calls/new?phone=${encodeURIComponent(phone)}`);
      }, 500);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to start call'));
    }
  }, [callStatus?.currentCallPhone, callStatus?.currentStatus, queryClient, router]);

  const closeTask = () => {
    if (!taskToClose || !closeReason.trim()) {
      toast.error('Close reason is required');
      return;
    }
    closeTaskMutation.mutate({ task: taskToClose, reason: closeReason.trim() });
  };

  const closeLeadDetail = useCallback(() => {
    const params = new URLSearchParams(searchString);
    params.delete('leadId');
    const nextSearch = params.toString();
    router.push(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [pathname, router, searchString]);

  return (
    <div data-testid="pipeline-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Track leads by stage, owner, priority, and next action.
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Number
            </Button>
            <div className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-center text-sm text-gray-600 sm:w-auto">
              Total leads: <span className="font-semibold text-gray-900">{totalLeads}</span>
            </div>
          </div>
        </div>

        <PipelineFilters
          users={users ?? []}
          currentUser={user}
          ownerId={ownerId}
          priority={priority}
          phoneSearch={phoneSearch}
          allowAllEmployees={canViewAllEmployees}
          onOwnerChange={(value) => {
            setOwnerId(value);
            setStagePages(createInitialStagePages());
          }}
          onPriorityChange={(value) => {
            setPriority(value);
            setStagePages(createInitialStagePages());
          }}
          onPhoneSearchChange={(value) => {
            setPhoneSearch(value);
            setStagePages(createInitialStagePages());
          }}
        />

        {(leadsInitialLoading || usersLoading) && (
          <div data-testid="pipeline-loading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        )}

        {leadsError && (
          <div data-testid="pipeline-error">
            <ErrorState message="Unable to load CRM pipeline" onRetry={() => refetchLeads()} />
          </div>
        )}

        {!leadsInitialLoading && ownerFilterInitialized && !leadsError && !isMobilePipeline && (
          <div
            data-testid="crm-pipeline-board"
            className="overflow-x-auto pb-3"
          >
            <div className="flex min-w-max gap-4">
              {PIPELINE_STAGES.map((stage) => (
                <Fragment key={stage}>
                  <PipelineStageColumn
                    stage={stage}
                    count={countForStage(stage)}
                    leads={leadsForStage(stage)}
                    stages={PIPELINE_STAGES}
                    page={stagePages[stage] ?? 1}
                    totalPages={totalPagesForStage(stage)}
                    updatingLeadId={updatingLeadId}
                    onPreview={openLeadDetail}
                    onMoveStage={handleMoveStage}
                    onPageChange={handlePageChange}
                  />
                  {stage === CrmStage.NEW && (
                    <>
                      <PipelineActionColumn
                        title="Tasks Required"
                        count={requiredTasks.length}
                        testId="pipeline-actions-tasks-required"
                        tone="red"
                        isLoading={requiredTasksLoading}
                        isError={requiredTasksError}
                        emptyTitle="No required tasks"
                        onRetry={() => refetchRequiredTasks()}
                      >
                        {requiredTasks.map((task) => (
                          <PipelineTaskCard
                            key={task.id}
                            task={task}
                            activeCallPhone={callStatus?.currentCallPhone}
                            isOnCall={callStatus?.currentStatus === 'ON_CALL'}
                            onCall={handlePipelineCall}
                            onOpenLead={openLeadDetailById}
                            onOpenTaskDetails={openLeadDetailByTask}
                            onComplete={(task) => completeTaskMutation.mutate(task)}
                            onClose={(task) => {
                              setCloseReason('');
                              setTaskToClose(task);
                            }}
                            canComplete={canMutateTasks}
                            canClose={canMutateTasks}
                            resolvingTaskId={resolvingTaskId}
                            isMutating={completeTaskMutation.isPending || closeTaskMutation.isPending}
                          />
                        ))}
                      </PipelineActionColumn>

                      <PipelineActionColumn
                        title="Needs Retry"
                        count={retryCalls.length}
                        testId="pipeline-actions-needs-retry"
                        tone="amber"
                        isLoading={needsRetryLoading}
                        isError={needsRetryError}
                        emptyTitle="No calls need retry"
                        onRetry={() => refetchNeedsRetry()}
                      >
                        {retryCalls.map((call) => (
                          <PipelineRetryCard
                            key={call.id}
                            call={call}
                            activeCallPhone={callStatus?.currentCallPhone}
                            isOnCall={callStatus?.currentStatus === 'ON_CALL'}
                            waitLabel={retryWaitMap.get(call.id)}
                            onCall={handlePipelineCall}
                            onOpenDetails={openLeadDetailByCall}
                            resolvingCallId={resolvingCallId}
                          />
                        ))}
                      </PipelineActionColumn>
                    </>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {!leadsInitialLoading && ownerFilterInitialized && !leadsError && isMobilePipeline && (
          <div data-testid="crm-pipeline-mobile" className="space-y-3">
            <div data-testid="pipeline-mobile-tabs" className="overflow-x-auto pb-1">
              <div className="flex w-max min-w-full gap-2">
                {mobileTabs.map((tab) => {
                  const isActive = activeMobileTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      data-testid={`pipeline-mobile-tab-${tab.id}`}
                      aria-pressed={isActive}
                      className={`min-h-11 shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                      onClick={() => setActiveMobileTab(tab.id)}
                    >
                      <span>{tab.label}</span>
                      <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-700">
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div data-testid="pipeline-mobile-panel">
              {PIPELINE_STAGES.includes(activeMobileTab as CrmStage) && (
                <PipelineStageColumn
                  stage={activeMobileTab as CrmStage}
                  count={countForStage(activeMobileTab as CrmStage)}
                  leads={leadsForStage(activeMobileTab as CrmStage)}
                  stages={PIPELINE_STAGES}
                  page={stagePages[activeMobileTab as CrmStage] ?? 1}
                  totalPages={totalPagesForStage(activeMobileTab as CrmStage)}
                  updatingLeadId={updatingLeadId}
                  layout="mobile"
                  onPreview={openLeadDetail}
                  onMoveStage={handleMoveStage}
                  onPageChange={handlePageChange}
                />
              )}

              {activeMobileTab === MOBILE_TASKS_TAB && (
                <PipelineActionColumn
                  title="Tasks Required"
                  count={requiredTasks.length}
                  testId="pipeline-actions-tasks-required-mobile"
                  tone="red"
                  isLoading={requiredTasksLoading}
                  isError={requiredTasksError}
                  emptyTitle="No required tasks"
                  layout="mobile"
                  onRetry={() => refetchRequiredTasks()}
                >
                  {requiredTasks.map((task) => (
                    <PipelineTaskCard
                      key={task.id}
                      task={task}
                      activeCallPhone={callStatus?.currentCallPhone}
                      isOnCall={callStatus?.currentStatus === 'ON_CALL'}
                      onCall={handlePipelineCall}
                      onOpenLead={openLeadDetailById}
                      onOpenTaskDetails={openLeadDetailByTask}
                      onComplete={(task) => completeTaskMutation.mutate(task)}
                      onClose={(task) => {
                        setCloseReason('');
                        setTaskToClose(task);
                      }}
                      canComplete={canMutateTasks}
                      canClose={canMutateTasks}
                      resolvingTaskId={resolvingTaskId}
                      isMutating={completeTaskMutation.isPending || closeTaskMutation.isPending}
                    />
                  ))}
                </PipelineActionColumn>
              )}

              {activeMobileTab === MOBILE_RETRY_TAB && (
                <PipelineActionColumn
                  title="Needs Retry"
                  count={retryCalls.length}
                  testId="pipeline-actions-needs-retry-mobile"
                  tone="amber"
                  isLoading={needsRetryLoading}
                  isError={needsRetryError}
                  emptyTitle="No calls need retry"
                  layout="mobile"
                  onRetry={() => refetchNeedsRetry()}
                >
                  {retryCalls.map((call) => (
                    <PipelineRetryCard
                      key={call.id}
                      call={call}
                      activeCallPhone={callStatus?.currentCallPhone}
                      isOnCall={callStatus?.currentStatus === 'ON_CALL'}
                      waitLabel={retryWaitMap.get(call.id)}
                      onCall={handlePipelineCall}
                      onOpenDetails={openLeadDetailByCall}
                      resolvingCallId={resolvingCallId}
                    />
                  ))}
                </PipelineActionColumn>
              )}
            </div>
          </div>
        )}

        <LeadDetailDrawer
          leadId={selectedLeadId}
          stages={PIPELINE_STAGES}
          onClose={closeLeadDetail}
          onDeleted={closeLeadDetail}
        />

        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Number">
          <div className="space-y-4">
            <Input
              id="pipeline-add-phone-number"
              name="phoneNumber"
              label="Phone Number"
              value={addForm.phoneNumber}
              onChange={(event) => setAddForm({ ...addForm, phoneNumber: event.target.value })}
              placeholder="+201234567890"
              className="min-h-11 text-base sm:min-h-0 sm:text-sm"
              required
            />
            <Input
              id="pipeline-add-client-name"
              name="clientName"
              label="Client Name"
              value={addForm.clientName || ''}
              className="min-h-11 text-base sm:min-h-0 sm:text-sm"
              onChange={(event) => setAddForm({ ...addForm, clientName: event.target.value })}
            />
            <Input
              id="pipeline-add-source"
              name="source"
              label="Source"
              value={addForm.source || ''}
              className="min-h-11 text-base sm:min-h-0 sm:text-sm"
              onChange={(event) => setAddForm({ ...addForm, source: event.target.value })}
            />
            <Button
              onClick={() => {
                if (!addForm.phoneNumber.trim()) {
                  toast.error('Phone number is required');
                  return;
                }
                addNumberMutation.mutate(addForm);
              }}
              loading={addNumberMutation.isPending}
              fullWidth
            >
              Add
            </Button>
          </div>
        </Modal>
        <Modal isOpen={Boolean(taskToClose)} onClose={() => setTaskToClose(null)} title="Close Task">
          <div className="space-y-4">
            <Textarea
              id="pipeline-close-reason"
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

export default function CrmPipelinePage() {
  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SALES_MANAGER, Role.SALES]}>
      <Suspense fallback={<PipelineLoadingFallback />}>
        <CrmPipelineContent />
      </Suspense>
    </ProtectedRoute>
  );
}
