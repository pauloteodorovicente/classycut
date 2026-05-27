import { useEffect, useRef, useState } from 'react'
import { Sparkles, Loader2, Zap, BookOpen, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAIStore } from '../../stores/aiStore'
import { useProjectStore } from '../../stores/projectStore'
import { usePlayerStore } from '../../stores/playerStore'
import { startHighlights, startChapters, startSummary } from '../../api/ai'
import { getJob } from '../../api/jobs'

interface AIToolProps {
  projectId: string
}

type AITab = 'highlights' | 'chapters' | 'summary'

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AITool({ projectId }: AIToolProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const { setSeekTo } = usePlayerStore()
  const {
    highlights, sensitivity, minDuration, highlightsJobId,
    setHighlights, setSensitivity, setMinDuration, setHighlightsJobId,
    chapters, minChapterDuration, chaptersJobId,
    setChapters, setMinChapterDuration, setChaptersJobId,
    summary, maxSentences, summaryJobId,
    setSummary, setMaxSentences, setSummaryJobId,
  } = useAIStore()

  const [activeTab, setActiveTab] = useState<AITab>('highlights')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedMedia = mediaFiles.find((f) => f.id === selectedMediaId)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // Poll highlights job
  useEffect(() => {
    if (!highlightsJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(highlightsJobId)
        if (job.status === 'done' && job.result_json) {
          const result = JSON.parse(job.result_json)
          setHighlights(result.highlights)
          setHighlightsJobId(null)
          stopPolling()
          toast.success(`${result.count} highlight(s) detectado(s)!`)
        } else if (job.status === 'error') {
          setHighlightsJobId(null)
          stopPolling()
          toast.error(`Erro: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // Keep polling
      }
    }, 1000)

    return stopPolling
  }, [highlightsJobId, setHighlights, setHighlightsJobId])

  // Poll chapters job
  useEffect(() => {
    if (!chaptersJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(chaptersJobId)
        if (job.status === 'done' && job.result_json) {
          const result = JSON.parse(job.result_json)
          setChapters(result.chapters)
          setChaptersJobId(null)
          stopPolling()
          toast.success(`${result.count} capítulo(s) gerado(s)!`)
        } else if (job.status === 'error') {
          setChaptersJobId(null)
          stopPolling()
          toast.error(`Erro: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // Keep polling
      }
    }, 1000)

    return stopPolling
  }, [chaptersJobId, setChapters, setChaptersJobId])

  // Poll summary job
  useEffect(() => {
    if (!summaryJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(summaryJobId)
        if (job.status === 'done' && job.result_json) {
          const result = JSON.parse(job.result_json)
          setSummary(result.summary)
          setSummaryJobId(null)
          stopPolling()
          toast.success('Resumo gerado!')
        } else if (job.status === 'error') {
          setSummaryJobId(null)
          stopPolling()
          toast.error(`Erro: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // Keep polling
      }
    }, 1000)

    return stopPolling
  }, [summaryJobId, setSummary, setSummaryJobId])

  const handleHighlights = async () => {
    if (!selectedMediaId) {
      toast.error('Selecione um arquivo de mídia primeiro')
      return
    }
    try {
      const res = await startHighlights(projectId, {
        media_id: selectedMediaId,
        sensitivity,
        min_duration: minDuration,
      })
      setHighlightsJobId(res.job_id)
      toast('Detectando highlights...')
    } catch {
      toast.error('Erro ao iniciar detecção de highlights')
    }
  }

  const handleChapters = async () => {
    if (!selectedMediaId) {
      toast.error('Selecione um arquivo de mídia primeiro')
      return
    }
    try {
      const res = await startChapters(projectId, {
        media_id: selectedMediaId,
        min_chapter_duration: minChapterDuration,
      })
      setChaptersJobId(res.job_id)
      toast('Gerando capítulos...')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('400') || (typeof err === 'object' && err !== null && 'response' in err)) {
        toast.error('Transcrição necessária. Execute a transcrição primeiro.')
      } else {
        toast.error('Erro ao gerar capítulos')
      }
    }
  }

  const handleSummary = async () => {
    if (!selectedMediaId) {
      toast.error('Selecione um arquivo de mídia primeiro')
      return
    }
    try {
      const res = await startSummary(projectId, {
        media_id: selectedMediaId,
        max_sentences: maxSentences,
      })
      setSummaryJobId(res.job_id)
      toast('Gerando resumo...')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('400') || (typeof err === 'object' && err !== null && 'response' in err)) {
        toast.error('Transcrição necessária. Execute a transcrição primeiro.')
      } else {
        toast.error('Erro ao gerar resumo')
      }
    }
  }

  const isAnyJobRunning = !!highlightsJobId || !!chaptersJobId || !!summaryJobId

  const tabs: { id: AITab; icon: typeof Zap; label: string }[] = [
    { id: 'highlights', icon: Zap, label: 'Highlights' },
    { id: 'chapters', icon: BookOpen, label: 'Capítulos' },
    { id: 'summary', icon: FileText, label: 'Resumo' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        AI Features
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

      {/* Highlights tab */}
      {activeTab === 'highlights' && (
        <div className="space-y-3">
          <div>
            <label className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>Sensibilidade</span>
              <span className="font-mono">{(sensitivity * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
              <span>Menos highlights</span>
              <span>Mais highlights</span>
            </div>
          </div>

          <div>
            <label className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>Duração mínima</span>
              <span className="font-mono">{minDuration.toFixed(1)}s</span>
            </label>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={minDuration}
              onChange={(e) => setMinDuration(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <button
            onClick={handleHighlights}
            disabled={!selectedMediaId || isAnyJobRunning}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {highlightsJobId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {highlightsJobId ? 'Analisando...' : 'Detectar Highlights'}
          </button>

          {highlightsJobId && (
            <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-[var(--accent)] animate-pulse w-full" />
            </div>
          )}

          {highlights.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-[var(--text-secondary)]">
                {highlights.length} highlight(s) encontrado(s)
              </p>
              <div className="space-y-0.5 max-h-60 overflow-y-auto">
                {highlights.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setSeekTo(h.start_ms / 1000)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 transition-colors text-left"
                  >
                    <span className="text-blue-400 font-mono shrink-0">
                      {formatTime(h.start_ms)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5">
                        <div
                          className="h-full bg-yellow-500 rounded-full"
                          style={{ width: `${Math.min(100, h.energy * 100 * 3)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[var(--text-secondary)] font-mono shrink-0">
                      {formatTime(h.duration_ms)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chapters tab */}
      {activeTab === 'chapters' && (
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--text-secondary)]">
            Gera capítulos automaticamente baseado na transcrição.
            Execute a transcrição primeiro.
          </p>

          <div>
            <label className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>Duração mín. do capítulo</span>
              <span className="font-mono">{minChapterDuration.toFixed(0)}s</span>
            </label>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={minChapterDuration}
              onChange={(e) => setMinChapterDuration(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <button
            onClick={handleChapters}
            disabled={!selectedMediaId || isAnyJobRunning}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chaptersJobId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
            {chaptersJobId ? 'Gerando...' : 'Gerar Capítulos'}
          </button>

          {chaptersJobId && (
            <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-[var(--accent)] animate-pulse w-full" />
            </div>
          )}

          {chapters.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-[var(--text-secondary)]">
                {chapters.length} capítulo(s)
              </p>
              <div className="space-y-0.5 max-h-60 overflow-y-auto">
                {chapters.map((ch) => (
                  <button
                    key={ch.index}
                    onClick={() => setSeekTo(ch.start_ms / 1000)}
                    className="w-full flex items-start gap-2 px-2 py-2 rounded text-[11px] bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 transition-colors text-left"
                  >
                    <span className="text-[var(--accent)] font-mono font-bold shrink-0">
                      {ch.index}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--text-primary)] leading-snug truncate">
                        {ch.title}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                        {formatTime(ch.start_ms)} — {formatTime(ch.end_ms)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary tab */}
      {activeTab === 'summary' && (
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--text-secondary)]">
            Gera um resumo extrativo baseado na transcrição.
            Execute a transcrição primeiro.
          </p>

          <div>
            <label className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>Máx. de frases</span>
              <span className="font-mono">{maxSentences}</span>
            </label>
            <input
              type="range"
              min="3"
              max="15"
              step="1"
              value={maxSentences}
              onChange={(e) => setMaxSentences(parseInt(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <button
            onClick={handleSummary}
            disabled={!selectedMediaId || isAnyJobRunning}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {summaryJobId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {summaryJobId ? 'Gerando...' : 'Gerar Resumo'}
          </button>

          {summaryJobId && (
            <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-[var(--accent)] animate-pulse w-full" />
            </div>
          )}

          {summary && (
            <div className="space-y-1">
              <p className="text-xs text-[var(--text-secondary)]">Resumo</p>
              <div className="bg-[var(--bg-tertiary)] rounded p-2.5 text-[11px] text-[var(--text-primary)] leading-relaxed">
                {summary}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
