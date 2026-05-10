import { create } from 'zustand'

export interface CutSegment {
  id: string
  start_ms: number
  end_ms: number
  keep: boolean
}

const MAX_HISTORY = 100

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

interface CutStore {
  segments: CutSegment[]
  history: CutSegment[][]  // undo stack
  future: CutSegment[][]   // redo stack
  mediaId: string | null
  durationMs: number
  jobId: string | null

  initFromMedia: (mediaId: string, durationMs: number) => void
  cutAtTime: (timeMs: number) => void
  toggleKeep: (id: string) => void
  removeSegment: (id: string) => void
  undo: () => void
  redo: () => void
  reset: () => void
  setJobId: (id: string | null) => void
}

/** Push current segments onto the undo stack and clear the redo stack. */
function pushHistory(
  current: CutSegment[],
  history: CutSegment[][],
): { history: CutSegment[][]; future: CutSegment[][] } {
  return {
    history: [...history.slice(-(MAX_HISTORY - 1)), current],
    future: [],
  }
}

export const useCutStore = create<CutStore>((set, get) => ({
  segments: [],
  history: [],
  future: [],
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
      future: [],
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

    set({ segments: next, ...pushHistory(segments, history) })
  },

  toggleKeep: (id) => {
    const { segments, history } = get()
    set({
      segments: segments.map((s) => (s.id === id ? { ...s, keep: !s.keep } : s)),
      ...pushHistory(segments, history),
    })
  },

  removeSegment: (id) => {
    const { segments, history } = get()
    set({
      segments: segments.map((s) => (s.id === id ? { ...s, keep: false } : s)),
      ...pushHistory(segments, history),
    })
  },

  undo: () => {
    const { segments, history, future } = get()
    if (history.length === 0) return
    const prev = history[history.length - 1]
    set({
      segments: prev,
      history: history.slice(0, -1),
      future: [...future.slice(-(MAX_HISTORY - 1)), segments],
    })
  },

  redo: () => {
    const { segments, history, future } = get()
    if (future.length === 0) return
    const next = future[future.length - 1]
    set({
      segments: next,
      future: future.slice(0, -1),
      history: [...history.slice(-(MAX_HISTORY - 1)), segments],
    })
  },

  reset: () => {
    const { mediaId, durationMs } = get()
    if (!mediaId) return
    set({
      segments: [{ id: uid(), start_ms: 0, end_ms: durationMs, keep: true }],
      history: [],
      future: [],
    })
  },

  setJobId: (id) => set({ jobId: id }),
}))
