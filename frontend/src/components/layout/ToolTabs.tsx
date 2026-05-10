import {
  Film,
  Merge,
  Scissors,
  Split,
  FileText,
  Subtitles,
  ZoomIn,
  Download,
  Sparkles,
  Layers,
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

const tools = [
  { id: 'media' as const, icon: Film, label: 'Media' },
  { id: 'merge' as const, icon: Merge, label: 'Merge' },
  { id: 'silence' as const, icon: Scissors, label: 'Auto-Corte' },
  { id: 'cut' as const, icon: Split, label: 'Corte Manual' },
  { id: 'transcription' as const, icon: FileText, label: 'Transcrição' },
  { id: 'subtitles' as const, icon: Subtitles, label: 'Legendas' },
  { id: 'zoom' as const, icon: ZoomIn, label: 'Zoom' },
  { id: 'export' as const, icon: Download, label: 'Exportar' },
  { id: 'ai' as const, icon: Sparkles, label: 'AI' },
  { id: 'batch' as const, icon: Layers, label: 'Batch' },
]

export default function ToolTabs() {
  const { activeTool, setActiveTool } = useUIStore()

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-[var(--border)]">
      {tools.map((tool) => {
        const Icon = tool.icon
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors
              ${activeTool === tool.id
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            title={tool.label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{tool.label}</span>
          </button>
        )
      })}
    </div>
  )
}
