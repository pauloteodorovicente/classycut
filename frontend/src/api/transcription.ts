import api from './client'
import type { TranscribeRequest, TranscriptionResult } from '../types/transcription'

export async function startTranscription(
  projectId: string,
  payload: TranscribeRequest
): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/transcribe`, payload)
  return data
}

export async function getTranscription(mediaId: string): Promise<TranscriptionResult> {
  const { data } = await api.get(`/media/${mediaId}/transcription`)
  return data
}

export function getSubtitleDownloadUrl(mediaId: string, format: 'srt' | 'vtt' = 'srt'): string {
  return `/api/v1/media/${mediaId}/subtitles?format=${format}`
}
