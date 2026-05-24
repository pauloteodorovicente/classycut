import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AppShell from '../components/layout/AppShell'
import ToolTabs from '../components/layout/ToolTabs'
import Sidebar from '../components/layout/Sidebar'
import VideoPlayer from '../components/player/VideoPlayer'
import Timeline from '../components/timeline/Timeline'
import MergeTool from '../components/tools/MergeTool'
import SilenceTool from '../components/tools/SilenceTool'
import TranscriptionTool from '../components/tools/TranscriptionTool'
import ExportTool from '../components/tools/ExportTool'
import ZoomTool from '../components/tools/ZoomTool'
import AITool from '../components/tools/AITool'
import BatchTool from '../components/tools/BatchTool'
import CutToolbar from '../components/tools/CutToolbar'
import CompressionTool from '../components/tools/CompressionTool'
import UpscaleTool from '../components/tools/UpscaleTool'
import HighlightsTool from '../components/tools/HighlightsTool'
import ChaptersTool from '../components/tools/ChaptersTool'
import SummaryTool from '../components/tools/SummaryTool'
import FileDropzone from '../components/shared/FileDropzone'
import ShareModal from '../components/shared/ShareModal'
import { getProject } from '../api/projects'
import { listMedia, uploadMedia, deleteMedia } from '../api/media'
import { useProjectStore } from '../stores/projectStore'
import { useUIStore } from '../stores/uiStore'
import { useHistoryStore } from '../stores/historyStore'

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { selectedMediaId, setMediaFiles, addMediaFiles, removeMediaFile } = useProjectStore()
  const { activeTool } = useUIStore()
  const { undo, redo, clear: clearHistory } = useHistoryStore()
  const [showShareModal, setShowShareModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  })

  const { data: mediaFiles = [] } = useQuery({
    queryKey: ['media', projectId],
    queryFn: () => listMedia(projectId!),
    enabled: !!projectId,
  })

  const prevJsonRef = useRef('')
  useEffect(() => {
    const json = JSON.stringify(mediaFiles)
    if (json !== prevJsonRef.current) {
      prevJsonRef.current = json
      setMediaFiles(mediaFiles)
    }
  }, [mediaFiles, setMediaFiles])

  // Clear global history when selected media changes (AC-5)
  const prevMediaRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedMediaId !== prevMediaRef.current) {
      prevMediaRef.current = selectedMediaId
      if (selectedMediaId) clearHistory()
    }
  }, [selectedMediaId, clearHistory])

  // Global Ctrl+Z / Ctrl+Y for all tools (AC-1, AC-2)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => {
      setUploadProgress(0)
      return uploadMedia(projectId!, files, setUploadProgress)
    },
    onSuccess: (newMedia) => {
      setUploadProgress(null)
      addMediaFiles(newMedia)
      queryClient.invalidateQueries({ queryKey: ['media', projectId] })
      toast.success(`${newMedia.length} arquivo(s) importado(s)`)
    },
    onError: () => {
      setUploadProgress(null)
      toast.error('Erro ao importar arquivos')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
    onSuccess: (_, mediaId) => {
      removeMediaFile(mediaId)
      queryClient.invalidateQueries({ queryKey: ['media', projectId] })
      toast.success('Arquivo removido')
    },
  })

  if (!projectId) return null

  const toolbar = (
    <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-4 gap-4">
      <button
        onClick={() => navigate('/')}
        className="p-1 hover:text-[var(--accent)] transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-sm font-medium">{project?.name || 'Carregando...'}</h1>
      <div className="flex-1" />
      <button
        onClick={() => setShowShareModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] hover:border-[var(--accent)] rounded text-xs font-medium transition-colors"
        title="Compartilhar projeto"
      >
        <Share2 className="w-3.5 h-3.5" />
        Compartilhar
      </button>
      {uploadProgress !== null ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded text-xs font-medium min-w-[140px]">
          <div className="flex-1 bg-[var(--border)] rounded-full h-1.5">
            <div
              className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-[var(--text-secondary)] tabular-nums">{uploadProgress}%</span>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded text-xs font-medium cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          Importar
          <input
            type="file"
            multiple
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (files.length > 0) uploadMutation.mutate(files)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )

  const sidebarContent = (
    <div className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col h-full">
      <ToolTabs />
      {activeTool === 'merge' ? (
        <MergeTool projectId={projectId} />
      ) : activeTool === 'silence' ? (
        <SilenceTool projectId={projectId} />
      ) : activeTool === 'transcription' || activeTool === 'subtitles' ? (
        <TranscriptionTool projectId={projectId} />
      ) : activeTool === 'zoom' ? (
        <ZoomTool projectId={projectId} />
      ) : activeTool === 'export' ? (
        <ExportTool projectId={projectId} />
      ) : activeTool === 'ai' ? (
        <AITool projectId={projectId} />
      ) : activeTool === 'batch' ? (
        <BatchTool projectId={projectId} />
      ) : activeTool === 'cut' ? (
        <CutToolbar projectId={projectId} />
      ) : activeTool === 'compression' ? (
        <CompressionTool projectId={projectId} />
      ) : activeTool === 'upscale' ? (
        <UpscaleTool projectId={projectId} />
      ) : activeTool === 'highlights' ? (
        <HighlightsTool projectId={projectId} />
      ) : activeTool === 'chapters' ? (
        <ChaptersTool projectId={projectId} />
      ) : activeTool === 'summary' ? (
        <SummaryTool projectId={projectId} />
      ) : activeTool === 'media' ? (
        <Sidebar onDeleteMedia={(id) => deleteMutation.mutate(id)} />
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-[var(--text-secondary)] text-center">Em breve</p>
        </div>
      )}
    </div>
  )

  const preview = (
    <div className="flex-1 flex flex-col gap-2 min-h-0">
      <VideoPlayer mediaId={selectedMediaId} />
      {mediaFiles.length === 0 && (
        <FileDropzone
          onFilesSelected={(files) => uploadMutation.mutate(files)}
          compact
        />
      )}
    </div>
  )

  return (
    <>
      <AppShell
        toolbar={toolbar}
        sidebar={sidebarContent}
        preview={preview}
        timeline={<Timeline />}
      />
      {showShareModal && (
        <ShareModal projectId={projectId} onClose={() => setShowShareModal(false)} />
      )}
    </>
  )
}
