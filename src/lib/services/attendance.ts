import api from '@/lib/api';
import {
  AttendanceSessionResponseDto,
  AttendanceQueryDto,
  AttendanceSummaryResponseDto,
  PaginatedResponse,
} from '@/types/api';

export async function clockIn(): Promise<AttendanceSessionResponseDto> {
  const response = await api.post<AttendanceSessionResponseDto>('/attendance/clock-in');
  return response.data;
}

export async function clockOut(): Promise<AttendanceSessionResponseDto> {
  const response = await api.post<AttendanceSessionResponseDto>('/attendance/clock-out');
  return response.data;
}

export async function getAttendanceStatus(): Promise<AttendanceSessionResponseDto | null> {
  const response = await api.get<AttendanceSessionResponseDto | null>('/attendance/status');
  return response.data;
}

export async function getActiveSessions(): Promise<AttendanceSessionResponseDto[]> {
  const response = await api.get<AttendanceSessionResponseDto[]>('/attendance/active-sessions');
  return response.data;
}

export async function getAttendanceHistory(
  query?: AttendanceQueryDto,
): Promise<PaginatedResponse<AttendanceSessionResponseDto>> {
  const response = await api.get<PaginatedResponse<AttendanceSessionResponseDto>>(
    '/attendance/history',
    { params: query },
  );
  return response.data;
}

export async function getAttendanceSummary(params?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AttendanceSummaryResponseDto> {
  const response = await api.get<AttendanceSummaryResponseDto>('/attendance/summary', {
    params,
  });
  return response.data;
}
