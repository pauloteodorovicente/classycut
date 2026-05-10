import type { ExportPreset } from './export'

export type UpscaleMethod = 'ffmpeg' | 'realesrgan'

export interface BatchExportRequest {
  media_ids: string[]
  preset: ExportPreset
}

export interface UpscaleRequest {
  media_id: string
  scale_factor: number
  method: UpscaleMethod
  output_name?: string
}

export interface BatchExportResponse {
  job_id: string
  child_job_ids: string[]
  status: string
  total: number
}
