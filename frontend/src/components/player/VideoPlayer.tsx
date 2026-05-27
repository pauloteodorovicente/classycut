import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { getStreamUrl } from '../../api/media'
import PlayerControls from './PlayerControls'
import SubtitleOverlay from './SubtitleOverlay'

interface VideoPlayerProps {
  mediaId: string | null
}

export default function VideoPlayer({ mediaId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const {
    setCurrentTime, setDuration, setIsPlaying,
    volume, setVolume, seekTo, setSeekTo,
    playbackRate, setPlaybackRate,
  } = usePlayerStore()

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }, [setCurrentTime])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }, [setDuration])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
  }, [setIsPlaying])

  // Sync volume
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume
  }, [volume])

  // Sync seekTo
  useEffect(() => {
    if (seekTo !== null && videoRef.current) {
      videoRef.current.currentTime = seekTo
      setSeekTo(null)
    }
  }, [seekTo, setSeekTo])

  // Sync playbackRate
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate
  }, [playbackRate])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      if (e.key === ' ') {
        e.preventDefault()
        if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play()
          else videoRef.current.pause()
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setVolume(Math.min(1, volume + 0.05))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setVolume(Math.max(0, volume - 0.05))
      } else if (e.key === 'c' || e.key === 'C') {
        setPlaybackRate(playbackRate + 0.1)
      } else if (e.key === 'x' || e.key === 'X') {
        setPlaybackRate(playbackRate - 0.1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playbackRate, setPlaybackRate, volume, setVolume])

  if (!mediaId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black rounded-lg">
        <p className="text-[var(--text-secondary)] text-sm">
          Selecione um arquivo de mídia para visualizar
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-black rounded-lg overflow-hidden">
      <div className="flex-1 flex items-center justify-center min-h-0 relative">
        <video
          ref={videoRef}
          src={getStreamUrl(mediaId)}
          className="max-w-full max-h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <SubtitleOverlay />
      </div>
      <PlayerControls videoRef={videoRef} />
    </div>
  )
}
