import { useEffect, useRef } from 'react'
import { ZoomIn, Loader2, Plus, Trash2, Move, Maximize } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useZoomStore } from '../../stores/zoomStore'
import { useProjectStore } from '../../stores/projectStore'
import { usePlayerStore } from '../../stores/playerStore'
import { applyZoom } from '../../api/zoom'
import { getJob } from '../../api/jobs'
import { formatDuration } from '../../lib/formatters'
import type { PresetOption, ZoomKeyframe, ZoomEasing } from '../../types/zoom'

interface ZoomToolProps {
  projectId: string
}

const PRESETS: PresetOption[] = [
  { id: 'punch_in', label: 'Punch-in', desc: 'Zoom rápido no centro' },
  { id: 'pan_left_right', label: 'Pan Esq → Dir', desc: 'Desliza da esquerda para direita' },
  { id: 'pan_right_left', label: 'Pan Dir → Esq', desc: 'Desliza da direita para esquerda' },
  { id: 'ken_burns_in', label: 'Ken Burns In', desc: 'Zoom lento e suave para dentro' },
  { id: 'ken_burns_out', label: 'Ken Burns Out', desc: 'Zoom lento e suave para fora' },
]

const EASING_OPTIONS: { value: ZoomEasing; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease_in', label: 'Ease In' },
  { value: 'ease_out', label: 'Ease Out' },
  { value: 'ease_in_out', label: 'Ease In/Out' },
]

export default function ZoomTool({ projectId }: ZoomToolProps) {
  const { selectedMediaId, mediaFiles } = useProjectStore()
  const { currentTime } = usePlayerStore()
  const queryClient = useQueryClient()
  const {
    keyframes,
    selectedPreset,
    zoomJobId,
    selectedKeyframeIndex,
    addKeyframe,
    updateKeyframe,
    removeKeyframe,
    setKeyframes,
    setSelectedPreset,
    setZoomJobId,
    setSelectedKeyframeIndex,
  } = useZoomStore()

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // Poll zoom job
  useEffect(() => {
    if (!zoomJobId) return
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(zoomJobId)
        if (job.status === 'done') {
          setZoomJobId(null)
          stopPolling()
          queryClient.invalidateQueries({ queryKey: ['media', projectId] })
          toast.success('Zoom aplicado! Novo arquivo criado.')
        } else if (job.status === 'error') {
          setZoomJobId(null)
          stopPolling()
          toast.error(`Erro no zoom: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // Keep polling on network errors
      }
    }, 1000)

    return stopPolling
  }, [zoomJobId, setZoomJobId, projectId, queryClient])

  const selectedMedia = mediaFiles.find((f) => f.id === selectedMediaId)

  const handlePresetClick = (presetId: typeof PRESETS[number]['id']) => {
    setSelectedPreset(presetId)
    setKeyframes([])
  }

  const handleAddKeyframe = () => {
    const timeMs = Math.round(currentTime * 1000)
    const newKf: ZoomKeyframe = {
      time_ms: timeMs,
      x: 0.5,
      y: 0.5,
      scale: 1.5,
      easing: 'ease_in_out',
    }
    addKeyframe(newKf)
  }

  const handleApplyZoom = async () => {
    if (!selectedMediaId) {
      toast.error('Selecione um arquivo de mídia primeiro')
      return
    }

    const usePreset = selectedPreset && selectedPreset !== 'custom' && keyframes.length === 0
    const useKeyframes = keyframes.length >= 2

    if (!usePreset && !useKeyframes) {
      toast.error('Selecione um preset ou adicione pelo menos 2 keyframes')
      return
    }

    const ext = selectedMedia?.filename.split('.').pop() || 'mp4'
    const outputName = `zoom_${Date.now()}.${ext}`

    try {
      const res = await applyZoom(projectId, {
        media_id: selectedMediaId,
        ...(usePreset
          ? { preset: selectedPreset! }
          : { keyframes, preset: 'custom' }),
        output_name: outputName,
      })
      setZoomJobId(res.job_id)
      toast('Aplicando zoom...')
    } catch {
      toast.error('Erro ao iniciar processamento de zoom')
    }
  }

  const selectedKf = selectedKeyframeIndex !== null ? keyframes[selectedKeyframeIndex] : null

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Efeitos de Zoom
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

      {/* Presets */}
      <div>
        <p className="text-xs text-[var(--text-secondary)] mb-1.5">Presets</p>
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetClick(p.id)}
              className={`flex flex-col items-start px-2 py-2 rounded text-left transition-colors
                ${selectedPreset === p.id && keyframes.length === 0
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent)]/20'
                }`}
            >
              <span className="text-[10px] font-medium">{p.label}</span>
              <span className={`text-[9px] ${selectedPreset === p.id && keyframes.length === 0 ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                {p.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom keyframes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-[var(--text-secondary)]">Keyframes</p>
          <button
            onClick={handleAddKeyframe}
            disabled={!selectedMediaId}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </button>
        </div>

        {keyframes.length === 0 && (
          <p className="text-[10px] text-[var(--text-secondary)] italic">
            {selectedPreset && selectedPreset !== 'custom'
              ? 'Usando preset selecionado'
              : 'Posicione o playhead e adicione keyframes'}
          </p>
        )}

        {/* Keyframe list */}
        <div className="space-y-0.5 max-h-32 overflow-y-auto">
          {keyframes.map((kf, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedKeyframeIndex(selectedKeyframeIndex === idx ? null : idx)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors
                ${selectedKeyframeIndex === idx
                  ? 'bg-[var(--accent)]/30 text-[var(--accent)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                }`}
            >
              <ZoomIn className="w-3 h-3 shrink-0" />
              <span className="font-mono">{formatDuration(kf.time_ms)}</span>
              <span className="flex-1 text-right text-[var(--text-secondary)]">
                {kf.scale.toFixed(1)}x
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeKeyframe(idx) }}
                className="p-0.5 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Keyframe editor */}
      {selectedKf && selectedKeyframeIndex !== null && (
        <div className="bg-[var(--bg-tertiary)] rounded p-2 space-y-2">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
            Keyframe {selectedKeyframeIndex + 1}
          </p>

          {/* Position X */}
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Move className="w-3 h-3 text-[var(--text-secondary)]" />
              <label className="text-[10px] text-[var(--text-secondary)]">
                Posição X: {(selectedKf.x * 100).toFixed(0)}%
              </label>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={selectedKf.x * 100}
              onChange={(e) => updateKeyframe(selectedKeyframeIndex, { x: Number(e.target.value) / 100 })}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          {/* Position Y */}
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Move className="w-3 h-3 text-[var(--text-secondary)]" />
              <label className="text-[10px] text-[var(--text-secondary)]">
                Posição Y: {(selectedKf.y * 100).toFixed(0)}%
              </label>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={selectedKf.y * 100}
              onChange={(e) => updateKeyframe(selectedKeyframeIndex, { y: Number(e.target.value) / 100 })}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          {/* Scale */}
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Maximize className="w-3 h-3 text-[var(--text-secondary)]" />
              <label className="text-[10px] text-[var(--text-secondary)]">
                Zoom: {selectedKf.scale.toFixed(1)}x
              </label>
            </div>
            <input
              type="range"
              min={100}
              max={400}
              step={10}
              value={selectedKf.scale * 100}
              onChange={(e) => updateKeyframe(selectedKeyframeIndex, { scale: Number(e.target.value) / 100 })}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[9px] text-[var(--text-secondary)]">
              <span>1.0x</span>
              <span>4.0x</span>
            </div>
          </div>

          {/* Easing */}
          <div>
            <label className="text-[10px] text-[var(--text-secondary)] block mb-0.5">Easing</label>
            <select
              value={selectedKf.easing}
              onChange={(e) => updateKeyframe(selectedKeyframeIndex, { easing: e.target.value as ZoomEasing })}
              className="w-full px-2 py-1 rounded text-[10px] bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]"
            >
              {EASING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Apply button */}
      <button
        onClick={handleApplyZoom}
        disabled={
          !selectedMediaId ||
          !!zoomJobId ||
          (!selectedPreset && keyframes.length < 2) ||
          (selectedPreset === 'custom' && keyframes.length < 2)
        }
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
          bg-green-600 hover:bg-green-700 text-white
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {zoomJobId ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ZoomIn className="w-4 h-4" />
        )}
        {zoomJobId ? 'Processando...' : 'Aplicar Zoom'}
      </button>

      {/* Progress indicator */}
      {zoomJobId && (
        <div className="space-y-1">
          <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-green-500 animate-pulse w-full" />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] text-center">
            Processando zoom com FFmpeg...
          </p>
        </div>
      )}
    </div>
  )
}
