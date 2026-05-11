import api from './client'

export async function applyCuts(
  projectId: string,
  mediaId: string,
  segmentsToKeep: { start_ms: number; end_ms: number }[],
  outputName: string,
  platform?: string,
): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/silence-cut`, {
    media_id: mediaId,
    segments_to_keep: segmentsToKeep,
    output_name: outputName,
    ...(platform ? { platform } : {}),
  })
  return data
}
