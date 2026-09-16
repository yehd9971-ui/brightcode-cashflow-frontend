'use client';

import { CrmLeadResponseDto, CrmStage } from '@/types/api';
import { crmStageLabel } from '@/lib/crm-stages';
import { cn } from '@/utils/cn';
import { PipelineLeadCard } from './PipelineLeadCard';

interface PipelineStageColumnProps {
  stage: CrmStage;
  count: number;
  leads: CrmLeadResponseDto[];
  stages: CrmStage[];
  page: number;
  totalPages: number;
  updatingLeadId?: string;
  layout?: 'desktop' | 'mobile';
  onPreview: (lead: CrmLeadResponseDto) => void;
  onMoveStage: (lead: CrmLeadResponseDto, stage: CrmStage) => void;
  onPageChange: (stage: CrmStage, page: number) => void;
  selectionEnabled?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  onStageSelectChange?: (stage: CrmStage, leadIds: string[], checked: boolean) => void;
}

export function PipelineStageColumn({
  stage,
  count,
  leads,
  stages,
  page,
  totalPages,
  updatingLeadId,
  layout = 'desktop',
  onPreview,
  onMoveStage,
  onPageChange,
  selectionEnabled = false,
  selectedIds,
  onToggleSelect,
  onStageSelectChange,
}: PipelineStageColumnProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const canPageBack = count > 0 && safePage > 1;
  const canPageForward = count > 0 && safePage < safeTotalPages;

  return (
    <section
      data-testid={`pipeline-stage-${stage}`}
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50',
        layout === 'mobile'
          ? 'min-h-0 w-full'
          : 'min-h-[520px] max-h-[calc(100vh-260px)] w-[290px] shrink-0',
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
        {selectionEnabled && (
          <input
            type="checkbox"
            data-testid={`pipeline-stage-${stage}-select-all`}
            checked={leads.length > 0 && leads.every((lead) => selectedIds?.has(lead.id))}
            onChange={(event) =>
              onStageSelectChange?.(
                stage,
                leads.map((lead) => lead.id),
                event.target.checked,
              )
            }
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            aria-label={`Select all leads in ${crmStageLabel(stage)}`}
          />
        )}
        <h2 className="text-sm font-semibold text-gray-900">{crmStageLabel(stage)}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-700">
          {count}
        </span>
      </div>
      <div
        className={cn(
          'flex flex-col gap-3 p-3',
          layout === 'mobile' ? 'overflow-visible' : 'min-h-0 flex-1 overflow-y-auto',
        )}
      >
        {leads.length === 0 ? (
          <div
            data-testid="pipeline-empty-column"
            className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-3 text-center text-sm text-gray-500"
          >
            No leads in this stage
          </div>
        ) : (
          leads.map((lead) => (
            <PipelineLeadCard
              key={lead.id}
              lead={lead}
              stages={stages}
              isUpdating={updatingLeadId === lead.id}
              onPreview={onPreview}
              onMoveStage={onMoveStage}
              selectable={selectionEnabled}
              selected={selectedIds?.has(lead.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-3 py-2">
        <button
          type="button"
          data-testid={`pipeline-stage-${stage}-prev`}
          className={cn(
            'rounded-md border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
            layout === 'mobile' ? 'min-h-10 px-3 py-2 text-sm' : 'px-2 py-1 text-xs',
          )}
          disabled={!canPageBack}
          onClick={() => onPageChange(stage, Math.max(1, safePage - 1))}
        >
          Previous
        </button>
        <span
          data-testid={`pipeline-stage-${stage}-page`}
          className="shrink-0 text-xs font-medium text-gray-600"
        >
          Page {safePage} of {safeTotalPages}
        </span>
        <button
          type="button"
          data-testid={`pipeline-stage-${stage}-next`}
          className={cn(
            'rounded-md border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
            layout === 'mobile' ? 'min-h-10 px-3 py-2 text-sm' : 'px-2 py-1 text-xs',
          )}
          disabled={!canPageForward}
          onClick={() => onPageChange(stage, Math.min(safeTotalPages, safePage + 1))}
        >
          Next
        </button>
      </div>
    </section>
  );
}
