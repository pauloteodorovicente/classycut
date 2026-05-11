import { create } from 'zustand'
import type { SilenceSegment } from '../types/silence'
import { useHistoryStore } from './historyStore'

interface SilenceStore {
  segments: SilenceSegment[]
  noiseDb: number
  minDuration: number
  speechPaddingMs: number
  detectionJobId: string | null
  cutJobId: string | null
  setSegments: (segments: SilenceSegment[]) => void
  setNoiseDb: (db: number) => void
  setMinDuration: (duration: number) => void
  setSpeechPaddingMs: (ms: number) => void
  setDetectionJobId: (id: string | null) => void
  setCutJobId: (id: string | null) => void
  toggleSegmentKeep: (index: number) => void
  setAllSilenceKeep: (keep: boolean) => void
  updateSegmentBounds: (index: number, start_ms: number, end_ms: number) => void
  reset: () => void
}

export const useSilenceStore = create<SilenceStore>((set, get) => ({
  segments: [],
  noiseDb: -30,
  minDuration: 0.5,
  speechPaddingMs: 150,
  detectionJobId: null,
  cutJobId: null,
  setSegments: (segments) => set({ segments }),
  setNoiseDb: (db) => set({ noiseDb: db }),
  setMinDuration: (duration) => set({ minDuration: duration }),
  setSpeechPaddingMs: (ms) => set({ speechPaddingMs: ms }),
  setDetectionJobId: (id) => set({ detectionJobId: id }),
  setCutJobId: (id) => set({ cutJobId: id }),

  toggleSegmentKeep: (index) => {
    const prevSegments = get().segments
    const nextSegments = prevSegments.map((seg, i) =>
      i === index ? { ...seg, keep: !seg.keep } : seg
    )
    useHistoryStore.getState().execute({
      description: `Toggle silence segment ${index}`,
      execute: () => set({ segments: nextSegments }),
      undo: () => set({ segments: prevSegments }),
    })
  },

  setAllSilenceKeep: (keep) => {
    const prevSegments = get().segments
    const nextSegments = prevSegments.map((seg) =>
      seg.type === 'silence' ? { ...seg, keep } : seg
    )
    useHistoryStore.getState().execute({
      description: `Set all silence keep=${keep}`,
      execute: () => set({ segments: nextSegments }),
      undo: () => set({ segments: prevSegments }),
    })
  },

  updateSegmentBounds: (index, start_ms, end_ms) => {
    const prevSegments = get().segments
    const nextSegments = prevSegments.map((seg, i) => {
      if (i !== index) return seg
      return { ...seg, start_ms, end_ms, duration_ms: end_ms - start_ms }
    })
    useHistoryStore.getState().execute({
      description: `Update segment ${index} bounds`,
      execute: () => set({ segments: nextSegments }),
      undo: () => set({ segments: prevSegments }),
    })
  },

  reset: () =>
    set({
      segments: [],
      detectionJobId: null,
      cutJobId: null,
    }),
}))
