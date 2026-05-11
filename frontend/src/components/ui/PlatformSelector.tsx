import { Smartphone, Music2, Play, MessageCircle, Monitor, Film } from 'lucide-react'
import { useUIStore, type PlatformPreset } from '../../stores/uiStore'

interface Platform {
  id: PlatformPreset
  label: string
  icon: React.ElementType
  info: string
}

const PLATFORMS: Platform[] = [
  { id: 'original',        label: 'Original',  icon: Film,          info: 'Sem transformação' },
  { id: 'instagram_reels', label: 'Reels',     icon: Smartphone,    info: '1080×1920 · 9:16' },
  { id: 'tiktok',          label: 'TikTok',    icon: Music2,        info: '1080×1920 · 9:16' },
  { id: 'youtube_shorts',  label: 'Shorts',    icon: Play,          info: '1080×1920 · max 256 MB' },
  { id: 'whatsapp',        label: 'WhatsApp',  icon: MessageCircle, info: '640×1136 · max 16 MB' },
  { id: 'youtube',         label: 'YouTube',   icon: Monitor,       info: '1920×1080 · 16:9' },
]

export default function PlatformSelector() {
  const { platformPreset, setPlatformPreset } = useUIStore()

  const active = PLATFORMS.find((p) => p.id === platformPreset)

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--text-secondary)]">Plataforma de destino</p>
      <div className="flex flex-wrap gap-1">
        {PLATFORMS.map((p) => {
          const Icon = p.icon
          const isActive = platformPreset === p.id
          return (
            <button
              key={p.id}
              onClick={() => setPlatformPreset(p.id)}
              title={p.info}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium transition-colors
                ${isActive
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70'
                }`}
            >
              <Icon className="w-3 h-3" />
              {p.label}
            </button>
          )
        })}
      </div>
      {active && active.id !== 'original' && (
        <p className="text-[10px] text-[var(--text-secondary)]">
          ↳ {active.info} — crop + scale aplicados automaticamente
        </p>
      )}
    </div>
  )
}
