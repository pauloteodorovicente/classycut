import { create } from 'zustand'
import type { ExportPreset } from '../types/export'
import type { UpscaleMethod } from '../types/batch'

interface BatchStore {
  // Batch export
  selectedMediaIds: string[]
  batchPreset: ExportPreset
  batchJobId: string | null
  batchProgress: number
  batchTotal: number
  toggleMediaId: (id: string) => void
  selectAllMedia: (ids: string[]) => void
  clearSelection: () => void
  setBatchPreset: (preset: ExportPreset) => void
  setBatchJobId: (id: string | null) => void
  setBatchProgress: (progress: number) => void
  setBatchTotal: (total: number) => void

  // Upscale
  scaleFactor: number
  upscaleMethod: UpscaleMethod
  upscaleJobId: string | null
  setScaleFactor: (factor: number) => void
  setUpscaleMethod: (method: UpscaleMethod) => void
  setUpscaleJobId: (id: string | null) => void
}

export const useBatchStore = create<BatchStore>((set) => ({
  selectedMediaIds: [],
  batchPreset: 'original',
  batchJobId: null,
  batchProgress: 0,
  batchTotal: 0,
  toggleMediaId: (id) =>
    set((state) => ({
      selectedMediaIds: state.selectedMediaIds.includes(id)
        ? state.selectedMediaIds.filter((mid) => mid !== id)
        : [...state.selectedMediaIds, id],
    })),
  selectAllMedia: (ids) => set({ selectedMediaIds: ids }),
  clearSelection: () => set({ selectedMediaIds: [] }),
  setBatchPreset: (preset) => set({ batchPreset: preset }),
  setBatchJobId: (id) => set({ batchJobId: id }),
  setBatchProgress: (progress) => set({ batchProgress: progress }),
  setBatchTotal: (total) => set({ batchTotal: total }),

  scaleFactor: 2,
  upscaleMethod: 'ffmpeg',
  upscaleJobId: null,
  setScaleFactor: (factor) => set({ scaleFactor: factor }),
  setUpscaleMethod: (method) => set({ upscaleMethod: method }),
  setUpscaleJobId: (id) => set({ upscaleJobId: id }),
}))
