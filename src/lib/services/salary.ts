import api from '@/lib/api';
import {
  MonthlySalaryResponseDto,
  DailyWorkRecordDto,
  EmployeeSalaryOverviewDto,
  CreateDeductionDto,
  OverrideDayRecordDto,
  SalaryDeductionDto,
} from '@/types/api';

export async function getMySalarySummary(month?: number, year?: number): Promise<MonthlySalaryResponseDto> {
  const params: Record<string, unknown> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const response = await api.get<MonthlySalaryResponseDto>('/salary/my-summary', { params });
  return response.data;
}

export async function getMyDailyRecord(date: string): Promise<DailyWorkRecordDto> {
  const response = await api.get<DailyWorkRecordDto>(`/salary/my-daily/${date}`);
  return response.data;
}

export async function getMyAccumulatedSalary(): Promise<MonthlySalaryResponseDto> {
  const response = await api.get<MonthlySalaryResponseDto>('/salary/my-accumulated');
  return response.data;
}

export async function getEmployeeSalarySummary(userId: string, month?: number, year?: number): Promise<MonthlySalaryResponseDto> {
  const params: Record<string, unknown> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const response = await api.get<MonthlySalaryResponseDto>(`/salary/employee/${userId}/summary`, { params });
  return response.data;
}

export async function getAllEmployeesSummary(month?: number, year?: number): Promise<EmployeeSalaryOverviewDto[]> {
  const params: Record<string, unknown> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const response = await api.get<EmployeeSalaryOverviewDto[]>('/salary/all-employees', { params });
  return response.data;
}

export async function getTeamSalarySummary(month?: number, year?: number): Promise<EmployeeSalaryOverviewDto[]> {
  const params: Record<string, unknown> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const response = await api.get<EmployeeSalaryOverviewDto[]>('/salary/team-summary', { params });
  return response.data;
}

export async function addDeduction(data: CreateDeductionDto): Promise<void> {
  await api.post('/salary/deduction', data);
}

export async function overrideDayRecord(recordId: string, data: OverrideDayRecordDto): Promise<DailyWorkRecordDto> {
  const response = await api.patch<DailyWorkRecordDto>(`/salary/daily-record/${recordId}/override`, data);
  return response.data;
}

export async function getMyDeductions(month: number, year: number): Promise<SalaryDeductionDto[]> {
  const response = await api.get<SalaryDeductionDto[]>('/salary/my-deductions', { params: { month, year } });
  return response.data;
}

export async function editDeduction(deductionId: string, amount: number): Promise<void> {
  await api.patch(`/salary/deduction/${deductionId}`, { amount });
}

export async function waiveDeduction(deductionId: string): Promise<void> {
  await api.patch(`/salary/deduction/${deductionId}/waive`);
}
