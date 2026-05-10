import { create } from 'zustand'
import type { TranscriptionSegment } from '../types/transcription'

interface TranscriptionStore {
  segments: TranscriptionSegment[]
  language: string | null
  modelSize: string
  requestLanguage: string | null
  transcribeJobId: string | null
  subtitlesVisible: boolean
  setSegments: (segments: TranscriptionSegment[]) => void
  setLanguage: (language: string | null) => void
  setModelSize: (size: string) => void
  setRequestLanguage: (lang: string | null) => void
  setTranscribeJobId: (id: string | null) => void
  setSubtitlesVisible: (visible: boolean) => void
  updateSegmentText: (id: number, text: string) => void
  reset: () => void
}

export const useTranscriptionStore = create<TranscriptionStore>((set) => ({
  segments: [],
  language: null,
  modelSize: 'base',
  requestLanguage: null,
  transcribeJobId: null,
  subtitlesVisible: true,
  setSegments: (segments) => set({ segments }),
  setLanguage: (language) => set({ language }),
  setModelSize: (size) => set({ modelSize: size }),
  setRequestLanguage: (lang) => set({ requestLanguage: lang }),
  setTranscribeJobId: (id) => set({ transcribeJobId: id }),
  setSubtitlesVisible: (visible) => set({ subtitlesVisible: visible }),
  updateSegmentText: (id, text) =>
    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.id === id ? { ...seg, text } : seg
      ),
    })),
  reset: () =>
    set({
      segments: [],
      language: null,
      transcribeJobId: null,
    }),
}))
