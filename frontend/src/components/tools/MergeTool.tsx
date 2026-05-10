import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Merge, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useProjectStore } from '../../stores/projectStore'
import { mergeMedia } from '../../api/media'

interface MergeToolProps {
  projectId: string
}

export default function MergeTool({ projectId }: MergeToolProps) {
  const { mediaFiles } = useProjectStore()
  const queryClient = useQueryClient()
  const [videoId, setVideoId] = useState('')
  const [audioId, setAudioId] = useState('')
  const [outputName, setOutputName] = useState('merged_output.mp4')

  const videoFiles = mediaFiles.filter((f) => f.media_type === 'video')
  const audioFiles = mediaFiles.filter(
    (f) => f.media_type === 'audio' || (f.media_type === 'video' && f.has_audio)
  )

  const mergeMutation = useMutation({
    mutationFn: () =>
      mergeMedia(projectId, {
        video_media_id: videoId,
        audio_media_id: audioId,
        output_name: outputName,
      }),
    onSuccess: (data) => {
      toast.success(`Merge iniciado! Job: ${data.job_id.slice(0, 8)}...`)
      queryClient.invalidateQueries({ queryKey: ['jobs', projectId] })
    },
    onError: (err: Error) => {
      toast.error(`Erro no merge: ${err.message}`)
    },
  })

  const canMerge = videoId && audioId && outputName && !mergeMutation.isPending

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Merge Video + Audio
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Video</label>
          <select
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
          >
            <option value="">Selecione o video...</option>
            {videoFiles.map((f) => (
              <option key={f.id} value={f.id}>
                {f.filename}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Audio</label>
          <select
            value={audioId}
            onChange={(e) => setAudioId(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
          >
            <option value="">Selecione o audio...</option>
            {audioFiles.map((f) => (
              <option key={f.id} value={f.id}>
                {f.filename}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Nome do arquivo</label>
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
          />
        </div>

        <button
          onClick={() => mergeMutation.mutate()}
          disabled={!canMerge}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors
            bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mergeMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Merge className="w-4 h-4" />
          )}
          {mergeMutation.isPending ? 'Processando...' : 'Iniciar Merge'}
        </button>
      </div>
    </div>
  )
}
