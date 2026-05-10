import { create } from 'zustand'
import type { ExportPreset } from '../types/export'

interface ExportStore {
  selectedPreset: ExportPreset
  exportJobId: string | null
  setSelectedPreset: (preset: ExportPreset) => void
  setExportJobId: (id: string | null) => void
}

export const useExportStore = create<ExportStore>((set) => ({
  selectedPreset: 'original',
  exportJobId: null,
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),
  setExportJobId: (id) => set({ exportJobId: id }),
}))
