export type ExportPreset =
  | 'original'
  | 'youtube'
  | 'tiktok'
  | 'instagram_portrait'
  | 'instagram_square'

export interface ExportRequest {
  media_id: string
  preset: ExportPreset
  output_name?: string
}

export interface PresetInfo {
  id: ExportPreset
  label: string
  desc: string
  resolution: string
}
