import { create } from 'zustand'

export interface EditCommand {
  description: string
  execute: () => void
  undo: () => void
}

const MAX_HISTORY = 100

interface HistoryStore {
  past: EditCommand[]
  future: EditCommand[]
  execute: (cmd: EditCommand) => void
  undo: () => void
  redo: () => void
  clear: () => void
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],

  execute: (cmd) => {
    cmd.execute()
    set((state) => ({
      past: [...state.past.slice(-(MAX_HISTORY - 1)), cmd],
      future: [],
    }))
  },

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return
    const cmd = past[past.length - 1]
    cmd.undo()
    set({
      past: past.slice(0, -1),
      future: [...future.slice(-(MAX_HISTORY - 1)), cmd],
    })
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return
    const cmd = future[future.length - 1]
    cmd.execute()
    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), cmd],
      future: future.slice(0, -1),
    })
  },

  clear: () => set({ past: [], future: [] }),
}))
