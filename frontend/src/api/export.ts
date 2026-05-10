import apiClient from './client'
import type { ExportRequest } from '../types/export'

export async function startExport(
  projectId: string,
  payload: ExportRequest,
): Promise<{ job_id: string; status: string }> {
  const res = await apiClient.post(`/projects/${projectId}/export`, payload)
  return res.data
}
