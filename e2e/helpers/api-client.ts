import { API_BASE, localDate, localTime, TEST_RUN_PREFIX } from './test-data';

export async function api<T = unknown>(path: string, options: RequestInit & { token?: string } = {}) {
  const { token, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...fetchOpts, headers });
  if (!res.ok && res.status !== 409) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${options.method || 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return null;
  return res.json() as Promise<T>;
}

export async function rawApi<T = unknown>(path: string, options: RequestInit & { token?: string } = {}) {
  const { token, headers, ...fetchOpts } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers: {
      ...(headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok && res.status !== 409) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${options.method || 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data as { accessToken: string; refreshToken: string; user: { id: string; role: string } };
}

export async function getUsers(token: string) {
  return api('/users?limit=100', { token }) as Promise<{ data: Array<{ id: string; email: string; role: string }> }>;
}

export async function resetPassword(userId: string, newPassword: string, token: string) {
  return api(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ password: newPassword }),
    token,
  });
}

export async function createUserApi(
  data: { email: string; password: string; role: 'ADMIN' | 'SALES' | 'SALES_MANAGER' },
  token: string,
) {
  return api('/users', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  }) as Promise<{ id: string; email: string; role: string }>;
}

export async function bulkImport(
  numbers: Array<{ phoneNumber: string; clientName?: string; source?: string }>,
  token: string,
) {
  return api('/client-numbers/import', {
    method: 'POST',
    body: JSON.stringify({ numbers }),
    token,
  });
}

export async function getPoolStats(token: string) {
  return api('/client-numbers/pool/stats', { token });
}

export async function createClientNumberApi(
  data: { phoneNumber: string; clientName?: string; source?: string },
  token: string,
) {
  return api('/client-numbers', {
    method: 'POST',
    body: JSON.stringify({ source: 'Playwright', ...data }),
    token,
  }) as Promise<{ id: string; phoneNumber: string; clientName?: string; leadStatus?: string }>;
}

export async function ensureClientNumberApi(
  data: { phoneNumber: string; clientName?: string; source?: string },
  token: string,
) {
  const created = await createClientNumberApi(data, token).catch(() => null);
  if (created?.id) return created;

  const matches = await searchNumbersApi(data.phoneNumber, token);
  const existing = matches.find((number) => number.phoneNumber === data.phoneNumber);
  if (!existing) throw new Error(`Could not create or find test number ${data.phoneNumber}`);
  return existing;
}

export async function searchNumbersApi(q: string, token: string) {
  return api(`/client-numbers/search?q=${encodeURIComponent(q)}`, { token }) as Promise<
    Array<{ id: string; phoneNumber: string; clientName?: string; leadStatus?: string }>
  >;
}

export async function updateLeadStatusApi(numberId: string, leadStatus: string, token: string) {
  return api(`/client-numbers/${numberId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ leadStatus }),
    token,
  });
}

export async function scheduleFollowUpsApi(numberId: string, token: string) {
  return api(`/client-numbers/${numberId}/follow-ups`, { method: 'POST', token }) as Promise<
    Array<{ id: string; clientNumberId: string; scheduledAt?: string; status?: string }>
  >;
}

export async function createCallTaskApi(
  data: {
    clientPhoneNumber: string;
    taskDate?: string;
    taskTime?: string;
    userId?: string;
    notes?: string;
    sourceCallId?: string;
  },
  token: string,
) {
  return api('/call-tasks', {
    method: 'POST',
    body: JSON.stringify({
      taskDate: localDate(),
      taskTime: localTime(),
      notes: `${TEST_RUN_PREFIX} task`,
      ...data,
    }),
    token,
  }) as Promise<{ id: string; clientPhoneNumber: string; taskDate: string; status?: string }>;
}

export async function getTodayTasksApi(token: string, userId?: string) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return api(`/call-tasks/today${qs}`, { token });
}

export async function getOpenTasksApi(
  token: string,
  query?: {
    bucket?: 'overdue' | 'today' | 'upcoming' | 'all';
    userId?: string;
    phoneNumber?: string;
    clientNumberId?: string;
    source?: string;
    priority?: number;
    includeCompleted?: boolean;
    page?: number;
    limit?: number;
  },
) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value !== 'undefined') {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return api(`/call-tasks/open${qs ? '?' + qs : ''}`, { token }) as Promise<{
    data: Array<{
      id: string;
      bucket: 'overdue' | 'today' | 'upcoming';
      isOverdue: boolean;
      clientNumber?: { id: string; phoneNumber: string; priority?: number; nextActionAt?: string };
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

export async function getCrmLeadsApi(
  token: string,
  query?: {
    page?: number;
    limit?: number;
    stage?: string;
    ownerId?: string;
    priority?: number;
    stale?: boolean;
    staleDays?: number;
    nextAction?: 'overdue' | 'today' | 'upcoming' | 'none' | 'all';
    sortBy?: 'updatedAt' | 'createdAt' | 'lastContactedAt' | 'nextActionAt';
    sortOrder?: 'asc' | 'desc';
  },
) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value !== 'undefined') {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return api(`/crm/leads${qs ? '?' + qs : ''}`, { token }) as Promise<{
    data: Array<{
      id: string;
      phoneNumber: string;
      normalizedPhone: string;
      stage: string;
      crmStage?: string;
      leadStatus: string;
      owner?: { id: string; email: string; role?: string };
      nextOpenTask?: { id: string; scheduledAt: string; status: string };
      timelinePreview: Array<{ id: string; type: string; title: string; occurredAt: string }>;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    countsByStage: Record<string, number>;
  }>;
}

export async function getCrmLeadApi(numberId: string, token: string) {
  return api(`/crm/leads/${numberId}`, { token }) as Promise<{
    id: string;
    phoneNumber: string;
    stage: string;
    nextOpenTask?: { id: string; status: string; scheduledAt: string; notes?: string };
    recentTasks: Array<{
      id: string;
      status: string;
      scheduledAt?: string;
      notes?: string;
      completedAt?: string;
      closedAt?: string;
      closedReason?: string;
    }>;
    followUps: Array<{ id: string; status: string; scheduledDate?: string; completedAt?: string }>;
  }>;
}

export async function getCrmLeadTimelineApi(
  numberId: string,
  token: string,
  query?: { page?: number; limit?: number; order?: 'asc' | 'desc'; eventType?: string },
) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value !== 'undefined') {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return api(`/crm/leads/${numberId}/timeline${qs ? '?' + qs : ''}`, { token }) as Promise<{
    data: Array<{
      id: string;
      type: string;
      event: string;
      rawAction?: string;
      title: string;
      details?: Record<string, unknown>;
      occurredAt: string;
      occurredAtEgypt: string;
      actor?: { id: string; email: string; role?: string };
      user?: { id: string; email: string; role?: string };
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

export async function updateCrmLeadStageApi(
  numberId: string,
  data: { stage: string; priority?: number; lostReason?: string; nextActionAt?: string; nextActionType?: string },
  token: string,
) {
  return api(`/crm/leads/${numberId}/stage`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  });
}

export async function createCrmLeadTaskApi(
  numberId: string,
  data: { taskDate?: string; taskTime?: string; userId?: string; notes?: string },
  token: string,
) {
  return api(`/crm/leads/${numberId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({
      taskDate: localDate(1),
      taskTime: localTime(10, 30),
      notes: `${TEST_RUN_PREFIX} CRM task`,
      ...data,
    }),
    token,
  }) as Promise<{ id: string; status: string; scheduledAt: string }>;
}

export async function completeCrmTaskApi(taskId: string, token: string, data?: { callId?: string }) {
  return api(`/crm/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
    token,
  }) as Promise<{ id: string; status: string; completedAt?: string }>;
}

export async function closeCrmTaskApi(taskId: string, closedReason: string, token: string) {
  return api(`/crm/tasks/${taskId}/close`, {
    method: 'POST',
    body: JSON.stringify({ closedReason }),
    token,
  }) as Promise<{ id: string; status: string; closedAt?: string; closedReason?: string }>;
}

export async function getCrmReportApi(
  token: string,
  query?: {
    ownerId?: string;
    priority?: number;
    stage?: string;
    staleDays?: number;
    page?: number;
    limit?: number;
  },
) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value !== 'undefined') {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return api(`/reports/crm${qs ? '?' + qs : ''}`, { token }) as Promise<{
    cards: {
      overdueTasks: number;
      hotLeads: number;
      staleLeads: number;
      hotLeadsWithoutFollowUp: number;
      averageCompletionHours: number;
      hotLeadConversionRate: number;
    };
    overdueByEmployee: Array<{ userId: string; email: string; count: number }>;
    hotLeadsWithoutFollowUp: Array<{ id: string; phoneNumber: string; stage: string }>;
    staleLeadsByStage: Array<{ stage: string; count: number }>;
    exportRows: Array<{ type: string; label: string; value?: string | number }>;
  }>;
}

export async function getNotificationsApi(token: string) {
  return api('/notifications?page=1&limit=20', { token }) as Promise<{
    data: Array<{ id: string; title: string; message: string; type: string; read: boolean }>;
    total: number;
  }>;
}

export async function getUnreadCountApi(token: string) {
  return api('/notifications/unread-count', { token }) as Promise<{ count: number }>;
}

export async function markNotificationReadApi(id: string, token: string) {
  return api(`/notifications/${id}/read`, { method: 'PATCH', token });
}

export async function createCallApi(
  data: {
    clientPhoneNumber: string;
    callStatus?: 'ANSWERED' | 'NOT_ANSWERED';
    durationMinutes?: number;
    notes?: string;
  },
  token: string,
) {
  const form = new FormData();
  form.set('clientPhoneNumber', data.clientPhoneNumber);
  form.set('callStatus', data.callStatus || 'NOT_ANSWERED');
  if (typeof data.durationMinutes === 'number') {
    form.set('durationMinutes', String(data.durationMinutes));
  }
  form.set('notes', data.notes || `${TEST_RUN_PREFIX} call`);

  return rawApi('/calls', { method: 'POST', body: form, token }) as Promise<{
    id: string;
    clientPhoneNumber: string;
    callStatus: string;
  }>;
}

export async function getMyCallStatusApi(token: string) {
  return api('/users/my-call-status', { token }) as Promise<{
    currentStatus: string | null;
    currentCallPhone: string | null;
  }>;
}

export async function clearActiveCallWithReportApi(token: string) {
  const status = await getMyCallStatusApi(token);
  if (status.currentStatus !== 'ON_CALL' || !status.currentCallPhone) return status;

  await createCallApi(
    {
      clientPhoneNumber: status.currentCallPhone,
      callStatus: 'NOT_ANSWERED',
      notes: `${TEST_RUN_PREFIX} clear active call`,
    },
    token,
  );

  return getMyCallStatusApi(token);
}

export async function getNeedsRetryApi(token: string, userId?: string) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return api(`/calls/needs-retry${qs}`, { token });
}

export async function bestEffortCleanupTestData(token: string) {
  void token;
  return {
    strategy: 'prefix-only',
    prefix: TEST_RUN_PREFIX,
    note: 'No destructive cleanup endpoint exists; test data uses unique phones/prefixes.',
  };
}

// ── Leave helpers ───────────────────────────────────────────────────────

export async function createLeave(
  data: { leaveDate: string; reason?: string },
  token: string,
) {
  return api('/leaves', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  }) as Promise<{ id: string; leaveDate: string; status: string }>;
}

export async function getMyLeaves(
  token: string,
  query?: { page?: number; limit?: number },
) {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return api(`/leaves/my${qs ? '?' + qs : ''}`, { token }) as Promise<{
    data: Array<{ id: string; leaveDate: string; status: string; rejectionReason?: string }>;
    total: number;
  }>;
}

export async function cancelLeaveApi(leaveId: string, token: string) {
  return api(`/leaves/${leaveId}`, { method: 'DELETE', token });
}

export async function approveLeaveApi(
  leaveId: string,
  type: 'PAID' | 'UNPAID',
  token: string,
) {
  return api(`/leaves/${leaveId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ type }),
    token,
  });
}

export async function rejectLeaveApi(
  leaveId: string,
  reason: string,
  token: string,
) {
  return api(`/leaves/${leaveId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
    token,
  });
}

export async function getPendingLeavesApi(token: string) {
  return api('/leaves/pending', { token }) as Promise<{
    data: Array<{ id: string; userId: string; leaveDate: string; status: string }>;
    total: number;
  }>;
}

// ── Salary helpers ──────────────────────────────────────────────────────

export async function getMySalarySummary(token: string, month: number, year: number) {
  return api(`/salary/my-summary?month=${month}&year=${year}`, { token }) as Promise<{
    userId: string; month: number; year: number; baseSalary: string;
    dailyRecords: Array<{
      id: string; userId: string; dateEgypt: string; totalMinutes: number;
      dayStatus: string; dayPercentage: number; salaryEarned: string;
      callDeduction: string; adminOverride: boolean; adminNotes?: string;
    }>;
    totalDaysWorked: number; totalEarned: string; totalCallDeductions: string;
    totalAbsenceDeductions: string; totalManualDeductions: string;
    totalBonuses: string; totalCommission: string; netSalary: string;
  }>;
}

export async function getAllEmployeesSummary(token: string, month: number, year: number) {
  return api(`/salary/all-employees?month=${month}&year=${year}`, { token }) as Promise<
    Array<{
      userId: string; email: string; baseSalary: string; totalEarned: string;
      totalDeductions: string; totalBonuses: string; netSalary: string; daysWorked: number;
    }>
  >;
}

export async function getEmployeeSalarySummary(
  token: string, userId: string, month: number, year: number,
) {
  return api(`/salary/employee/${userId}/summary?month=${month}&year=${year}`, { token }) as Promise<{
    userId: string; month: number; year: number; baseSalary: string;
    dailyRecords: Array<{
      id: string; dateEgypt: string; totalMinutes: number; dayStatus: string;
      dayPercentage: number; salaryEarned: string; callDeduction: string;
      adminOverride: boolean; adminNotes?: string;
    }>;
    totalDaysWorked: number; totalEarned: string; totalCallDeductions: string;
    totalAbsenceDeductions: string; totalManualDeductions: string;
    totalBonuses: string; totalCommission: string; netSalary: string;
  }>;
}

export async function getTeamSalarySummary(token: string, month: number, year: number) {
  return api(`/salary/team-summary?month=${month}&year=${year}`, { token }) as Promise<
    Array<{
      userId: string; email: string; baseSalary: string; totalEarned: string;
      totalDeductions: string; totalBonuses: string; netSalary: string; daysWorked: number;
    }>
  >;
}

export async function addDeductionApi(
  data: { userId: string; amount: number; description: string; dateEgypt: string },
  token: string,
) {
  return api('/salary/deduction', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export async function overrideDayRecordApi(
  recordId: string,
  data: { dayPercentage: number; adminNotes?: string },
  token: string,
) {
  return api(`/salary/daily-record/${recordId}/override`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  });
}
