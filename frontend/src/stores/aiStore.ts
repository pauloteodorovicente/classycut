import { create } from 'zustand'
import type { HighlightSegment, Chapter } from '../types/ai'

interface AIStore {
  // Highlights
  highlights: HighlightSegment[]
  sensitivity: number
  minDuration: number
  highlightsJobId: string | null
  setHighlights: (h: HighlightSegment[]) => void
  setSensitivity: (v: number) => void
  setMinDuration: (v: number) => void
  setHighlightsJobId: (id: string | null) => void

  // Chapters
  chapters: Chapter[]
  minChapterDuration: number
  chaptersJobId: string | null
  setChapters: (c: Chapter[]) => void
  setMinChapterDuration: (v: number) => void
  setChaptersJobId: (id: string | null) => void

  // Summary
  summary: string
  maxSentences: number
  summaryJobId: string | null
  setSummary: (s: string) => void
  setMaxSentences: (v: number) => void
  setSummaryJobId: (id: string | null) => void

  // Reset
  reset: () => void
}

export const useAIStore = create<AIStore>((set) => ({
  highlights: [],
  sensitivity: 0.5,
  minDuration: 3.0,
  highlightsJobId: null,
  setHighlights: (h) => set({ highlights: h }),
  setSensitivity: (v) => set({ sensitivity: v }),
  setMinDuration: (v) => set({ minDuration: v }),
  setHighlightsJobId: (id) => set({ highlightsJobId: id }),

  chapters: [],
  minChapterDuration: 30.0,
  chaptersJobId: null,
  setChapters: (c) => set({ chapters: c }),
  setMinChapterDuration: (v) => set({ minChapterDuration: v }),
  setChaptersJobId: (id) => set({ chaptersJobId: id }),

  summary: '',
  maxSentences: 5,
  summaryJobId: null,
  setSummary: (s) => set({ summary: s }),
  setMaxSentences: (v) => set({ maxSentences: v }),
  setSummaryJobId: (id) => set({ summaryJobId: id }),

  reset: () =>
    set({
      highlights: [],
      highlightsJobId: null,
      chapters: [],
      chaptersJobId: null,
      summary: '',
      summaryJobId: null,
    }),
}))
