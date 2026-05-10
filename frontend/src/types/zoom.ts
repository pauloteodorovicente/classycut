export type ZoomEasing = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out'

export type ZoomPreset =
  | 'punch_in'
  | 'pan_left_right'
  | 'pan_right_left'
  | 'ken_burns_in'
  | 'ken_burns_out'
  | 'custom'

export interface ZoomKeyframe {
  time_ms: number
  x: number
  y: number
  scale: number
  easing: ZoomEasing
}

export interface ZoomApplyRequest {
  media_id: string
  keyframes?: ZoomKeyframe[]
  preset?: ZoomPreset
  output_name: string
}

export interface PresetOption {
  id: ZoomPreset
  label: string
  desc: string
}
