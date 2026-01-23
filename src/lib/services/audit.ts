import api from '@/lib/api';
import { AuditQueryDto, AuditList } from '@/types/api';

export async function getAuditLogs(query?: AuditQueryDto): Promise<AuditList> {
  const response = await api.get<AuditList>('/audit', { params: query });
  return response.data;
}
