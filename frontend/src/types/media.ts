export interface MediaFile {
  id: string
  project_id: string
  filename: string
  file_path: string
  media_type: 'video' | 'audio' | 'image'
  duration_ms: number | null
  width: number | null
  height: number | null
  fps: number | null
  codec: string | null
  file_size: number | null
  has_audio: boolean
  is_deleted: boolean
  created_at: string
}

export interface MergeRequest {
  video_media_id: string
  audio_media_id: string
  output_name?: string
}
