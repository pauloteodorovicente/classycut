import { useEffect, useRef } from 'react'
import { Download, Loader2, Monitor, Smartphone, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useExportStore } from '../../stores/exportStore'
import { useProjectStore } from '../../stores/projectStore'
import { startExport } from '../../api/export'
import { getJob } from '../../api/jobs'
import type { PresetInfo } from '../../types/export'

interface ExportToolProps {
  projectId: string
}

const PRESETS: PresetInfo[] = [
  {
    id: 'original',
    label: 'Original',
    desc: 'Mantém resolução original',
    resolution: 'Sem re-encode',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    desc: 'Horizontal (16:9)',
    resolution: '1920×1080',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    desc: 'Vertical (9:16)',
    resolution: '1080×1920',
  },
  {
    id: 'instagram_portrait',
    label: 'Instagram Retrato',
    desc: 'Retrato (4:5)',
    resolution: '1080×1350',
  },
  {
    id: 'instagram_square',
    label: 'Instagram Quadrado',
    desc: 'Quadrado (1:1)',
    resolution: '1080×1080',
  },
]

function PresetIcon({ id }: { id: string }) {
  if (id === 'original') return <Monitor className="w-4 h-4" />
  if (id === 'youtube') return <Monitor className="w-4 h-4" />
  if (id === 'tiktok') return <Smartphone className="w-4 h-4" />
  if (id === 'instagram_portrait') return <Smartphone className="w-4 h-4" />
  return <Square className="w-4 h-4" />
}

export default function ExportTool({ projectId }: ExportToolProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const queryClient = useQueryClient()
  const { selectedPreset, exportJobId, setSelectedPreset, setExportJobId } = useExportStore()

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    if (!exportJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(exportJobId)
        if (job.status === 'done') {
          setExportJobId(null)
          stopPolling()
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Exportação concluída! Arquivo disponível na aba Mídia.')
        } else if (job.status === 'error') {
          setExportJobId(null)
          stopPolling()
          toast.error(`Erro na exportação: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // Keep polling on network errors
      }
    }, 1000)

    return stopPolling
  }, [exportJobId, setExportJobId, projectId, queryClient])

  const selectedMedia = mediaFiles.find((f) => f.id === selectedMediaId)

  const handleExport = async () => {
    if (!selectedMediaId) {
      toast.error('Selecione um arquivo de mídia primeiro')
      return
    }
    const ext = selectedMedia?.filename.split('.').pop() || 'mp4'
    const outputName = `export_${selectedPreset}_${Date.now()}.${ext}`
    try {
      const res = await startExport(projectId, {
        media_id: selectedMediaId,
        preset: selectedPreset,
        output_name: outputName,
      })
      setExportJobId(res.job_id)
      toast('Exportando...')
    } catch {
      toast.error('Erro ao iniciar exportação')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Exportar Vídeo
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

      {/* Preset list */}
      <div className="space-y-1.5">
        <p className="text-xs text-[var(--text-secondary)]">Plataforma / Formato</p>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setSelectedPreset(preset.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors
              ${selectedPreset === preset.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent)]/20'
              }`}
          >
            <PresetIcon id={preset.id} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{preset.label}</div>
              <div className={`text-[10px] ${selectedPreset === preset.id ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                {preset.desc} · {preset.resolution}
              </div>
            </div>
            {selectedPreset === preset.id && (
              <div className="w-2 h-2 rounded-full bg-white shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={!selectedMediaId || !!exportJobId}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exportJobId ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {exportJobId ? 'Exportando...' : 'Exportar'}
      </button>

      {/* Progress indicator */}
      {exportJobId && (
        <div className="space-y-1">
          <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-[var(--accent)] animate-pulse w-full" />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] text-center">
            Processando com FFmpeg...
          </p>
        </div>
      )}
    </div>
  )
}
