import {
  Film,
  Music,
  Trash2,
} from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { formatDuration, formatFileSize } from '../../lib/formatters'
import type { MediaFile } from '../../types/media'

interface SidebarProps {
  onDeleteMedia: (id: string) => void
}

export default function Sidebar({ onDeleteMedia }: SidebarProps) {
  const { mediaFiles, selectedMediaId, setSelectedMediaId } = useProjectStore()

  return (
    <div className="flex-1 overflow-y-auto p-2">
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
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}
