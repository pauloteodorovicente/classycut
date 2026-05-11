import api from './client'

export interface HighlightsRequest {
  media_id: string
  sensitivity?: number
  min_duration?: number
}

export interface Highlight {
  start_ms: number
  end_ms: number
  duration_ms: number
  energy: number
}

export async function detectHighlights(
  projectId: string,
  payload: HighlightsRequest,
): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/detect-highlights`, payload)
  return data
}
