import { create } from 'zustand'
import { useHistoryStore } from './historyStore'

export interface CutSegment {
  id: string
  start_ms: number
  end_ms: number
  keep: boolean
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

interface CutStore {
  segments: CutSegment[]
  mediaId: string | null
  durationMs: number
  jobId: string | null

  initFromMedia: (mediaId: string, durationMs: number) => void
  cutAtTime: (timeMs: number) => void
  toggleKeep: (id: string) => void
  removeSegment: (id: string) => void
  reset: () => void
  setJobId: (id: string | null) => void
}

export const useCutStore = create<CutStore>((set, get) => ({
  segments: [],
  mediaId: null,
  durationMs: 0,
  jobId: null,

  initFromMedia: (mediaId, durationMs) => {
    if (get().mediaId === mediaId) return
    useHistoryStore.getState().clear()
    set({
      mediaId,
      durationMs,
      segments: [{ id: uid(), start_ms: 0, end_ms: durationMs, keep: true }],
    })
  },

  cutAtTime: (timeMs) => {
    const { segments } = get()
    const idx = segments.findIndex((s) => s.start_ms < timeMs && s.end_ms > timeMs)
    if (idx === -1) return

    const seg = segments[idx]
    const left: CutSegment = { id: uid(), start_ms: seg.start_ms, end_ms: timeMs, keep: seg.keep }
    const right: CutSegment = { id: uid(), start_ms: timeMs, end_ms: seg.end_ms, keep: seg.keep }
    const nextSegments = [...segments.slice(0, idx), left, right, ...segments.slice(idx + 1)]
    const prevSegments = segments

    useHistoryStore.getState().execute({
      description: `Cut at ${timeMs}ms`,
      execute: () => set({ segments: nextSegments }),
      undo: () => set({ segments: prevSegments }),
    })
  },

  toggleKeep: (id) => {
    const { segments } = get()
    const prevSegments = segments
    const nextSegments = segments.map((s) => (s.id === id ? { ...s, keep: !s.keep } : s))

    useHistoryStore.getState().execute({
      description: `Toggle keep ${id}`,
      execute: () => set({ segments: nextSegments }),
      undo: () => set({ segments: prevSegments }),
    })
  },

  removeSegment: (id) => {
    const { segments } = get()
    const prevSegments = segments
    const nextSegments = segments.map((s) => (s.id === id ? { ...s, keep: false } : s))

    useHistoryStore.getState().execute({
      description: `Remove segment ${id}`,
      execute: () => set({ segments: nextSegments }),
      undo: () => set({ segments: prevSegments }),
    })
  },

  reset: () => {
    const { mediaId, durationMs } = get()
    if (!mediaId) return
    useHistoryStore.getState().clear()
    set({
      segments: [{ id: uid(), start_ms: 0, end_ms: durationMs, keep: true }],
    })
  },

  setJobId: (id) => set({ jobId: id }),
}))
