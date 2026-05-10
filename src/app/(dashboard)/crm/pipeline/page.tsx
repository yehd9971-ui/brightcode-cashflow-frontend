'use client';

import { Fragment, Suspense, useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { LayoutDashboard } from 'lucide-react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LeadDetailDrawer } from '@/components/crm/lead-detail';
import {
  PipelineActionColumn,
  PipelineRetryCard,
  PipelineTaskCard,
} from '@/components/crm/pipeline/PipelineActionColumn';
import { PipelineFilters } from '@/components/crm/pipeline/PipelineFilters';
import { PipelineStageColumn } from '@/components/crm/pipeline/PipelineStageColumn';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { getOpenTasks } from '@/lib/services/call-tasks';
import { getNeedsRetry } from '@/lib/services/calls';
import { getCrmLeads, updateCrmLeadStage } from '@/lib/services/crm';
import { getSalesUsers } from '@/lib/services/users';
import { CRM_PIPELINE_STAGES } from '@/lib/crm-stages';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePhoneNumber } from '@/utils/phone';
import {
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

function priorityValue(value: string) {
  return value ? Number(value) : undefined;
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
  const [ownerId, setOwnerId] = useState('');
  const [priority, setPriority] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [stagePages, setStagePages] = useState(createInitialStagePages);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | undefined>();
  const searchString = searchParams.toString();
  const selectedLeadId = searchParams.get('leadId');
  const phoneSearchDigits = phoneSearch.replace(/\D/g, '');
  const effectivePhoneSearch = phoneSearchDigits.length >= 5 ? phoneSearch.trim() : undefined;
  const selectedPriority = priorityValue(priority);
  const operationalUserId = ownerId || undefined;

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
        enabled: isAdmin || isSalesManager,
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
    enabled: isAdmin || isSalesManager,
  });

  const {
    data: needsRetry,
    isLoading: needsRetryLoading,
    isError: needsRetryError,
    refetch: refetchNeedsRetry,
  } = useQuery({
    queryKey: ['calls', 'needs-retry', 'pipeline', operationalUserId],
    queryFn: () => getNeedsRetry(operationalUserId),
    enabled: isAdmin || isSalesManager,
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
  const leadsLoading = stageQueries.some((query) => query.isLoading);
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
  const refetchLeads = () => {
    stageQueries.forEach((query) => query.refetch());
  };

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
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
            Total leads: <span className="font-semibold text-gray-900">{totalLeads}</span>
          </div>
        </div>

        <PipelineFilters
          users={users ?? []}
          currentUser={user}
          ownerId={ownerId}
          priority={priority}
          phoneSearch={phoneSearch}
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

        {!leadsInitialLoading && !leadsError && (
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
                            onPreviewLead={openLeadDetailById}
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
                          <PipelineRetryCard key={call.id} call={call} />
                        ))}
                      </PipelineActionColumn>
                    </>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        )}

        <LeadDetailDrawer
          leadId={selectedLeadId}
          stages={PIPELINE_STAGES}
          onClose={closeLeadDetail}
          onDeleted={closeLeadDetail}
        />
    </div>
  );
}

export default function CrmPipelinePage() {
  return (
    <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SALES_MANAGER]}>
      <Suspense fallback={<PipelineLoadingFallback />}>
        <CrmPipelineContent />
      </Suspense>
    </ProtectedRoute>
  );
}
