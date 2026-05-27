import { useState } from 'react'
import { AlignLeft, Loader2, Copy, Check, RefreshCw } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { summarizeTranscript } from '../../api/summarize'
import { useProjectStore } from '../../stores/projectStore'
import { useTranscriptionStore } from '../../stores/transcriptionStore'

interface SummaryToolProps {
  projectId: string
}

export default function SummaryTool({ projectId }: SummaryToolProps) {
  const { selectedMediaId } = useProjectStore()
  const { completedTranscriptionJobId } = useTranscriptionStore()

  const [maxSentences, setMaxSentences] = useState(5)
  const [summary, setSummary] = useState('')
  const [editedSummary, setEditedSummary] = useState('')
  const [copied, setCopied] = useState(false)

  const summarizeMutation = useMutation({
    mutationFn: () => summarizeTranscript(projectId, completedTranscriptionJobId!, maxSentences),
    onSuccess: (data) => {
      setSummary(data.summary)
      setEditedSummary(data.summary)
      if (!data.summary) toast('Não foi possível gerar resumo. Tente com mais sentenças.')
      else toast.success('Resumo gerado!')
    },
    onError: () => toast.error('Erro ao gerar resumo'),
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(editedSummary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Resumo copiado!')
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

  if (!completedTranscriptionJobId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <AlignLeft className="w-6 h-6 text-[var(--text-secondary)] mx-auto" />
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
        Resumo Automático
      </h3>

      {/* AC-2: número de sentenças */}
      <div>
        <label className="text-xs text-[var(--text-secondary)] block mb-1">
          Número de sentenças (máx. 20)
        </label>
        <input
          type="number"
          min={1} max={20} step={1}
          value={maxSentences}
          onChange={(e) => setMaxSentences(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
          disabled={summarizeMutation.isPending}
          className="w-full text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5
            text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]
            disabled:opacity-50"
        />
      </div>

      <button
        onClick={() => summarizeMutation.mutate()}
        disabled={summarizeMutation.isPending}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {summarizeMutation.isPending
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <AlignLeft className="w-4 h-4" />
        }
        {summarizeMutation.isPending ? 'Gerando...' : 'Gerar Resumo'}
      </button>

      {/* AC-3, AC-4, AC-6, AC-7 */}
      {summary && (
        <div className="space-y-2">
          {/* AC-7: textarea editável */}
          <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            rows={6}
            className="w-full text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5
              text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]
              resize-y leading-relaxed"
          />

          <div className="flex gap-2">
            {/* AC-4: copiar */}
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors
                border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>

            {/* AC-6: regenerar */}
            <button
              onClick={() => summarizeMutation.mutate()}
              disabled={summarizeMutation.isPending}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors
                border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)]
                disabled:opacity-50 disabled:cursor-not-allowed"
              title="Regenerar resumo"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${summarizeMutation.isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
