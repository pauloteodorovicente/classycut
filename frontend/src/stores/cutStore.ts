import { create } from 'zustand'

export interface CutSegment {
  id: string
  start_ms: number
  end_ms: number
  keep: boolean
}

const MAX_HISTORY = 10

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

interface CutStore {
  segments: CutSegment[]
  history: CutSegment[][]
  mediaId: string | null
  durationMs: number
  jobId: string | null

  initFromMedia: (mediaId: string, durationMs: number) => void
  cutAtTime: (timeMs: number) => void
  toggleKeep: (id: string) => void
  removeSegment: (id: string) => void
  undo: () => void
  reset: () => void
  setJobId: (id: string | null) => void
}

export const useCutStore = create<CutStore>((set, get) => ({
  segments: [],
  history: [],
  mediaId: null,
  durationMs: 0,
  jobId: null,

  initFromMedia: (mediaId, durationMs) => {
    if (get().mediaId === mediaId) return
    set({
      mediaId,
      durationMs,
      segments: [{ id: uid(), start_ms: 0, end_ms: durationMs, keep: true }],
      history: [],
    })
  },

  cutAtTime: (timeMs) => {
    const { segments, history } = get()
    const idx = segments.findIndex((s) => s.start_ms < timeMs && s.end_ms > timeMs)
    if (idx === -1) return

    const seg = segments[idx]
    const left: CutSegment = { id: uid(), start_ms: seg.start_ms, end_ms: timeMs, keep: seg.keep }
    const right: CutSegment = { id: uid(), start_ms: timeMs, end_ms: seg.end_ms, keep: seg.keep }

    const next = [...segments.slice(0, idx), left, right, ...segments.slice(idx + 1)]
    set({
      segments: next,
      history: [...history.slice(-MAX_HISTORY), segments],
    })
  },

  toggleKeep: (id) => {
    const { segments, history } = get()
    set({
      segments: segments.map((s) => (s.id === id ? { ...s, keep: !s.keep } : s)),
      history: [...history.slice(-MAX_HISTORY), segments],
    })
  },

  removeSegment: (id) => {
    const { segments, history } = get()
    set({
      segments: segments.map((s) => (s.id === id ? { ...s, keep: false } : s)),
      history: [...history.slice(-MAX_HISTORY), segments],
    })
  },

  undo: () => {
    const { history } = get()
    if (history.length === 0) return
    const prev = history[history.length - 1]
    set({ segments: prev, history: history.slice(0, -1) })
  },

  reset: () => {
    const { mediaId, durationMs } = get()
    if (!mediaId) return
    set({
      segments: [{ id: uid(), start_ms: 0, end_ms: durationMs, keep: true }],
      history: [],
    })
  },

  setJobId: (id) => set({ jobId: id }),
}))
