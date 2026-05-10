import api from './client'
import type { SilenceDetectRequest, SilenceCutRequest } from '../types/silence'

export async function detectSilence(
  projectId: string,
  payload: SilenceDetectRequest
): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/silence-detect`, payload)
  return data
}

export async function cutSilence(
  projectId: string,
  payload: SilenceCutRequest
): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/silence-cut`, payload)
  return data
}
