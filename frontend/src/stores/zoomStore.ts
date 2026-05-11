import { create } from 'zustand'
import type { ZoomKeyframe, ZoomPreset } from '../types/zoom'
import { useHistoryStore } from './historyStore'

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

export const useZoomStore = create<ZoomStore>((set, get) => ({
  keyframes: [],
  selectedPreset: null,
  zoomJobId: null,
  selectedKeyframeIndex: null,

  addKeyframe: (kf) => {
    const prevKeyframes = get().keyframes
    const nextKeyframes = [...prevKeyframes, kf].sort((a, b) => a.time_ms - b.time_ms)
    useHistoryStore.getState().execute({
      description: `Add keyframe at ${kf.time_ms}ms`,
      execute: () => set({ keyframes: nextKeyframes, selectedPreset: 'custom' }),
      undo: () => set({ keyframes: prevKeyframes }),
    })
  },

  updateKeyframe: (index, partial) => {
    const prevKeyframes = get().keyframes
    const nextKeyframes = [...prevKeyframes]
    if (nextKeyframes[index]) {
      nextKeyframes[index] = { ...nextKeyframes[index], ...partial }
      nextKeyframes.sort((a, b) => a.time_ms - b.time_ms)
    }
    useHistoryStore.getState().execute({
      description: `Update keyframe ${index}`,
      execute: () => set({ keyframes: nextKeyframes, selectedPreset: 'custom' }),
      undo: () => set({ keyframes: prevKeyframes }),
    })
  },

  removeKeyframe: (index) => {
    const prevKeyframes = get().keyframes
    const prevIndex = get().selectedKeyframeIndex
    const nextKeyframes = prevKeyframes.filter((_, i) => i !== index)
    useHistoryStore.getState().execute({
      description: `Remove keyframe ${index}`,
      execute: () => set({ keyframes: nextKeyframes, selectedKeyframeIndex: null }),
      undo: () => set({ keyframes: prevKeyframes, selectedKeyframeIndex: prevIndex }),
    })
  },

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
