'use client';

import { Phone, PhoneOff, PhoneMissed, Clock, CheckCircle, XCircle } from 'lucide-react';
import { CallStatus, CallApprovalStatus, CallTaskStatus } from '@/types/api';
import { cn } from '@/utils/cn';

interface CallStatusBadgeProps {
  status: CallStatus;
  size?: 'sm' | 'md';
}

export function CallStatusBadge({ status, size = 'md' }: CallStatusBadgeProps) {
  const configs = {
    [CallStatus.ANSWERED]: { icon: Phone, text: 'Answered', className: 'bg-green-100 text-green-800' },
    [CallStatus.NOT_ANSWERED]: { icon: PhoneOff, text: 'Not Answered', className: 'bg-red-100 text-red-800' },
    [CallStatus.SUPERSEDED]: { icon: PhoneMissed, text: 'Superseded', className: 'bg-gray-100 text-gray-600' },
  };
  const config = configs[status];
  const Icon = config.icon;
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
  const iconSizes = { sm: 'w-3 h-3', md: 'w-4 h-4' };

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium rounded-full', config.className, sizes[size])}>
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
}

interface ApprovalStatusBadgeProps {
  status: CallApprovalStatus;
  size?: 'sm' | 'md';
}

export function ApprovalStatusBadge({ status, size = 'md' }: ApprovalStatusBadgeProps) {
  const configs = {
    [CallApprovalStatus.PENDING]: { icon: Clock, text: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
    [CallApprovalStatus.APPROVED]: { icon: CheckCircle, text: 'Approved', className: 'bg-green-100 text-green-800' },
    [CallApprovalStatus.REJECTED]: { icon: XCircle, text: 'Rejected', className: 'bg-red-100 text-red-800' },
  };
  const config = configs[status];
  const Icon = config.icon;
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
  const iconSizes = { sm: 'w-3 h-3', md: 'w-4 h-4' };

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium rounded-full', config.className, sizes[size])}>
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
}

interface TaskStatusBadgeProps {
  status: CallTaskStatus;
  size?: 'sm' | 'md';
}

export function TaskStatusBadge({ status, size = 'md' }: TaskStatusBadgeProps) {
  const configs = {
    [CallTaskStatus.PENDING]: { icon: Clock, text: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
    [CallTaskStatus.COMPLETED]: { icon: CheckCircle, text: 'Completed', className: 'bg-green-100 text-green-800' },
    [CallTaskStatus.REJECTED]: { icon: XCircle, text: 'Rejected', className: 'bg-red-100 text-red-800' },
    [CallTaskStatus.OVERDUE]: { icon: Clock, text: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  };
  const config = configs[status];
  const Icon = config.icon;
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
  const iconSizes = { sm: 'w-3 h-3', md: 'w-4 h-4' };

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium rounded-full', config.className, sizes[size])}>
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
}
