import { useState } from 'react'
import { Film, Music, Trash2, RotateCcw, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useProjectStore } from '../../stores/projectStore'
import { formatDuration, formatFileSize } from '../../lib/formatters'
import { listTrash, restoreMedia, permanentDeleteMedia } from '../../api/media'
import type { MediaFile } from '../../types/media'

interface SidebarProps {
  projectId: string
  onDeleteMedia: (id: string) => void
}

export default function Sidebar({ projectId, onDeleteMedia }: SidebarProps) {
  const { mediaFiles, selectedMediaId, setSelectedMediaId } = useProjectStore()
  const [trashOpen, setTrashOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: trashedFiles = [] } = useQuery({
    queryKey: ['trash', projectId],
    queryFn: () => listTrash(projectId),
    enabled: trashOpen,
  })

  const restoreMutation = useMutation({
    mutationFn: restoreMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', projectId] })
      queryClient.invalidateQueries({ queryKey: ['trash', projectId] })
      toast.success('Arquivo restaurado')
    },
    onError: () => toast.error('Erro ao restaurar arquivo'),
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentDeleteMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash', projectId] })
      toast.success('Arquivo excluído permanentemente')
    },
    onError: () => toast.error('Erro ao excluir arquivo'),
  })

  return (
    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
      {/* Active files */}
      <div>
        <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Arquivos
        </h3>
        {mediaFiles.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] text-center py-4">
            Nenhum arquivo importado
          </p>
        ) : (
          <div className="space-y-1">
            {mediaFiles.map((media) => (
              <MediaItem
                key={media.id}
                media={media}
                isSelected={selectedMediaId === media.id}
                onSelect={() => setSelectedMediaId(media.id)}
                onDelete={() => onDeleteMedia(media.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Trash section */}
      <div className="border-t border-[var(--border)] pt-2">
        <button
          onClick={() => setTrashOpen((o) => !o)}
          className="w-full flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1"
        >
          {trashOpen ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )}
          <Trash2 className="w-3 h-3 shrink-0" />
          <span className="font-medium uppercase tracking-wider">Lixeira</span>
          {trashedFiles.length > 0 && (
            <span className="ml-auto bg-[var(--bg-tertiary)] rounded px-1.5 py-0.5 font-mono text-[10px]">
              {trashedFiles.length}
            </span>
          )}
        </button>

        {trashOpen && (
          <div className="space-y-1">
            {trashedFiles.length === 0 ? (
              <p className="text-[10px] text-[var(--text-secondary)] text-center py-2">
                Lixeira vazia
              </p>
            ) : (
              <>
                <div className="flex items-start gap-1 px-1 py-1 rounded bg-amber-500/10 mb-1">
                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-amber-400 leading-relaxed">
                    Arquivos na lixeira ainda ocupam espaço no disco. Exclua permanentemente para liberar.
                  </p>
                </div>
                {trashedFiles.map((media) => (
                  <TrashItem
                    key={media.id}
                    media={media}
                    onRestore={() => restoreMutation.mutate(media.id)}
                    onPermanentDelete={() => {
                      if (window.confirm(`Excluir "${media.filename}" permanentemente? Esta ação não pode ser desfeita.`)) {
                        permanentDeleteMutation.mutate(media.id)
                      }
                    }}
                    isRestoring={restoreMutation.isPending}
                    isDeleting={permanentDeleteMutation.isPending}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MediaItem({
  media,
  isSelected,
  onSelect,
  onDelete,
}: {
  media: MediaFile
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const isVideo = media.media_type === 'video'

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors group
        ${isSelected ? 'bg-[var(--accent)]/20 border border-[var(--accent)]/50' : 'hover:bg-[var(--bg-tertiary)]'}`}
    >
      {isVideo ? (
        <Film className="w-4 h-4 text-blue-400 shrink-0" />
      ) : (
        <Music className="w-4 h-4 text-green-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{media.filename}</p>
        <p className="text-[10px] text-[var(--text-secondary)]">
          {formatDuration(media.duration_ms)} · {formatFileSize(media.file_size)}
          {media.width && media.height && ` · ${media.width}x${media.height}`}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:text-[var(--error)] transition-all"
        title="Mover para lixeira"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

function TrashItem({
  media,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: {
  media: MediaFile
  onRestore: () => void
  onPermanentDelete: () => void
  isRestoring: boolean
  isDeleting: boolean
}) {
  const isVideo = media.media_type === 'video'

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-[var(--bg-tertiary)]/50 opacity-70 hover:opacity-100 transition-opacity">
      {isVideo ? (
        <Film className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
      ) : (
        <Music className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
      )}
      <p className="text-[10px] truncate flex-1 text-[var(--text-secondary)]">{media.filename}</p>
      <button
        onClick={onRestore}
        disabled={isRestoring}
        className="p-1 text-[var(--text-secondary)] hover:text-green-400 transition-colors disabled:opacity-50"
        title="Restaurar"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
      <button
        onClick={onPermanentDelete}
        disabled={isDeleting}
        className="p-1 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
        title="Excluir permanentemente"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}
