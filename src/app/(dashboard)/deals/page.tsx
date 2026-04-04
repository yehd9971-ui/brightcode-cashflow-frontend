'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createDeal, updateDeal, getMyDeals, getMyCommission } from '@/lib/services/deals';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { ClientAutocomplete } from '@/components/ui/ClientAutocomplete';
import { ClientBalanceCard } from '@/components/ui/ClientBalanceCard';
import { DealStatus, ClientSearchResult } from '@/types/api';
import { formatAmount } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Plus, Target, TrendingUp, Pencil } from 'lucide-react';

const SERVICE_OPTIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'DESIGN', label: 'Design' },
];

function getDealStatusBadge(status: DealStatus) {
  const map: Record<string, { bg: string; label: string }> = {
    PENDING_DEAL: { bg: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    APPROVED_DEAL: { bg: 'bg-green-100 text-green-800', label: 'Approved' },
    CLOSED: { bg: 'bg-blue-100 text-blue-800', label: 'Closed' },
    LOST: { bg: 'bg-gray-100 text-gray-800', label: 'Lost' },
    REJECTED_DEAL: { bg: 'bg-red-100 text-red-800', label: 'Rejected' },
  };
  const s = map[status] || { bg: 'bg-gray-100 text-gray-800', label: status };
  return <span className={`px-2 py-1 text-xs rounded-full ${s.bg}`}>{s.label}</span>;
}

const emptyForm = { phoneNumber: '', clientName: '', clientId: '', amount: '', service: 'WEBSITE', notes: '' };

export default function DealsPage() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const now = new Date();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: deals, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-deals', page],
    queryFn: () => getMyDeals({ page, limit: 20 }),
  });

  const { data: commission } = useQuery({
    queryKey: ['my-commission', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => getMyCommission(now.getMonth() + 1, now.getFullYear()),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedClient(null);
    setEditingDealId(null);
    setShowModal(false);
  };

  const createMutation = useMutation({
    mutationFn: () => createDeal({
      phoneNumber: selectedClient?.phone || form.phoneNumber,
      clientName: form.clientName || undefined,
      clientId: selectedClient?.id || undefined,
      amount: Number(form.amount),
      service: form.service,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { toast.success('Deal created'); resetForm(); queryClient.invalidateQueries({ queryKey: ['my-deals'] }); queryClient.invalidateQueries({ queryKey: ['all-deals'] }); queryClient.invalidateQueries({ queryKey: ['approval-dashboard'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateDeal(editingDealId!, {
      phoneNumber: selectedClient?.phone || form.phoneNumber,
      clientName: form.clientName || undefined,
      clientId: selectedClient?.id || undefined,
      amount: Number(form.amount),
      service: form.service,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { toast.success('Deal updated'); resetForm(); queryClient.invalidateQueries({ queryKey: ['my-deals'] }); queryClient.invalidateQueries({ queryKey: ['all-deals'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedClient(null);
    setEditingDealId(null);
    setShowModal(true);
  };

  const openEdit = (deal: any) => {
    setForm({
      phoneNumber: deal.phoneNumber || '',
      clientName: deal.clientName || '',
      clientId: deal.clientId || '',
      amount: String(deal.amount),
      service: deal.service || 'WEBSITE',
      notes: deal.notes || '',
    });
    setSelectedClient(null);
    setEditingDealId(deal.id);
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!selectedClient && !form.phoneNumber.trim()) { toast.error('Please select a client'); return; }
    if (!form.amount) { toast.error('Amount is required'); return; }
    if (!form.service) { toast.error('Service is required'); return; }
    if (editingDealId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const canEdit = (deal: any) => {
    if (isAdmin) return true;
    return deal.userId === user?.id && deal.status === 'PENDING_DEAL';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Deals</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />New Deal</Button>
      </div>

      {commission && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Deals This Month" value={String(commission.totalDeals)} icon={<Target className="w-5 h-5" />} />
          <StatCard title="Total Amount" value={formatAmount(commission.totalAmount)} icon={<DollarSign className="w-5 h-5" />} />
          <StatCard title="Commission" value={formatAmount(commission.totalCommission)} icon={<TrendingUp className="w-5 h-5" />} />
        </div>
      )}

      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <ErrorState message="Unable to load data" onRetry={refetch} />
      ) : !deals || deals.data.length === 0 ? (
        <EmptyState title="No deals yet" description="Create your first deal." action={<Button onClick={openCreate}>New Deal</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deals.data.map((deal) => (
                  <tr key={deal.id}>
                    <td className="px-4 py-3 text-sm">{deal.phoneNumber || '-'}{deal.clientName ? ` (${deal.clientName})` : ''}</td>
                    <td className="px-4 py-3 text-sm">{deal.service}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatAmount(deal.amount)}</td>
                    <td className="px-4 py-3">{getDealStatusBadge(deal.status)}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{deal.commissionAmount ? formatAmount(deal.commissionAmount) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(deal.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {canEdit(deal) && (
                        <button onClick={() => openEdit(deal)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit" aria-label="Edit deal">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deals.total > 20 && <Pagination currentPage={page} totalPages={Math.ceil(deals.total / 20)} onPageChange={setPage} />}
        </Card>
      )}

      <Modal isOpen={showModal} onClose={resetForm} title={editingDealId ? 'Edit Deal' : 'New Deal'}>
        <div className="space-y-4">
          {/* Client Search */}
          <ClientAutocomplete
            label="Customer"
            value={selectedClient}
            onChange={(client) => {
              setSelectedClient(client);
              if (client) {
                setForm({ ...form, phoneNumber: client.phone || '', clientName: client.name, clientId: client.id });
              } else {
                setForm({ ...form, phoneNumber: '', clientName: '', clientId: '' });
              }
            }}
            required
          />

          {/* Balance Card */}
          {selectedClient && <ClientBalanceCard clientId={selectedClient.id} />}

          {/* Customer Name (auto-filled) */}
          <Input
            label="Customer Name"
            value={form.clientName}
            onChange={(e) => { if (!selectedClient) setForm({ ...form, clientName: e.target.value }); }}
            disabled={!!selectedClient}
          />

          {/* Amount */}
          <Input label="Amount (EGP)" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min={0.01} step={0.01} />

          {/* Service Dropdown */}
          <Select
            label="Service/Product"
            required
            options={SERVICE_OPTIONS}
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
          />

          {/* Notes */}
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <Button
            onClick={handleSubmit}
            loading={createMutation.isPending || updateMutation.isPending}
            fullWidth
          >
            {editingDealId ? 'Update Deal' : 'Create Deal'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
