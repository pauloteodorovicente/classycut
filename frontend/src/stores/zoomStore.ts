import { create } from 'zustand'
import type { ZoomKeyframe, ZoomPreset } from '../types/zoom'

interface ZoomStore {
  keyframes: ZoomKeyframe[]
  selectedPreset: ZoomPreset | null
  zoomJobId: string | null
  selectedKeyframeIndex: number | null
  addKeyframe: (kf: ZoomKeyframe) => void
  updateKeyframe: (index: number, partial: Partial<ZoomKeyframe>) => void
  removeKeyframe: (index: number) => void
  setKeyframes: (kfs: ZoomKeyframe[]) => void
  setSelectedPreset: (preset: ZoomPreset | null) => void
  setZoomJobId: (id: string | null) => void
  setSelectedKeyframeIndex: (index: number | null) => void
  reset: () => void
}

export const useZoomStore = create<ZoomStore>((set) => ({
  keyframes: [],
  selectedPreset: null,
  zoomJobId: null,
  selectedKeyframeIndex: null,
  addKeyframe: (kf) =>
    set((state) => ({
      keyframes: [...state.keyframes, kf].sort((a, b) => a.time_ms - b.time_ms),
      selectedPreset: 'custom',
    })),
  updateKeyframe: (index, partial) =>
    set((state) => {
      const keyframes = [...state.keyframes]
      if (keyframes[index]) {
        keyframes[index] = { ...keyframes[index], ...partial }
        keyframes.sort((a, b) => a.time_ms - b.time_ms)
      }
      return { keyframes, selectedPreset: 'custom' }
    }),
  removeKeyframe: (index) =>
    set((state) => ({
      keyframes: state.keyframes.filter((_, i) => i !== index),
      selectedKeyframeIndex: null,
    })),
  setKeyframes: (kfs) => set({ keyframes: kfs }),
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),
  setZoomJobId: (id) => set({ zoomJobId: id }),
  setSelectedKeyframeIndex: (index) => set({ selectedKeyframeIndex: index }),
  reset: () =>
    set({
      keyframes: [],
      selectedPreset: null,
      zoomJobId: null,
      selectedKeyframeIndex: null,
    }),
}))
