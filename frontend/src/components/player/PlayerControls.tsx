import type { RefObject } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { formatTimeSeconds } from '../../lib/formatters'

interface PlayerControlsProps {
  videoRef: RefObject<HTMLVideoElement | null>
}

export default function PlayerControls({ videoRef }: PlayerControlsProps) {
  const { isPlaying, currentTime, duration, volume, setVolume, playbackRate, setPlaybackRate } =
    usePlayerStore()

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) videoRef.current.pause()
    else videoRef.current.play()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) videoRef.current.currentTime = time
  }

  const toggleMute = () => setVolume(volume > 0 ? 0 : 1)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-secondary)]">
      <button onClick={togglePlay} className="p-1 hover:text-[var(--accent)] transition-colors">
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>

      <span className="text-xs text-[var(--text-secondary)] w-12 text-right font-mono">
        {formatTimeSeconds(currentTime)}
      </span>

      <div className="flex-1 relative h-5 flex items-center group">
        <div className="absolute w-full h-1 bg-[var(--bg-tertiary)] rounded-full">
          <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="absolute w-full h-1 opacity-0 cursor-pointer"
        />
      </div>

      <span className="text-xs text-[var(--text-secondary)] w-12 font-mono">
        {formatTimeSeconds(duration)}
      </span>

      {/* Playback rate */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPlaybackRate(playbackRate - 0.1)}
          className="text-[10px] w-4 h-4 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
          title="Desacelerar (X)"
        >
          ‹
        </button>
        <button
          onClick={() => setPlaybackRate(1.0)}
          className={`text-[10px] w-8 text-center font-mono transition-colors
            ${playbackRate !== 1.0 ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
          title="Reset velocidade"
        >
          {playbackRate.toFixed(1)}x
        </button>
        <button
          onClick={() => setPlaybackRate(playbackRate + 0.1)}
          className="text-[10px] w-4 h-4 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
          title="Acelerar (C)"
        >
          ›
        </button>
      </div>

      <button onClick={toggleMute} className="p-1 hover:text-[var(--accent)] transition-colors">
        {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </div>
  )
}
