import { useEffect, useRef } from 'react'
import { Split, Undo2, Redo2, Trash2, CheckSquare, Square, Loader2, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useCutStore } from '../../stores/cutStore'
import { useHistoryStore } from '../../stores/historyStore'
import { usePlayerStore } from '../../stores/playerStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import PlatformSelector from '../ui/PlatformSelector'
import { applyCuts } from '../../api/cuts'
import { getJob } from '../../api/jobs'
import { formatDuration } from '../../lib/formatters'

interface CutToolbarProps {
  projectId: string
}

export default function CutToolbar({ projectId }: CutToolbarProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const { currentTime, duration } = usePlayerStore()
  const {
    segments,
    mediaId: storeMediaId,
    jobId,
    initFromMedia,
    cutAtTime,
    toggleKeep,
    removeSegment,
    reset,
    setJobId,
  } = useCutStore()
  const { past, future, undo, redo } = useHistoryStore()
  const { platformPreset } = useUIStore()
  const queryClient = useQueryClient()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedMedia = mediaFiles.find((m) => m.id === selectedMediaId)

  // Init store when media is selected
  useEffect(() => {
    if (selectedMediaId && selectedMedia?.duration_ms) {
      initFromMedia(selectedMediaId, selectedMedia.duration_ms)
    }
  }, [selectedMediaId, selectedMedia?.duration_ms, initFromMedia])

  // Reset store when media changes
  useEffect(() => {
    if (selectedMediaId && storeMediaId && selectedMediaId !== storeMediaId) {
      initFromMedia(selectedMediaId, selectedMedia?.duration_ms ?? 0)
    }
  }, [selectedMediaId, storeMediaId, selectedMedia?.duration_ms, initFromMedia])

  // Poll cut job
  useEffect(() => {
    if (!jobId) return
    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(jobId)
        if (job.status === 'done') {
          setJobId(null)
          clearInterval(pollRef.current!)
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Corte concluído! Novo arquivo criado.')
        } else if (job.status === 'error') {
          setJobId(null)
          clearInterval(pollRef.current!)
          toast.error(`Erro no corte: ${job.error_message || 'Falha'}`)
        }
      } catch { /* keep polling */ }
    }, 1000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId, projectId, queryClient, setJobId])

  const handleCut = () => {
    if (!selectedMediaId || duration <= 0) return
    const timeMs = Math.round(currentTime * 1000)
    if (timeMs <= 0 || timeMs >= (selectedMedia?.duration_ms ?? 0)) {
      toast.error('Posicione o player em um ponto dentro do clipe')
      return
    }
    cutAtTime(timeMs)
  }

  // Keyboard shortcut: C to cut (Ctrl+Z/Y handled globally in EditorPage)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        handleCut()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleApply = async () => {
    if (!selectedMediaId || !selectedMedia) return
    const toKeep = segments.filter((s) => s.keep).map((s) => ({
      start_ms: s.start_ms,
      end_ms: s.end_ms,
    }))
    if (toKeep.length === 0) {
      toast.error('Nenhum segmento marcado para manter')
      return
    }
    const ext = selectedMedia.filename.split('.').pop() || 'mp4'
    const outputName = `${selectedMedia.filename.replace(/\.[^.]+$/, '')}_cortado.${ext}`
    try {
      const res = await applyCuts(projectId, selectedMediaId, toKeep, outputName, platformPreset !== 'original' ? platformPreset : undefined)
      setJobId(res.job_id)
      toast('Processando corte...')
    } catch {
      toast.error('Erro ao aplicar cortes')
    }
  }

  const keepMs = segments.filter((s) => s.keep).reduce((sum, s) => sum + (s.end_ms - s.start_ms), 0)
  const removeMs = segments.filter((s) => !s.keep).reduce((sum, s) => sum + (s.end_ms - s.start_ms), 0)
  const hasPending = segments.some((s) => !s.keep) || segments.length > 1

  if (!selectedMediaId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-[var(--text-secondary)] text-center">
          Selecione um arquivo de mídia na aba Mídia
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Corte Manual
      </h3>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        Posicione o player e clique <strong className="text-[var(--text-primary)]">Cortar aqui</strong> (ou tecla <kbd className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono text-[10px]">C</kbd>) para dividir o clipe.
      </p>

      {selectedMedia && (
        <p className="text-xs text-[var(--text-primary)] truncate" title={selectedMedia.filename}>
          {selectedMedia.filename}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCut}
          disabled={!selectedMediaId || !!jobId}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded text-xs font-medium
            bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Tecla C"
        >
          <Split className="w-3.5 h-3.5" />
          Cortar aqui
        </button>
        <button
          onClick={undo}
          disabled={past.length === 0 || !!jobId}
          className="px-2 py-2 rounded text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0 || !!jobId}
          className="px-2 py-2 rounded text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={reset}
          disabled={segments.length <= 1 && segments[0]?.keep === true || !!jobId}
          className="px-2 py-2 rounded text-xs bg-[var(--bg-tertiary)] hover:bg-red-500/20
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Resetar"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary */}
      {segments.length > 0 && (
        <div className="bg-[var(--bg-tertiary)] rounded p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Manter</span>
            <span className="text-green-400 font-mono">{formatDuration(keepMs)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Remover</span>
            <span className="text-red-400 font-mono">{formatDuration(removeMs)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Segmentos</span>
            <span className="font-mono">{segments.length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Desfazeres</span>
            <span className="font-mono text-[var(--text-secondary)]">{past.length}/100</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Refazeres</span>
            <span className="font-mono text-[var(--text-secondary)]">{future.length}/100</span>
          </div>
        </div>
      )}

      {/* Segment list */}
      {segments.length > 1 && (
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {segments.map((seg, idx) => (
            <div
              key={seg.id}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-[10px] transition-colors
                ${seg.keep ? 'bg-green-500/15' : 'bg-red-500/15'}`}
            >
              <button
                onClick={() => toggleKeep(seg.id)}
                className="shrink-0"
                title={seg.keep ? 'Clique para remover' : 'Clique para manter'}
              >
                {seg.keep
                  ? <CheckSquare className="w-3 h-3 text-green-400" />
                  : <Square className="w-3 h-3 text-red-400" />
                }
              </button>
              <span className={`font-mono flex-1 ${seg.keep ? 'text-green-300' : 'text-red-300'}`}>
                {formatDuration(seg.start_ms)} – {formatDuration(seg.end_ms)}
              </span>
              <span className="text-[var(--text-secondary)] font-mono">
                {formatDuration(seg.end_ms - seg.start_ms)}
              </span>
              <button
                onClick={() => removeSegment(seg.id)}
                className="shrink-0 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                title={`Remover segmento ${idx + 1}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Platform selector — AC-1, AC-6 */}
      <PlatformSelector />

      {/* Apply button */}
      <button
        onClick={handleApply}
        disabled={!hasPending || !!jobId}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-green-600 hover:bg-green-700 text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {jobId ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Split className="w-4 h-4" />
        )}
        {jobId ? 'Processando...' : 'Aplicar cortes'}
      </button>
    </div>
  )
}
