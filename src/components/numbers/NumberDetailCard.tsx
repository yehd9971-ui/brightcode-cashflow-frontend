'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { NumberActivityLogDto, LeadStatus, NumberPoolStatus } from '@/types/api';
import { formatEgyptDateTime } from '@/utils/formatters';
import { X, Phone, User, Clock, Hash } from 'lucide-react';

interface NumberDetailCardProps {
  number: {
    id: string;
    phoneNumber: string;
    clientName?: string;
    totalFailedAttempts: number;
    leadStatus: LeadStatus;
    poolStatus: NumberPoolStatus;
    cooldownUntil?: string;
    frozenUntil?: string;
    firstCallDate?: string;
    notes?: string;
  };
  activityLogs: NumberActivityLogDto[];
  previousAssignees: { userId: string; email: string; date: string }[];
  onClose: () => void;
}

function getLeadStatusVariant(status: LeadStatus) {
  switch (status) {
    case LeadStatus.NEW: return 'info';
    case LeadStatus.INTERESTED: return 'warning';
    case LeadStatus.FOLLOWING_UP: return 'warning';
    case LeadStatus.SOLD: return 'success';
    case LeadStatus.NOT_INTERESTED: return 'error';
    default: return 'neutral';
  }
}

function getPoolStatusVariant(status: NumberPoolStatus) {
  switch (status) {
    case NumberPoolStatus.AVAILABLE: return 'success';
    case NumberPoolStatus.ASSIGNED: return 'info';
    case NumberPoolStatus.COOLING_DOWN: return 'warning';
    case NumberPoolStatus.FROZEN: return 'error';
    case NumberPoolStatus.ARCHIVED: return 'neutral';
    default: return 'neutral';
  }
}

export function NumberDetailCard({ number, activityLogs, previousAssignees, onClose }: NumberDetailCardProps) {
  return (
    <Card>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-indigo-600" />
            <span className="text-xl font-bold">{number.phoneNumber}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {number.clientName && <p className="text-gray-600">{number.clientName}</p>}

        <div className="flex gap-2 flex-wrap">
          <Badge variant={getLeadStatusVariant(number.leadStatus) as any}>{number.leadStatus.replace(/_/g, ' ')}</Badge>
          <Badge variant={getPoolStatusVariant(number.poolStatus) as any}>{number.poolStatus.replace(/_/g, ' ')}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span>Failed Attempts: <strong>{number.totalFailedAttempts}</strong></span>
          </div>
          {number.cooldownUntil && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Clock className="w-4 h-4" />
              <span>Cooldown until: {formatEgyptDateTime(number.cooldownUntil)}</span>
            </div>
          )}
          {number.frozenUntil && (
            <div className="flex items-center gap-2 text-red-600">
              <Clock className="w-4 h-4" />
              <span>Frozen until: {formatEgyptDateTime(number.frozenUntil)}</span>
            </div>
          )}
        </div>

        {number.notes && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">Notes</p>
            <p className="text-sm">{number.notes}</p>
          </div>
        )}

        {previousAssignees.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Previous Employees</p>
            <div className="space-y-1">
              {previousAssignees.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <User className="w-3 h-3 text-gray-400" />
                  <span>{a.email}</span>
                  <span className="text-gray-400">{formatEgyptDateTime(a.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activityLogs.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Activity Log</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="font-medium text-gray-800">{log.action}</span>
                  <span>by {log.user?.email ?? log.userId}</span>
                  <span className="text-gray-400">{formatEgyptDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
