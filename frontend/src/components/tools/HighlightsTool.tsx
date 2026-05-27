import { useEffect, useRef, useState } from 'react'
import { Zap, Loader2, Play, CheckSquare, Square, Download } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { detectHighlights, type Highlight } from '../../api/highlights'
import { applyCuts } from '../../api/cuts'
import { getJob } from '../../api/jobs'
import { useProjectStore } from '../../stores/projectStore'
import { usePlayerStore } from '../../stores/playerStore'
import { formatDuration } from '../../lib/formatters'

interface HighlightsToolProps {
  projectId: string
}

export default function HighlightsTool({ projectId }: HighlightsToolProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const { setSeekTo } = usePlayerStore()
  const queryClient = useQueryClient()
  const selectedMedia = mediaFiles.find((m) => m.id === selectedMediaId)

  // Detection config — T-8
  const [sensitivity, setSensitivity] = useState(0.5)
  const [minDuration, setMinDuration] = useState(3)

  // Job state
  const [jobId, setJobId] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)

  // Results — T-9
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Export job
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const exportPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll detection job
  useEffect(() => {
    if (!jobId) return
    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(jobId)
        if (job.status === 'done') {
          clearInterval(pollRef.current!)
          setJobId(null)
          setIsDetecting(false)
          const res = job.result_json ? JSON.parse(job.result_json) : null
          const list: Highlight[] = res?.highlights ?? []
          setHighlights(list)
          setSelected(new Set(list.map((_, i) => i)))
          if (list.length === 0) toast('Nenhum highlight encontrado. Tente reduzir a sensibilidade.')
          else toast.success(`${list.length} highlight(s) detectado(s)`)
        } else if (job.status === 'error') {
          clearInterval(pollRef.current!)
          setJobId(null)
          setIsDetecting(false)
          toast.error(`Erro: ${job.error_message || 'Falha na detecção'}`)
        }
      } catch { /* keep polling */ }
    }, 1000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId])

  // Poll export job — T-12
  useEffect(() => {
    if (!exportJobId) return
    exportPollRef.current = setInterval(async () => {
      try {
        const job = await getJob(exportJobId)
        if (job.status === 'done') {
          clearInterval(exportPollRef.current!)
          setExportJobId(null)
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Highlights exportados! Novo arquivo criado.')
        } else if (job.status === 'error') {
          clearInterval(exportPollRef.current!)
          setExportJobId(null)
          toast.error(`Erro na exportação: ${job.error_message || 'Falha'}`)
        }
      } catch { /* keep polling */ }
    }, 1000)
    return () => { if (exportPollRef.current) clearInterval(exportPollRef.current) }
  }, [exportJobId, projectId, queryClient])

  const detectMutation = useMutation({
    mutationFn: () => detectHighlights(projectId, {
      media_id: selectedMediaId!,
      sensitivity,
      min_duration: minDuration,
    }),
    onSuccess: (data) => {
      setJobId(data.job_id)
      setIsDetecting(true)
      setHighlights([])
      setSelected(new Set())
    },
    onError: () => toast.error('Erro ao iniciar detecção'),
  })

  // T-12: export selected highlights as new file
  const handleExport = async () => {
    if (!selectedMediaId || !selectedMedia) return
    const toExport = highlights
      .filter((_, i) => selected.has(i))
      .sort((a, b) => a.start_ms - b.start_ms)
      .map((h) => ({ start_ms: h.start_ms, end_ms: h.end_ms }))

    if (toExport.length === 0) {
      toast.error('Selecione pelo menos um highlight para exportar')
      return
    }
    const ext = selectedMedia.filename.split('.').pop() || 'mp4'
    const outputName = `${selectedMedia.filename.replace(/\.[^.]+$/, '')}_highlights.${ext}`
    try {
      const res = await applyCuts(projectId, selectedMediaId, toExport, outputName)
      setExportJobId(res.job_id)
      toast('Exportando highlights...')
    } catch {
      toast.error('Erro ao exportar highlights')
    }
  }

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === highlights.length ? new Set() : new Set(highlights.map((_, i) => i))
    )
  }

  if (!selectedMediaId || !selectedMedia) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-[var(--text-secondary)] text-center">
          Selecione um arquivo de mídia na aba Mídia
        </p>
      </div>
    )
  }

  const isProcessing = isDetecting || detectMutation.isPending
  const isExporting = !!exportJobId

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Detecção de Highlights
      </h3>

      {selectedMedia && (
        <p className="text-xs text-[var(--text-primary)] truncate" title={selectedMedia.filename}>
          {selectedMedia.filename}
        </p>
      )}

      {/* Config — T-8 */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-secondary)]">Sensibilidade</span>
            <span className="font-mono">{sensitivity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            disabled={isProcessing}
            className="w-full accent-[var(--accent)] disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-0.5">
            <span>Mais seletivo</span>
            <span>Mais highlights</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--text-secondary)] block mb-1">
            Duração mínima (s)
          </label>
          <input
            type="number"
            min={1} max={60} step={1}
            value={minDuration}
            onChange={(e) => setMinDuration(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={isProcessing}
            className="w-full text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5
              text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]
              disabled:opacity-50"
          />
        </div>
      </div>

      {/* Detect button */}
      <button
        onClick={() => detectMutation.mutate()}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {isProcessing ? 'Analisando áudio...' : 'Detectar Highlights'}
      </button>

      {/* Results — T-9, T-10, T-11 */}
      {highlights.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              {highlights.length} highlight(s) — {selected.size} selecionado(s)
            </span>
            <button
              onClick={toggleAll}
              className="text-[10px] text-[var(--accent)] hover:underline"
            >
              {selected.size === highlights.length ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>

          <div className="space-y-1 max-h-52 overflow-y-auto">
            {highlights.map((h, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors
                  ${selected.has(idx) ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-[var(--bg-tertiary)]'}`}
              >
                {/* Checkbox — T-11 */}
                <button onClick={() => toggleSelect(idx)} className="shrink-0">
                  {selected.has(idx)
                    ? <CheckSquare className="w-3 h-3 text-yellow-400" />
                    : <Square className="w-3 h-3 text-[var(--text-secondary)]" />
                  }
                </button>

                {/* Seek button — T-10 */}
                <button
                  onClick={() => setSeekTo(h.start_ms / 1000)}
                  className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                  title="Ir para este momento"
                >
                  <Play className="w-3 h-3" />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-mono text-[var(--text-primary)]">
                      {formatDuration(h.start_ms)}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {formatDuration(h.duration_ms)}
                    </span>
                  </div>
                  {/* Energy bar — T-9 */}
                  <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${Math.min(h.energy * 100 * 3, 100)}%` }}
                    />
                  </div>
                </div>

                <span className="shrink-0 text-[var(--text-secondary)] font-mono">
                  {(h.energy * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* Export button — T-12 */}
          <button
            onClick={handleExport}
            disabled={selected.size === 0 || isExporting}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
              bg-green-600 hover:bg-green-700 text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />
            }
            {isExporting ? 'Exportando...' : `Exportar ${selected.size} highlight(s)`}
          </button>
        </div>
      )}
    </div>
  )
}
