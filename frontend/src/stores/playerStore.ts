import { create } from 'zustand'

interface PlayerStore {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  seekTo: number | null
  playbackRate: number
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setSeekTo: (time: number | null) => void
  setPlaybackRate: (rate: number) => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  seekTo: null,
  playbackRate: 1.0,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setSeekTo: (time) => set({ seekTo: time }),
  setPlaybackRate: (rate) => set({ playbackRate: Math.min(3.0, Math.max(0.1, Math.round(rate * 10) / 10)) }),
}))
