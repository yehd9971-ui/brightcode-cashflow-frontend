'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutDashboard } from 'lucide-react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LeadDetailDrawer } from '@/components/crm/lead-detail';
import { PipelineFilters } from '@/components/crm/pipeline/PipelineFilters';
import { PipelineStageColumn } from '@/components/crm/pipeline/PipelineStageColumn';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { getCrmLeads, updateCrmLeadStage } from '@/lib/services/crm';
import { getSalesUsers } from '@/lib/services/users';
import { useAuth } from '@/contexts/AuthContext';
import {
  CrmLeadResponseDto,
  CrmLeadsQueryDto,
  CrmLeadsResponseDto,
  CrmStage,
  Role,
} from '@/types/api';

const PIPELINE_STAGES = Object.values(CrmStage) as CrmStage[];
const PIPELINE_LIMIT = 100;

function priorityValue(value: string) {
  return value ? Number(value) : undefined;
}

function createEmptyGroups() {
  return PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = [];
    return acc;
  }, {} as Record<CrmStage, CrmLeadResponseDto[]>);
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
  const { isAdmin, isSalesManager } = useAuth();
  const [ownerId, setOwnerId] = useState('');
  const [priority, setPriority] = useState('');
  const [updatingLeadId, setUpdatingLeadId] = useState<string | undefined>();
  const searchString = searchParams.toString();
  const selectedLeadId = searchParams.get('leadId');

  const leadsQuery: CrmLeadsQueryDto = useMemo(() => ({
    page: 1,
    limit: PIPELINE_LIMIT,
    ownerId: ownerId || undefined,
    priority: priorityValue(priority),
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  }), [ownerId, priority]);

  const pipelineQueryKey = useMemo(
    () => ['crm', 'leads', 'pipeline', leadsQuery] as const,
    [leadsQuery],
  );

  const {
    data: users,
    isLoading: usersLoading,
  } = useQuery({
    queryKey: ['users', 'sales-users', 'pipeline'],
    queryFn: getSalesUsers,
    enabled: isAdmin || isSalesManager,
  });

  const {
    data: leads,
    isLoading: leadsLoading,
    isError: leadsError,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: pipelineQueryKey,
    queryFn: () => getCrmLeads(leadsQuery),
    enabled: isAdmin || isSalesManager,
  });

  const groupedLeads = useMemo(() => {
    const groups = createEmptyGroups();
    (leads?.data ?? []).forEach((lead) => {
      const stage = PIPELINE_STAGES.includes(lead.stage) ? lead.stage : CrmStage.NEW;
      groups[stage].push(lead);
    });
    return groups;
  }, [leads?.data]);

  const countForStage = (stage: CrmStage) => {
    const apiCount = leads?.countsByStage?.[stage];
    return typeof apiCount === 'number' ? apiCount : groupedLeads[stage].length;
  };

  const moveStageMutation = useMutation({
    mutationFn: ({ lead, stage }: { lead: CrmLeadResponseDto; stage: CrmStage }) =>
      updateCrmLeadStage(lead.id, { stage }),
    onMutate: async ({ lead, stage }) => {
      setUpdatingLeadId(lead.id);
      await queryClient.cancelQueries({ queryKey: pipelineQueryKey });
      const previous = queryClient.getQueryData<CrmLeadsResponseDto>(pipelineQueryKey);

      queryClient.setQueryData<CrmLeadsResponseDto>(pipelineQueryKey, (current) => {
        if (!current) return current;
        const previousStage = lead.stage;
        const countsByStage = { ...current.countsByStage };
        countsByStage[previousStage] = Math.max((countsByStage[previousStage] ?? 1) - 1, 0);
        countsByStage[stage] = (countsByStage[stage] ?? 0) + 1;

        return {
          ...current,
          countsByStage,
          data: current.data.map((item) =>
            item.id === lead.id ? { ...item, stage, crmStage: stage } : item
          ),
        };
      });

      return { previous };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(pipelineQueryKey, context.previous);
      }
      toast.error(error.response?.data?.message || 'Failed to update stage');
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

  const openLeadDetail = useCallback((lead: CrmLeadResponseDto) => {
    const params = new URLSearchParams(searchString);
    params.set('leadId', lead.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchString]);

  const closeLeadDetail = useCallback(() => {
    const params = new URLSearchParams(searchString);
    params.delete('leadId');
    const nextSearch = params.toString();
    router.push(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [pathname, router, searchString]);

  const showLimitWarning = Boolean(leads && leads.total > PIPELINE_LIMIT);

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
            Total leads: <span className="font-semibold text-gray-900">{leads?.total ?? 0}</span>
          </div>
        </div>

        <PipelineFilters
          users={users ?? []}
          ownerId={ownerId}
          priority={priority}
          onOwnerChange={setOwnerId}
          onPriorityChange={setPriority}
        />

        {showLimitWarning && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Showing the first {PIPELINE_LIMIT} leads. Narrow filters to inspect the rest.
          </div>
        )}

        {(leadsLoading || usersLoading) && (
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

        {!leadsLoading && !leadsError && (
          <div
            data-testid="crm-pipeline-board"
            className="overflow-x-auto pb-3"
          >
            <div className="flex min-w-max gap-4">
              {PIPELINE_STAGES.map((stage) => (
                <PipelineStageColumn
                  key={stage}
                  stage={stage}
                  count={countForStage(stage)}
                  leads={groupedLeads[stage]}
                  stages={PIPELINE_STAGES}
                  updatingLeadId={updatingLeadId}
                  onPreview={openLeadDetail}
                  onMoveStage={handleMoveStage}
                />
              ))}
            </div>
          </div>
        )}

        <LeadDetailDrawer
          leadId={selectedLeadId}
          stages={PIPELINE_STAGES}
          onClose={closeLeadDetail}
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
