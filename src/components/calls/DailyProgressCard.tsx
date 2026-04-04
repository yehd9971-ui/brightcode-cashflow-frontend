'use client';

import { Phone, Clock, PhoneIncoming, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DailyCallStatsDto } from '@/types/api';
import { cn } from '@/utils/cn';

interface DailyProgressCardProps {
  stats: DailyCallStatsDto;
}

export function DailyProgressCard({ stats }: DailyProgressCardProps) {
  const dynamicTarget = stats.dynamicCallTarget || 50;
  const targetLabel = dynamicTarget === 10
    ? 'Target: 10 \u2014 60min talk + 10 answered'
    : dynamicTarget === 25
    ? 'Target: 25 \u2014 60min talk time reached'
    : 'Target: 50 (default)';

  const metrics = [
    { label: 'Total Calls', value: stats.totalCalls, target: dynamicTarget, icon: Phone, color: 'blue', hint: targetLabel },
    { label: 'Talk Time', value: stats.totalTalkMinutes, target: 60, icon: Clock, color: 'purple', suffix: 'min' },
    { label: 'Answered', value: stats.answeredCalls, target: 10, icon: PhoneIncoming, color: 'green' },
    { label: 'Completion', value: Math.round(stats.completionPercent), target: 100, icon: TrendingUp, color: 'amber', suffix: '%', isPercent: true },
  ];

  const colorMap: Record<string, { bg: string; bar: string; text: string }> = {
    blue: { bg: 'bg-blue-50', bar: 'bg-blue-500', text: 'text-blue-700' },
    purple: { bg: 'bg-purple-50', bar: 'bg-purple-500', text: 'text-purple-700' },
    green: { bg: 'bg-green-50', bar: 'bg-green-500', text: 'text-green-700' },
    amber: { bg: 'bg-amber-50', bar: 'bg-amber-500', text: 'text-amber-700' },
  };

  return (
    <div className="space-y-2">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((metric) => {
        const colors = colorMap[metric.color];
        const Icon = metric.icon;
        const progress = Math.min((metric.value / metric.target) * 100, 100);

        return (
          <Card key={metric.label} className={cn('p-4', colors.bg)}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn('w-4 h-4', colors.text)} />
              <span className="text-xs font-medium text-gray-600">{metric.label}</span>
            </div>
            <p className={cn('text-2xl font-bold', colors.text)}>
              {metric.isPercent ? `${metric.value}%` : metric.value}
              {!metric.isPercent && (
                <span className="text-sm font-normal text-gray-500">/{metric.target}{metric.suffix ? ` ${metric.suffix}` : ''}</span>
              )}
            </p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', colors.bar)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </Card>
        );
      })}
    </div>
    <p className="text-xs font-medium text-gray-500 px-1">{targetLabel}</p>
    </div>
  );
}
