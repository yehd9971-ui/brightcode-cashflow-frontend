import type { CrmStage } from '@/types/api';

export interface PipelineViewState {
  ownerId: string;
  stagePages: Record<CrmStage, number>;
  priority: string;
  transferredFilter: string;
  phoneSearch: string;
}

// Module-level store: survives client-side navigation (e.g. pipeline -> call
// form -> back) but resets on full reload, so a refresh always starts clean.
const store = new Map<string, PipelineViewState>();

export function loadPipelineViewState(userId: string | undefined): PipelineViewState | undefined {
  if (!userId) return undefined;
  return store.get(userId);
}

export function savePipelineViewState(userId: string | undefined, state: PipelineViewState): void {
  if (!userId) return;
  store.set(userId, state);
}
