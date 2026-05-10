export interface SilenceSegment {
  start_ms: number
  end_ms: number
  duration_ms: number
  type: 'silence' | 'speech'
  keep: boolean
}

export interface SilenceDetectRequest {
  media_id: string
  noise_db: number
  min_duration: number
}

export interface SilenceCutRequest {
  media_id: string
  segments_to_keep: { start_ms: number; end_ms: number }[]
  output_name: string
}
