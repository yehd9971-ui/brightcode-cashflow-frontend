import api from '@/lib/api';
import {
  CreateCallDto,
  UpdateCallDto,
  CallQueryDto,
  CallResponseDto,
  CallList,
  DailyCallStatsDto,
  DashboardStatsResponseDto,
  RejectCallDto,
  DailyCallReportDto,
} from '@/types/api';

export async function getCalls(query?: CallQueryDto): Promise<CallList> {
  const response = await api.get<CallList>('/calls', { params: query });
  return response.data;
}

export async function getCallById(id: string): Promise<CallResponseDto> {
  const response = await api.get<CallResponseDto>(`/calls/${id}`);
  return response.data;
}

export async function createCall(
  data: CreateCallDto,
  screenshot?: File
): Promise<CallResponseDto> {
  const formData = new FormData();
  formData.append('clientPhoneNumber', data.clientPhoneNumber);
  formData.append('callStatus', data.callStatus);
  if (data.durationMinutes !== undefined) {
    formData.append('durationMinutes', data.durationMinutes.toString());
  }
  if (data.notes) {
    formData.append('notes', data.notes);
  }
  if (screenshot) {
    formData.append('file', screenshot);
  }

  const response = await api.post<CallResponseDto>('/calls', formData, {
    headers: { 'Content-Type': undefined },
  });
  return response.data;
}

export async function updateCall(
  id: string,
  data: UpdateCallDto
): Promise<CallResponseDto> {
  const response = await api.patch<CallResponseDto>(`/calls/${id}`, data);
  return response.data;
}

export async function getCallApprovals(query?: CallQueryDto): Promise<CallList> {
  const response = await api.get<CallList>('/calls/approvals', { params: query });
  return response.data;
}

export async function approveCall(id: string): Promise<CallResponseDto> {
  const response = await api.post<CallResponseDto>(`/calls/approvals/${id}/approve`);
  return response.data;
}

export async function rejectCall(
  id: string,
  data: RejectCallDto
): Promise<CallResponseDto> {
  const response = await api.post<CallResponseDto>(`/calls/approvals/${id}/reject`, data);
  return response.data;
}

export async function getMyDailyStats(date?: string): Promise<DailyCallStatsDto> {
  const response = await api.get<DailyCallStatsDto>('/calls/my-stats', {
    params: date ? { date } : undefined,
  });
  return response.data;
}

export async function getDashboardStats(date: string): Promise<DashboardStatsResponseDto> {
  const response = await api.get<DashboardStatsResponseDto>('/calls/dashboard', {
    params: { date },
  });
  return response.data;
}

export async function generateEndOfDayReport(date: string): Promise<DailyCallReportDto[]> {
  const response = await api.post<DailyCallReportDto[]>('/calls/generate-report', { date });
  return response.data;
}

export async function getCallScreenshot(screenshotId: string): Promise<Blob> {
  const response = await api.get(`/calls/screenshots/${screenshotId}`, {
    responseType: 'blob',
  });
  return response.data;
}
