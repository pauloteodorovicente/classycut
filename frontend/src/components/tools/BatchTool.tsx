import { useEffect, useRef, useState } from 'react'
import {
  Layers,
  Loader2,
  ArrowUpCircle,
  CheckSquare,
  Square,
  Monitor,
  Smartphone,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useBatchStore } from '../../stores/batchStore'
import { useProjectStore } from '../../stores/projectStore'
import { startBatchExport, startUpscale } from '../../api/batch'
import { getJob } from '../../api/jobs'
import type { ExportPreset } from '../../types/export'

interface BatchToolProps {
  projectId: string
}

type BatchTab = 'batch' | 'upscale'

interface PresetOption {
  id: ExportPreset
  label: string
  resolution: string
}

const PRESETS: PresetOption[] = [
  { id: 'original', label: 'Original', resolution: 'Sem re-encode' },
  { id: 'youtube', label: 'YouTube', resolution: '1920×1080' },
  { id: 'tiktok', label: 'TikTok', resolution: '1080×1920' },
  { id: 'instagram_portrait', label: 'IG Retrato', resolution: '1080×1350' },
  { id: 'instagram_square', label: 'IG Quadrado', resolution: '1080×1080' },
]

function PresetIcon({ id }: { id: string }) {
  if (id === 'tiktok' || id === 'instagram_portrait')
    return <Smartphone className="w-3 h-3" />
  if (id === 'instagram_square')
    return <Square className="w-3 h-3" />
  return <Monitor className="w-3 h-3" />
}

export default function BatchTool({ projectId }: BatchToolProps) {
  const { mediaFiles, selectedMediaId } = useProjectStore()
  const queryClient = useQueryClient()
  const {
    selectedMediaIds, batchPreset, batchJobId, batchProgress, batchTotal,
    toggleMediaId, selectAllMedia, clearSelection, setBatchPreset,
    setBatchJobId, setBatchProgress, setBatchTotal,
    scaleFactor, upscaleMethod, upscaleJobId,
    setScaleFactor, setUpscaleMethod, setUpscaleJobId,
  } = useBatchStore()

  const [activeTab, setActiveTab] = useState<BatchTab>('batch')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // Poll batch export job
  useEffect(() => {
    if (!batchJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(batchJobId)
        if (job.progress > 0) {
          setBatchProgress(job.progress)
        }
        if (job.status === 'done' && job.result_json) {
          const result = JSON.parse(job.result_json)
          setBatchJobId(null)
          setBatchProgress(0)
          stopPolling()
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          const msg = result.errors > 0
            ? `Batch concluído: ${result.completed}/${result.total} (${result.errors} erro(s))`
            : `Batch concluído! ${result.completed} arquivo(s) exportado(s).`
          toast.success(msg)
        } else if (job.status === 'error') {
          setBatchJobId(null)
          setBatchProgress(0)
          stopPolling()
          toast.error(`Erro no batch: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // Keep polling
      }
    }, 1500)

    return stopPolling
  }, [batchJobId, setBatchJobId, setBatchProgress, projectId, queryClient])

  // Poll upscale job
  useEffect(() => {
    if (!upscaleJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(upscaleJobId)
        if (job.status === 'done') {
          setUpscaleJobId(null)
          stopPolling()
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Upscale concluído! Arquivo disponível na aba Mídia.')
        } else if (job.status === 'error') {
          setUpscaleJobId(null)
          stopPolling()
          toast.error(`Erro no upscale: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // Keep polling
      }
    }, 1500)

    return stopPolling
  }, [upscaleJobId, setUpscaleJobId, projectId, queryClient])

  const videoFiles = mediaFiles.filter((f) => f.media_type === 'video')

  const handleBatchExport = async () => {
    if (selectedMediaIds.length === 0) {
      toast.error('Selecione ao menos um arquivo')
      return
    }
    try {
      const res = await startBatchExport(projectId, {
        media_ids: selectedMediaIds,
        preset: batchPreset,
      })
      setBatchJobId(res.job_id)
      setBatchTotal(res.total)
      setBatchProgress(0)
      toast(`Processando ${res.total} arquivo(s) em lote...`)
    } catch {
      toast.error('Erro ao iniciar batch export')
    }
  }

  const handleUpscale = async () => {
    if (!selectedMediaId) {
      toast.error('Selecione um arquivo de mídia primeiro')
      return
    }
    const media = mediaFiles.find((f) => f.id === selectedMediaId)
    const ext = media?.filename.split('.').pop() || 'mp4'
    const outputName = `upscaled_${scaleFactor}x_${Date.now()}.${ext}`
    try {
      const res = await startUpscale(projectId, {
        media_id: selectedMediaId,
        scale_factor: scaleFactor,
        method: upscaleMethod,
        output_name: outputName,
      })
      setUpscaleJobId(res.job_id)
      toast('Iniciando upscale...')
    } catch {
      toast.error('Erro ao iniciar upscale')
    }
  }

  const isAnyJobRunning = !!batchJobId || !!upscaleJobId
  const allSelected = videoFiles.length > 0 && selectedMediaIds.length === videoFiles.length

  const tabs: { id: BatchTab; icon: typeof Layers; label: string }[] = [
    { id: 'batch', icon: Layers, label: 'Batch Export' },
    { id: 'upscale', icon: ArrowUpCircle, label: 'Upscale' },
  ]

  const selectedMedia = mediaFiles.find((f) => f.id === selectedMediaId)

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5" />
        Batch & Upscale
      </h3>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-[var(--bg-tertiary)] rounded p-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium transition-colors
                ${activeTab === tab.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Batch Export tab */}
      {activeTab === 'batch' && (
        <div className="space-y-3">
          {/* Select/deselect all */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-secondary)]">
              {selectedMediaIds.length} de {videoFiles.length} selecionado(s)
            </p>
            <button
              onClick={() =>
                allSelected ? clearSelection() : selectAllMedia(videoFiles.map((f) => f.id))
              }
              className="text-[10px] text-[var(--accent)] hover:underline"
            >
              {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          </div>

          {/* File list with checkboxes */}
          <div className="space-y-0.5 max-h-36 overflow-y-auto">
            {videoFiles.map((file) => {
              const checked = selectedMediaIds.includes(file.id)
              return (
                <button
                  key={file.id}
                  onClick={() => toggleMediaId(file.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left transition-colors
                    ${checked
                      ? 'bg-[var(--accent)]/15 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/80'
                    }`}
                >
                  {checked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate flex-1">{file.filename}</span>
                  {file.width && file.height && (
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] shrink-0">
                      {file.width}×{file.height}
                    </span>
                  )}
                </button>
              )
            })}
            {videoFiles.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)] p-2 text-center">
                Nenhum vídeo disponível
              </p>
            )}
          </div>

          {/* Preset selection */}
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">Formato de saída</p>
            <div className="space-y-0.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setBatchPreset(preset.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left transition-colors
                    ${batchPreset === preset.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent)]/20'
                    }`}
                >
                  <PresetIcon id={preset.id} />
                  <span className="flex-1">{preset.label}</span>
                  <span className={`text-[10px] font-mono ${batchPreset === preset.id ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                    {preset.resolution}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Batch export button */}
          <button
            onClick={handleBatchExport}
            disabled={selectedMediaIds.length === 0 || isAnyJobRunning}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {batchJobId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            {batchJobId
              ? `Processando... ${Math.round(batchProgress * 100)}%`
              : `Exportar ${selectedMediaIds.length} arquivo(s)`}
          </button>

          {/* Batch progress */}
          {batchJobId && (
            <div className="space-y-1">
              <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${Math.max(5, batchProgress * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] text-center">
                {Math.round(batchProgress * batchTotal)}/{batchTotal} arquivo(s) processado(s)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upscale tab */}
      {activeTab === 'upscale' && (
        <div className="space-y-3">
          {!selectedMediaId && (
            <p className="text-xs text-[var(--text-secondary)]">
              Selecione um arquivo de mídia na aba Mídia
            </p>
          )}

          {selectedMedia && (
            <div className="bg-[var(--bg-tertiary)] rounded p-2 space-y-1">
              <p className="text-xs text-[var(--text-primary)] truncate">
                {selectedMedia.filename}
              </p>
              {selectedMedia.width && selectedMedia.height && (
                <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                  {selectedMedia.width}×{selectedMedia.height} →{' '}
                  <span className="text-[var(--accent)]">
                    {selectedMedia.width * scaleFactor}×{selectedMedia.height * scaleFactor}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Scale factor */}
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">Escala</p>
            <div className="flex gap-2">
              {[2, 4].map((factor) => (
                <button
                  key={factor}
                  onClick={() => setScaleFactor(factor)}
                  className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors
                    ${scaleFactor === factor
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent)]/20'
                    }`}
                >
                  {factor}× Upscale
                </button>
              ))}
            </div>
          </div>

          {/* Method */}
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">Método</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setUpscaleMethod('ffmpeg')}
                className={`w-full flex items-start gap-2 px-2 py-2 rounded text-left transition-colors
                  ${upscaleMethod === 'ffmpeg'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent)]/20'
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">FFmpeg (Lanczos)</div>
                  <div className={`text-[10px] ${upscaleMethod === 'ffmpeg' ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                    Rápido, sempre disponível
                  </div>
                </div>
              </button>
              <button
                onClick={() => setUpscaleMethod('realesrgan')}
                className={`w-full flex items-start gap-2 px-2 py-2 rounded text-left transition-colors
                  ${upscaleMethod === 'realesrgan'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent)]/20'
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">Real-ESRGAN (AI)</div>
                  <div className={`text-[10px] ${upscaleMethod === 'realesrgan' ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                    Qualidade superior, requer binário instalado
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Upscale button */}
          <button
            onClick={handleUpscale}
            disabled={!selectedMediaId || isAnyJobRunning}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {upscaleJobId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="w-4 h-4" />
            )}
            {upscaleJobId ? 'Processando...' : `Upscale ${scaleFactor}×`}
          </button>

          {/* Upscale progress */}
          {upscaleJobId && (
            <div className="space-y-1">
              <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-[var(--accent)] animate-pulse w-full" />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] text-center">
                Upscaling com {upscaleMethod === 'realesrgan' ? 'Real-ESRGAN' : 'FFmpeg'}...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
