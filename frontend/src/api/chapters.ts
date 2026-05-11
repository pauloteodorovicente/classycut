import api from './client'

export interface Chapter {
  index: number
  start_ms: number
  end_ms: number
  title: string
}

export async function generateChapters(
  projectId: string,
  transcriptionJobId: string,
  minDurationS: number = 60,
): Promise<{ chapters: Chapter[] }> {
  const { data } = await api.post(`/projects/${projectId}/generate-chapters`, {
    transcription_job_id: transcriptionJobId,
    min_duration_s: minDurationS,
  })
  return data
}
