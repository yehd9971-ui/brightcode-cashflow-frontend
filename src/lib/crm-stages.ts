import { CrmStage } from '@/types/api';

export const CRM_PIPELINE_STAGES: CrmStage[] = [
  CrmStage.NEW,
  CrmStage.NOT_ANSWERED,
  CrmStage.INTERESTED,
  CrmStage.HOT_LEAD,
  CrmStage.FOLLOWING_UP,
  CrmStage.SOLD,
  CrmStage.NOT_INTERESTED,
];

export function crmStageLabel(stage?: CrmStage | string) {
  if (!stage) return '';
  if (stage === CrmStage.NOT_ANSWERED || stage === 'NOT_ANSWERED') return 'NO ANSWER';
  return String(stage).replace(/_/g, ' ');
}

export const CRM_STAGE_OPTIONS = CRM_PIPELINE_STAGES.map((stage) => ({
  value: stage,
  label: crmStageLabel(stage),
}));
