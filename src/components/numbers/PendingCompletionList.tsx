'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Clock, CheckCircle, Phone } from 'lucide-react';

interface PendingNumber {
  id: string;
  phoneNumber: string;
  clientName?: string;
  firstCallDate: string;
  ready: boolean;
  minutesRemaining: number;
}

interface PendingCompletionListProps {
  numbers: PendingNumber[];
  onComplete: (numberId: string) => void;
}

function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'Ready';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

export function PendingCompletionList({ numbers, onComplete }: PendingCompletionListProps) {
  if (numbers.length === 0) {
    return null;
  }

  const readyNumbers = numbers.filter((n) => n.ready);
  const waitingNumbers = numbers.filter((n) => !n.ready);

  return (
    <div className="space-y-4">
      {readyNumbers.length > 0 && (
        <Card title="Ready for Completion">
          <div className="divide-y divide-gray-100">
            {readyNumbers.map((num) => (
              <div key={num.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span className="font-medium">{num.phoneNumber}</span>
                    </div>
                    {num.clientName && <p className="text-xs text-gray-500">{num.clientName}</p>}
                  </div>
                </div>
                <Button size="sm" onClick={() => onComplete(num.id)}>Complete Now</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {waitingNumbers.length > 0 && (
        <Card title="Waiting for Completion">
          <div className="divide-y divide-gray-100">
            {waitingNumbers.map((num) => (
              <div key={num.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span className="font-medium">{num.phoneNumber}</span>
                    </div>
                    {num.clientName && <p className="text-xs text-gray-500">{num.clientName}</p>}
                  </div>
                </div>
                <span className="text-sm text-yellow-600 font-medium">{formatTimeRemaining(num.minutesRemaining)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
