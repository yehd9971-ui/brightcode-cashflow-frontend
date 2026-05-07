'use client';

import { CrmLeadResponseDto, CrmStage } from '@/types/api';
import { PipelineLeadCard } from './PipelineLeadCard';

interface PipelineStageColumnProps {
  stage: CrmStage;
  count: number;
  leads: CrmLeadResponseDto[];
  stages: CrmStage[];
  updatingLeadId?: string;
  onPreview: (lead: CrmLeadResponseDto) => void;
  onMoveStage: (lead: CrmLeadResponseDto, stage: CrmStage) => void;
}

function stageLabel(stage: CrmStage) {
  return stage.replace(/_/g, ' ');
}

export function PipelineStageColumn({
  stage,
  count,
  leads,
  stages,
  updatingLeadId,
  onPreview,
  onMoveStage,
}: PipelineStageColumnProps) {
  return (
    <section
      data-testid={`pipeline-stage-${stage}`}
      className="flex min-h-[360px] w-[290px] shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-50"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{stageLabel(stage)}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-700">
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
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
    </section>
  );
}
