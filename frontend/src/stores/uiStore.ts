import { create } from 'zustand'

type ActiveTool = 'media' | 'merge' | 'silence' | 'cut' | 'transcription' | 'subtitles' | 'zoom' | 'export' | 'ai' | 'batch' | 'compression' | 'upscale' | 'highlights' | 'chapters'

export type PlatformPreset = 'original' | 'instagram_reels' | 'tiktok' | 'youtube_shorts' | 'whatsapp' | 'youtube'

interface UIStore {
  activeTool: ActiveTool
  sidebarOpen: boolean
  platformPreset: PlatformPreset
  setActiveTool: (tool: ActiveTool) => void
  setSidebarOpen: (open: boolean) => void
  setPlatformPreset: (preset: PlatformPreset) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeTool: 'media',
  sidebarOpen: true,
  platformPreset: 'original',
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setPlatformPreset: (preset) => set({ platformPreset: preset }),
}))
