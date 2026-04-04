'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientBalance } from '@/lib/services/clients';
import { formatAmount } from '@/utils/formatters';
import { cn } from '@/utils/cn';

interface ClientBalanceCardProps {
  clientId: string;
}

export function ClientBalanceCard({ clientId }: ClientBalanceCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['client-balance', clientId],
    queryFn: () => getClientBalance(clientId),
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  const { totalDealAmount, totalPaid, remainingBalance, services } = data;

  const statusColor = remainingBalance <= 0
    ? 'border-green-200 bg-green-50'
    : totalPaid > 0
      ? 'border-yellow-200 bg-yellow-50'
      : 'border-red-200 bg-red-50';

  const balanceColor = remainingBalance <= 0
    ? 'text-green-700'
    : 'text-red-700';

  return (
    <div className={cn('p-3 border rounded-lg', statusColor)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase">Client Balance</span>
        {services.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {services.map((s) => (
              <span key={s} className="px-1.5 py-0.5 text-xs bg-white/70 text-gray-600 rounded">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-gray-500 block text-xs">Total Agreed</span>
          <span className="font-semibold text-gray-900">{formatAmount(totalDealAmount)}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">Total Paid</span>
          <span className="font-semibold text-gray-900">{formatAmount(totalPaid)}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">Remaining</span>
          <span className={cn('font-semibold', balanceColor)}>
            {formatAmount(Math.abs(remainingBalance))}
            {remainingBalance <= 0 && totalDealAmount > 0 && ' (Paid)'}
          </span>
        </div>
      </div>
    </div>
  );
}
