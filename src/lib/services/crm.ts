import api from '@/lib/api';
import {
  CreateCrmLeadTaskDto,
  CrmLeadDetailResponseDto,
  CrmLeadsQueryDto,
  CrmLeadsResponseDto,
  CrmTimelineQueryDto,
  CrmTimelineResponseDto,
  CrmTaskSummaryDto,
  CrmLeadResponseDto,
  UpdateCrmLeadStageDto,
} from '@/types/api';

export async function getCrmLeads(query?: CrmLeadsQueryDto): Promise<CrmLeadsResponseDto> {
  const response = await api.get<CrmLeadsResponseDto>('/crm/leads', { params: query });
  return response.data;
}

export async function getCrmLead(id: string): Promise<CrmLeadDetailResponseDto> {
  const response = await api.get<CrmLeadDetailResponseDto>(`/crm/leads/${id}`);
  return response.data;
}

export async function getCrmLeadTimeline(
  id: string,
  query?: CrmTimelineQueryDto,
): Promise<CrmTimelineResponseDto> {
  const response = await api.get<CrmTimelineResponseDto>(`/crm/leads/${id}/timeline`, {
    params: query,
  });
  return response.data;
}

export async function updateCrmLeadStage(
  id: string,
  data: UpdateCrmLeadStageDto,
): Promise<CrmLeadResponseDto> {
  const response = await api.patch<CrmLeadResponseDto>(`/crm/leads/${id}/stage`, data);
  return response.data;
}

export async function createCrmLeadTask(
  id: string,
  data: CreateCrmLeadTaskDto,
): Promise<CrmTaskSummaryDto> {
  const response = await api.post<CrmTaskSummaryDto>(`/crm/leads/${id}/tasks`, data);
  return response.data;
}

export async function completeCrmTask(
  id: string,
  data: { callId?: string } = {},
): Promise<CrmTaskSummaryDto> {
  const response = await api.post<CrmTaskSummaryDto>(`/crm/tasks/${id}/complete`, data);
  return response.data;
}

export async function closeCrmTask(
  id: string,
  data: { closedReason: string },
): Promise<CrmTaskSummaryDto> {
  const response = await api.post<CrmTaskSummaryDto>(`/crm/tasks/${id}/close`, data);
  return response.data;
}
