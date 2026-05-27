import { useState } from 'react'
import { BookOpen, Loader2, Copy, Check, Play } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { generateChapters, type Chapter } from '../../api/chapters'
import { useProjectStore } from '../../stores/projectStore'
import { usePlayerStore } from '../../stores/playerStore'
import { useTranscriptionStore } from '../../stores/transcriptionStore'
import { formatDuration } from '../../lib/formatters'

interface ChaptersToolProps {
  projectId: string
}

function msToYoutube(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function ChaptersTool({ projectId }: ChaptersToolProps) {
  const { selectedMediaId } = useProjectStore()
  const { setSeekTo } = usePlayerStore()
  const { completedTranscriptionJobId } = useTranscriptionStore()

  const [minDuration, setMinDuration] = useState(60)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [editedTitles, setEditedTitles] = useState<Record<number, string>>({})
  const [copied, setCopied] = useState(false)

  const generateMutation = useMutation({
    mutationFn: () => generateChapters(projectId, completedTranscriptionJobId!, minDuration),
    onSuccess: (data) => {
      setChapters(data.chapters)
      setEditedTitles({})
      if (data.chapters.length === 0) toast('Não foi possível dividir em capítulos. Tente reduzir a duração mínima.')
      else toast.success(`${data.chapters.length} capítulo(s) gerado(s)`)
    },
    onError: () => toast.error('Erro ao gerar capítulos'),
  })

  const getTitle = (ch: Chapter) => editedTitles[ch.index] ?? ch.title

  // T-9: Copiar no formato YouTube
  const handleCopy = () => {
    const text = chapters
      .map((ch) => `${msToYoutube(ch.start_ms)} ${getTitle(ch)}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Capítulos copiados!')
  }

  if (!selectedMediaId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-[var(--text-secondary)] text-center">
          Selecione um arquivo de mídia na aba Mídia
        </p>
      </div>
    )
  }

  // AC-1: erro claro se não há transcrição
  if (!completedTranscriptionJobId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <BookOpen className="w-6 h-6 text-[var(--text-secondary)] mx-auto" />
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
        Capítulos Automáticos
      </h3>

      {/* AC-2: configurar duração mínima */}
      <div>
        <label className="text-xs text-[var(--text-secondary)] block mb-1">
          Duração mínima por capítulo (s)
        </label>
        <input
          type="number"
          min={10} max={600} step={10}
          value={minDuration}
          onChange={(e) => setMinDuration(Math.max(10, parseInt(e.target.value) || 60))}
          disabled={generateMutation.isPending}
          className="w-full text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5
            text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]
            disabled:opacity-50"
        />
      </div>

      <button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generateMutation.isPending
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <BookOpen className="w-4 h-4" />
        }
        {generateMutation.isPending ? 'Gerando...' : 'Gerar Capítulos'}
      </button>

      {/* AC-4, AC-5, AC-6, AC-7 */}
      {chapters.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              {chapters.length} capítulo(s)
            </span>
            {/* AC-6: Copiar para YouTube */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado!' : 'Copiar para YouTube'}
            </button>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {chapters.map((ch) => (
              <div
                key={ch.index}
                className="flex items-start gap-2 px-2 py-2 rounded bg-[var(--bg-tertiary)]"
              >
                {/* AC-5: navegar no player */}
                <button
                  onClick={() => setSeekTo(ch.start_ms / 1000)}
                  className="shrink-0 mt-0.5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                  title="Ir para este capítulo"
                >
                  <Play className="w-3 h-3" />
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] shrink-0">
                      {msToYoutube(ch.start_ms)}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                      ({formatDuration(ch.end_ms - ch.start_ms)})
                    </span>
                  </div>
                  {/* AC-7: título editável inline */}
                  <input
                    type="text"
                    value={getTitle(ch)}
                    onChange={(e) => setEditedTitles((prev) => ({ ...prev, [ch.index]: e.target.value }))}
                    className="w-full text-xs bg-transparent border-b border-transparent hover:border-[var(--border)]
                      focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)]
                      transition-colors py-0.5"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Preview do formato YouTube */}
          <div className="bg-[var(--bg-tertiary)] rounded p-2">
            <p className="text-[10px] text-[var(--text-secondary)] mb-1">Prévia (formato YouTube):</p>
            <pre className="text-[10px] font-mono text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {chapters.map((ch) => `${msToYoutube(ch.start_ms)} ${getTitle(ch)}`).join('\n')}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
