import { useState } from 'react'
import { Share2, Copy, Trash2, X, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { generateShareLink, revokeShareLink } from '../../api/projects'

interface ShareModalProps {
  projectId: string
  onClose: () => void
}

export default function ShareModal({ projectId, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const generateMutation = useMutation({
    mutationFn: () => generateShareLink(projectId),
    onSuccess: (data) => {
      const frontendUrl = `${window.location.origin}/share/${data.share_token}`
      setShareUrl(frontendUrl)
    },
    onError: () => toast.error('Erro ao gerar link'),
  })

  const revokeMutation = useMutation({
    mutationFn: () => revokeShareLink(projectId),
    onSuccess: () => {
      setShareUrl(null)
      toast.success('Link revogado')
    },
    onError: () => toast.error('Erro ao revogar link'),
  })

  const handleCopy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copiado!')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg w-full max-w-md p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold">Compartilhar projeto</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
          Gere um link público somente-leitura. Qualquer pessoa com o link pode visualizar o projeto sem precisar de conta.
        </p>

        {!shareUrl ? (
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            Gerar link de compartilhamento
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5 font-mono text-[var(--text-secondary)] truncate"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                title="Copiar link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium
                text-red-400 border border-red-400/30 hover:bg-red-500/10
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {revokeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Revogar link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
