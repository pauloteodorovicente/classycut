export interface WordTimestamp {
  word: string
  start: number
  end: number
  probability: number
}

export interface TranscriptionSegment {
  id: number
  start: number
  end: number
  text: string
  words: WordTimestamp[]
}

export interface TranscriptionResult {
  language: string
  segments: TranscriptionSegment[]
  job_id?: string
}

export interface TranscribeRequest {
  media_id: string
  model_size: string
  language: string | null
}
