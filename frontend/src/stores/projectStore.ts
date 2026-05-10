import { create } from 'zustand'
import type { MediaFile } from '../types/media'

interface ProjectStore {
  selectedMediaId: string | null
  mediaFiles: MediaFile[]
  setSelectedMediaId: (id: string | null) => void
  setMediaFiles: (files: MediaFile[]) => void
  addMediaFiles: (files: MediaFile[]) => void
  removeMediaFile: (id: string) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  selectedMediaId: null,
  mediaFiles: [],
  setSelectedMediaId: (id) => set({ selectedMediaId: id }),
  setMediaFiles: (files) => set({ mediaFiles: files }),
  addMediaFiles: (files) =>
    set((state) => ({ mediaFiles: [...state.mediaFiles, ...files] })),
  removeMediaFile: (id) =>
    set((state) => ({
      mediaFiles: state.mediaFiles.filter((f) => f.id !== id),
      selectedMediaId: state.selectedMediaId === id ? null : state.selectedMediaId,
    })),
}))
