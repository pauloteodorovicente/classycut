import { useEffect, useRef, useCallback } from 'react'
import { Scissors, Loader2, Volume2, VolumeX, CheckSquare, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useSilenceStore } from '../../stores/silenceStore'
import { useProjectStore } from '../../stores/projectStore'
import { detectSilence, cutSilence } from '../../api/silence'
import { getJob } from '../../api/jobs'
import { formatDuration } from '../../lib/formatters'
import type { SilenceSegment } from '../../types/silence'

interface SilenceToolProps {
  projectId: string
}

export default function SilenceTool({ projectId }: SilenceToolProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const queryClient = useQueryClient()
  const {
    segments,
    noiseDb,
    minDuration,
    speechPaddingMs,
    detectionJobId,
    cutJobId,
    setSegments,
    setNoiseDb,
    setMinDuration,
    setSpeechPaddingMs,
    setDetectionJobId,
    setCutJobId,
    toggleSegmentKeep,
    setAllSilenceKeep,
  } = useSilenceStore()

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Poll detection job
  useEffect(() => {
    if (!detectionJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(detectionJobId)
        if (job.status === 'done' && job.result_json) {
          const result = JSON.parse(job.result_json)
          setSegments(result.segments as SilenceSegment[])
          setDetectionJobId(null)
          stopPolling()
          toast.success('Silêncios detectados!')
        } else if (job.status === 'error') {
          setDetectionJobId(null)
          stopPolling()
          toast.error(`Erro: ${job.error_message || 'Falha na detecção'}`)
        }
      } catch {
        // Keep polling on network errors
      }
    }, 1000)

    return stopPolling
  }, [detectionJobId, setSegments, setDetectionJobId, stopPolling])

  // Poll cut job
  useEffect(() => {
    if (!cutJobId) return
    const interval = setInterval(async () => {
      try {
        const job = await getJob(cutJobId)
        if (job.status === 'done') {
          setCutJobId(null)
          clearInterval(interval)
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Corte concluído! Novo arquivo criado.')
        } else if (job.status === 'error') {
          setCutJobId(null)
          clearInterval(interval)
          toast.error(`Erro no corte: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // Keep polling
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [cutJobId, setCutJobId, projectId, queryClient])

  const selectedMedia = mediaFiles.find((f) => f.id === selectedMediaId)

  const handleDetect = async () => {
    if (!selectedMediaId) {
      toast.error('Selecione um arquivo de mídia primeiro')
      return
    }
    try {
      const res = await detectSilence(projectId, {
        media_id: selectedMediaId,
        noise_db: noiseDb,
        min_duration: minDuration,
      })
      setDetectionJobId(res.job_id)
      toast('Detectando silêncios...')
    } catch {
      toast.error('Erro ao iniciar detecção')
    }
  }

  const handleCut = async () => {
    if (!selectedMediaId) return
    // Apply speech padding: expand kept segments into adjacent silence areas
    const totalDuration = segments.length > 0 ? segments[segments.length - 1].end_ms : 0
    const keepSegs = segments
      .filter((s) => s.keep)
      .map((s) => ({
        start_ms: Math.max(0, s.start_ms - speechPaddingMs),
        end_ms: Math.min(totalDuration || s.end_ms + speechPaddingMs, s.end_ms + speechPaddingMs),
      }))

    if (keepSegs.length === 0) {
      toast.error('Nenhum segmento selecionado para manter')
      return
    }

    const ext = selectedMedia?.filename.split('.').pop() || 'mp4'
    const outputName = `cut_${Date.now()}.${ext}`

    try {
      const res = await cutSilence(projectId, {
        media_id: selectedMediaId,
        segments_to_keep: keepSegs,
        output_name: outputName,
      })
      setCutJobId(res.job_id)
      toast('Executando corte...')
    } catch {
      toast.error('Erro ao iniciar corte')
    }
  }

  const silenceSegments = segments.filter((s) => s.type === 'silence')
  const speechSegments = segments.filter((s) => s.type === 'speech')
  const totalSilence = silenceSegments.reduce((sum, s) => sum + s.duration_ms, 0)
  const totalSpeech = speechSegments.reduce((sum, s) => sum + s.duration_ms, 0)
  const removedSilence = silenceSegments.filter((s) => !s.keep).reduce((sum, s) => sum + s.duration_ms, 0)

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Detecção de Silêncio
      </h3>

      {!selectedMediaId && (
        <p className="text-xs text-[var(--text-secondary)]">
          Selecione um arquivo de mídia na aba Mídia
        </p>
      )}

      {selectedMedia && (
        <p className="text-xs text-[var(--text-primary)] truncate">
          {selectedMedia.filename}
        </p>
      )}

      {/* Threshold slider */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Threshold: {noiseDb} dB
        </label>
        <input
          type="range"
          min={-60}
          max={-10}
          step={1}
          value={noiseDb}
          onChange={(e) => setNoiseDb(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
          <span>-60 dB</span>
          <span>-10 dB</span>
        </div>
      </div>

      {/* Min duration slider */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Duração mínima: {minDuration.toFixed(1)}s
        </label>
        <input
          type="range"
          min={0.1}
          max={3.0}
          step={0.1}
          value={minDuration}
          onChange={(e) => setMinDuration(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
          <span>0.1s</span>
          <span>3.0s</span>
        </div>
      </div>

      {/* Speech padding slider */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Margem de fala: {speechPaddingMs}ms
        </label>
        <input
          type="range"
          min={0}
          max={500}
          step={25}
          value={speechPaddingMs}
          onChange={(e) => setSpeechPaddingMs(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
          <span>0ms</span>
          <span>500ms</span>
        </div>
      </div>

      {/* Detect button */}
      <button
        onClick={handleDetect}
        disabled={!selectedMediaId || !!detectionJobId}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {detectionJobId ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Scissors className="w-4 h-4" />
        )}
        {detectionJobId ? 'Detectando...' : 'Detectar Silêncio'}
      </button>

      {/* Results */}
      {segments.length > 0 && (
        <>
          {/* Summary */}
          <div className="bg-[var(--bg-tertiary)] rounded p-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Fala total</span>
              <span className="text-blue-400 font-mono">{formatDuration(totalSpeech)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Silêncio total</span>
              <span className="text-red-400 font-mono">{formatDuration(totalSilence)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">A remover</span>
              <span className="text-orange-400 font-mono">{formatDuration(removedSilence)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Segmentos</span>
              <span className="font-mono">{segments.length}</span>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setAllSilenceKeep(false)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] bg-[var(--bg-tertiary)] hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
            >
              <VolumeX className="w-3 h-3" />
              Remover todos
            </button>
            <button
              onClick={() => setAllSilenceKeep(true)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] bg-[var(--bg-tertiary)] hover:bg-blue-500/20 text-[var(--text-secondary)] hover:text-blue-400 transition-colors"
            >
              <Volume2 className="w-3 h-3" />
              Manter todos
            </button>
          </div>

          {/* Segment list */}
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {segments.map((seg, idx) => (
              <button
                key={idx}
                onClick={() => toggleSegmentKeep(idx)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors
                  ${seg.type === 'silence'
                    ? seg.keep
                      ? 'bg-gray-500/20 text-gray-400'
                      : 'bg-red-500/15 text-red-400'
                    : 'bg-blue-500/15 text-blue-400'
                  }`}
              >
                {seg.keep ? (
                  <CheckSquare className="w-3 h-3 shrink-0" />
                ) : (
                  <Square className="w-3 h-3 shrink-0" />
                )}
                <span className="font-mono">
                  {formatDuration(seg.start_ms)} - {formatDuration(seg.end_ms)}
                </span>
                <span className="flex-1 text-right">
                  {seg.type === 'silence' ? 'silêncio' : 'fala'}
                </span>
              </button>
            ))}
          </div>

          {/* Cut button */}
          <button
            onClick={handleCut}
            disabled={!!cutJobId || segments.filter((s) => s.keep).length === 0}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
              bg-green-600 hover:bg-green-700 text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cutJobId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Scissors className="w-4 h-4" />
            )}
            {cutJobId ? 'Cortando...' : 'Executar Corte'}
          </button>
        </>
      )}
    </div>
  )
}
