import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Loader2, Download, Eye, EyeOff, Pencil, Check, Flame } from 'lucide-react'
import TranscriptEditor from './TranscriptEditor'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useTranscriptionStore } from '../../stores/transcriptionStore'
import { useProjectStore } from '../../stores/projectStore'
import { usePlayerStore } from '../../stores/playerStore'
import { startTranscription, getTranscription, getSubtitleDownloadUrl, burnSubtitles } from '../../api/transcription'
import { getJob } from '../../api/jobs'

interface TranscriptionToolProps {
  projectId: string
}

const MODEL_OPTIONS = [
  { value: 'tiny', label: 'Tiny', desc: 'Mais rápido, menor precisão' },
  { value: 'base', label: 'Base', desc: 'Bom equilíbrio' },
  { value: 'small', label: 'Small', desc: 'Boa precisão' },
  { value: 'medium', label: 'Medium', desc: 'Alta precisão' },
  { value: 'large-v3', label: 'Large v3', desc: 'Máxima precisão, mais lento' },
]

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Auto-detectar' },
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TranscriptionTool({ projectId }: TranscriptionToolProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const { setSeekTo } = usePlayerStore()
  const {
    segments,
    language,
    modelSize,
    requestLanguage,
    transcribeJobId,
    completedTranscriptionJobId,
    subtitlesVisible,
    setSegments,
    setLanguage,
    setModelSize,
    setRequestLanguage,
    setTranscribeJobId,
    setCompletedTranscriptionJobId,
    setSubtitlesVisible,
    updateSegmentText,
  } = useTranscriptionStore()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [burnFontSize, setBurnFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [burnPosition, setBurnPosition] = useState<'bottom' | 'top'>('bottom')
  const [burnJobId, setBurnJobId] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const burnPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Poll transcription job
  useEffect(() => {
    if (!transcribeJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(transcribeJobId)
        if (job.status === 'done' && job.result_json) {
          const result = JSON.parse(job.result_json)
          setSegments(result.segments)
          setLanguage(result.language)
          setCompletedTranscriptionJobId(transcribeJobId)
          setTranscribeJobId(null)
          stopPolling()
          toast.success(`Transcrição concluída! Idioma: ${result.language}`)
        } else if (job.status === 'error') {
          setTranscribeJobId(null)
          stopPolling()
          toast.error(`Erro: ${job.error_message || 'Falha na transcrição'}`)
        }
      } catch {
        // Keep polling on network errors
      }
    }, 2000)

    return stopPolling
  }, [transcribeJobId, setSegments, setLanguage, setCompletedTranscriptionJobId, setTranscribeJobId, stopPolling])

  // Load existing transcription when media changes
  useEffect(() => {
    if (!selectedMediaId) return
    getTranscription(selectedMediaId)
      .then((result) => {
        setSegments(result.segments)
        setLanguage(result.language)
        if (result.job_id) setCompletedTranscriptionJobId(result.job_id)
      })
      .catch(() => {
        // No existing transcription — that's fine
      })
  }, [selectedMediaId, setSegments, setLanguage, setCompletedTranscriptionJobId])

  // Poll burn-in job
  useEffect(() => {
    if (!burnJobId) return
    burnPollRef.current = setInterval(async () => {
      try {
        const job = await getJob(burnJobId)
        if (job.status === 'done') {
          setBurnJobId(null)
          clearInterval(burnPollRef.current!)
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Legendas embutidas! Novo arquivo criado.')
        } else if (job.status === 'error') {
          setBurnJobId(null)
          clearInterval(burnPollRef.current!)
          toast.error(`Erro no burn-in: ${job.error_message || 'Falha'}`)
        }
      } catch { /* keep polling */ }
    }, 1500)
    return () => { if (burnPollRef.current) clearInterval(burnPollRef.current) }
  }, [burnJobId, projectId, queryClient])

  const selectedMedia = mediaFiles.find((f) => f.id === selectedMediaId)

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

  const handleTranscribe = async () => {
    if (!selectedMediaId) {
      toast.error('Selecione um arquivo de mídia primeiro')
      return
    }
    try {
      const res = await startTranscription(projectId, {
        media_id: selectedMediaId,
        model_size: modelSize,
        language: requestLanguage || null,
      })
      setTranscribeJobId(res.job_id)
      toast('Iniciando transcrição... Isso pode levar alguns minutos.')
    } catch {
      toast.error('Erro ao iniciar transcrição')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Transcrição
      </h3>

      {!selectedMediaId && (
        <p className="text-xs text-[var(--text-secondary)]">
          Selecione um arquivo de mídia na aba Media
        </p>
      )}

      {selectedMedia && (
        <p className="text-xs text-[var(--text-primary)] truncate">
          {selectedMedia.filename}
        </p>
      )}

      {/* Model selection */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">Modelo</label>
        <select
          value={modelSize}
          onChange={(e) => setModelSize(e.target.value)}
          className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs rounded px-2 py-1.5 border border-[var(--border)]"
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} — {opt.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Language selection */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">Idioma</label>
        <select
          value={requestLanguage || ''}
          onChange={(e) => setRequestLanguage(e.target.value || null)}
          className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs rounded px-2 py-1.5 border border-[var(--border)]"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Transcribe button */}
      <button
        onClick={handleTranscribe}
        disabled={!selectedMediaId || !!transcribeJobId}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {transcribeJobId ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        {transcribeJobId ? 'Transcrevendo...' : 'Transcrever'}
      </button>

      {/* Results */}
      {segments.length > 0 && (
        <>
          {/* Info bar */}
          <div className="bg-[var(--bg-tertiary)] rounded p-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Idioma detectado</span>
              <span className="text-blue-400 font-mono">{language || '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Segmentos</span>
              <span className="font-mono">{segments.length}</span>
            </div>
          </div>

          {/* Toggle subtitles + Download */}
          <div className="flex gap-2">
            <button
              onClick={() => setSubtitlesVisible(!subtitlesVisible)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] transition-colors
                ${subtitlesVisible
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                }`}
            >
              {subtitlesVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Legendas
            </button>
            {selectedMediaId && (
              <>
                <a
                  href={getSubtitleDownloadUrl(selectedMediaId, 'srt')}
                  download
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] bg-[var(--bg-tertiary)] hover:bg-green-500/20 text-[var(--text-secondary)] hover:text-green-400 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  SRT
                </a>
                <a
                  href={getSubtitleDownloadUrl(selectedMediaId, 'vtt')}
                  download
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] bg-[var(--bg-tertiary)] hover:bg-green-500/20 text-[var(--text-secondary)] hover:text-green-400 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  VTT
                </a>
              </>
            )}
          </div>

          {/* Segment list */}
          <div className="space-y-0.5 max-h-80 overflow-y-auto">
            {segments.map((seg) => (
              <div
                key={seg.id}
                className="flex items-start gap-1 px-2 py-1.5 rounded text-[11px] bg-[var(--bg-tertiary)] group"
              >
                <button
                  onClick={() => setSeekTo(seg.start)}
                  className="text-blue-400 font-mono shrink-0 mt-0.5 hover:text-blue-300"
                >
                  {formatTime(seg.start)}
                </button>
                {editingId === seg.id ? (
                  <div className="flex-1 flex items-start gap-1">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          updateSegmentText(seg.id, editText.trim())
                          setEditingId(null)
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                      autoFocus
                      className="flex-1 bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[11px] leading-relaxed rounded px-1.5 py-0.5 border border-[var(--accent)] resize-none outline-none"
                      rows={2}
                    />
                    <button
                      onClick={() => {
                        updateSegmentText(seg.id, editText.trim())
                        setEditingId(null)
                      }}
                      className="text-green-400 hover:text-green-300 mt-0.5"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      onClick={() => setSeekTo(seg.start)}
                      className="flex-1 text-[var(--text-primary)] leading-relaxed cursor-pointer"
                    >
                      {seg.text}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(seg.id)
                        setEditText(seg.text)
                      }}
                      className="text-[var(--text-secondary)] hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
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

            {!completedTranscriptionJobId && (
              <p className="text-[10px] text-orange-400">
                Faça uma transcrição primeiro para habilitar o burn-in.
              </p>
            )}

            <button
              onClick={handleBurnSubtitles}
              disabled={!completedTranscriptionJobId || !!burnJobId}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
                bg-orange-600 hover:bg-orange-700 text-white
                disabled:opacity-50 disabled:cursor-not-allowed"
              title="Requer transcrição concluída"
            >
              {burnJobId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Flame className="w-4 h-4" />
              )}
              {burnJobId ? 'Processando...' : 'Embutir legendas no vídeo'}
            </button>
          </div>

          {/* T-13: TranscriptEditor — click-to-seek + text selection cuts */}
          <TranscriptEditor segments={segments} />
        </>
      )}
    </div>
  )
}
