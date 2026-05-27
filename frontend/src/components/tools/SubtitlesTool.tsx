import { useState, useEffect, useRef } from 'react'
import { Subtitles, Loader2, Download, Eye, EyeOff, Flame } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useTranscriptionStore } from '../../stores/transcriptionStore'
import { useProjectStore } from '../../stores/projectStore'
import { getSubtitleDownloadUrl, burnSubtitles } from '../../api/transcription'
import { getJob } from '../../api/jobs'

interface SubtitlesToolProps {
  projectId: string
}

export default function SubtitlesTool({ projectId }: SubtitlesToolProps) {
  const { selectedMediaId } = useProjectStore()
  const {
    completedTranscriptionJobId,
    subtitlesVisible,
    setSubtitlesVisible,
  } = useTranscriptionStore()

  const [burnFontSize, setBurnFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [burnPosition, setBurnPosition] = useState<'bottom' | 'top'>('bottom')
  const [burnJobId, setBurnJobId] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const burnPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!burnJobId) return
    burnPollRef.current = setInterval(async () => {
      try {
        const job = await getJob(burnJobId)
        if (job.status === 'done') {
          setBurnJobId(null)
          clearInterval(burnPollRef.current!)
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Legendas embutidas! Arquivo adicionado à aba Mídia.')
        } else if (job.status === 'error') {
          setBurnJobId(null)
          clearInterval(burnPollRef.current!)
          toast.error(`Erro no burn-in: ${job.error_message || 'Falha'}`)
        }
      } catch { /* keep polling */ }
    }, 1500)
    return () => { if (burnPollRef.current) clearInterval(burnPollRef.current) }
  }, [burnJobId, projectId, queryClient])

  const handleBurnSubtitles = async () => {
    if (!selectedMediaId || !completedTranscriptionJobId) return
    try {
      const res = await burnSubtitles(projectId, {
        media_id: selectedMediaId,
        transcription_job_id: completedTranscriptionJobId,
        font_size: burnFontSize,
        position: burnPosition,
      })
      setBurnJobId(res.job_id)
      toast('Embutindo legendas no vídeo...')
    } catch {
      toast.error('Erro ao embutir legendas')
    }
  }

  if (!completedTranscriptionJobId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <Subtitles className="w-6 h-6 text-[var(--text-secondary)] mx-auto" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Nenhuma transcrição disponível.<br />
            Transcreva o áudio primeiro na aba <strong>Transcrição</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Legendas
      </h3>

      {/* Toggle subtitles overlay */}
      <button
        onClick={() => setSubtitlesVisible(!subtitlesVisible)}
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs transition-colors
          ${subtitlesVisible
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border)]'
          }`}
      >
        {subtitlesVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {subtitlesVisible ? 'Legendas visíveis no player' : 'Mostrar legendas no player'}
      </button>

      {/* Download */}
      {selectedMediaId && (
        <div className="flex gap-2">
          <a
            href={getSubtitleDownloadUrl(selectedMediaId, 'srt')}
            download
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] bg-[var(--bg-tertiary)] hover:bg-green-500/20 text-[var(--text-secondary)] hover:text-green-400 transition-colors"
          >
            <Download className="w-3 h-3" />
            Baixar SRT
          </a>
          <a
            href={getSubtitleDownloadUrl(selectedMediaId, 'vtt')}
            download
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] bg-[var(--bg-tertiary)] hover:bg-green-500/20 text-[var(--text-secondary)] hover:text-green-400 transition-colors"
          >
            <Download className="w-3 h-3" />
            Baixar VTT
          </a>
        </div>
      )}

      {/* Burn-in section */}
      <div className="border-t border-[var(--border)] pt-3 space-y-3">
        <h4 className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Embutir legendas no vídeo
        </h4>
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          Grava as legendas diretamente nos frames do vídeo — ideal para Instagram e TikTok.
        </p>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-[var(--text-secondary)] mb-1">Tamanho</label>
            <select
              value={burnFontSize}
              onChange={(e) => setBurnFontSize(e.target.value as 'small' | 'medium' | 'large')}
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] rounded px-2 py-1 border border-[var(--border)]"
            >
              <option value="small">Pequeno (16px)</option>
              <option value="medium">Médio (22px)</option>
              <option value="large">Grande (28px)</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-[var(--text-secondary)] mb-1">Posição</label>
            <select
              value={burnPosition}
              onChange={(e) => setBurnPosition(e.target.value as 'bottom' | 'top')}
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] rounded px-2 py-1 border border-[var(--border)]"
            >
              <option value="bottom">Inferior</option>
              <option value="top">Superior</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleBurnSubtitles}
          disabled={!!burnJobId}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
            bg-orange-600 hover:bg-orange-700 text-white
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {burnJobId ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Flame className="w-4 h-4" />
          )}
          {burnJobId ? 'Processando...' : 'Embutir legendas no vídeo'}
        </button>
      </div>
    </div>
  )
}
