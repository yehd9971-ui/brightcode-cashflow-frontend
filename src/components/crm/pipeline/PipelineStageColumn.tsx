'use client';

import { CrmLeadResponseDto, CrmStage } from '@/types/api';
import { crmStageLabel } from '@/lib/crm-stages';
import { PipelineLeadCard } from './PipelineLeadCard';

interface PipelineStageColumnProps {
  stage: CrmStage;
  count: number;
  leads: CrmLeadResponseDto[];
  stages: CrmStage[];
  page: number;
  totalPages: number;
  updatingLeadId?: string;
  onPreview: (lead: CrmLeadResponseDto) => void;
  onMoveStage: (lead: CrmLeadResponseDto, stage: CrmStage) => void;
  onPageChange: (stage: CrmStage, page: number) => void;
}

export function PipelineStageColumn({
  stage,
  count,
  leads,
  stages,
  page,
  totalPages,
  updatingLeadId,
  onPreview,
  onMoveStage,
  onPageChange,
}: PipelineStageColumnProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const canPageBack = count > 0 && safePage > 1;
  const canPageForward = count > 0 && safePage < safeTotalPages;

  return (
    <section
      data-testid={`pipeline-stage-${stage}`}
      className="flex min-h-[520px] max-h-[calc(100vh-260px)] w-[290px] shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{crmStageLabel(stage)}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-700">
          {count}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
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
            />
          ))
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-3 py-2">
        <button
          type="button"
          data-testid={`pipeline-stage-${stage}-prev`}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canPageForward}
          onClick={() => onPageChange(stage, Math.min(safeTotalPages, safePage + 1))}
        >
          Next
        </button>
      </div>
    </section>
  );
}
