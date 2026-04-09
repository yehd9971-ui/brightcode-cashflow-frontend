'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, PhoneCall } from 'lucide-react';
import toast from 'react-hot-toast';
import { searchNumbers } from '@/lib/services/client-numbers';
import { startCall } from '@/lib/services/users';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ClientNumberDto } from '@/types/api';

const leadStatusBadge: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'error' | 'neutral' }> = {
  NEW: { label: 'New', variant: 'info' },
  INTERESTED: { label: 'Interested', variant: 'success' },
  HOT_LEAD: { label: 'Hot Lead', variant: 'warning' },
  FOLLOWING_UP: { label: 'Following Up', variant: 'warning' },
  SOLD: { label: 'Sold', variant: 'success' },
  NOT_INTERESTED: { label: 'Not Interested', variant: 'error' },
};

export function NumberSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientNumberDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchNumbers(query);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleCall = async (phoneNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await startCall(phoneNumber);
      window.open(`tel:${phoneNumber}`, '_self');
      setTimeout(() => {
        router.push(`/calls/new?phone=${encodeURIComponent(phoneNumber)}`);
      }, 500);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start call');
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0 && query.length >= 2) setIsOpen(true); }}
          placeholder="Search any number by phone or name..."
          className="block w-full ps-10 pe-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {isLoading && (
          <div className="absolute end-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.map((num) => {
            const badge = leadStatusBadge[num.leadStatus] ?? { label: num.leadStatus, variant: 'neutral' as const };
            const assignee = num.currentAssignee?.email;
            return (
              <div
                key={num.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-gray-900">{num.phoneNumber}</span>
                    {num.clientName && (
                      <span className="text-sm text-gray-600 truncate">{num.clientName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    <span className="text-xs text-gray-400">
                      {assignee ? `Assigned to: ${assignee}` : num.poolStatus === 'AVAILABLE' ? 'Available' : num.poolStatus.replace('_', ' ').toLowerCase()}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => handleCall(num.phoneNumber, e)}
                >
                  <PhoneCall className="w-4 h-4 mr-1" /> Call
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
          No numbers found
        </div>
      )}
    </div>
  );
}
