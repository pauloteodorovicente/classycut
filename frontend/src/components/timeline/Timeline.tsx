import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { usePlayerStore } from '../../stores/playerStore'
import { useSilenceStore } from '../../stores/silenceStore'
import { useCutStore } from '../../stores/cutStore'
import { useUIStore } from '../../stores/uiStore'
import { Film, Music } from 'lucide-react'
import { formatDuration } from '../../lib/formatters'
import { useWaveform } from '../../hooks/useWaveform'

export default function Timeline() {
  const { mediaFiles, selectedMediaId, setSelectedMediaId } = useProjectStore()
  const { currentTime, duration, setSeekTo } = usePlayerStore()
  const { segments, toggleSegmentKeep, updateSegmentBounds } = useSilenceStore()
  const { segments: cutSegments } = useCutStore()
  const { activeTool } = useUIStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const showSilenceTimeline = activeTool === 'silence' && segments.length > 0
  const showCutTimeline = activeTool === 'cut' && cutSegments.length > 0

  const selectedMedia = mediaFiles.find((m) => m.id === selectedMediaId)
  const { waveformData, isLoading, waveformColor } = useWaveform(selectedMediaId, selectedMedia?.media_type)

  const totalMs = useMemo(
    () => (segments.length > 0 ? segments[segments.length - 1].end_ms : (duration * 1000) || 1),
    [segments, duration]
  )
  const cutTotalMs = useMemo(
    () => (cutSegments.length > 0 ? cutSegments[cutSegments.length - 1].end_ms : (duration * 1000) || 1),
    [cutSegments, duration]
  )

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const barWidth = canvas.width / waveformData.length
    const midY = canvas.height / 2

    ctx.fillStyle = waveformColor
    waveformData.forEach((amp, i) => {
      const barH = Math.max(1, amp * canvas.height * 0.9)
      ctx.fillRect(i * barWidth, midY - barH / 2, Math.max(1, barWidth - 0.5), barH)
    })
  }, [waveformData, zoomLevel, waveformColor])

  // Ctrl+Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.2 : 0.2
      const next = Math.min(10, Math.max(1, Math.round((zoomLevel + delta) * 10) / 10))
      setZoomLevel(next)
    },
    [zoomLevel]
  )

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!scrollRef.current || duration <= 0) return
    const container = scrollRef.current
    const innerWidth = container.scrollWidth
    const playheadX = (currentTime / duration) * innerWidth
    const viewLeft = container.scrollLeft
    const viewRight = viewLeft + container.clientWidth
    if (playheadX < viewLeft + 20 || playheadX > viewRight - 20) {
      container.scrollLeft = Math.max(0, playheadX - container.clientWidth / 2)
    }
  }, [currentTime, duration])

  // Position helpers
  const xToTime = useCallback(
    (x: number, containerWidth: number): number => {
      const innerWidth = containerWidth * zoomLevel
      return (x / innerWidth) * duration
    },
    [zoomLevel, duration]
  )

  const getInnerX = useCallback(
    (e: React.MouseEvent | MouseEvent, container: HTMLElement): number => {
      const rect = container.getBoundingClientRect()
      return e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0)
    },
    []
  )

  // Playhead drag
  const startPlayheadDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDraggingPlayhead(true)
      const container = scrollRef.current
      if (!container) return

      const onMove = (ev: MouseEvent) => {
        const x = ev.clientX - container.getBoundingClientRect().left + container.scrollLeft
        const t = Math.max(0, Math.min(duration, xToTime(x, container.clientWidth)))
        setSeekTo(t)
      }
      const onUp = () => {
        setIsDraggingPlayhead(false)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [duration, xToTime, setSeekTo]
  )

  // Click anywhere on timeline to seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDraggingPlayhead) return
      const container = scrollRef.current
      if (!container || duration <= 0) return
      const x = getInnerX(e, container)
      const t = Math.max(0, Math.min(duration, xToTime(x, container.clientWidth)))
      setSeekTo(t)
    },
    [isDraggingPlayhead, duration, xToTime, getInnerX, setSeekTo]
  )

  // Segment border drag
  const startBorderDrag = useCallback(
    (e: React.MouseEvent, segIdx: number, side: 'left' | 'right') => {
      e.stopPropagation()
      e.preventDefault()
      const container = scrollRef.current
      if (!container) return

      const onMove = (ev: MouseEvent) => {
        const x = ev.clientX - container.getBoundingClientRect().left + container.scrollLeft
        const newTimeMs = Math.round(Math.max(0, Math.min(totalMs, xToTime(x, container.clientWidth) * 1000)))
        const seg = segments[segIdx]
        if (!seg) return
        if (side === 'left') {
          const maxStart = seg.end_ms - 50
          updateSegmentBounds(segIdx, Math.min(newTimeMs, maxStart), seg.end_ms)
        } else {
          const minEnd = seg.start_ms + 50
          updateSegmentBounds(segIdx, seg.start_ms, Math.max(newTimeMs, minEnd))
        }
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [segments, totalMs, xToTime, updateSegmentBounds]
  )

  const rulerMarks = useMemo(() => {
    if (duration <= 0) return []
    const marks: { time: number; label: string }[] = []
    const stepOptions = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
    const idealStep = duration / (10 * zoomLevel)
    const step = stepOptions.find((s) => s >= idealStep) ?? 600
    for (let t = 0; t <= duration; t += step) {
      marks.push({ time: t, label: formatDuration(t * 1000) })
    }
    return marks
  }, [duration, zoomLevel])

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  if (mediaFiles.length === 0) {
    return (
      <div className="h-36 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">Importe media para começar a editar</p>
      </div>
    )
  }

  if (showCutTimeline) {
    return (
      <div
        className="h-36 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex flex-col select-none"
        onWheel={handleWheel}
      >
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden cursor-pointer"
          onClick={handleTimelineClick}
        >
          <div className="relative h-full" style={{ width: `${zoomLevel * 100}%` }}>
            {/* Ruler */}
            <div className="h-6 bg-[var(--bg-tertiary)] border-b border-[var(--border)] relative">
              {rulerMarks.map((mark) => {
                const pct = duration > 0 ? (mark.time / duration) * 100 : 0
                return (
                  <div
                    key={mark.time}
                    className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
                    style={{ left: `${pct}%` }}
                  >
                    <div className="w-px h-2 bg-[var(--text-secondary)] opacity-50" />
                    <span className="text-[8px] text-[var(--text-secondary)] font-mono whitespace-nowrap">
                      {mark.label}
                    </span>
                  </div>
                )
              })}
              {/* Playhead on ruler */}
              <div
                className="absolute top-0 w-3 h-full flex flex-col items-center cursor-ew-resize z-20"
                style={{ left: `calc(${playheadPercent}% - 6px)` }}
                onMouseDown={startPlayheadDrag}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-white mt-0.5" />
                <div className="w-0.5 flex-1 bg-white" />
              </div>
            </div>

            {/* Segments + waveform */}
            <div className="relative" style={{ height: 'calc(100% - 24px - 20px)' }}>
              {waveformData.length > 0 && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              )}

              {cutSegments.map((seg) => {
                const left = (seg.start_ms / cutTotalMs) * 100
                const width = ((seg.end_ms - seg.start_ms) / cutTotalMs) * 100
                return (
                  <div
                    key={seg.id}
                    className={`absolute top-0 h-full border-r border-[var(--bg-secondary)] hover:brightness-125 cursor-pointer
                      ${seg.keep ? 'bg-blue-400/20' : 'bg-red-400/20'}`}
                    style={{ left: `${left}%`, width: `${Math.max(width, 0.1)}%` }}
                    onClick={(e) => e.stopPropagation()}
                    title={`${seg.keep ? 'Manter' : 'Remover'}: ${formatDuration(seg.start_ms)} – ${formatDuration(seg.end_ms)}`}
                  />
                )
              })}

              {/* Playhead line */}
              <div
                className="absolute top-0 w-0.5 h-full bg-white z-10 pointer-events-none"
                style={{ left: `${playheadPercent}%` }}
              />
            </div>

            {/* Legend */}
            <div className="h-5 flex items-center gap-4 px-3 border-t border-[var(--border)]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-blue-400/20 rounded-sm" />
                <span className="text-[9px] text-[var(--text-secondary)]">Manter</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-red-400/20 rounded-sm" />
                <span className="text-[9px] text-[var(--text-secondary)]">Remover</span>
              </div>
              <div className="ml-auto text-[9px] text-[var(--text-secondary)] font-mono">
                Tecla C para cortar · Ctrl+Z desfazer · {zoomLevel.toFixed(1)}x
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!showSilenceTimeline) {
    return (
      <div className="h-36 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex flex-col">
        <div className="h-6 bg-[var(--bg-tertiary)] border-b border-[var(--border)] flex items-center px-2">
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">Timeline</span>
        </div>
        <div className="relative flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {isLoading && (
            <div className="absolute inset-0 pointer-events-none animate-pulse bg-[var(--accent)]/5" />
          )}
          {waveformData.length > 0 && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
            />
          )}
          {mediaFiles.map((media) => (
            <div
              key={media.id}
              onClick={() => setSelectedMediaId(media.id)}
              className={`relative flex items-center gap-2 h-10 px-3 rounded cursor-pointer transition-colors
                ${selectedMediaId === media.id
                  ? 'bg-[var(--accent)]/30 border border-[var(--accent)]/50'
                  : 'bg-[var(--bg-tertiary)]/80 hover:bg-[var(--bg-tertiary)]'}`}
            >
              {media.media_type === 'video' ? (
                <Film className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Music className="w-3.5 h-3.5 text-green-400" />
              )}
              <span className="text-xs truncate flex-1">{media.filename}</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                {formatDuration(media.duration_ms ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-36 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex flex-col select-none"
      onWheel={handleWheel}
    >
      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden cursor-pointer"
        onClick={handleTimelineClick}
      >
        <div className="relative h-full" style={{ width: `${zoomLevel * 100}%` }}>
          {/* Ruler */}
          <div className="h-6 bg-[var(--bg-tertiary)] border-b border-[var(--border)] relative">
            {rulerMarks.map((mark) => {
              const pct = duration > 0 ? (mark.time / duration) * 100 : 0
              return (
                <div
                  key={mark.time}
                  className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
                  style={{ left: `${pct}%` }}
                >
                  <div className="w-px h-2 bg-[var(--text-secondary)] opacity-50" />
                  <span className="text-[8px] text-[var(--text-secondary)] font-mono whitespace-nowrap">
                    {mark.label}
                  </span>
                </div>
              )
            })}
            {/* Playhead on ruler — draggable */}
            <div
              className="absolute top-0 w-3 h-full flex flex-col items-center cursor-ew-resize z-20"
              style={{ left: `calc(${playheadPercent}% - 6px)` }}
              onMouseDown={startPlayheadDrag}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-white mt-0.5" />
              <div className="w-0.5 flex-1 bg-white" />
            </div>
          </div>

          {/* Waveform + segments */}
          <div className="relative" style={{ height: 'calc(100% - 24px - 20px)' }}>
            {/* Waveform canvas */}
            {waveformData.length > 0 && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            )}

            {/* Segments */}
            {segments.map((seg, idx) => {
              const left = (seg.start_ms / totalMs) * 100
              const width = (seg.duration_ms / totalMs) * 100

              let bgColor: string
              if (seg.type === 'speech') bgColor = 'bg-blue-400/20'
              else if (seg.keep) bgColor = 'bg-slate-400/15'
              else bgColor = 'bg-red-400/20'

              return (
                <div
                  key={idx}
                  className={`absolute top-0 h-full ${bgColor} border-r border-[var(--bg-secondary)] hover:brightness-125`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.1)}%` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSegmentKeep(idx)
                  }}
                  title={`${seg.type === 'silence' ? 'Silêncio' : 'Fala'}: ${formatDuration(seg.start_ms)} – ${formatDuration(seg.end_ms)}`}
                >
                  {/* Left border handle */}
                  <div
                    className="absolute left-0 top-0 w-2 h-full cursor-ew-resize z-10 hover:bg-white/30 group-hover:opacity-100"
                    onMouseDown={(e) => startBorderDrag(e, idx, 'left')}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {/* Right border handle */}
                  <div
                    className="absolute right-0 top-0 w-2 h-full cursor-ew-resize z-10 hover:bg-white/30"
                    onMouseDown={(e) => startBorderDrag(e, idx, 'right')}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )
            })}

            {/* Playhead line over segments */}
            <div
              className="absolute top-0 w-0.5 h-full bg-white z-10 pointer-events-none"
              style={{ left: `${playheadPercent}%` }}
            />
          </div>

          {/* Legend + zoom indicator */}
          <div className="h-5 flex items-center gap-4 px-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-blue-400/20 rounded-sm" />
              <span className="text-[9px] text-[var(--text-secondary)]">Fala</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-red-400/20 rounded-sm" />
              <span className="text-[9px] text-[var(--text-secondary)]">Silêncio (remover)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-slate-400/15 rounded-sm" />
              <span className="text-[9px] text-[var(--text-secondary)]">Silêncio (manter)</span>
            </div>
            <div className="ml-auto text-[9px] text-[var(--text-secondary)] font-mono">
              Ctrl+Scroll para zoom · {zoomLevel.toFixed(1)}x
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
