import api from './client'

export async function summarizeTranscript(
  projectId: string,
  transcriptionJobId: string,
  maxSentences: number = 5,
): Promise<{ summary: string }> {
  const { data } = await api.post(`/projects/${projectId}/summarize`, {
    transcription_job_id: transcriptionJobId,
    max_sentences: maxSentences,
  })
  return data
}
