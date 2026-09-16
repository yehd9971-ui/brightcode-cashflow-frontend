'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall } from 'lucide-react';
import { getMyCallStatus } from '@/lib/services/users';

const GRACE_MINUTES = 3;

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function ActiveCallBanner() {
  const { data: callStatus } = useQuery({
    queryKey: ['my-call-status', 'banner'],
    queryFn: getMyCallStatus,
    refetchInterval: 15000,
  });

  const [now, setNow] = useState(() => Date.now());

  const isOnCall = callStatus?.currentStatus === 'ON_CALL' && Boolean(callStatus?.currentCallPhone);

  useEffect(() => {
    if (!isOnCall) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOnCall]);

  const elapsedSeconds = callStatus?.callStartedAt
    ? Math.max(0, Math.floor((now - new Date(callStatus.callStartedAt).getTime()) / 1000))
    : 0;

  if (!isOnCall || !callStatus?.currentCallPhone) {
    return null;
  }

  const overGrace = elapsedSeconds > GRACE_MINUTES * 60;

  return (
    <div
      data-testid="active-call-banner"
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b px-4 py-2 text-sm font-medium ${
        overGrace
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <PhoneCall className="h-4 w-4 animate-pulse" aria-hidden />
        Active call on {callStatus.currentCallPhone} — {formatElapsed(elapsedSeconds)} elapsed
        {overGrace ? ' — late-report penalty accruing' : ''}
      </span>
      <Link
        href={`/calls/new?phone=${encodeURIComponent(callStatus.currentCallPhone)}`}
        className={`rounded-md px-3 py-1 text-xs font-semibold text-white ${
          overGrace ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
        }`}
      >
        Complete report
      </Link>
    </div>
  );
}
