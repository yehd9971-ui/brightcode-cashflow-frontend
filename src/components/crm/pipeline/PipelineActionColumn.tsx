'use client';

import { ReactNode } from 'react';
import { AlertTriangle, Clock, Eye, FileText, PhoneCall, PhoneOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/Loading';
import { CallResponseDto, CrmStage, OpenTaskBucket, OpenTaskResponseDto } from '@/types/api';
import { crmStageLabel } from '@/lib/crm-stages';
import { cn } from '@/utils/cn';

interface PipelineActionColumnProps {
  title: string;
  count: number;
  testId: string;
  tone?: 'red' | 'amber' | 'blue';
  isLoading?: boolean;
  isError?: boolean;
  emptyTitle: string;
  layout?: 'desktop' | 'mobile';
  onRetry?: () => void;
  children: ReactNode;
}

const columnToneClass = {
  red: 'border-red-200 bg-red-50/50',
  amber: 'border-amber-200 bg-amber-50/50',
  blue: 'border-blue-200 bg-blue-50/50',
};

const taskBadge: Record<string, { label: string; variant: 'error' | 'warning' | 'info' }> = {
  [OpenTaskBucket.OVERDUE]: { label: 'Overdue', variant: 'error' },
  [OpenTaskBucket.TODAY]: { label: 'Today', variant: 'warning' },
  [OpenTaskBucket.UPCOMING]: { label: 'Upcoming', variant: 'info' },
};

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

function priorityLabel(priority?: number) {
  if (!priority) return 'Normal';
  return ({ 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' } as Record<number, string>)[priority] ?? `P${priority}`;
}

function taskStageLabel(stage?: CrmStage) {
  return stage ? crmStageLabel(stage) : 'No stage';
}

function phoneDigits(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

export function PipelineActionColumn({
  title,
  count,
  testId,
  tone = 'blue',
  isLoading,
  isError,
  emptyTitle,
  layout = 'desktop',
  onRetry,
  children,
}: PipelineActionColumnProps) {
  return (
    <section
      data-testid={testId}
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border',
        layout === 'mobile'
          ? 'min-h-0 w-full'
          : 'min-h-[520px] max-h-[calc(100vh-260px)] w-[290px] shrink-0',
        columnToneClass[tone],
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
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
        {isLoading ? (
          <CardSkeleton />
        ) : isError ? (
          <ErrorState message={`Unable to load ${title.toLowerCase()}`} onRetry={onRetry} />
        ) : count === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4">
            <EmptyState title={emptyTitle} />
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function PipelineTaskCard({
  task,
  activeCallPhone,
  isOnCall,
  onCall,
  onOpenLead,
  onOpenPhone,
  resolvingPhone,
}: {
  task: OpenTaskResponseDto;
  activeCallPhone?: string | null;
  isOnCall?: boolean;
  onCall: (phone: string) => void;
  onOpenLead: (leadId: string) => void;
  onOpenPhone: (phone: string) => void;
  resolvingPhone?: string | null;
}) {
  const client = task.clientNumber;
  const phone = task.rawPhoneNumber || client?.phoneNumber || task.clientPhoneNumber;
  const leadId = client?.id || task.clientNumberId;
  const activeDigits = phoneDigits(activeCallPhone);
  const resolvingForThisPhone = Boolean(
    resolvingPhone && phoneDigits(resolvingPhone) === phoneDigits(phone),
  );
  const openDetails = () => {
    if (leadId) {
      onOpenLead(leadId);
      return;
    }

    onOpenPhone(phone);
  };
  const activeForThisPhone = Boolean(
    activeDigits &&
      [phone, task.clientPhoneNumber, client?.phoneNumber].some((value) => phoneDigits(value) === activeDigits),
  );
  const callDisabled = Boolean(isOnCall && !activeForThisPhone);
  const badge = task.isOverdue
    ? taskBadge[OpenTaskBucket.OVERDUE]
    : taskBadge[task.bucket] ?? taskBadge[OpenTaskBucket.TODAY];

  return (
    <div
      data-testid="pipeline-task-card"
      data-phone={phone}
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-300',
        task.isOverdue && 'border-red-300 bg-red-50/60 hover:border-red-400',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            type="button"
            onClick={openDetails}
            disabled={resolvingForThisPhone}
            title={leadId ? undefined : 'Find CRM details by phone'}
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left font-mono text-sm font-semibold text-blue-700 hover:underline disabled:cursor-wait disabled:opacity-70"
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span className="truncate">{phone}</span>
          </button>
          <p className="mt-1 truncate text-sm font-medium text-gray-900">
            {client?.clientName || 'Unnamed client'}
          </p>
        </div>
        <Badge variant={badge.variant} size="sm">
          {badge.label}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="neutral" size="sm">{taskStageLabel(client?.crmStage)}</Badge>
        <Badge variant={client?.priority && client.priority >= 3 ? 'warning' : 'neutral'} size="sm">
          {priorityLabel(client?.priority)}
        </Badge>
      </div>

      <div className="mt-3 grid gap-1 text-xs text-gray-500">
        <span>Due: {formatDate(task.scheduledAt)}</span>
        <span className="truncate">Assignee: {task.user?.email || task.userId}</span>
        <span>{task.source.replace(/_/g, ' ')}</span>
      </div>
      {task.notes && <p className="mt-2 line-clamp-2 text-xs text-gray-500">{task.notes}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={openDetails}
          loading={resolvingForThisPhone}
          aria-label={`Open details ${phone}`}
        >
          <Eye className="mr-1 h-4 w-4" /> Details
        </Button>
        <Button
          size="sm"
          onClick={() => onCall(phone)}
          disabled={callDisabled}
          title={callDisabled ? `Active call: ${activeCallPhone}` : undefined}
          aria-label={`${activeForThisPhone ? 'Fill report' : 'Call'} ${phone}`}
        >
          {activeForThisPhone ? (
            <>
              <FileText className="mr-1 h-4 w-4" /> Fill Report
            </>
          ) : (
            <>
              <PhoneCall className="mr-1 h-4 w-4" /> Call
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function PipelineRetryCard({ call }: { call: CallResponseDto }) {
  return (
    <div
      data-testid="pipeline-retry-card"
      data-phone={call.rawPhoneNumber || call.clientPhoneNumber}
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 font-mono text-sm font-semibold text-blue-700">
            <PhoneOff className="h-4 w-4 shrink-0" />
            <span className="truncate">{call.rawPhoneNumber || call.clientPhoneNumber}</span>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-gray-900">
            {call.user?.email || 'Unassigned'}
          </p>
        </div>
        <Badge variant="info" size="sm">Retry</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="error" size="sm">
          <AlertTriangle className="mr-1 h-3 w-3" /> No answer
        </Badge>
      </div>

      <div className="mt-3 grid gap-1 text-xs text-gray-500">
        <span>First attempt: {formatDate(call.createdAt)}</span>
        <span className="truncate">Status: {call.approvalStatus.replace(/_/g, ' ')}</span>
      </div>
    </div>
  );
}
