'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = 'Unable to load data',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <p className="text-gray-700 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="primary" size="sm">
          Try again
        </Button>
      )}
    </div>
  );
}
