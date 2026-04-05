'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { getClientById, updateClient } from '@/lib/services/clients';
import { addWebsite, updateWebsite, getClientWebsites } from '@/lib/services/client-websites';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import type { CreateClientWebsiteDto, UpdateClientWebsiteDto, ClientWebsiteDto, UpdateClientDto } from '@/types/api';
import { formatEgyptDateTime } from '@/utils/formatters';
import { Globe, Phone, DollarSign, Plus, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function calcRenewalDate(startDate: string): string {
  const d = new Date(startDate);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isSalesManager } = useAuth();
  const canViewWebsites = isAdmin || isSalesManager;
  const queryClient = useQueryClient();

  // Website modal
  const [showAddWebsite, setShowAddWebsite] = useState(false);
  const [websiteForm, setWebsiteForm] = useState<CreateClientWebsiteDto & { startDate?: string }>({ url: '' });

  // Edit client modal
  const [showEditClient, setShowEditClient] = useState(false);
  const [editForm, setEditForm] = useState<UpdateClientDto>({});

  // Edit website modal
  const [showEditWebsite, setShowEditWebsite] = useState(false);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);
  const [editWebsiteForm, setEditWebsiteForm] = useState<UpdateClientWebsiteDto & { startDate?: string }>({});

  const { data: client, isLoading, isError, refetch } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClientById(id),
    enabled: !!id,
  });

  const { data: websites } = useQuery({
    queryKey: ['client-websites', id],
    queryFn: () => getClientWebsites(id),
    enabled: !!id && canViewWebsites,
  });

  const addWebsiteMutation = useMutation({
    mutationFn: (data: CreateClientWebsiteDto) => addWebsite(id, data),
    onSuccess: () => {
      toast.success('Website added');
      setShowAddWebsite(false);
      setWebsiteForm({ url: '' });
      queryClient.invalidateQueries({ queryKey: ['client-websites', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateWebsiteMutation = useMutation({
    mutationFn: ({ wId, data }: { wId: string; data: UpdateClientWebsiteDto }) => updateWebsite(wId, data),
    onSuccess: () => {
      toast.success('Website updated');
      setShowEditWebsite(false);
      setEditingWebsiteId(null);
      queryClient.invalidateQueries({ queryKey: ['client-websites', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateClientDto) => updateClient(id, data),
    onSuccess: () => {
      toast.success('Client updated');
      setShowEditClient(false);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const openEditClient = () => {
    if (!client) return;
    setEditForm({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      company: client.company || '',
      notes: client.notes || '',
    });
    setShowEditClient(true);
  };

  const buildUpdatePayload = (form: UpdateClientDto): UpdateClientDto => {
    const payload: UpdateClientDto = {};
    if (form.name?.trim()) payload.name = form.name.trim();
    if (form.phone?.trim()) payload.phone = form.phone.trim();
    if (form.email?.trim()) payload.email = form.email.trim();
    if (form.company?.trim()) payload.company = form.company.trim();
    if (form.notes?.trim()) payload.notes = form.notes.trim();
    return payload;
  };

  const openEditWebsite = (w: ClientWebsiteDto) => {
    setEditingWebsiteId(w.id);
    setEditWebsiteForm({
      url: w.url,
      notes: w.notes || '',
    });
    setShowEditWebsite(true);
  };

  const handleSaveWebsite = () => {
    if (!editingWebsiteId) return;
    const data: UpdateClientWebsiteDto = {
      url: editWebsiteForm.url,
      notes: editWebsiteForm.notes,
    };
    if (editWebsiteForm.startDate) {
      data.domainRenewalDate = calcRenewalDate(editWebsiteForm.startDate);
    }
    updateWebsiteMutation.mutate({ wId: editingWebsiteId, data });
  };

  const handleAddWebsite = () => {
    if (!websiteForm.url.trim()) {
      toast.error('URL is required');
      return;
    }
    const data: CreateClientWebsiteDto = {
      url: websiteForm.url,
      notes: websiteForm.notes,
    };
    // Auto-calculate renewal date: start date + 1 year - 1 day
    if (websiteForm.startDate) {
      data.domainRenewalDate = calcRenewalDate(websiteForm.startDate);
    }
    addWebsiteMutation.mutate(data);
  };

  if (isLoading) return <CardSkeleton />;
  if (isError) return <ErrorState message="Unable to load data" onRetry={refetch} />;
  if (!client) return <ErrorState message="Client not found" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={openEditClient}>
            <Pencil className="w-4 h-4 mr-1" /> Edit Client
          </Button>
        )}
      </div>

      {/* Client Info */}
      <Card title="Client Information">
        <div className="p-4 grid grid-cols-2 gap-4">
          <div><p className="text-sm text-gray-500">Client Code</p><p className="font-mono text-blue-600">{client.clientCode}</p></div>
          <div><p className="text-sm text-gray-500">Phone</p><p>{client.phone || '-'}</p></div>
          <div><p className="text-sm text-gray-500">Email</p><p>{client.email || '-'}</p></div>
          <div><p className="text-sm text-gray-500">Company</p><p>{client.company || '-'}</p></div>
          <div><p className="text-sm text-gray-500">Created</p><p>{formatEgyptDateTime(client.createdAt)}</p></div>
          {client.notes && <div className="col-span-2"><p className="text-sm text-gray-500">Notes</p><p>{client.notes}</p></div>}
        </div>
      </Card>

      {/* Phone Numbers */}
      {client.clientNumbers && client.clientNumbers.length > 0 && (
        <Card title={`Phone Numbers (${client.clientNumbers.length})`}>
          <div className="divide-y divide-gray-100">
            {client.clientNumbers.map((num: any) => (
              <div key={num.id} className="flex items-center gap-3 p-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{num.phoneNumber}</span>
                <Badge variant={num.poolStatus === 'AVAILABLE' ? 'success' : 'info'}>{num.poolStatus}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Websites (ADMIN/SALES_MANAGER only) */}
      {canViewWebsites && <Card title={`Websites (${websites?.length ?? 0})`}>
        {isAdmin && (
          <div className="p-4">
            <Button variant="outline" size="sm" onClick={() => setShowAddWebsite(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Website
            </Button>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {websites?.map((w: ClientWebsiteDto) => (
            <div key={w.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <div>
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{w.url}</a>
                  {w.domainRenewalDate && (
                    <p className="text-xs text-gray-500">Expires: {new Date(w.domainRenewalDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={w.status === 'ACTIVE' ? 'success' : w.status === 'EXPIRED' ? 'error' : 'neutral'}>
                  {w.status}
                </Badge>
                {isAdmin && (
                  <button onClick={() => openEditWebsite(w)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit website" aria-label="Edit website">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>}

      {/* Transactions */}
      {client.transactions && client.transactions.length > 0 && (
        <Card title={`Recent Transactions (${client.transactions.length})`}>
          <div className="divide-y divide-gray-100">
            {client.transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{tx.description || tx.txNumber}</p>
                    <p className="text-xs text-gray-500">{formatEgyptDateTime(tx.createdAt)}</p>
                  </div>
                </div>
                <span className={`font-medium ${tx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'IN' ? '+' : '-'}{tx.amount} EGP
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Edit Client Modal */}
      <Modal isOpen={showEditClient} onClose={() => setShowEditClient(false)} title="Edit Client">
        <div className="space-y-4">
          <Input label="Name" required value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Phone" required type="tel" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <Input label="Email" type="email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <Input label="Company" value={editForm.company || ''} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
          <Textarea label="Notes" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          <Button
            onClick={() => {
              if (!editForm.name?.trim()) { toast.error('Name is required'); return; }
              updateMutation.mutate(buildUpdatePayload(editForm));
            }}
            loading={updateMutation.isPending}
            fullWidth
          >
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* Edit Website Modal */}
      <Modal isOpen={showEditWebsite} onClose={() => setShowEditWebsite(false)} title="Edit Website">
        <div className="space-y-4">
          <Input label="URL" required value={editWebsiteForm.url || ''} onChange={(e) => setEditWebsiteForm({ ...editWebsiteForm, url: e.target.value })} placeholder="https://example.com" />
          <Input
            label="New Start Date (optional)"
            type="date"
            value={editWebsiteForm.startDate || ''}
            onChange={(e) => setEditWebsiteForm({ ...editWebsiteForm, startDate: e.target.value })}
            helperText={editWebsiteForm.startDate ? `New expiry: ${new Date(calcRenewalDate(editWebsiteForm.startDate)).toLocaleDateString()}` : 'Leave empty to keep current expiry date'}
          />
          <Input label="Notes" value={editWebsiteForm.notes || ''} onChange={(e) => setEditWebsiteForm({ ...editWebsiteForm, notes: e.target.value })} />
          <Button onClick={handleSaveWebsite} loading={updateWebsiteMutation.isPending} fullWidth>Save Changes</Button>
        </div>
      </Modal>

      {/* Add Website Modal */}
      <Modal isOpen={showAddWebsite} onClose={() => setShowAddWebsite(false)} title="Add Website">
        <div className="space-y-4">
          <Input label="URL" required value={websiteForm.url} onChange={(e) => setWebsiteForm({ ...websiteForm, url: e.target.value })} placeholder="https://example.com" />
          <Input
            label="Start Date"
            type="date"
            value={websiteForm.startDate || ''}
            onChange={(e) => setWebsiteForm({ ...websiteForm, startDate: e.target.value })}
            helperText={websiteForm.startDate ? `Expires: ${new Date(calcRenewalDate(websiteForm.startDate)).toLocaleDateString()}` : 'Expiry = start date + 1 year - 1 day'}
          />
          <Input label="Notes" value={websiteForm.notes || ''} onChange={(e) => setWebsiteForm({ ...websiteForm, notes: e.target.value })} />
          <Button onClick={handleAddWebsite} loading={addWebsiteMutation.isPending} fullWidth>Add</Button>
        </div>
      </Modal>
    </div>
  );
}
