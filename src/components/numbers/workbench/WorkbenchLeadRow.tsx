'use client';

import { Clock, FileText, Flame, Phone, PhoneCall } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CrmStage } from '@/types/api';

export interface WorkbenchLeadItem {
  id: string;
  phoneNumber: string;
  clientName?: string;
  stage?: CrmStage | string;
  priority?: number;
  nextActionAt?: string;
  lastContactedAt?: string;
  ownerEmail?: string;
  meta?: string;
  kind: 'retry' | 'hot' | 'stale';
}

interface WorkbenchLeadRowProps {
  item: WorkbenchLeadItem;
  isViewingOther: boolean;
  isOnCall: boolean;
  activeCallPhone?: string | null;
  waitLabel?: string;
  onCall: (phone: string) => void;
  onFillReport: (phone: string) => void;
  onSelectLead?: (id: string) => void;
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

function priorityLabel(priority?: number) {
  if (!priority) return 'Normal';
  return ({ 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' } as Record<number, string>)[priority] ?? `P${priority}`;
}

export function WorkbenchLeadRow({
  item,
  isViewingOther,
  isOnCall,
  activeCallPhone,
  waitLabel,
  onCall,
  onFillReport,
  onSelectLead,
}: WorkbenchLeadRowProps) {
  const isActivePhone = activeCallPhone === item.phoneNumber;
  const Icon = item.kind === 'hot' ? Flame : item.kind === 'retry' ? Phone : Clock;
  const badgeVariant = item.kind === 'hot' ? 'warning' : item.kind === 'retry' ? 'info' : 'neutral';
  const label = item.kind === 'retry' ? 'Needs Retry' : item.kind === 'hot' ? 'Hot Lead' : 'Stale';

  return (
    <div
      data-testid="workbench-lead-row"
      className="flex flex-col gap-3 p-3 hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="h-4 w-4 text-amber-600" />
          <button
            type="button"
            onClick={() => onSelectLead?.(item.id)}
            className="font-mono text-sm font-semibold text-indigo-700 hover:underline"
          >
            {item.phoneNumber}
          </button>
          <Badge variant={badgeVariant} size="sm">
            {label}
          </Badge>
          <Badge variant="neutral" size="sm">{String(item.stage || 'No stage').replace(/_/g, ' ')}</Badge>
          <Badge variant={item.priority && item.priority >= 3 ? 'warning' : 'neutral'} size="sm">
            {priorityLabel(item.priority)}
          </Badge>
        </div>
        <div className="mt-1 grid gap-1 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
          <span className="truncate">{item.clientName || 'Unnamed client'}</span>
          <span>Next: {formatDate(item.nextActionAt)}</span>
          <span>Last: {formatDate(item.lastContactedAt)}</span>
          <span>Owner: {item.ownerEmail || 'Unassigned'}</span>
        </div>
        {item.meta && <p className="mt-1 text-xs text-gray-500">{item.meta}</p>}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {!isViewingOther && isOnCall && isActivePhone && (
          <Button size="sm" variant="outline" onClick={() => onFillReport(item.phoneNumber)}>
            <FileText className="mr-1 h-4 w-4" /> Fill Report
          </Button>
        )}
        {!isViewingOther && !isOnCall && (
          <Button size="sm" disabled={Boolean(waitLabel)} onClick={() => onCall(item.phoneNumber)}>
            <PhoneCall className="mr-1 h-4 w-4" /> {waitLabel || 'Call'}
          </Button>
        )}
      </div>
    </div>
  );
}
