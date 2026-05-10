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

export async function burnSubtitles(
  projectId: string,
  payload: {
    media_id: string
    transcription_job_id: string
    font_size: 'small' | 'medium' | 'large'
    position: 'bottom' | 'top'
  },
): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/burn-subtitles`, payload)
  return data
}
