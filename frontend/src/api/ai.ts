import apiClient from './client'
import type { HighlightsRequest, ChaptersRequest, SummaryRequest } from '../types/ai'

export async function startHighlights(
  projectId: string,
  payload: HighlightsRequest,
): Promise<{ job_id: string; status: string }> {
  const res = await apiClient.post(`/projects/${projectId}/highlights`, payload)
  return res.data
}

export async function startChapters(
  projectId: string,
  payload: ChaptersRequest,
): Promise<{ job_id: string; status: string }> {
  const res = await apiClient.post(`/projects/${projectId}/chapters`, payload)
  return res.data
}

export async function startSummary(
  projectId: string,
  payload: SummaryRequest,
): Promise<{ job_id: string; status: string }> {
  const res = await apiClient.post(`/projects/${projectId}/summary`, payload)
  return res.data
}
