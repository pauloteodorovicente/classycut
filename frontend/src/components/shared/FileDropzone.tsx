import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: Record<string, string[]>
  label?: string
  compact?: boolean
}

export default function FileDropzone({
  onFilesSelected,
  accept = { 'video/*': ['.mp4', '.mov', '.webm'], 'audio/*': ['.mp3', '.m4a', '.wav'] },
  label = 'Arraste arquivos aqui ou clique para selecionar',
  compact = false,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) onFilesSelected(acceptedFiles)
    },
    [onFilesSelected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg cursor-pointer transition-colors
        ${isDragActive ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] hover:border-[var(--text-secondary)]'}
        ${compact ? 'p-3' : 'p-8'}
        flex flex-col items-center justify-center gap-2 text-center`}
    >
      <input {...getInputProps()} />
      <Upload className={`text-[var(--text-secondary)] ${compact ? 'w-5 h-5' : 'w-8 h-8'}`} />
      <p className={`text-[var(--text-secondary)] ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
    </div>
  )
}
