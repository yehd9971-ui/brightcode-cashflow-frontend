import api from '../api';

export interface HealthResponse {
  status: string;
  timestamp?: string;
  version?: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/health');
  return response.data;
}
