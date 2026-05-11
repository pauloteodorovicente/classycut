import api from './client'

export interface CompressRequest {
  media_id: string
  target_mb: number
  output_name?: string
}

export async function compressVideo(projectId: string, payload: CompressRequest): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/compress`, payload)
  return data
}
