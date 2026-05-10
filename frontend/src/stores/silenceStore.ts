import { create } from 'zustand'
import type { SilenceSegment } from '../types/silence'

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

export const useSilenceStore = create<SilenceStore>((set) => ({
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
  toggleSegmentKeep: (index) =>
    set((state) => {
      const segments = [...state.segments]
      if (segments[index]) {
        segments[index] = { ...segments[index], keep: !segments[index].keep }
      }
      return { segments }
    }),
  setAllSilenceKeep: (keep) =>
    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.type === 'silence' ? { ...seg, keep } : seg
      ),
    })),
  updateSegmentBounds: (index, start_ms, end_ms) =>
    set((state) => {
      const segments = [...state.segments]
      if (segments[index]) {
        const duration_ms = end_ms - start_ms
        segments[index] = { ...segments[index], start_ms, end_ms, duration_ms }
      }
      return { segments }
    }),
  reset: () =>
    set({
      segments: [],
      detectionJobId: null,
      cutJobId: null,
    }),
}))
