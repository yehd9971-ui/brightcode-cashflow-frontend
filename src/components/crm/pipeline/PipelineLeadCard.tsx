'use client';

import { AlertTriangle, CalendarClock, Clock, Flame, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { CrmLeadResponseDto, CrmStage } from '@/types/api';
import { cn } from '@/utils/cn';

interface PipelineLeadCardProps {
  lead: CrmLeadResponseDto;
  stages: CrmStage[];
  isUpdating: boolean;
  onPreview: (lead: CrmLeadResponseDto) => void;
  onMoveStage: (lead: CrmLeadResponseDto, stage: CrmStage) => void;
}

function stageLabel(stage: CrmStage | string) {
  return String(stage).replace(/_/g, ' ');
}

function priorityLabel(priority?: number) {
  if (!priority) return 'Normal';
  return ({ 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' } as Record<number, string>)[priority] ?? `P${priority}`;
}

function formatDate(value?: string) {
  if (!value) return 'None';
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isStale(value?: string) {
  if (!value) return true;
  return new Date(value).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function nextActionWarning(value?: string) {
  if (!value) return 'No next action';
  return new Date(value).getTime() < Date.now() ? 'Overdue action' : '';
}

export function PipelineLeadCard({
  lead,
  stages,
  isUpdating,
  onPreview,
  onMoveStage,
}: PipelineLeadCardProps) {
  const stale = isStale(lead.lastContactedAt);
  const actionWarning = nextActionWarning(lead.nextActionAt);

  return (
    <div
      data-testid="pipeline-lead-card"
      data-phone={lead.phoneNumber}
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-300',
        isUpdating && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onPreview(lead)}
            className="flex min-w-0 items-center gap-2 text-left font-mono text-sm font-semibold text-blue-700 hover:underline"
          >
            <Phone className="h-4 w-4 shrink-0" />
            <span className="truncate">{lead.phoneNumber}</span>
          </button>
          <p className="mt-1 truncate text-sm font-medium text-gray-900">
            {lead.clientName || 'Unnamed client'}
          </p>
        </div>
        <Badge variant={lead.priority && lead.priority >= 3 ? 'warning' : 'neutral'} size="sm">
          {priorityLabel(lead.priority)}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {lead.stage === CrmStage.HOT_LEAD && (
          <Badge variant="warning" size="sm">
            <Flame className="mr-1 h-3 w-3" /> Hot Lead
          </Badge>
        )}
        {stale && (
          <Badge variant="error" size="sm">
            <Clock className="mr-1 h-3 w-3" /> Stale
          </Badge>
        )}
        {actionWarning && (
          <Badge variant="warning" size="sm">
            <AlertTriangle className="mr-1 h-3 w-3" /> {actionWarning}
          </Badge>
        )}
      </div>

      <div className="mt-3 grid gap-1 text-xs text-gray-500">
        <span className="truncate">Owner: {lead.owner?.email || 'Unassigned'}</span>
        <span className="flex items-center gap-1">
          <CalendarClock className="h-3 w-3" /> Next: {formatDate(lead.nextActionAt)}
        </span>
        <span>Last: {formatDate(lead.lastContactedAt)}</span>
      </div>

      <div className="mt-3">
        <Select
          aria-label={`Move stage ${lead.phoneNumber}`}
          value={lead.stage}
          disabled={isUpdating}
          options={stages.map((stage) => ({ value: stage, label: stageLabel(stage) }))}
          onChange={(event) => onMoveStage(lead, event.target.value as CrmStage)}
        />
      </div>
    </div>
  );
}
