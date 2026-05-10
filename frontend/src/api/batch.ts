import apiClient from './client'
import type { BatchExportRequest, BatchExportResponse, UpscaleRequest } from '../types/batch'

export async function startBatchExport(
  projectId: string,
  payload: BatchExportRequest,
): Promise<BatchExportResponse> {
  const res = await apiClient.post(`/projects/${projectId}/batch-export`, payload)
  return res.data
}

export async function startUpscale(
  projectId: string,
  payload: UpscaleRequest,
): Promise<{ job_id: string; status: string }> {
  const res = await apiClient.post(`/projects/${projectId}/upscale`, payload)
  return res.data
}
