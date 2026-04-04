'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getClients, createClient } from '@/lib/services/clients';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import type { CreateClientDto, ClientDto } from '@/types/api';
import { formatEgyptDateTime, formatAmount } from '@/utils/formatters';
import { Plus, Search, User, ClipboardCopy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

const SERVICE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'DESIGN', label: 'Design' },
];

export default function ClientsPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateClientDto>({ name: '', phone: '' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clients', page, search, serviceFilter],
    queryFn: () => getClients({ page, limit: 20, search: search || undefined, service: serviceFilter || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      toast.success('Client created');
      setShowCreate(false);
      setForm({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const copyAllPhones = () => {
    if (!data?.data || data.data.length === 0) return;
    const phones = data.data.map((c: ClientDto) => c.phone).filter(Boolean).join('\n');
    if (!phones) { toast.error('No phone numbers to copy'); return; }
    navigator.clipboard.writeText(phones);
    toast.success(`${phones.split('\n').length} phone numbers copied`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <div className="flex items-center gap-2">
          {data?.data && data.data.length > 0 && (
            <Button variant="outline" onClick={copyAllPhones}>
              <ClipboardCopy className="w-4 h-4 mr-1" /> Copy All Numbers
            </Button>
          )}
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Add Client</Button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search clients"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {isAdmin && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {SERVICE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setServiceFilter(f.value); setPage(1); }}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  serviceFilter === f.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <ErrorState message="Unable to load data" onRetry={refetch} />
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {data?.data.map((client: ClientDto) => (
              <button
                key={client.id}
                onClick={() => router.push(`/clients/${client.id}`)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-600">{client.clientCode}</span>
                      <p className="font-medium">{client.name}</p>
                    </div>
                    <p className="text-xs text-gray-500">{[client.phone, client.email, client.company].filter(Boolean).join(' - ') || 'No details'}</p>
                    {client.websites && client.websites.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {client.websites.map((w: any, i: number) => (
                          <span key={i} className="text-xs text-indigo-500">{w.url}{i < client.websites!.length - 1 ? ',' : ''}</span>
                        ))}
                      </div>
                    )}
                    {client.balance?.visible && client.balance.totalDealAmount > 0 && (
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-gray-500">Agreed: <span className="font-medium text-gray-700">{formatAmount(client.balance.totalDealAmount)}</span></span>
                        <span className="text-gray-500">Paid: <span className="font-medium text-gray-700">{formatAmount(client.balance.totalPaid)}</span></span>
                        <span className={`font-medium ${
                          client.balance.remainingBalance <= 0
                            ? 'text-green-600'
                            : client.balance.totalPaid > 0
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}>
                          Remaining: {formatAmount(Math.abs(client.balance.remainingBalance))}
                          {client.balance.remainingBalance <= 0 && ' (Paid)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatEgyptDateTime(client.createdAt)}</span>
              </button>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <p className="p-4 text-gray-500 text-center">No clients found.</p>
            )}
          </div>
          {data && data.total > 20 && (
            <div className="p-4"><Pagination currentPage={page} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} /></div>
          )}
        </Card>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Client">
        <div className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Phone" type="tel" required placeholder="01090353648" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Company" value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <Textarea label="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <p className="text-xs text-gray-500">Client code will be auto-generated (e.g., CLT-0001)</p>
          <Button onClick={() => { if (!form.name.trim() || !form.phone?.trim()) { toast.error('Name and phone are required'); return; } createMutation.mutate(form); }} loading={createMutation.isPending} fullWidth>Create</Button>
        </div>
      </Modal>
    </div>
  );
}
