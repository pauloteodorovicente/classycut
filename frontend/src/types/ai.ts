export interface HighlightsRequest {
  media_id: string
  sensitivity?: number
  min_duration?: number
}

export interface HighlightSegment {
  start_ms: number
  end_ms: number
  duration_ms: number
  energy: number
}

export interface ChaptersRequest {
  media_id: string
  min_chapter_duration?: number
}

export interface Chapter {
  index: number
  start_ms: number
  end_ms: number
  title: string
}

export interface SummaryRequest {
  media_id: string
  max_sentences?: number
}
