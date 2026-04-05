'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getPortfolio } from '@/lib/services/client-websites';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import type { ClientWebsiteDto } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Globe, Copy, Search, ClipboardCopy } from 'lucide-react';

export default function PortfolioPage() {
  const [search, setSearch] = useState('');

  const { data: websites, isLoading, isError, refetch } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
  });

  const filtered = websites?.filter((w: ClientWebsiteDto) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return w.url.toLowerCase().includes(s) || (w.client?.name || '').toLowerCase().includes(s);
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied');
  };

  const copyAllUrls = () => {
    if (!filtered || filtered.length === 0) return;
    const allUrls = filtered.map((w: ClientWebsiteDto, i: number) => `${i + 1}. ${w.url}`).join('\n');
    navigator.clipboard.writeText(allUrls);
    toast.success(`${filtered.length} URLs copied`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
        {filtered && filtered.length > 0 && (
          <Button variant="outline" onClick={copyAllUrls}>
            <ClipboardCopy className="w-4 h-4 mr-2" /> Copy All Websites
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by client name or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search websites"
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <ErrorState message="Unable to load data" onRetry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((w: ClientWebsiteDto) => (
              <Card key={w.id}>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-indigo-600" />
                      <Badge variant="success">ACTIVE</Badge>
                    </div>
                    <button onClick={() => copyUrl(w.url)} className="text-gray-400 hover:text-gray-600" aria-label="Copy URL">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium block truncate">
                    {w.url}
                  </a>
                  {w.client && <p className="text-sm text-gray-500">{w.client.name}</p>}
                  {w.domainRenewalDate && (
                    <p className="text-xs text-gray-400">Renews: {new Date(w.domainRenewalDate).toLocaleDateString('en-GB')}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {(!filtered || filtered.length === 0) && (
            <p className="text-center text-gray-500 py-8">No active websites in the portfolio.</p>
          )}
        </>
      )}
    </div>
  );
}
