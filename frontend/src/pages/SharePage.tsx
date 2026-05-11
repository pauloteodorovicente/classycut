import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Film, Music, Loader2, AlertCircle } from 'lucide-react'
import { getSharedProject } from '../api/projects'
import { formatDuration } from '../lib/formatters'

export default function SharePage() {
  const { token } = useParams<{ token: string }>()

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['share', token],
    queryFn: () => getSharedProject(token!),
    enabled: !!token,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm font-medium">Link inválido ou expirado</p>
          <p className="text-xs text-[var(--text-secondary)]">Este link de compartilhamento não existe ou foi revogado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4 flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-[var(--accent)] flex items-center justify-center">
          <Film className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold">{project.name}</h1>
          <p className="text-[10px] text-[var(--text-secondary)]">ClassyCut — Visualização somente leitura</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Arquivos de mídia ({project.media_files.length})
        </h2>

        {project.media_files.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Nenhum arquivo de mídia neste projeto.</p>
        ) : (
          <div className="space-y-2">
            {project.media_files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
              >
                {file.media_type === 'audio' ? (
                  <Music className="w-4 h-4 text-green-400 shrink-0" />
                ) : (
                  <Film className="w-4 h-4 text-blue-400 shrink-0" />
                )}
                <span className="flex-1 text-sm truncate" title={file.filename}>
                  {file.filename}
                </span>
                {file.duration_ms != null && (
                  <span className="text-xs text-[var(--text-secondary)] font-mono shrink-0">
                    {formatDuration(file.duration_ms)}
                  </span>
                )}
                {file.file_size != null && (
                  <span className="text-xs text-[var(--text-secondary)] shrink-0">
                    {(file.file_size / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
