import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { Scissors, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import type { TranscriptionSegment } from '../../types/transcription'
import { usePlayerStore } from '../../stores/playerStore'
import { useCutStore } from '../../stores/cutStore'
import { useHistoryStore } from '../../stores/historyStore'

interface TranscriptEditorProps {
  segments: TranscriptionSegment[]
}

interface FlatWord {
  word: string
  startMs: number
  endMs: number
  globalIndex: number
}

// Build a flat list of words from all segments
function flattenWords(segments: TranscriptionSegment[]): FlatWord[] {
  const result: FlatWord[] = []
  let idx = 0
  for (const seg of segments) {
    const words = seg.words ?? []
    if (words.length > 0) {
      for (const w of words) {
        result.push({
          word: w.word,
          startMs: Math.round(w.start * 1000),
          endMs: Math.round(w.end * 1000),
          globalIndex: idx++,
        })
      }
    } else {
      // Fallback: no word-level timestamps — use segment times for whole text
      result.push({
        word: seg.text,
        startMs: Math.round(seg.start * 1000),
        endMs: Math.round(seg.end * 1000),
        globalIndex: idx++,
      })
    }
  }
  return result
}

interface WordSpanProps {
  fw: FlatWord
  onWordClick: (startMs: number) => void
  onMouseDown: (idx: number) => void
  onMouseUp: (idx: number) => void
  isMarkedRemove: boolean
  isMarkedKeep: boolean
  spanRef: (el: HTMLSpanElement | null) => void
}

const WordSpan = memo(function WordSpan({
  fw, onWordClick, onMouseDown, onMouseUp, isMarkedRemove, isMarkedKeep, spanRef,
}: WordSpanProps) {
  let bg = ''
  if (isMarkedRemove) bg = 'bg-red-500/30 text-red-200'
  else if (isMarkedKeep) bg = 'bg-green-500/30 text-green-200'

  return (
    <span
      ref={spanRef}
      data-idx={fw.globalIndex}
      onClick={() => onWordClick(fw.startMs)}
      onMouseDown={() => onMouseDown(fw.globalIndex)}
      onMouseUp={() => onMouseUp(fw.globalIndex)}
      className={`inline cursor-pointer rounded px-0.5 hover:bg-[var(--accent)]/20 transition-colors select-none ${bg}`}
    >
      {fw.word}{' '}
    </span>
  )
})

interface MarkedRange {
  startMs: number
  endMs: number
  keep: boolean
}

export default function TranscriptEditor({ segments }: TranscriptEditorProps) {
  const { setSeekTo, currentTime } = usePlayerStore()
  const { mediaId, durationMs } = useCutStore()
  const executeHistory = useHistoryStore((s) => s.execute)

  const [words] = useState<FlatWord[]>(() => flattenWords(segments))
  const [markedRanges, setMarkedRanges] = useState<MarkedRange[]>([])
  const [selStart, setSelStart] = useState<number | null>(null)
  const [selEnd, setSelEnd] = useState<number | null>(null)
  const [showPopover, setShowPopover] = useState(false)

  // Refs for DOM-based highlight (avoid re-rendering every frame)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const activeIdxRef = useRef<number>(-1)

  // Sync word highlight with currentTime via DOM manipulation
  useEffect(() => {
    const currentMs = currentTime * 1000
    const newIdx = words.findIndex((w) => w.startMs <= currentMs && currentMs < w.endMs)
    if (newIdx === activeIdxRef.current) return

    // Remove previous highlight
    const prev = wordRefs.current[activeIdxRef.current]
    if (prev) prev.style.fontWeight = ''

    // Add new highlight
    const next = wordRefs.current[newIdx]
    if (next) next.style.fontWeight = 'bold'

    activeIdxRef.current = newIdx
  }, [currentTime, words])

  const handleWordClick = useCallback((startMs: number) => {
    setSeekTo(startMs / 1000)
  }, [setSeekTo])

  const handleMouseDown = useCallback((idx: number) => {
    setSelStart(idx)
    setSelEnd(idx)
    setShowPopover(false)
  }, [])

  const handleMouseUp = useCallback((idx: number) => {
    setSelEnd(idx)
    setShowPopover(true)
  }, [])

  const getSelectionRange = (): { startMs: number; endMs: number } | null => {
    if (selStart === null || selEnd === null) return null
    const lo = Math.min(selStart, selEnd)
    const hi = Math.max(selStart, selEnd)
    return {
      startMs: words[lo].startMs,
      endMs: words[hi].endMs,
    }
  }

  const handleMark = (keep: boolean) => {
    const range = getSelectionRange()
    if (!range) return

    const prev = markedRanges
    const next = [...markedRanges, { ...range, keep }]

    executeHistory({
      description: `Mark transcript range as ${keep ? 'keep' : 'remove'}`,
      execute: () => setMarkedRanges(next),
      undo: () => setMarkedRanges(prev),
    })

    setSelStart(null)
    setSelEnd(null)
    setShowPopover(false)
    toast.success(keep ? 'Trecho marcado para manter' : 'Trecho marcado para remover')
  }

  const handleApplyCuts = () => {
    if (markedRanges.length === 0) {
      toast('Nenhum trecho marcado.')
      return
    }
    if (!mediaId || !durationMs) {
      toast.error('Inicialize a ferramenta de corte primeiro.')
      return
    }

    // Build keep-segments from marked ranges
    // Strategy: start with full duration as "keep", then apply remove marks
    const removeRanges = markedRanges.filter((r) => !r.keep)
    if (removeRanges.length === 0) {
      toast('Apenas trechos "manter" marcados — nada a cortar.')
      return
    }

    // Create new segments based on cuts from transcript
    const sorted = [...removeRanges].sort((a, b) => a.startMs - b.startMs)
    const newSegments = useCutStore.getState().segments

    // Cut at each remove range boundary and mark those segments as remove
    for (const range of sorted) {
      useCutStore.getState().cutAtTime(range.startMs)
      useCutStore.getState().cutAtTime(range.endMs)
    }

    // After cuts, toggle keep for segments that fall within remove ranges
    const updatedSegs = useCutStore.getState().segments
    const toggleIds: string[] = []
    for (const seg of updatedSegs) {
      const midMs = (seg.start_ms + seg.end_ms) / 2
      const shouldRemove = sorted.some((r) => r.startMs <= midMs && midMs <= r.endMs)
      if (shouldRemove && seg.keep) {
        toggleIds.push(seg.id)
      }
    }
    for (const id of toggleIds) {
      useCutStore.getState().toggleKeep(id)
    }

    toast.success(`${sorted.length} trecho(s) marcado(s) para corte. Vá para Corte Manual para aplicar.`)
    setMarkedRanges([])
    void newSegments // silence unused warning
  }

  const clearMarks = () => {
    const prev = markedRanges
    executeHistory({
      description: 'Clear transcript marks',
      execute: () => setMarkedRanges([]),
      undo: () => setMarkedRanges(prev),
    })
  }

  const isWordMarked = (fw: FlatWord): { remove: boolean; keep: boolean } => {
    const remove = markedRanges.some((r) => !r.keep && r.startMs <= fw.startMs && fw.endMs <= r.endMs)
    const keep = markedRanges.some((r) => r.keep && r.startMs <= fw.startMs && fw.endMs <= r.endMs)
    return { remove, keep }
  }

  const selectionRange = getSelectionRange()
  const loIdx = selStart !== null && selEnd !== null ? Math.min(selStart, selEnd) : null
  const hiIdx = selStart !== null && selEnd !== null ? Math.max(selStart, selEnd) : null

  return (
    <div className="border-t border-[var(--border)] pt-3 space-y-3">
      <h4 className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
        <Scissors className="w-3.5 h-3.5 text-blue-400" />
        Editar por transcrição
      </h4>
      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
        Clique numa palavra para navegar. Selecione um trecho para marcar para corte.
      </p>

      {/* Word cloud — AC-1, AC-2, AC-3, AC-4 */}
      <div
        className="text-[11px] leading-relaxed bg-[var(--bg-tertiary)] rounded p-2 max-h-48 overflow-y-auto"
        onMouseLeave={() => {
          if (selStart !== null && selEnd !== null && selStart !== selEnd) {
            setShowPopover(true)
          }
        }}
      >
        {words.map((fw) => {
          const { remove, keep } = isWordMarked(fw)
          const isInSelection = loIdx !== null && hiIdx !== null
            && fw.globalIndex >= loIdx && fw.globalIndex <= hiIdx
          const effectiveRemove = remove || (isInSelection && !keep)
          const effectiveKeep = keep

          return (
            <WordSpan
              key={fw.globalIndex}
              fw={fw}
              onWordClick={handleWordClick}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              isMarkedRemove={effectiveRemove && !effectiveKeep}
              isMarkedKeep={effectiveKeep}
              spanRef={(el) => { wordRefs.current[fw.globalIndex] = el }}
            />
          )
        })}
      </div>

      {/* Popover — AC-5 */}
      {showPopover && selectionRange && (
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-[var(--text-secondary)]">Trecho selecionado:</span>
          <button
            onClick={() => handleMark(false)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
          >
            Remover
          </button>
          <button
            onClick={() => handleMark(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
          >
            <Check className="w-3 h-3" />
            Manter
          </button>
        </div>
      )}

      {/* AC-6, AC-7 */}
      {markedRanges.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={handleApplyCuts}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
          >
            <Scissors className="w-3.5 h-3.5" />
            Aplicar cortes ({markedRanges.filter((r) => !r.keep).length})
          </button>
          <button
            onClick={clearMarks}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors
              border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-secondary)]"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  )
}
