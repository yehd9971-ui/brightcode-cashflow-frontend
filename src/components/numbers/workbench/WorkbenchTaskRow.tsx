'use client';

import { CheckCircle, Clock, PhoneCall, XCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CrmStage, OpenTaskBucket, OpenTaskResponseDto } from '@/types/api';
import { crmStageLabel } from '@/lib/crm-stages';
import { cn } from '@/utils/cn';

interface WorkbenchTaskRowProps {
  task: OpenTaskResponseDto;
  isViewingOther: boolean;
  isOnCall: boolean;
  activeCallPhone?: string | null;
  canComplete: boolean;
  canClose: boolean;
  isBusy?: boolean;
  onCall: (phone: string) => void;
  onFillReport: (phone: string) => void;
  onComplete: (task: OpenTaskResponseDto) => void;
  onClose: (task: OpenTaskResponseDto) => void;
  onSelectLead?: (id: string) => void;
}

const bucketBadge: Record<string, { label: string; variant: 'error' | 'warning' | 'info' }> = {
  [OpenTaskBucket.OVERDUE]: { label: 'Overdue', variant: 'error' },
  [OpenTaskBucket.TODAY]: { label: 'Today', variant: 'warning' },
  [OpenTaskBucket.UPCOMING]: { label: 'Upcoming', variant: 'info' },
};

function displayDateTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stageLabel(stage?: CrmStage) {
  return stage ? crmStageLabel(stage) : 'No stage';
}

function priorityLabel(priority?: number) {
  if (!priority) return 'Normal';
  return ({ 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' } as Record<number, string>)[priority] ?? `P${priority}`;
}

export function WorkbenchTaskRow({
  task,
  isViewingOther,
  isOnCall,
  activeCallPhone,
  canComplete,
  canClose,
  isBusy,
  onCall,
  onFillReport,
  onComplete,
  onClose,
  onSelectLead,
}: WorkbenchTaskRowProps) {
  const client = task.clientNumber;
  const phone = task.rawPhoneNumber || client?.phoneNumber || task.clientPhoneNumber;
  const bucket = bucketBadge[task.bucket] ?? bucketBadge[OpenTaskBucket.TODAY];
  const activeForThisPhone = activeCallPhone === phone || activeCallPhone === task.clientPhoneNumber;

  return (
    <div
      data-testid="workbench-task-row"
      className={cn(
        'flex flex-col gap-3 p-3 hover:bg-gray-50 md:flex-row md:items-center md:justify-between',
        task.isOverdue && 'bg-red-50/60',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Clock className={cn('h-4 w-4', task.isOverdue ? 'text-red-600' : 'text-blue-600')} />
          {client?.id ? (
            <button
              type="button"
              onClick={() => onSelectLead?.(client.id)}
              className="font-mono text-sm font-semibold text-indigo-700 hover:underline"
            >
              {phone}
            </button>
          ) : (
            <span className="font-mono text-sm font-semibold text-gray-900">{phone}</span>
          )}
          <Badge variant={bucket.variant} size="sm">{bucket.label}</Badge>
          <Badge variant="neutral" size="sm">{stageLabel(client?.crmStage)}</Badge>
          <Badge variant={client?.priority && client.priority >= 3 ? 'warning' : 'neutral'} size="sm">
            {priorityLabel(client?.priority)}
          </Badge>
        </div>
        <div className="mt-1 grid gap-1 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
          <span className="truncate">{client?.clientName || 'Unnamed client'}</span>
          <span>Next: {displayDateTime(task.scheduledAt)}</span>
          <span>Assignee: {task.user?.email || task.userId}</span>
          <span>{task.source.replace(/_/g, ' ')}</span>
        </div>
        {task.notes && <p className="mt-1 truncate text-xs text-gray-500">{task.notes}</p>}
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        {!isViewingOther && isOnCall && activeForThisPhone && (
          <Button size="sm" variant="outline" onClick={() => onFillReport(phone)}>
            <FileText className="mr-1 h-4 w-4" /> Fill Report
          </Button>
        )}
        {!isViewingOther && !isOnCall && (
          <Button size="sm" onClick={() => onCall(phone)}>
            <PhoneCall className="mr-1 h-4 w-4" /> Call
          </Button>
        )}
        {canComplete && (
          <Button
            size="sm"
            variant="outline"
            loading={isBusy}
            onClick={() => onComplete(task)}
            aria-label={`Complete task ${phone}`}
          >
            <CheckCircle className="mr-1 h-4 w-4" /> Complete
          </Button>
        )}
        {canClose && (
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => onClose(task)}
            aria-label={`Close task ${phone}`}
          >
            <XCircle className="mr-1 h-4 w-4" /> Close
          </Button>
        )}
      </div>
    </div>
  );
}
