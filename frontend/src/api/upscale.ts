import api from './client'

export interface UpscaleRequest {
  media_id: string
  factor: 2 | 4
  method: 'ffmpeg' | 'realesrgan'
  output_name?: string
}

export async function upscaleVideo(projectId: string, payload: UpscaleRequest): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/upscale`, payload)
  return data
}

export async function checkRealesrgan(): Promise<{ available: boolean }> {
  const { data } = await api.get('/upscale/check-realesrgan')
  return data
}
