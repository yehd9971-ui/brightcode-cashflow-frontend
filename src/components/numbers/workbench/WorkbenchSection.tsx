'use client';

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/Loading';

interface WorkbenchSectionProps {
  title: string;
  count: number;
  testId: string;
  tone?: 'red' | 'blue' | 'amber' | 'green' | 'gray';
  isLoading?: boolean;
  isError?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: ReactNode;
}

const toneClass = {
  red: 'border-red-200',
  blue: 'border-blue-200',
  amber: 'border-amber-200',
  green: 'border-green-200',
  gray: 'border-gray-200',
};

export function WorkbenchSection({
  title,
  count,
  testId,
  tone = 'gray',
  isLoading,
  isError,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: WorkbenchSectionProps) {
  return (
    <section data-testid={testId}>
      <Card
        padding="none"
        className={toneClass[tone]}
        title={title}
        actions={<Badge variant={count > 0 ? 'info' : 'neutral'}>{count}</Badge>}
      >
        {isLoading ? (
          <div className="p-4">
            <CardSkeleton />
          </div>
        ) : isError ? (
          <div className="p-4">
            <ErrorState
              message={`Unable to load ${title.toLowerCase()}`}
              onRetry={onRetry}
            />
          </div>
        ) : count === 0 ? (
          <div className="p-4">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">{children}</div>
        )}
      </Card>
    </section>
  );
}
