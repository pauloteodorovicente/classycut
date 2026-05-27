import { useEffect, useRef, useState } from 'react'
import { Minimize2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { compressVideo } from '../../api/compression'
import { getJob } from '../../api/jobs'
import { useProjectStore } from '../../stores/projectStore'

interface CompressionToolProps {
  projectId: string
}

const PRESET_SIZES = [8, 25, 50, 100]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const mb = bytes / 1024 / 1024
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

export default function CompressionTool({ projectId }: CompressionToolProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const queryClient = useQueryClient()
  const selectedMedia = mediaFiles.find((m) => m.id === selectedMediaId)

  const [targetMb, setTargetMb] = useState<number>(50)
  const [customInput, setCustomInput] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ originalSize: number; resultSize: number } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const effectiveTarget = useCustom ? parseFloat(customInput) || 0 : targetMb

  const originalMb = selectedMedia?.file_size ? selectedMedia.file_size / 1024 / 1024 : 0
  const isLowQuality = originalMb > 0 && effectiveTarget < originalMb * 0.2

  // Poll job progress
  useEffect(() => {
    if (!jobId) return
    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(jobId)
        if (job.progress != null) setProgress(job.progress)

        if (job.status === 'done') {
          clearInterval(pollRef.current!)
          setJobId(null)
          setProgress(1)
          const res = job.result_json ? JSON.parse(job.result_json) : null
          if (res) setResult({ originalSize: res.original_size, resultSize: res.result_size })
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Compressão concluída! Novo arquivo criado.')
        } else if (job.status === 'error') {
          clearInterval(pollRef.current!)
          setJobId(null)
          toast.error(`Erro na compressão: ${job.error_message || 'Falha'}`)
        }
      } catch { /* keep polling */ }
    }, 1000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId, projectId, queryClient])

  const compressMutation = useMutation({
    mutationFn: () => compressVideo(projectId, { media_id: selectedMediaId!, target_mb: effectiveTarget }),
    onSuccess: (data) => {
      setJobId(data.job_id)
      setProgress(0)
      setResult(null)
      toast('Compressão iniciada...')
    },
    onError: () => toast.error('Erro ao iniciar compressão'),
  })

  if (!selectedMediaId || !selectedMedia) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-[var(--text-secondary)] text-center">
          Selecione um arquivo de mídia na aba Mídia
        </p>
      </div>
    )
  }

  if (selectedMedia.media_type === 'audio') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-[var(--text-secondary)] text-center">
          Compressão disponível apenas para arquivos de vídeo
        </p>
      </div>
    )
  }

  const isProcessing = !!jobId || compressMutation.isPending
  const canCompress = effectiveTarget > 0 && !isProcessing

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Compressão Inteligente
      </h3>

      {selectedMedia && (
        <div className="bg-[var(--bg-tertiary)] rounded p-2 space-y-1">
          <p className="text-xs text-[var(--text-primary)] truncate" title={selectedMedia.filename}>
            {selectedMedia.filename}
          </p>
          {selectedMedia.file_size && (
            <p className="text-xs text-[var(--text-secondary)]">
              Tamanho original: <span className="font-mono text-[var(--text-primary)]">{formatBytes(selectedMedia.file_size)}</span>
            </p>
          )}
        </div>
      )}

      {/* Target size presets */}
      <div>
        <p className="text-xs text-[var(--text-secondary)] mb-2">Tamanho-alvo</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => { setTargetMb(size); setUseCustom(false) }}
              disabled={isProcessing}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors
                ${!useCustom && targetMb === size
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {size} MB
            </button>
          ))}
          <button
            onClick={() => setUseCustom(true)}
            disabled={isProcessing}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors
              ${useCustom
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Custom
          </button>
        </div>

        {useCustom && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={4096}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Ex: 75"
              disabled={isProcessing}
              className="flex-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5
                text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]
                focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
            <span className="text-xs text-[var(--text-secondary)] shrink-0">MB</span>
          </div>
        )}
      </div>

      {/* Low quality warning — AC-7 */}
      {isLowQuality && (
        <div className="flex items-start gap-2 px-2.5 py-2 rounded bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-yellow-300 leading-relaxed">
            Tamanho-alvo muito baixo — menos de 20% do original. A qualidade do vídeo pode ficar muito ruim.
          </p>
        </div>
      )}

      {/* Progress bar — AC-4 */}
      {isProcessing && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Codificando...</span>
            <span className="font-mono">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">Two-pass encoding em andamento...</p>
        </div>
      )}

      {/* Result — AC-6 */}
      {result && (
        <div className="flex items-start gap-2 px-2.5 py-2 rounded bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="text-green-300 font-medium">Compressão concluída</p>
            <p className="text-[var(--text-secondary)]">
              Original: <span className="font-mono">{formatBytes(result.originalSize)}</span>
              {' → '}
              Resultado: <span className="font-mono text-green-300">{formatBytes(result.resultSize)}</span>
            </p>
            <p className="text-[var(--text-secondary)]">
              Redução: <span className="font-mono">{((1 - result.resultSize / result.originalSize) * 100).toFixed(1)}%</span>
            </p>
          </div>
        </div>
      )}

      {/* Compress button */}
      <button
        onClick={() => compressMutation.mutate()}
        disabled={!canCompress}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Minimize2 className="w-4 h-4" />
        )}
        {isProcessing ? 'Comprimindo...' : `Comprimir para ${effectiveTarget > 0 ? effectiveTarget + ' MB' : '...'}`}
      </button>
    </div>
  )
}
