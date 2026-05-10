import api from './client'
import type { ZoomApplyRequest } from '../types/zoom'

export async function applyZoom(
  projectId: string,
  payload: ZoomApplyRequest,
): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/zoom-apply`, payload)
  return data
}
