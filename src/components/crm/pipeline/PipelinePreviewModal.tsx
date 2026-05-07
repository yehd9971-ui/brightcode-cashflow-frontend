'use client';

import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { CrmLeadResponseDto } from '@/types/api';

interface PipelinePreviewModalProps {
  lead: CrmLeadResponseDto | null;
  onClose: () => void;
}

function formatDate(value?: string) {
  if (!value) return 'None';
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function priorityLabel(priority?: number) {
  if (!priority) return 'Normal';
  return ({ 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' } as Record<number, string>)[priority] ?? `P${priority}`;
}

export function PipelinePreviewModal({ lead, onClose }: PipelinePreviewModalProps) {
  return (
    <Modal isOpen={Boolean(lead)} onClose={onClose} title="Lead Preview" size="lg">
      {lead && (
        <div data-testid="pipeline-lead-preview" className="space-y-4">
          <div>
            <p className="font-mono text-lg font-semibold text-blue-700">{lead.phoneNumber}</p>
            <p className="text-sm text-gray-500">{lead.clientName || 'Unnamed client'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info" size="sm">{lead.stage.replace(/_/g, ' ')}</Badge>
            <Badge variant={lead.priority && lead.priority >= 3 ? 'warning' : 'neutral'} size="sm">
              {priorityLabel(lead.priority)}
            </Badge>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Owner</dt>
              <dd className="font-medium text-gray-900">{lead.owner?.email || 'Unassigned'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Source</dt>
              <dd className="font-medium text-gray-900">{lead.source || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Next action</dt>
              <dd className="font-medium text-gray-900">{formatDate(lead.nextActionAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Last contacted</dt>
              <dd className="font-medium text-gray-900">{formatDate(lead.lastContactedAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Failed attempts</dt>
              <dd className="font-medium text-gray-900">{lead.totalFailedAttempts}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Updated</dt>
              <dd className="font-medium text-gray-900">{formatDate(lead.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      )}
    </Modal>
  );
}
