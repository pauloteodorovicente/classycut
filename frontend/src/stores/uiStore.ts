import { create } from 'zustand'

type ActiveTool = 'media' | 'merge' | 'silence' | 'transcription' | 'subtitles' | 'zoom' | 'export' | 'ai' | 'batch'

interface UIStore {
  activeTool: ActiveTool
  sidebarOpen: boolean
  setActiveTool: (tool: ActiveTool) => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeTool: 'media',
  sidebarOpen: true,
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
