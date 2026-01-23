'use client';

import { Clock, CheckCircle, XCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { TransactionStatus, TransactionType } from '@/types/api';
import { cn } from '@/utils/cn';

export interface StatusBadgeProps {
  status: TransactionStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const configs = {
    [TransactionStatus.PENDING]: {
      icon: Clock,
      text: 'Pending',
      className: 'bg-yellow-100 text-yellow-800',
    },
    [TransactionStatus.APPROVED]: {
      icon: CheckCircle,
      text: 'Approved',
      className: 'bg-green-100 text-green-800',
    },
    [TransactionStatus.REJECTED]: {
      icon: XCircle,
      text: 'Rejected',
      className: 'bg-red-100 text-red-800',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        config.className,
        sizes[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
}

export interface TypeBadgeProps {
  type: TransactionType;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const configs = {
    [TransactionType.IN]: {
      icon: ArrowDownCircle,
      text: 'IN',
      className: 'bg-green-100 text-green-800',
    },
    [TransactionType.OUT]: {
      icon: ArrowUpCircle,
      text: 'OUT',
      className: 'bg-red-100 text-red-800',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        config.className,
        sizes[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
}
