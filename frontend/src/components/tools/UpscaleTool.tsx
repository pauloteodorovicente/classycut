import { useEffect, useRef, useState } from 'react'
import { ArrowUpFromLine, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { upscaleVideo, checkRealesrgan } from '../../api/upscale'
import { getJob } from '../../api/jobs'
import { useProjectStore } from '../../stores/projectStore'

interface UpscaleToolProps {
  projectId: string
}

type Factor = 2 | 4
type Method = 'ffmpeg' | 'realesrgan'

function formatRes(w: number | null | undefined, h: number | null | undefined): string {
  if (!w || !h) return '—'
  return `${w}×${h}`
}

export default function UpscaleTool({ projectId }: UpscaleToolProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const queryClient = useQueryClient()
  const selectedMedia = mediaFiles.find((m) => m.id === selectedMediaId)

  const [factor, setFactor] = useState<Factor>(2)
  const [method, setMethod] = useState<Method>('ffmpeg')
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    originalWidth: number | null
    originalHeight: number | null
    resultWidth: number | null
    resultHeight: number | null
  } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check Real-ESRGAN availability on mount
  const { data: realesrganStatus } = useQuery({
    queryKey: ['realesrgan-check'],
    queryFn: checkRealesrgan,
    staleTime: Infinity,
  })
  const realesrganAvailable = realesrganStatus?.available ?? false

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
          if (res) {
            setResult({
              originalWidth: res.original_width,
              originalHeight: res.original_height,
              resultWidth: res.result_width,
              resultHeight: res.result_height,
            })
          }
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Upscale concluído! Novo arquivo criado.')
        } else if (job.status === 'error') {
          clearInterval(pollRef.current!)
          setJobId(null)
          toast.error(`Erro no upscale: ${job.error_message || 'Falha'}`)
        }
      } catch { /* keep polling */ }
    }, 1000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId, projectId, queryClient])

  const upscaleMutation = useMutation({
    mutationFn: () => upscaleVideo(projectId, { media_id: selectedMediaId!, factor, method }),
    onSuccess: (data) => {
      setJobId(data.job_id)
      setProgress(0)
      setResult(null)
      toast('Upscale iniciado...')
    },
    onError: () => toast.error('Erro ao iniciar upscale'),
  })

  if (!selectedMediaId || !selectedMedia) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-[var(--text-secondary)] text-center">
          Selecione um arquivo de mídia na aba Media
        </p>
      </div>
    )
  }

  if (selectedMedia.media_type === 'audio') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-[var(--text-secondary)] text-center">
          Upscale disponível apenas para arquivos de vídeo
        </p>
      </div>
    )
  }

  const isProcessing = !!jobId || upscaleMutation.isPending
  const resultW = selectedMedia.width ? selectedMedia.width * factor : null
  const resultH = selectedMedia.height ? selectedMedia.height * factor : null

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Upscale de Vídeo
      </h3>

      {/* File info */}
      <div className="bg-[var(--bg-tertiary)] rounded p-2 space-y-1">
        <p className="text-xs text-[var(--text-primary)] truncate" title={selectedMedia.filename}>
          {selectedMedia.filename}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          Resolução atual: <span className="font-mono text-[var(--text-primary)]">
            {formatRes(selectedMedia.width, selectedMedia.height)}
          </span>
        </p>
      </div>

      {/* Factor selection — AC-1 */}
      <div>
        <p className="text-xs text-[var(--text-secondary)] mb-2">Fator de upscale</p>
        <div className="flex gap-2">
          {([2, 4] as Factor[]).map((f) => (
            <button
              key={f}
              onClick={() => setFactor(f)}
              disabled={isProcessing}
              className={`flex-1 py-2 rounded text-xs font-medium transition-colors
                ${factor === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {f}×
              {selectedMedia.width && selectedMedia.height && (
                <span className="block text-[9px] opacity-70 font-normal mt-0.5">
                  {selectedMedia.width * f}×{selectedMedia.height * f}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Method selection — AC-2, AC-3, AC-4 */}
      <div>
        <p className="text-xs text-[var(--text-secondary)] mb-2">Método</p>
        <div className="flex gap-2">
          <button
            onClick={() => setMethod('ffmpeg')}
            disabled={isProcessing}
            className={`flex-1 py-2 rounded text-xs font-medium transition-colors
              ${method === 'ffmpeg'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Lanczos
            <span className="block text-[9px] opacity-70 font-normal mt-0.5">FFmpeg</span>
          </button>
          <button
            onClick={() => realesrganAvailable && setMethod('realesrgan')}
            disabled={isProcessing || !realesrganAvailable}
            title={realesrganAvailable ? undefined : 'Real-ESRGAN não está instalado neste servidor'}
            className={`flex-1 py-2 rounded text-xs font-medium transition-colors relative
              ${method === 'realesrgan' && realesrganAvailable
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              } ${!realesrganAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-tertiary)]/70'}`}
          >
            Real-ESRGAN
            <span className="block text-[9px] font-normal mt-0.5 opacity-70">
              {realesrganAvailable ? 'IA · Mais lento' : 'Não instalado'}
            </span>
          </button>
        </div>

        {/* AC-4: clear notice when Real-ESRGAN unavailable */}
        {!realesrganAvailable && (
          <div className="flex items-start gap-1.5 mt-2 px-2 py-1.5 rounded bg-[var(--bg-tertiary)]">
            <Info className="w-3 h-3 text-[var(--text-secondary)] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
              Real-ESRGAN não está instalado. Usando Lanczos (FFmpeg), que já oferece boa qualidade.
            </p>
          </div>
        )}
      </div>

      {/* Preview of result resolution */}
      {resultW && resultH && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <ArrowUpFromLine className="w-3.5 h-3.5" />
          <span>
            {formatRes(selectedMedia.width, selectedMedia.height)}
            {' → '}
            <span className="text-[var(--text-primary)] font-mono">{formatRes(resultW, resultH)}</span>
          </span>
        </div>
      )}

      {/* Progress bar — AC-5 */}
      {isProcessing && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">
              {method === 'realesrgan' ? 'Processando frames...' : 'Codificando...'}
            </span>
            <span className="font-mono">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Result — AC-6, AC-7 */}
      {result && (
        <div className="flex items-start gap-2 px-2.5 py-2 rounded bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="text-green-300 font-medium">Upscale concluído</p>
            <p className="text-[var(--text-secondary)]">
              Original: <span className="font-mono">{formatRes(result.originalWidth, result.originalHeight)}</span>
              {' → '}
              Resultado: <span className="font-mono text-green-300">{formatRes(result.resultWidth, result.resultHeight)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Upscale button */}
      <button
        onClick={() => upscaleMutation.mutate()}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowUpFromLine className="w-4 h-4" />
        )}
        {isProcessing ? 'Processando...' : `Upscale ${factor}× com ${method === 'ffmpeg' ? 'Lanczos' : 'Real-ESRGAN'}`}
      </button>

      {method === 'realesrgan' && realesrganAvailable && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-yellow-300 leading-relaxed">
            Real-ESRGAN é significativamente mais lento — processa frame-a-frame. Recomendado apenas para vídeos curtos.
          </p>
        </div>
      )}
    </div>
  )
}
