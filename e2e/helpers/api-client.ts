import { API_BASE } from './test-data';

async function api(path: string, options: RequestInit & { token?: string } = {}) {
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
  return res.json();
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
