'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  closeCrmTask,
  createCrmLeadTask,
  deleteCrmLead,
  getCrmLead,
  getCrmLeadTimeline,
  updateCrmLeadStage,
} from '@/lib/services/crm';
import { getMyCallStatus, startCall } from '@/lib/services/users';
import { CRM_PIPELINE_STAGES, crmStageLabel } from '@/lib/crm-stages';
import {
  CallTaskStatus,
  CreateCrmLeadTaskDto,
  CrmLeadDetailResponseDto,
  CrmStage,
  CrmTaskSummaryDto,
  CrmTimelineItemDto,
} from '@/types/api';
import { cn } from '@/utils/cn';

interface LeadDetailDrawerProps {
  leadId: string | null;
  stages?: CrmStage[];
  onClose: () => void;
  onDeleted?: () => void;
}

const TIMELINE_QUERY = { page: 1, limit: 50, order: 'desc' as const };

function stageLabel(stage?: CrmStage | string) {
  if (!stage) return 'Unknown';
  if (stage === CrmStage.NOT_ANSWERED || stage === 'NOT_ANSWERED') return crmStageLabel(stage);
  return String(stage).replace(/_/g, ' ');
}

function priorityLabel(priority?: number) {
  if (!priority) return 'Normal';
  return ({ 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' } as Record<number, string>)[priority] ?? `P${priority}`;
}

function formatDate(value?: string) {
  if (!value) return 'None';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Date(timestamp).toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function egyptDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function defaultTaskTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(Date.now() + 60 * 60 * 1000));
}

function isOpenTask(task?: CrmTaskSummaryDto) {
  if (!task) return false;
  if (task.closedAt || task.completedAt) return false;
  return task.status !== CallTaskStatus.COMPLETED && task.status !== CallTaskStatus.REJECTED;
}

function eventVariant(event: string) {
  if (event.includes('COMPLETED') || event.includes('SOLD')) return 'success' as const;
  if (event.includes('CLOSED') || event.includes('LOST') || event.includes('NOT_ANSWERED')) return 'error' as const;
  if (event.includes('TASK') || event.includes('FOLLOWUP')) return 'warning' as const;
  return 'info' as const;
}

function invalidateLeadQueries(queryClient: ReturnType<typeof useQueryClient>, leadId?: string | null) {
  if (leadId) {
    queryClient.invalidateQueries({ queryKey: ['crm', 'lead-detail', leadId] });
    queryClient.invalidateQueries({ queryKey: ['crm', 'lead-timeline', leadId] });
  }
  queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] });
  queryClient.invalidateQueries({ queryKey: ['crm', 'leads', 'pipeline'] });
  queryClient.invalidateQueries({ queryKey: ['call-tasks', 'open'] });
}

function updateCachedStage(
  queryClient: ReturnType<typeof useQueryClient>,
  leadId: string,
  stage: CrmStage,
  extras?: Partial<CrmLeadDetailResponseDto>,
) {
  queryClient.setQueryData<CrmLeadDetailResponseDto>(
    ['crm', 'lead-detail', leadId],
    (current) => current ? { ...current, ...extras, stage, crmStage: stage } : current,
  );
}

function TimelineItem({ item }: { item: CrmTimelineItemDto }) {
  const actor = item.actor || item.user;
  const details = item.details ?? {};
  const notes = typeof details.notes === 'string' ? details.notes.trim() : '';
  const closedReason =
    typeof details.closedReason === 'string' ? details.closedReason.trim() : '';

  return (
    <li
      data-testid="lead-detail-timeline-item"
      data-event={item.event}
      className="rounded-lg border border-gray-200 bg-white px-3 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={eventVariant(item.event)} size="sm">
          {stageLabel(item.event)}
        </Badge>
        <span className="text-xs text-gray-500">{formatDate(item.occurredAtEgypt || item.occurredAt)}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-gray-900">{item.title}</p>
      {item.rawAction && item.rawAction !== item.event && (
        <p className="mt-1 text-xs text-gray-500">Raw: {item.rawAction}</p>
      )}
      {actor?.email && (
        <p className="mt-1 text-xs text-gray-500">Actor: {actor.email}</p>
      )}
      {notes && (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Notes:</span> {notes}
        </p>
      )}
      {closedReason && (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Closed reason:</span> {closedReason}
        </p>
      )}
    </li>
  );
}

export function LeadDetailDrawer({
  leadId,
  stages = CRM_PIPELINE_STAGES,
  onClose,
  onDeleted,
}: LeadDetailDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, isSalesManager } = useAuth();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskDate, setTaskDate] = useState(egyptDate(1));
  const [taskTime, setTaskTime] = useState(defaultTaskTime());
  const [taskNotes, setTaskNotes] = useState('');
  const [lostOpen, setLostOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [closingTask, setClosingTask] = useState<CrmTaskSummaryDto | null>(null);
  const [closedReason, setClosedReason] = useState('');

  const canManageTasks = isAdmin || isSalesManager;

  const detailQuery = useQuery({
    queryKey: ['crm', 'lead-detail', leadId],
    queryFn: () => getCrmLead(leadId as string),
    enabled: Boolean(leadId),
  });

  const timelineQuery = useQuery({
    queryKey: ['crm', 'lead-timeline', leadId, TIMELINE_QUERY],
    queryFn: () => getCrmLeadTimeline(leadId as string, TIMELINE_QUERY),
    enabled: Boolean(leadId),
  });

  const { data: callStatus } = useQuery({
    queryKey: ['my-call-status', 'lead-detail'],
    queryFn: getMyCallStatus,
    enabled: Boolean(leadId),
  });

  const lead = detailQuery.data;
  const nextTask = useMemo(
    () => lead?.nextOpenTask || lead?.recentTasks?.find(isOpenTask),
    [lead?.nextOpenTask, lead?.recentTasks],
  );
  const isOnCall = callStatus?.currentStatus === 'ON_CALL';
  const activeCallPhone = callStatus?.currentCallPhone || '';
  const isSameActiveCall = Boolean(lead?.phoneNumber && activeCallPhone === lead.phoneNumber);
  const callDisabled = isOnCall && !isSameActiveCall;

  useEffect(() => {
    if (!leadId) {
      setCreateTaskOpen(false);
      setLostOpen(false);
      setDeleteOpen(false);
      setClosingTask(null);
      return;
    }

    setTaskDate(egyptDate(1));
    setTaskTime(defaultTaskTime());
    setTaskNotes('');
    setLostReason('');
    setClosedReason('');
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [leadId, onClose]);

  const stageMutation = useMutation({
    mutationFn: ({ stage, payload }: { stage: CrmStage; payload?: Partial<CreateCrmLeadTaskDto> & { lostReason?: string } }) => {
      if (!leadId) throw new Error('Missing lead id');
      return updateCrmLeadStage(leadId, { stage, ...payload });
    },
    onMutate: ({ stage, payload }) => {
      if (leadId) {
        updateCachedStage(queryClient, leadId, stage, payload?.lostReason ? { lostReason: payload.lostReason } : undefined);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update stage');
      invalidateLeadQueries(queryClient, leadId);
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.stage === CrmStage.SOLD ? 'Marked sold' : variables.stage === CrmStage.LOST ? 'Marked lost' : 'Stage updated');
      setLostOpen(false);
      setLostReason('');
    },
    onSettled: () => invalidateLeadQueries(queryClient, leadId),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateCrmLeadTaskDto) => {
      if (!leadId) throw new Error('Missing lead id');
      return createCrmLeadTask(leadId, data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create task');
    },
    onSuccess: () => {
      toast.success('Task created');
      setCreateTaskOpen(false);
      setTaskDate(egyptDate(1));
      setTaskTime(defaultTaskTime());
      setTaskNotes('');
    },
    onSettled: () => invalidateLeadQueries(queryClient, leadId),
  });

  const closeTaskMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      closeCrmTask(taskId, { closedReason: reason }),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to close task');
    },
    onSuccess: () => {
      toast.success('Task closed');
      setClosingTask(null);
      setClosedReason('');
    },
    onSettled: () => invalidateLeadQueries(queryClient, leadId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!leadId) throw new Error('Missing lead id');
      return deleteCrmLead(leadId);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete lead');
    },
    onSuccess: () => {
      toast.success('Lead deleted');
      setDeleteOpen(false);
      invalidateLeadQueries(queryClient, leadId);
      onDeleted?.();
    },
  });

  const handleStageChange = useCallback((stage: CrmStage) => {
    if (!leadId || lead?.stage === stage || stageMutation.isPending) return;
    stageMutation.mutate({ stage });
  }, [lead?.stage, leadId, stageMutation]);

  const handleCreateTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTaskMutation.mutate({
      taskDate,
      taskTime,
      notes: taskNotes.trim() || undefined,
    });
  };

  const handleMarkLost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = lostReason.trim();
    if (!reason) {
      toast.error('Lost reason is required');
      return;
    }
    stageMutation.mutate({ stage: CrmStage.LOST, payload: { lostReason: reason } });
  };

  const handleCloseTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = closedReason.trim();
    if (!closingTask || !reason) {
      toast.error('Close reason is required');
      return;
    }
    closeTaskMutation.mutate({ taskId: closingTask.id, reason });
  };

  const handleCall = async () => {
    if (!lead) return;
    const phone = lead.phoneNumber;

    if (isSameActiveCall) {
      router.push(`/calls/new?phone=${encodeURIComponent(phone)}`);
      return;
    }

    if (callDisabled) {
      toast.error('Finish the active call report first');
      return;
    }

    try {
      await startCall(phone);
      window.open(`tel:${phone}`, '_self');
      setTimeout(() => {
        router.push(`/calls/new?phone=${encodeURIComponent(phone)}`);
      }, 500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start call');
    }
  };

  if (!leadId) return null;

  const loading = detailQuery.isLoading || timelineQuery.isLoading;
  const hasError = detailQuery.isError || timelineQuery.isError;

  return (
    <>
      <div className="fixed inset-0 z-40">
        <button
          type="button"
          aria-label="Close lead detail overlay"
          className="absolute inset-0 h-full w-full bg-gray-900/40"
          onClick={onClose}
        />

        <aside
          data-testid="lead-detail-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Lead detail"
          className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Lead Detail</p>
              <h2 className="mt-1 truncate font-mono text-xl font-bold text-gray-900">
                {lead?.phoneNumber || 'Loading...'}
              </h2>
              <p className="mt-1 truncate text-sm text-gray-500">
                {lead?.clientName || lead?.client?.name || 'Unnamed client'}
              </p>
            </div>
            <button
              data-testid="lead-detail-close"
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close lead detail"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading && (
              <div data-testid="lead-detail-loading" className="flex min-h-[360px] items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Loading lead detail</span>
              </div>
            )}

            {hasError && (
              <div data-testid="lead-detail-error">
                <ErrorState
                  message="Unable to load lead detail"
                  onRetry={() => {
                    detailQuery.refetch();
                    timelineQuery.refetch();
                  }}
                />
              </div>
            )}

            {!loading && !hasError && lead && (
              <div className="space-y-5">
                <section className="rounded-lg border border-gray-200 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-gray-500">Owner</p>
                        <p className="truncate font-medium text-gray-900">{lead.owner?.email || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Source</p>
                        <p className="truncate font-medium text-gray-900">{lead.source || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Priority</p>
                        <p className="font-medium text-gray-900">{priorityLabel(lead.priority)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last contacted</p>
                        <p className="font-medium text-gray-900">{formatDate(lead.lastContactedAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        data-testid="lead-detail-call"
                        size="sm"
                        onClick={handleCall}
                        disabled={callDisabled}
                        title={callDisabled ? `Active call: ${activeCallPhone}` : undefined}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        {isSameActiveCall ? 'Fill Report' : callDisabled ? 'Active Call' : 'Call'}
                      </Button>
                      <Button
                        data-testid="lead-detail-create-task"
                        size="sm"
                        variant="outline"
                        onClick={() => setCreateTaskOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Create Task
                      </Button>
                      {isAdmin && (
                        <Button
                          data-testid="lead-detail-delete"
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteOpen(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </section>

                <section data-testid="lead-detail-notes" className="rounded-lg border border-gray-200 px-4 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Sales notes</h3>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-600">
                    {lead.notes || 'No notes'}
                  </p>
                </section>

                <section className="rounded-lg border border-gray-200 px-4 py-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div data-testid="lead-detail-stage" className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-semibold text-gray-900">Current stage</p>
                      </div>
                      <Select
                        data-testid="lead-detail-stage-select"
                        aria-label="Change lead stage"
                        value={lead.stage}
                        disabled={stageMutation.isPending}
                        options={stages.map((stage) => ({ value: stage, label: crmStageLabel(stage) }))}
                        onChange={(event) => handleStageChange(event.target.value as CrmStage)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        data-testid="lead-detail-mark-sold"
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={stageMutation.isPending || lead.stage === CrmStage.SOLD}
                        onClick={() => stageMutation.mutate({ stage: CrmStage.SOLD })}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Sold
                      </Button>
                      <Button
                        data-testid="lead-detail-mark-lost"
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={stageMutation.isPending || lead.stage === CrmStage.LOST}
                        onClick={() => setLostOpen(true)}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Mark Lost
                      </Button>
                    </div>
                  </div>
                </section>

                <section data-testid="lead-detail-next-task" className="rounded-lg border border-gray-200 px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Next task</h3>
                    </div>
                    {nextTask && canManageTasks && (
                      <Button size="sm" variant="outline" onClick={() => setClosingTask(nextTask)}>
                        Close
                      </Button>
                    )}
                  </div>
                  {nextTask ? (
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p><span className="text-gray-500">Scheduled:</span> {formatDate(nextTask.scheduledAt)}</p>
                      <p><span className="text-gray-500">Status:</span> {stageLabel(nextTask.status)}</p>
                      <p className="sm:col-span-2"><span className="text-gray-500">Notes:</span> {nextTask.notes || 'None'}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No open task</p>
                  )}
                </section>

                <section data-testid="lead-detail-recent-call" className="rounded-lg border border-gray-200 px-4 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Recent call</h3>
                  </div>
                  {lead.lastCall ? (
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p><span className="text-gray-500">Status:</span> {stageLabel(lead.lastCall.callStatus)}</p>
                      <p><span className="text-gray-500">Date:</span> {formatDate(lead.lastCall.createdAt)}</p>
                      <p><span className="text-gray-500">User:</span> {lead.lastCall.user?.email || 'Unknown'}</p>
                      <p><span className="text-gray-500">Duration:</span> {lead.lastCall.durationMinutes ?? 0} min</p>
                      {lead.lastCall.notes && (
                        <p className="sm:col-span-2"><span className="text-gray-500">Notes:</span> {lead.lastCall.notes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No calls yet</p>
                  )}
                </section>

                <section className="rounded-lg border border-gray-200 px-4 py-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Tasks and follow-ups</h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Tasks</p>
                      <div className="space-y-2">
                        {lead.recentTasks.length === 0 && <p className="text-sm text-gray-500">No tasks</p>}
                        {lead.recentTasks.map((task) => (
                          <div key={task.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-gray-900">{formatDate(task.scheduledAt)}</p>
                                <p className="text-xs text-gray-500">{stageLabel(task.status)}</p>
                              </div>
                              {canManageTasks && isOpenTask(task) && (
                                <Button size="sm" variant="outline" onClick={() => setClosingTask(task)}>
                                  Close
                                </Button>
                              )}
                            </div>
                            {task.notes && <p className="mt-2 text-gray-600">{task.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Follow-ups</p>
                      <div className="space-y-2">
                        {lead.followUps.length === 0 && <p className="text-sm text-gray-500">No follow-ups</p>}
                        {lead.followUps.map((followUp) => (
                          <div key={followUp.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                            <p className="font-medium text-gray-900">#{followUp.followUpNumber} - {formatDate(followUp.scheduledDate)}</p>
                            <p className="text-xs text-gray-500">{stageLabel(followUp.status)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section data-testid="lead-detail-timeline" className="rounded-lg border border-gray-200 px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900">Timeline</h3>
                    <Button size="sm" variant="ghost" onClick={() => timelineQuery.refetch()}>
                      <RefreshCw className={cn('mr-2 h-4 w-4', timelineQuery.isFetching && 'animate-spin')} />
                      Refresh
                    </Button>
                  </div>
                  {timelineQuery.data?.data.length ? (
                    <ol className="space-y-2">
                      {timelineQuery.data.data.map((item) => (
                        <TimelineItem key={`${item.type}-${item.id}-${item.event}`} item={item} />
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-gray-500">No timeline events</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </aside>
      </div>

      <Modal
        isOpen={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        title="Create Task"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateTaskOpen(false)} disabled={createTaskMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="lead-detail-create-task-form" loading={createTaskMutation.isPending}>
              Create Task
            </Button>
          </>
        }
      >
        <form id="lead-detail-create-task-form" onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Task date"
              name="taskDate"
              type="date"
              required
              value={taskDate}
              onChange={(event) => setTaskDate(event.target.value)}
            />
            <Input
              label="Task time"
              name="taskTime"
              type="time"
              required
              value={taskTime}
              onChange={(event) => setTaskTime(event.target.value)}
            />
          </div>
          <Textarea
            label="Notes"
            name="taskNotes"
            value={taskNotes}
            maxLength={2000}
            showCounter
            onChange={(event) => setTaskNotes(event.target.value)}
          />
        </form>
      </Modal>

      <Modal
        isOpen={lostOpen}
        onClose={() => setLostOpen(false)}
        title="Mark Lost"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setLostOpen(false)} disabled={stageMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="lead-detail-lost-form" variant="danger" loading={stageMutation.isPending}>
              Mark Lost
            </Button>
          </>
        }
      >
        <form id="lead-detail-lost-form" onSubmit={handleMarkLost}>
          <Textarea
            label="Lost reason"
            name="lostReason"
            required
            value={lostReason}
            maxLength={2000}
            showCounter
            onChange={(event) => setLostReason(event.target.value)}
          />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(closingTask)}
        onClose={() => setClosingTask(null)}
        title="Close Task"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setClosingTask(null)} disabled={closeTaskMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="lead-detail-close-task-form" variant="danger" loading={closeTaskMutation.isPending}>
              Close Task
            </Button>
          </>
        }
      >
        <form id="lead-detail-close-task-form" onSubmit={handleCloseTask}>
          <Textarea
            label="Close reason"
            name="closedReason"
            required
            value={closedReason}
            maxLength={2000}
            showCounter
            onChange={(event) => setClosedReason(event.target.value)}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Lead"
        message={`Permanently delete ${lead?.phoneNumber || 'this lead'} from CRM? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </>
  );
}
